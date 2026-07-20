const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const Jimp = require('jimp');
const https = require('https');

let previewProcess = null;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const CONFIG_PATH = path.join(__dirname, 'config.json');
const APP_JSON_PATH = path.join(__dirname, 'test_wf', 'app.json');
const INDEX_JS_PATH = path.join(__dirname, 'test_wf', 'watchface', 'index.js');
const AOD_JS_PATH = path.join(__dirname, 'test_wf', 'watchface', 'aod.js');
const QRCODE_PATH = path.join(__dirname, 'qrcode.png');

const DEFAULT_CONFIG = {
  themeIndex: 0,
  hourColor: '#ff5a36',
  minuteColor: '#eaf4ff',
  lineColor: '#ff5a36',
  stepsColor: '#ff5a36',
  batteryLow: 20,
  batteryHigh: 80,
  appName: 'Minimal Art V1.3',
  appId: 1120255,
  fontFamily: 'Outfit',
  backgroundStyle: 'none',
  backgroundScale: 100,
  backgroundX: 0,
  backgroundY: 0,
  backgroundSpacing: 50,
  backgroundOpacity: 40,
  backgroundRotation: 0,
  widgets: [
    { type: 'HOUR', x: 40, y: 162, size: 96, color: 'primary' },
    { type: 'MINUTE', x: 244, y: 162, size: 96, color: 'secondary' },
    { type: 'DIVIDER', x: 226, y: 67, w: 2, h: 320, color: 'primary' },
    { type: 'BATTERY', x: 115, y: 313, size: 22, color: 'secondary', iconStyle: '1', iconSize: 24, showProgress: false, shortcut: 'DEFAULT' },
    { type: 'WEEKDAY', x: 115, y: 338, size: 16, color: 'secondary', shortcut: 'DEFAULT' },
    { type: 'STEP', x: 239, y: 313, size: 22, color: 'primary', iconStyle: '1', iconSize: 24, showProgress: false, shortcut: 'DEFAULT' },
    { type: 'DATE', x: 239, y: 338, size: 16, color: 'secondary', shortcut: 'DEFAULT' }
  ]
};

const FONT_URLS = {
  'Outfit': 'https://cdn.jsdelivr.net/npm/@fontsource/outfit/files/outfit-latin-800-normal.ttf',
  'Orbitron': 'https://cdn.jsdelivr.net/npm/@fontsource/orbitron/files/orbitron-latin-900-normal.ttf',
  'Share Tech Mono': 'https://cdn.jsdelivr.net/npm/@fontsource/share-tech-mono/files/share-tech-mono-latin-400-normal.ttf',
  'JetBrains Mono': 'https://cdn.jsdelivr.net/npm/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-800-normal.ttf'
};

const FONT_FILENAMES = {
  'Outfit': 'Outfit-ExtraBold.ttf',
  'Orbitron': 'Orbitron-Black.ttf',
  'Share Tech Mono': 'ShareTechMono-Regular.ttf',
  'JetBrains Mono': 'JetBrainsMono-ExtraBold.ttf'
};

const PRESETS = [
  { primary: '#ff5a36', secondary: '#eaf4ff' },
  { primary: '#ff7b90', secondary: '#fff0f2' },
  { primary: '#7cd1a1', secondary: '#f0faf4' },
  { primary: '#8f9eff', secondary: '#f2f4ff' },
  { primary: '#ffd670', secondary: '#fffcf2' },
  { primary: '#ff9e7d', secondary: '#fff5f2' }
];

// Ensure config.json exists
if (!fs.existsSync(CONFIG_PATH)) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
}

function downloadFont(fontFamily) {
  return new Promise((resolve, reject) => {
    const url = FONT_URLS[fontFamily];
    const filename = FONT_FILENAMES[fontFamily];
    if (!url || !filename) return resolve();

    const fontsDir = path.join(__dirname, 'test_wf', 'assets', 'fonts');
    if (!fs.existsSync(fontsDir)) {
      fs.mkdirSync(fontsDir, { recursive: true });
    }

    const dest = path.join(fontsDir, filename);
    if (fs.existsSync(dest)) {
      return resolve(filename);
    }

    console.log(`Downloading font ${fontFamily} from ${url}...`);
    const file = fs.createWriteStream(dest);

    const getFile = (requestUrl) => {
      https.get(requestUrl, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          getFile(response.headers.location);
          return;
        }
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download font: status ${response.statusCode}`));
          return;
        }
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`Successfully downloaded ${filename}`);
          resolve(filename);
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    };

    getFile(url);
  });
}

// GET config
app.get('/api/config', (req, res) => {
  try {
    const data = fs.readFileSync(CONFIG_PATH, 'utf8');
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(500).json({ error: 'Failed to read config' });
  }
});

// Dynamic Background Pattern Generator Endpoint
app.get('/api/background', async (req, res) => {
  try {
    const style = req.query.style || 'none';
    const spacing = parseInt(req.query.spacing) || 50;
    const rotation = parseInt(req.query.rotation) || 0;
    
    if (style === 'none') {
      const img = await new Jimp(454, 454, 0x000000ff);
      const buffer = await img.getBufferAsync(Jimp.MIME_PNG);
      res.type('image/png').send(buffer);
      return;
    }

    const img = await generatePatternImage(style, spacing, rotation);
    const buffer = await img.getBufferAsync(Jimp.MIME_PNG);
    res.type('image/png').send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).send('Background pattern generation failed');
  }
});

// POST save configuration
app.post('/api/save', async (req, res) => {
  try {
    const config = req.body;
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

    // Overwrite bg_${style}.png with custom spacing and rotation on the fly!
    if (config.backgroundStyle && config.backgroundStyle !== 'none') {
      const bgImg = await generatePatternImage(config.backgroundStyle, config.backgroundSpacing || 50, config.backgroundRotation || 0);
      const dest1 = path.join(__dirname, 'test_wf', 'assets', '454x454-amazfit-gtr-3', `bg_${config.backgroundStyle}.png`);
      const dest2 = path.join(__dirname, 'public', `bg_${config.backgroundStyle}.png`);
      await bgImg.writeAsync(dest1);
      await bgImg.writeAsync(dest2);
    }

    // Auto-download selected custom TTF font and generate image assets for all themes
    if (config.fontFamily) {
      try {
        await downloadFont(config.fontFamily);
        console.log('Generating image assets for all theme colors...');
        await generateAllFontAssets(config);
      } catch (fontErr) {
        console.error('Failed to download custom font or generate assets:', fontErr);
      }
    }

    // Generate Dynamic Thumbnail (icon.png) representing the user's custom design
    const iconDest = path.join(__dirname, 'test_wf', 'assets', '454x454-amazfit-gtr-3', 'icon.png');
    try {
      await generateThumbnail(config, iconDest);
    } catch (iconErr) {
      console.error('Failed to generate thumbnail icon:', iconErr);
    }

    // Update app.json
    if (fs.existsSync(APP_JSON_PATH)) {
      const appJsonData = fs.readFileSync(APP_JSON_PATH, 'utf8');
      const appJson = JSON.parse(appJsonData);

      appJson.app.appName = config.appName;
      appJson.app.appId = config.appId;
      if (appJson.app.version) {
        appJson.app.version.code = (appJson.app.version.code || 0) + 1;
        appJson.app.version.name = `1.${appJson.app.version.code}`;
      }
      if (appJson.i18n && appJson.i18n['en-US']) {
        appJson.i18n['en-US'].appName = config.appName;
      }

      fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2));
    }

    // Generate index.js (Active Watchface)
    const indexJsContent = generateIndexJs(config);
    fs.writeFileSync(INDEX_JS_PATH, indexJsContent);

    // Generate aod.js (Always-On Display Watchface)
    const aodJsContent = generateAodJs(config);
    fs.writeFileSync(AOD_JS_PATH, aodJsContent);

    res.json({ success: true, config });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save configuration' });
  }
});

// POST build and generate QR code
app.post('/api/build', (req, res) => {
  const testWfDir = path.join(__dirname, 'test_wf');
  
  // Kill existing preview process if running
  if (previewProcess) {
    console.log('Killing existing zeus preview process...');
    try {
      previewProcess.kill();
    } catch (e) {}
    previewProcess = null;
  }

  // Clear previous QR code images
  const path1 = path.join(__dirname, 'test_wf', 'qrcode.png');
  const path2 = path.join(__dirname, 'qrcode.png');
  if (fs.existsSync(path1)) {
    try { fs.unlinkSync(path1); } catch (e) {}
  }
  if (fs.existsSync(path2)) {
    try { fs.unlinkSync(path2); } catch (e) {}
  }

  console.log('Compiling watchface...');
  const userEnv = {
    ...process.env,
    USERPROFILE: 'C:\\Users\\bug95',
    HOME: 'C:\\Users\\bug95',
    HOMEPATH: '\\Users\\bug95',
    HOMEDRIVE: 'C:'
  };

  exec('npx zeus build', { 
    cwd: testWfDir,
    env: userEnv
  }, (err, stdout, stderr) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Zeus build failed', details: stdout || stderr });
    }

    console.log('Spawning zeus preview process in background...');
    previewProcess = spawn('npx', ['zeus', 'preview'], {
      cwd: testWfDir,
      shell: true,
      env: userEnv
    });

    previewProcess.stdout.on('data', (data) => {
      console.log(`[Preview stdout]: ${data}`);
    });
    previewProcess.stderr.on('data', (data) => {
      console.log(`[Preview stderr]: ${data}`);
    });

    // Immediately start polling for the generated QR code, without waiting for the process to exit
    let attempts = 0;
    const checkInterval = setInterval(() => {
      attempts++;
      const p1 = path.join(__dirname, 'test_wf', 'qrcode.png');
      const p2 = path.join(__dirname, 'qrcode.png');
      let finalPath = null;
      if (fs.existsSync(p1)) finalPath = p1;
      else if (fs.existsSync(p2)) finalPath = p2;

      if (finalPath) {
        clearInterval(checkInterval);
        console.log(`Successfully generated QR code at ${finalPath}`);
        // Give 300ms for file write to complete
        setTimeout(() => {
          try {
            const qrImageBuffer = fs.readFileSync(finalPath);
            const qrBase64 = `data:image/png;base64,${qrImageBuffer.toString('base64')}`;
            return res.json({ success: true, qr: qrBase64 });
          } catch (readErr) {
            console.error(readErr);
            return res.status(500).json({ error: 'Failed to read QR code image' });
          }
        }, 300);
        return;
      }
      
      if (attempts >= 300) { // 60 seconds timeout
        clearInterval(checkInterval);
        return res.status(500).json({ 
          error: 'Timeout waiting for QR code generation', 
          details: 'The compile process took longer than 60 seconds due to PNG asset conversion. Please click compile again; the assets are now cached and it will finish immediately.' 
        });
      }
    }, 200);
  });
});

// Dynamic Watchface Preview Thumbnail Generator (icon.png)
async function generateThumbnail(config, destPath) {
  const canvas = await new Jimp(454, 454, 0x000000ff);
  const themeIdx = config.themeIndex || 0;
  const assetsDir = path.join(__dirname, 'test_wf', 'assets', '454x454-amazfit-gtr-3');
  
  // Composite Background
  if (config.backgroundStyle && config.backgroundStyle !== 'none') {
    const bgImgPath = path.join(__dirname, 'public', `bg_${config.backgroundStyle}.png`);
    if (fs.existsSync(bgImgPath)) {
      const bgImg = await Jimp.read(bgImgPath);
      const bgScale = config.backgroundScale || 100;
      const bgX = config.backgroundX || 0;
      const bgY = config.backgroundY || 0;
      const w = Math.round(454 * (bgScale / 100));
      const h = Math.round(454 * (bgScale / 100));
      bgImg.resize(w, h);
      
      const bgRotation = config.backgroundRotation || 0;
      if (bgRotation !== 0) {
        bgImg.rotate(-bgRotation, false);
      }
      
      const alphaVal = (config.backgroundOpacity !== undefined ? config.backgroundOpacity : 40) / 100;
      bgImg.opacity(alphaVal);
      const x = Math.round(- (w - 454) / 2 + bgX);
      const y = Math.round(- (h - 454) / 2 + bgY);
      canvas.composite(bgImg, x, y);
    }
  }

  // Draw outer subtle ring
  const ring = await new Jimp(454, 454, 0x00000000);
  for (let x = 0; x < 454; x++) {
    for (let y = 0; y < 454; y++) {
      const dx = x - 227;
      const dy = y - 227;
      const r = Math.sqrt(dx * dx + dy * dy);
      if (Math.abs(r - 215) < 1) {
        ring.setPixelColor(0x222633ff, x, y);
      }
    }
  }
  canvas.composite(ring, 0, 0);

  // Helper to composite TEXT_IMG widgets side-by-side (matching Zepp OS variable-width logic)
  const drawTextImg = async (text, startX, y, prefix) => {
    let currX = startX;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const charPath = path.join(assetsDir, `${prefix}_${char}.png`);
      if (fs.existsSync(charPath)) {
        const charImg = await Jimp.read(charPath);
        canvas.composite(charImg, currX, y);
        currX += charImg.bitmap.width + 2; // width + h_space (2px)
      }
    }
  };

  const activePreset = PRESETS[themeIdx] || PRESETS[0];
  const primaryColor = config.lineColor || activePreset.primary;
  const secondaryColor = config.minuteColor || activePreset.secondary;

  // Overlay Widgets matching actual assets
  const widgetsList = config.widgets || [];
  for (const w of widgetsList) {
    if (w.type === 'NONE') continue;

    if (w.type === 'HOUR') {
      await drawTextImg('13', w.x, w.y - 14, `h_${themeIdx}`);
    } else if (w.type === 'MINUTE') {
      await drawTextImg('48', w.x, w.y - 14, `m_${themeIdx}`);
    } else if (w.type === 'DIVIDER') {
      const colorHex = w.color === 'primary' ? primaryColor : (w.color === 'secondary' ? secondaryColor : w.customColor || '#ffffff');
      const rectImg = new Jimp(w.w || 2, w.h || 320, colorHex + 'ff');
      canvas.composite(rectImg, w.x, w.y);
    } else if (w.type === 'BATTERY') {
      const colorHex = w.color === 'primary' ? primaryColor : (w.color === 'secondary' ? secondaryColor : w.customColor || '#ffffff');
      const tipColor = parseInt(colorHex.replace('#', '0x') + 'ff');
      
      const batOutline = await new Jimp(16, 24, 0x00000000);
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 24; y++) {
          if (x === 0 || x === 15 || y === 2 || y === 23) {
            batOutline.setPixelColor(tipColor, x, y);
          }
          if (y === 0 && x >= 4 && x <= 11) {
            batOutline.setPixelColor(tipColor, x, y);
          }
          if (y === 1 && (x === 4 || x === 11)) {
            batOutline.setPixelColor(tipColor, x, y);
          }
        }
      }
      canvas.composite(batOutline, w.x, w.y - 14);

      const barH = 14;
      const barY = 24 - 1 - barH;
      const batBar = await new Jimp(10, barH, tipColor);
      canvas.composite(batBar, w.x + 3, w.y - 14 + barY);

      await drawTextImg('80', w.x + 24, w.y - 12, `b_${themeIdx}`);
    } else if (w.type === 'HEART') {
      const heartIconPath = path.join(assetsDir, `heart_${themeIdx}.png`);
      if (fs.existsSync(heartIconPath)) {
        const heartImg = await Jimp.read(heartIconPath);
        canvas.composite(heartImg, w.x, w.y - 12);
      }
      await drawTextImg('72', w.x + 26, w.y - 12, `hr_${themeIdx}`);
    } else if (w.type === 'STEP') {
      const stepIconPath = path.join(assetsDir, `step_${themeIdx}.png`);
      if (fs.existsSync(stepIconPath)) {
        const stepImg = await Jimp.read(stepIconPath);
        canvas.composite(stepImg, w.x, w.y - 12);
      }
      await drawTextImg('6245', w.x + 26, w.y - 12, `s_${themeIdx}`);
    } else if (w.type === 'WEEKDAY') {
      const weekPath = path.join(assetsDir, `w_${themeIdx}_week_4.png`);
      if (fs.existsSync(weekPath)) {
        const weekImg = await Jimp.read(weekPath);
        canvas.composite(weekImg, w.x, w.y - 12);
      }
    } else if (w.type === 'DATE') {
      const monthPath = path.join(assetsDir, `mon_${themeIdx}_month_7.png`);
      let monthWidth = 0;
      if (fs.existsSync(monthPath)) {
        const monthImg = await Jimp.read(monthPath);
        canvas.composite(monthImg, w.x, w.y - 12);
        monthWidth = monthImg.bitmap.width;
      }
      await drawTextImg('16', w.x + monthWidth + 4, w.y - 12, `dt_${themeIdx}`);
  }
  }
  await canvas.writeAsync(destPath);
}

// Programmatic Anti-Aliased Pattern Engine
const WIDTH = 908;
const HEIGHT = 908;
const COLOR_BLACK = 0x000000ff;
const COLOR_GREY = 0x4a5061ff;
const COLOR_GREY_LIGHT = 0x5c6275ff;

// Target dimensions for downscaling
const TARGET_W = 454;
const TARGET_H = 454;

function drawLine(image, x0, y0, x1, y1, color, thickness = 3) {
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = (x0 < x1) ? 1 : -1;
  const sy = (y0 < y1) ? 1 : -1;
  let err = dx - dy;

  const halfThick = Math.floor(thickness / 2);

  while (true) {
    for (let ox = -halfThick; ox <= halfThick; ox++) {
      for (let oy = -halfThick; oy <= halfThick; oy++) {
        const px = x0 + ox;
        const py = y0 + oy;
        if (px >= 0 && px < WIDTH && py >= 0 && py < HEIGHT) {
          image.setPixelColor(color, px, py);
        }
      }
    }

    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
}

function drawCircle(image, xc, yc, r, color, thickness = 3) {
  xc = Math.round(xc);
  yc = Math.round(yc);
  r = Math.round(r);

  const step = 1.0 / r;
  const halfThick = Math.floor(thickness / 2);
  
  for (let theta = 0; theta < 2 * Math.PI; theta += step) {
    const x = Math.round(xc + r * Math.cos(theta));
    const y = Math.round(yc + r * Math.sin(theta));
    
    for (let ox = -halfThick; ox <= halfThick; ox++) {
      for (let oy = -halfThick; oy <= halfThick; oy++) {
        const px = x + ox;
        const py = y + oy;
        if (px >= 0 && px < WIDTH && py >= 0 && py < HEIGHT) {
          image.setPixelColor(color, px, py);
        }
      }
    }
  }
}

async function generatePatternImage(style, spacing, rotation = 0) {
  const img = await new Jimp(WIDTH, HEIGHT, COLOR_BLACK);
  const spacing2x = spacing * 2;
  const xc = WIDTH / 2;
  const yc = HEIGHT / 2;

  if (style === 'grid') {
    for (let x = spacing2x; x < WIDTH; x += spacing2x) {
      drawLine(img, x, 0, x, HEIGHT, COLOR_GREY, 3);
    }
    for (let y = spacing2x; y < HEIGHT; y += spacing2x) {
      drawLine(img, 0, y, WIDTH, y, COLOR_GREY, 3);
    }
  } 
  else if (style === 'radar') {
    for (let r = spacing2x; r < 460; r += spacing2x) {
      drawCircle(img, xc, yc, r, COLOR_GREY, 3);
    }
    drawLine(img, xc, 40, xc, HEIGHT - 40, COLOR_GREY, 3);
    drawLine(img, 40, yc, WIDTH - 40, yc, COLOR_GREY, 3);
  } 
  else if (style === 'dots') {
    for (let x = spacing2x; x < WIDTH; x += spacing2x) {
      for (let y = spacing2x; y < HEIGHT; y += spacing2x) {
        const dotSize = Math.max(1, Math.round(spacing / 20));
        for (let dx = -dotSize; dx <= dotSize; dx++) {
          for (let dy = -dotSize; dy <= dotSize; dy++) {
            const px = x + dx;
            const py = y + dy;
            if (px >= 0 && px < WIDTH && py >= 0 && py < HEIGHT) {
              img.setPixelColor(COLOR_GREY, px, py);
            }
          }
        }
      }
    }
  } 
  else if (style === 'floral') {
    const drawMotif = (cx, cy) => {
      const step = 0.01;
      const sizeVal = Math.round(spacing * 1.2);
      for (let theta = 0; theta < 2 * Math.PI; theta += step) {
        const r = sizeVal * Math.cos(4 * theta);
        const x = Math.round(cx + r * Math.cos(theta));
        const y = Math.round(cy + r * Math.sin(theta));
        for (let ox = -2; ox <= 2; ox++) {
          for (let oy = -2; oy <= 2; oy++) {
            img.setPixelColor(COLOR_GREY_LIGHT, x + ox, y + oy);
          }
        }
      }
      drawCircle(img, cx, cy, sizeVal + 20, COLOR_GREY, 3);
    };

    const pad = spacing2x * 2;
    for (let x = -pad; x < WIDTH + pad; x += spacing2x * 3) {
      for (let y = -pad; y < HEIGHT + pad; y += spacing2x * 3) {
        drawMotif(x, y);
      }
    }
  } 
  else if (style === 'mandala') {
    const r1 = spacing2x;
    const r2 = spacing2x * 2;
    const r3 = spacing2x * 3;
    const r4 = spacing2x * 4;

    if (r1 < 450) drawCircle(img, xc, yc, r1, COLOR_GREY, 3);
    if (r2 < 450) drawCircle(img, xc, yc, r2, COLOR_GREY, 3);
    if (r3 < 450) drawCircle(img, xc, yc, r3, COLOR_GREY, 3);
    if (r4 < 450) drawCircle(img, xc, yc, r4, COLOR_GREY, 3);

    for (let angle = 0; angle < 360; angle += 30) {
      const rad = angle * Math.PI / 180;
      const x0 = xc + r1 * Math.cos(rad);
      const y0 = yc + r1 * Math.sin(rad);
      const x1 = xc + Math.min(440, r4) * Math.cos(rad);
      const y1 = yc + Math.min(440, r4) * Math.sin(rad);
      drawLine(img, x0, y0, x1, y1, COLOR_GREY, 3);
    }
  } 
  else if (style === 'waves') {
    const amplitude = Math.round(spacing / 3);
    const frequency = 0.04;
    for (let y = spacing2x; y < HEIGHT; y += spacing2x) {
      for (let x = 0; x < WIDTH; x++) {
        const dy = Math.round(amplitude * Math.sin(x * frequency));
        const py = y + dy;
        if (py >= 0 && py < HEIGHT) img.setPixelColor(COLOR_GREY, x, py);
        if (py + 1 >= 0 && py + 1 < HEIGHT) img.setPixelColor(COLOR_GREY, x, py + 1);
        if (py - 1 >= 0 && py - 1 < HEIGHT) img.setPixelColor(COLOR_GREY, x, py - 1);
      }
    }
  } 
  else if (style === 'carbon') {
    const blockSize = Math.round(spacing / 2);
    for (let x = 0; x < WIDTH; x += blockSize) {
      for (let y = 0; y < HEIGHT; y += blockSize) {
        const isEven = (Math.floor(x / blockSize) + Math.floor(y / blockSize)) % 2 === 0;
        if (!isEven) continue;
        for (let i = 0; i < blockSize; i++) {
          img.setPixelColor(COLOR_GREY, x + i, y + i);
          if (i < blockSize - 1) {
            img.setPixelColor(COLOR_GREY, x + i + 1, y + i);
            img.setPixelColor(COLOR_GREY, x + i, y + i + 1);
          }
        }
      }
    }
  } 
  else if (style === 'honeycomb') {
    const size = spacing;
    const h = size * Math.sqrt(3);
    const drawHex = (cx, cy) => {
      const points = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i * 60) * Math.PI / 180;
        points.push({
          x: Math.round(cx + size * Math.cos(angle)),
          y: Math.round(cy + size * Math.sin(angle))
        });
      }
      for (let i = 0; i < 6; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % 6];
        drawLine(img, p1.x, p1.y, p2.x, p2.y, COLOR_GREY, 3);
      }
    };
    for (let x = -size * 2; x < WIDTH + size * 2; x += size * 3) {
      for (let y = -h; y < HEIGHT + h; y += h) {
        drawHex(x, y);
        drawHex(x + size * 1.5, y + h / 2);
      }
    }
  } 
  else if (style === 'sunburst') {
    const angleStep = Math.max(5, Math.round(spacing / 3));
    for (let angle = 0; angle < 360; angle += angleStep) {
      const rad = angle * Math.PI / 180;
      const x1 = Math.round(xc + 440 * Math.cos(rad));
      const y1 = Math.round(yc + 440 * Math.sin(rad));
      drawLine(img, xc, yc, x1, y1, COLOR_GREY, 3);
    }
  } 
  else if (style === 'stars') {
    for (let bx = -spacing2x; bx < WIDTH + spacing2x; bx += spacing2x * 2.5) {
      for (let by = -spacing2x; by < HEIGHT + spacing2x; by += spacing2x * 2.5) {
        const s0 = { x: bx + spacing * 0.4, y: by + spacing * 0.3 };
        const s1 = { x: bx + spacing * 1.4, y: by + spacing * 0.2 };
        const s2 = { x: bx + spacing * 0.3, y: by + spacing * 1.4 };
        const s3 = { x: bx + spacing * 1.5, y: by + spacing * 1.6 };

        const drawStarNode = (s) => {
          for (let dx = -3; dx <= 3; dx++) {
            for (let dy = -3; dy <= 3; dy++) {
              img.setPixelColor(COLOR_GREY_LIGHT, s.x + dx, s.y + dy);
            }
          }
        };

        drawStarNode(s0); drawStarNode(s1); drawStarNode(s2); drawStarNode(s3);
        drawLine(img, s0.x, s0.y, s1.x, s1.y, COLOR_GREY, 2);
        drawLine(img, s1.x, s1.y, s3.x, s3.y, COLOR_GREY, 2);
        drawLine(img, s2.x, s2.y, s3.x, s3.y, COLOR_GREY, 2);
      }
    }
  } 
  else if (style === 'circuit') {
    const block = spacing2x * 2;
    for (let bx = -block; bx < WIDTH + block; bx += block) {
      for (let by = -block; by < HEIGHT + block; by += block) {
        const cx = bx + block / 2;
        const cy = by + block / 2;
        const offset = spacing;

        const drawNode = (x, y) => {
          for (let dx = -4; dx <= 4; dx++) {
            for (let dy = -4; dy <= 4; dy++) {
              img.setPixelColor(COLOR_GREY_LIGHT, x + dx, y + dy);
            }
          }
        };

        drawLine(img, cx - offset, cy - offset, cx, cy - offset, COLOR_GREY, 3);
        drawLine(img, cx, cy - offset, cx + offset, cy, COLOR_GREY, 3);
        drawNode(cx - offset, cy - offset);
        drawNode(cx + offset, cy);
      }
    }
  } 
  else if (style === 'damask') {
    const drawDamaskMotif = (cx, cy) => {
      const step = 0.01;
      const sizeVal = Math.round(spacing * 1.2);
      for (let theta = 0; theta < 2 * Math.PI; theta += step) {
        const r = sizeVal * Math.sin(3 * theta);
        const x = Math.round(cx + r * Math.cos(theta));
        const y = Math.round(cy + r * Math.sin(theta));
        for (let ox = -2; ox <= 2; ox++) {
          for (let oy = -2; oy <= 2; oy++) {
            img.setPixelColor(COLOR_GREY_LIGHT, x + ox, y + oy);
          }
        }
      }
      const dist = sizeVal + 30;
      drawLine(img, cx, cy - dist, cx + dist, cy, COLOR_GREY, 3);
      drawLine(img, cx + dist, cy, cx, cy + dist, COLOR_GREY, 3);
      drawLine(img, cx, cy + dist, cx - dist, cy, COLOR_GREY, 3);
      drawLine(img, cx - dist, cy, cx, cy - dist, COLOR_GREY, 3);
    };

    const pad = spacing2x * 2;
    for (let x = -pad; x < WIDTH + pad; x += spacing2x * 3.5) {
      for (let y = -pad; y < HEIGHT + pad; y += spacing2x * 3.5) {
        drawDamaskMotif(x, y);
      }
    }
  } 
  else if (style === 'hatch') {
    for (let offset = -HEIGHT; offset < WIDTH; offset += spacing2x) {
      drawLine(img, offset, 0, offset + HEIGHT, HEIGHT, COLOR_GREY, 3);
    }
  } 
  else if (style === 'pinstripe') {
    for (let x = spacing2x; x < WIDTH; x += spacing2x) {
      drawLine(img, x, 0, x, HEIGHT, COLOR_GREY, 3);
    }
  } 
  else if (style === 'poly') {
    for (let x = -spacing2x; x < WIDTH + spacing2x; x += spacing2x) {
      for (let y = -spacing2x; y < HEIGHT + spacing2x; y += spacing2x) {
        for (let dx = -3; dx <= 3; dx++) {
          for (let dy = -3; dy <= 3; dy++) {
            img.setPixelColor(COLOR_GREY_LIGHT, x + dx, y + dy);
          }
        }
        drawLine(img, x, y, x + spacing2x, y, COLOR_GREY, 2);
        drawLine(img, x, y, x, y + spacing2x, COLOR_GREY, 2);
        drawLine(img, x, y, x + spacing2x, y + spacing2x, COLOR_GREY, 2);
      }
    }
  }
  else if (style === 'chevron') {
    for (let x = -spacing2x; x < WIDTH + spacing2x; x += spacing2x) {
      for (let y = -spacing2x; y < HEIGHT + spacing2x; y += spacing2x) {
        drawLine(img, x, y, x + spacing, y + spacing, COLOR_GREY, 3);
        drawLine(img, x + spacing, y + spacing, x + spacing2x, y, COLOR_GREY, 3);
      }
    }
  }
  else if (style === 'crosshair') {
    for (let x = spacing2x; x < WIDTH; x += spacing2x) {
      for (let y = spacing2x; y < HEIGHT; y += spacing2x) {
        drawCircle(img, x, y, Math.round(spacing / 3), COLOR_GREY, 2);
        drawLine(img, x - 15, y, x + 15, y, COLOR_GREY, 2);
        drawLine(img, x, y - 15, x, y + 15, COLOR_GREY, 2);
      }
    }
  }
  else if (style === 'ripple') {
    for (let x = spacing2x; x < WIDTH; x += spacing2x) {
      for (let y = spacing2x; y < HEIGHT; y += spacing2x) {
        drawCircle(img, x, y, Math.round(spacing / 3), COLOR_GREY, 2);
        drawCircle(img, x, y, Math.round(spacing * 2 / 3), COLOR_GREY, 2);
      }
    }
  }
  else if (style === 'maze') {
    for (let x = -spacing2x; x < WIDTH + spacing2x; x += spacing2x) {
      for (let y = -spacing2x; y < HEIGHT + spacing2x; y += spacing2x) {
        const rand = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
        const choice = rand > 0.5 ? 1 : 0;
        if (choice === 0) {
          drawLine(img, x + spacing, y, x, y + spacing, COLOR_GREY, 3);
          drawLine(img, x + spacing2x, y + spacing, x + spacing, y + spacing2x, COLOR_GREY, 3);
        } else {
          drawLine(img, x, y + spacing, x + spacing, y + spacing2x, COLOR_GREY, 3);
          drawLine(img, x + spacing, y, x + spacing2x, y + spacing, COLOR_GREY, 3);
        }
      }
    }
  }
  else if (style === 'baroque') {
    const drawBaroqueMotif = (cx, cy) => {
      const step = 0.01;
      const sizeVal = Math.round(spacing * 0.9);
      
      for (let t = 0; t < 2 * Math.PI; t += step) {
        const r = sizeVal * (1 - Math.sin(t)) * (0.5 + 0.5 * Math.cos(t) * Math.cos(t));
        const px = Math.round(cx + r * Math.sin(t));
        const py = Math.round(cy + r * Math.cos(t) - spacing * 0.2);
        if (px >= 0 && px < WIDTH && py >= 0 && py < HEIGHT) {
          img.setPixelColor(COLOR_GREY_LIGHT, px, py);
        }
      }

      for (let t = 0; t < 3.5; t += 0.05) {
        const px = Math.round(cx - spacing * 0.6 * Math.sin(t) - spacing * 0.3);
        const py = Math.round(cy + spacing * 0.8 * Math.cos(t) + (t * 8));
        if (px >= 0 && px < WIDTH && py >= 0 && py < HEIGHT) {
          img.setPixelColor(COLOR_GREY, px, py);
        }
      }

      for (let t = 0; t < 3.5; t += 0.05) {
        const px = Math.round(cx + spacing * 0.6 * Math.sin(t) + spacing * 0.3);
        const py = Math.round(cy + spacing * 0.8 * Math.cos(t) + (t * 8));
        if (px >= 0 && px < WIDTH && py >= 0 && py < HEIGHT) {
          img.setPixelColor(COLOR_GREY, px, py);
        }
      }

      const dist = sizeVal + 40;
      drawLine(img, cx, cy - dist, cx + dist, cy, COLOR_GREY, 2);
      drawLine(img, cx + dist, cy, cx, cy + dist, COLOR_GREY, 2);
      drawLine(img, cx, cy + dist, cx - dist, cy, COLOR_GREY, 2);
      drawLine(img, cx - dist, cy, cx, cy - dist, COLOR_GREY, 2);
    };

    const stepX = spacing2x * 3;
    const stepY = spacing2x * 3;
    for (let x = -stepX; x < WIDTH + stepX; x += stepX) {
      for (let y = -stepY; y < HEIGHT + stepY; y += stepY) {
        drawBaroqueMotif(x, y);
        drawBaroqueMotif(x + stepX / 2, y + stepY / 2);
      }
    }
  }
  else if (style === 'meander') {
    for (let x = -spacing2x; x < WIDTH + spacing2x; x += spacing2x) {
      for (let y = -spacing2x; y < HEIGHT + spacing2x; y += spacing2x) {
        drawLine(img, x, y, x + spacing2x, y, COLOR_GREY, 3);
        drawLine(img, x + spacing2x, y, x + spacing2x, y + spacing2x, COLOR_GREY, 3);
        drawLine(img, x + spacing2x, y + spacing2x, x, y + spacing2x, COLOR_GREY, 3);
        drawLine(img, x, y + spacing2x, x, y + spacing, COLOR_GREY, 3);
        drawLine(img, x, y + spacing, x + spacing, y + spacing, COLOR_GREY, 3);
        drawLine(img, x + spacing, y + spacing, x + spacing, y + spacing * 1.5, COLOR_GREY, 3);
      }
    }
  }

  if (rotation !== 0) {
    img.rotate(-rotation, false);
  }

  img.resize(TARGET_W, TARGET_H, Jimp.RESIZE_BICUBIC);
  return img;
}

// Widget Shortcut Map compiler helper
function getShortcutType(widget) {
  const target = widget.shortcut || 'DEFAULT';
  if (target === 'NONE') return '';
  if (target !== 'DEFAULT') {
    return `hmUI.data_type.${target}`;
  }
  // Auto mapping defaults
  if (widget.type === 'BATTERY') return 'hmUI.data_type.BATTERY';
  if (widget.type === 'STEP') return 'hmUI.data_type.STEP';
  if (widget.type === 'HEART') return 'hmUI.data_type.HEART';
  if (widget.type === 'CAL') return 'hmUI.data_type.STRESS';
  if (widget.type === 'DISTANCE') return 'hmUI.data_type.DISTANCE';
  return '';
}

// Generate index.js layout template code (Awake Mode)
function generateIndexJs(config) {
  const activeSensors = new Set();
  const widgetsList = config.widgets || [];
  widgetsList.forEach(w => {
    if (['BATTERY', 'STEP', 'HEART', 'CAL', 'DISTANCE'].includes(w.type)) {
      activeSensors.add(w.type);
    }
  });

  let onInitSensors = '';
  if (activeSensors.has('BATTERY')) onInitSensors += "    this.batterySensor = hmSensor.createSensor(hmSensor.id.BATTERY)\n";
  if (activeSensors.has('STEP')) onInitSensors += "    this.stepSensor = hmSensor.createSensor(hmSensor.id.STEP)\n";
  if (activeSensors.has('HEART')) onInitSensors += "    this.heartSensor = hmSensor.createSensor(hmSensor.id.HEART)\n";
  if (activeSensors.has('CAL')) onInitSensors += "    this.calSensor = hmSensor.createSensor(hmSensor.id.CALORIE)\n";
  if (activeSensors.has('DISTANCE')) onInitSensors += "    this.distanceSensor = hmSensor.createSensor(hmSensor.id.DISTANCE)\n";

  let buildWidgets = '';
  const initialT = config.themeIndex;

  widgetsList.forEach(w => {
    if (w.type === 'NONE') return;

    const shortcutType = getShortcutType(w);
    let shortcutWidget = '';
    const clickAreaW = (w.showProgress && ['BATTERY', 'STEP'].includes(w.type)) ? 120 : 100;
    const clickAreaH = (w.showProgress && ['BATTERY', 'STEP'].includes(w.type)) ? 44 : 30;

    if (shortcutType) {
      shortcutWidget = `
    // Shortcut Touch Area for ${w.type}
    hmUI.createWidget(hmUI.widget.IMG_CLICK, {
      x: ${w.x},
      y: ${w.y - 12},
      w: ${clickAreaW},
      h: ${clickAreaH},
      src: 'transparent.png',
      type: ${shortcutType}
    })
      `;
    }

    const getFontArrayStrForTheme = (prefix, isCustom, widgetId, themeVar) => {
      if (isCustom) {
        return `[
        'font_custom_${widgetId}_0.png', 'font_custom_${widgetId}_1.png', 'font_custom_${widgetId}_2.png', 'font_custom_${widgetId}_3.png', 'font_custom_${widgetId}_4.png',
        'font_custom_${widgetId}_5.png', 'font_custom_${widgetId}_6.png', 'font_custom_${widgetId}_7.png', 'font_custom_${widgetId}_8.png', 'font_custom_${widgetId}_9.png'
      ]`;
      } else {
        return `[
        '${prefix}_' + ${themeVar} + '_0.png', '${prefix}_' + ${themeVar} + '_1.png', '${prefix}_' + ${themeVar} + '_2.png', '${prefix}_' + ${themeVar} + '_3.png', '${prefix}_' + ${themeVar} + '_4.png',
        '${prefix}_' + ${themeVar} + '_5.png', '${prefix}_' + ${themeVar} + '_6.png', '${prefix}_' + ${themeVar} + '_7.png', '${prefix}_' + ${themeVar} + '_8.png', '${prefix}_' + ${themeVar} + '_9.png'
      ]`;
      }
    };

    if (w.type === 'HOUR') {
      if (w.color === 'custom') {
        const fontArr = getFontArrayStrForTheme('h', true, w.id, '0');
        buildWidgets += `
    // Hour Widget (Custom Color)
    const hourW = hmUI.createWidget(hmUI.widget.TEXT_IMG, {
      x: ${w.x},
      y: ${w.y - 14},
      w: 180,
      h: 130,
      font_array: ${fontArr},
      h_space: 2,
      text: '00'
    })
    this.hourTextWidgets = [hourW, hourW, hourW, hourW, hourW, hourW]
        `;
      } else {
        buildWidgets += `
    // Hour Widgets (one per theme)
    this.hourTextWidgets = []
    for (let i = 0; i < THEMES.length; i++) {
      this.hourTextWidgets.push(hmUI.createWidget(hmUI.widget.TEXT_IMG, {
        x: ${w.x},
        y: ${w.y - 14},
        w: 180,
        h: 130,
        font_array: ${getFontArrayStrForTheme('h', false, w.id, 'i')},
        h_space: 2,
        text: '00'
      }))
    }
        `;
      }
    } else if (w.type === 'MINUTE') {
      if (w.color === 'custom') {
        const fontArr = getFontArrayStrForTheme('m', true, w.id, '0');
        buildWidgets += `
    // Minute Widget (Custom Color)
    const minuteW = hmUI.createWidget(hmUI.widget.TEXT_IMG, {
      x: ${w.x},
      y: ${w.y - 14},
      w: 180,
      h: 130,
      font_array: ${fontArr},
      h_space: 2,
      text: '00'
    })
    this.minuteTextWidgets = [minuteW, minuteW, minuteW, minuteW, minuteW, minuteW]
        `;
      } else {
        buildWidgets += `
    // Minute Widgets (one per theme)
    this.minuteTextWidgets = []
    for (let i = 0; i < THEMES.length; i++) {
      this.minuteTextWidgets.push(hmUI.createWidget(hmUI.widget.TEXT_IMG, {
        x: ${w.x},
        y: ${w.y - 14},
        w: 180,
        h: 130,
        font_array: ${getFontArrayStrForTheme('m', false, w.id, 'i')},
        h_space: 2,
        text: '00'
      }))
    }
        `;
      }
    } else if (w.type === 'DIVIDER') {
      buildWidgets += `
    // Divider Accent Line
    const activeTheme = THEMES[this.currentThemeIndex]
    this.centerLineWidget = hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: ${w.x},
      y: ${w.y},
      w: ${w.w || 2},
      h: ${w.h || 320},
      color: activeTheme.line
    })

    // Theme Switcher Hotspot
    const themeHotspot = hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: ${w.x - 16},
      y: ${w.y},
      w: ${(w.w || 2) + 32},
      h: ${w.h || 320},
      color: 0x000000,
      alpha: 0
    })
    themeHotspot.addEventListener(hmUI.event.CLICK_DOWN, () => {
      this.cycleTheme()
    })
      `;
    } else if (w.type === 'BATTERY') {
      const isSmall = w.iconSize <= 16;
      const textXOffset = w.showProgress ? 50 : (isSmall ? 22 : 30);
      const textYOffset = w.showProgress ? -12 : -16;

      let drawIconCode = '';
      if (w.iconStyle === '2') { // Vertical Battery
        if (isSmall) {
          drawIconCode = `
    this.batteryOutline = hmUI.createWidget(hmUI.widget.FILL_RECT, { x: ${w.x}, y: ${w.y - 8}, w: 10, h: 16, radius: 1, color: 0x4a4e5d })
    hmUI.createWidget(hmUI.widget.FILL_RECT, { x: ${w.x + 1}, y: ${w.y - 7}, w: 8, h: 14, radius: 0, color: 0x000000 })
    this.batteryTip = hmUI.createWidget(hmUI.widget.FILL_RECT, { x: ${w.x + 3}, y: ${w.y - 10}, w: 4, h: 2, color: 0x4a4e5d })
    this.batteryFillWidget = hmUI.createWidget(hmUI.widget.FILL_RECT, { x: ${w.x + 2}, y: ${w.y - 5}, w: 6, h: 10, color: 0x8a90a6 })
          `;
        } else {
          drawIconCode = `
    this.batteryOutline = hmUI.createWidget(hmUI.widget.FILL_RECT, { x: ${w.x}, y: ${w.y - 12}, w: 14, h: 24, radius: 2, color: 0x4a4e5d })
    hmUI.createWidget(hmUI.widget.FILL_RECT, { x: ${w.x + 1}, y: ${w.y - 11}, w: 12, h: 22, radius: 1, color: 0x000000 })
    this.batteryTip = hmUI.createWidget(hmUI.widget.FILL_RECT, { x: ${w.x + 4}, y: ${w.y - 14}, w: 6, h: 2, color: 0x4a4e5d })
    this.batteryFillWidget = hmUI.createWidget(hmUI.widget.FILL_RECT, { x: ${w.x + 3}, y: ${w.y - 9}, w: 8, h: 18, color: 0x8a90a6 })
          `;
        }
      } else if (w.iconStyle === '3') { // Circle Bolt
        if (isSmall) {
          drawIconCode = `
    this.batteryOutline = hmUI.createWidget(hmUI.widget.ARC, { x: ${w.x}, y: ${w.y - 8}, w: 16, h: 16, start_angle: 0, end_angle: 360, color: 0x4a4e5d, line_width: 2 })
    this.batteryTip = hmUI.createWidget(hmUI.widget.FILL_RECT, { x: ${w.x}, y: ${w.y}, w: 1, h: 1, color: 0x000000 }) // Dummy
    this.batteryFillWidget = hmUI.createWidget(hmUI.widget.FILL_RECT, { x: ${w.x + 7}, y: ${w.y - 5}, w: 3, h: 10, color: 0x8a90a6 })
          `;
        } else {
          drawIconCode = `
    this.batteryOutline = hmUI.createWidget(hmUI.widget.ARC, { x: ${w.x}, y: ${w.y - 12}, w: 24, h: 24, start_angle: 0, end_angle: 360, color: 0x4a4e5d, line_width: 2 })
    this.batteryTip = hmUI.createWidget(hmUI.widget.FILL_RECT, { x: ${w.x}, y: ${w.y}, w: 1, h: 1, color: 0x000000 }) // Dummy
    this.batteryFillWidget = hmUI.createWidget(hmUI.widget.FILL_RECT, { x: ${w.x + 10}, y: ${w.y - 7}, w: 4, h: 14, color: 0x8a90a6 })
          `;
        }
      } else { // Style 1: Horizontal Battery (Default)
        if (isSmall) {
          drawIconCode = `
    this.batteryOutline = hmUI.createWidget(hmUI.widget.FILL_RECT, { x: ${w.x}, y: ${w.y - 5}, w: 16, h: 10, radius: 1, color: 0x4a4e5d })
    hmUI.createWidget(hmUI.widget.FILL_RECT, { x: ${w.x + 1}, y: ${w.y - 4}, w: 14, h: 8, radius: 0, color: 0x000000 })
    this.batteryTip = hmUI.createWidget(hmUI.widget.FILL_RECT, { x: ${w.x + 16}, y: ${w.y - 2}, w: 1, h: 4, color: 0x4a4e5d })
    this.batteryFillWidget = hmUI.createWidget(hmUI.widget.FILL_RECT, { x: ${w.x + 2}, y: ${w.y - 3}, w: 12, h: 6, color: 0x8a90a6 })
          `;
        } else {
          drawIconCode = `
    this.batteryOutline = hmUI.createWidget(hmUI.widget.FILL_RECT, { x: ${w.x}, y: ${w.y - 8}, w: 24, h: 14, radius: 2, color: 0x4a4e5d })
    hmUI.createWidget(hmUI.widget.FILL_RECT, { x: ${w.x + 1}, y: ${w.y - 7}, w: 22, h: 12, radius: 1, color: 0x000000 })
    this.batteryTip = hmUI.createWidget(hmUI.widget.FILL_RECT, { x: ${w.x + 24}, y: ${w.y - 4}, w: 2, h: 6, color: 0x4a4e5d })
    this.batteryFillWidget = hmUI.createWidget(hmUI.widget.FILL_RECT, { x: ${w.x + 3}, y: ${w.y - 5}, w: 18, h: 8, color: 0x8a90a6 })
          `;
        }
      }

      let drawProgressCode = '';
      if (w.showProgress) {
        drawProgressCode = `
    // Battery Progress Arc Rings
    this.batteryArcBg = hmUI.createWidget(hmUI.widget.ARC, { x: ${w.x}, y: ${w.y - 12}, w: 44, h: 44, start_angle: 0, end_angle: 360, color: 0x222633, line_width: 3 })
    this.batteryArcVal = hmUI.createWidget(hmUI.widget.ARC, { x: ${w.x}, y: ${w.y - 12}, w: 44, h: 44, start_angle: -90, end_angle: 270, color: 0x8a90a6, line_width: 3 })
        `;
      }

      if (w.color === 'custom') {
        const fontArr = getFontArrayStrForTheme('b', true, w.id, '0');
        buildWidgets += `
    // Battery Complication (Custom Color)
    ${drawProgressCode}
    ${drawIconCode}
    const batteryTextW = hmUI.createWidget(hmUI.widget.TEXT_IMG, {
      x: ${w.x + textXOffset},
      y: ${w.y + textYOffset},
      w: 70,
      h: 30,
      font_array: ${fontArr},
      h_space: 1,
      text: ''
    })
    this.batteryTextWidgets = [batteryTextW, batteryTextW, batteryTextW, batteryTextW, batteryTextW, batteryTextW]
    ${shortcutWidget}
        `;
      } else {
        buildWidgets += `
    // Battery Complication (one per theme)
    ${drawProgressCode}
    ${drawIconCode}
    this.batteryTextWidgets = []
    for (let i = 0; i < THEMES.length; i++) {
      this.batteryTextWidgets.push(hmUI.createWidget(hmUI.widget.TEXT_IMG, {
        x: ${w.x + textXOffset},
        y: ${w.y + textYOffset},
        w: 70,
        h: 30,
        font_array: ${getFontArrayStrForTheme('b', false, w.id, 'i')},
        h_space: 1,
        text: ''
      }))
    }
    ${shortcutWidget}
        `;
      }
    } else if (w.type === 'STEP') {
      let drawProgressCode = '';
      if (w.showProgress) {
        drawProgressCode = `
    // Steps Progress Arc Rings
    this.stepsArcBg = hmUI.createWidget(hmUI.widget.ARC, { x: ${w.x}, y: ${w.y - 12}, w: 44, h: 44, start_angle: 0, end_angle: 360, color: 0x222633, line_width: 3 })
    this.stepsArcVal = hmUI.createWidget(hmUI.widget.ARC, { x: ${w.x}, y: ${w.y - 12}, w: 44, h: 44, start_angle: -90, end_angle: 270, color: 0x000000, line_width: 3 })
        `;
      }

      if (w.color === 'custom') {
        const fontArr = getFontArrayStrForTheme('s', true, w.id, '0');
        buildWidgets += `
    // Steps Complication (Custom Color)
    ${drawProgressCode}
    this.stepsIconWidget = hmUI.createWidget(hmUI.widget.IMG, {
      x: ${w.x},
      y: ${w.y - 12},
      src: 'step_' + this.currentThemeIndex + '.png'
    })
    const stepsTextW = hmUI.createWidget(hmUI.widget.TEXT_IMG, {
      x: ${w.x + 30},
      y: ${w.y - 16},
      w: 74,
      h: 30,
      font_array: ${fontArr},
      h_space: 1,
      text: ''
    })
    this.stepsTextWidgets = [stepsTextW, stepsTextW, stepsTextW, stepsTextW, stepsTextW, stepsTextW]
    ${shortcutWidget}
        `;
      } else {
        buildWidgets += `
    // Steps Complication (one per theme)
    ${drawProgressCode}
    this.stepsIconWidget = hmUI.createWidget(hmUI.widget.IMG, {
      x: ${w.x},
      y: ${w.y - 12},
      src: 'step_' + this.currentThemeIndex + '.png'
    })
    this.stepsTextWidgets = []
    for (let i = 0; i < THEMES.length; i++) {
      this.stepsTextWidgets.push(hmUI.createWidget(hmUI.widget.TEXT_IMG, {
        x: ${w.x + 30},
        y: ${w.y - 16},
        w: 74,
        h: 30,
        font_array: ${getFontArrayStrForTheme('s', false, w.id, 'i')},
        h_space: 1,
        text: ''
      }))
    }
    ${shortcutWidget}
        `;
      }
    } else if (w.type === 'HEART') {
      if (w.color === 'custom') {
        const fontArr = getFontArrayStrForTheme('hr', true, w.id, '0');
        buildWidgets += `
    // Heart Rate Complication (Custom Color)
    this.heartIconWidget = hmUI.createWidget(hmUI.widget.IMG, {
      x: ${w.x},
      y: ${w.y - 12},
      src: 'heart_' + this.currentThemeIndex + '.png'
    })
    const heartTextW = hmUI.createWidget(hmUI.widget.TEXT_IMG, {
      x: ${w.x + 30},
      y: ${w.y - 16},
      w: 74,
      h: 30,
      font_array: ${fontArr},
      h_space: 1,
      text: ''
    })
    this.heartTextWidgets = [heartTextW, heartTextW, heartTextW, heartTextW, heartTextW, heartTextW]
    ${shortcutWidget}
        `;
      } else {
        buildWidgets += `
    // Heart Rate Complication (one per theme)
    this.heartIconWidget = hmUI.createWidget(hmUI.widget.IMG, {
      x: ${w.x},
      y: ${w.y - 12},
      src: 'heart_' + this.currentThemeIndex + '.png'
    })
    this.heartTextWidgets = []
    for (let i = 0; i < THEMES.length; i++) {
      this.heartTextWidgets.push(hmUI.createWidget(hmUI.widget.TEXT_IMG, {
        x: ${w.x + 30},
        y: ${w.y - 16},
        w: 74,
        h: 30,
        font_array: ${getFontArrayStrForTheme('hr', false, w.id, 'i')},
        h_space: 1,
        text: ''
      }))
    }
    ${shortcutWidget}
        `;
      }
    } else if (w.type === 'CAL') {
      const scale = (w.iconSize || 24) / 24;
      const textXOffset = Math.round(24 * scale) + 6;
      let drawIconCode = '';
      if (w.iconStyle === '2') { // Single Flame
        drawIconCode = `
    this.calFlame1 = hmUI.createWidget(hmUI.widget.FILL_RECT, { x: ${w.x + Math.round(6 * scale)}, y: ${w.y - Math.round(8 * scale)}, w: Math.round(12 * scale), h: Math.round(18 * scale), radius: Math.round(3 * scale), color: 0x000000 })
    this.calFlame2 = hmUI.createWidget(hmUI.widget.FILL_RECT, { x: ${w.x}, y: ${w.y}, w: 1, h: 1, color: 0x000000 }) // Dummy
        `;
      } else if (w.iconStyle === '3') { // Spark
        drawIconCode = `
    this.calFlame1 = hmUI.createWidget(hmUI.widget.FILL_RECT, { x: ${w.x + Math.round(4 * scale)}, y: ${w.y - Math.round(4 * scale)}, w: Math.round(6 * scale), h: Math.round(6 * scale), radius: Math.round(1 * scale), color: 0x000000 })
    this.calFlame2 = hmUI.createWidget(hmUI.widget.FILL_RECT, { x: ${w.x + Math.round(14 * scale)}, y: ${w.y - Math.round(8 * scale)}, w: Math.round(6 * scale), h: Math.round(6 * scale), radius: Math.round(1 * scale), color: 0x000000 })
        `;
      } else { // Standard (Default)
        drawIconCode = `
    this.calFlame1 = hmUI.createWidget(hmUI.widget.FILL_RECT, { x: ${w.x + Math.round(6 * scale)}, y: ${w.y - Math.round(4 * scale)}, w: Math.round(6 * scale), h: Math.round(10 * scale), radius: Math.round(2 * scale), color: 0x000000 })
    this.calFlame2 = hmUI.createWidget(hmUI.widget.FILL_RECT, { x: ${w.x + Math.round(9 * scale)}, y: ${w.y - Math.round(8 * scale)}, w: Math.round(4 * scale), h: Math.round(8 * scale), radius: Math.round(1 * scale), color: 0x000000 })
        `;
      }

      if (w.color === 'custom') {
        const fontArr = getFontArrayStrForTheme('c', true, w.id, '0');
        buildWidgets += `
    // Calories Complication (Custom Color)
    ${drawIconCode}
    const calTextW = hmUI.createWidget(hmUI.widget.TEXT_IMG, {
      x: ${w.x + textXOffset},
      y: ${w.y - 16},
      w: 74,
      h: 30,
      font_array: ${fontArr},
      h_space: 1,
      text: ''
    })
    this.calTextWidgets = [calTextW, calTextW, calTextW, calTextW, calTextW, calTextW]
    ${shortcutWidget}
        `;
      } else {
        buildWidgets += `
    // Calories Complication (one per theme)
    ${drawIconCode}
    this.calTextWidgets = []
    for (let i = 0; i < THEMES.length; i++) {
      this.calTextWidgets.push(hmUI.createWidget(hmUI.widget.TEXT_IMG, {
        x: ${w.x + textXOffset},
        y: ${w.y - 16},
        w: 74,
        h: 30,
        font_array: ${getFontArrayStrForTheme('c', false, w.id, 'i')},
        h_space: 1,
        text: ''
      }))
    }
    ${shortcutWidget}
        `;
      }
    } else if (w.type === 'DISTANCE') {
      const scale = (w.iconSize || 24) / 24;
      const textXOffset = Math.round(24 * scale) + 6;
      let drawIconCode = '';
      if (w.iconStyle === '2') { // Pin Alone
        drawIconCode = `
    this.distPinCircle = hmUI.createWidget(hmUI.widget.ARC, { x: ${w.x + Math.round(4 * scale)}, y: ${w.y - Math.round(8 * scale)}, w: Math.round(16 * scale), h: Math.round(16 * scale), start_angle: 0, end_angle: 360, color: 0x000000, line_width: 2 })
    this.distPinLine = hmUI.createWidget(hmUI.widget.FILL_RECT, { x: ${w.x}, y: ${w.y}, w: 1, h: 1, color: 0x000000 }) // Dummy
        `;
      } else if (w.iconStyle === '3') { // Path Loop
        drawIconCode = `
    this.distPinCircle = hmUI.createWidget(hmUI.widget.ARC, { x: ${w.x}, y: ${w.y - Math.round(8 * scale)}, w: Math.round(24 * scale), h: Math.round(14 * scale), start_angle: 0, end_angle: 180, color: 0x000000, line_width: 2 })
    this.distPinLine = hmUI.createWidget(hmUI.widget.FILL_RECT, { x: ${w.x + Math.round(11 * scale)}, y: ${w.y - Math.round(2 * scale)}, w: Math.round(2 * scale), h: Math.round(8 * scale), color: 0x000000 })
        `;
      } else { // Pin and line (Default)
        drawIconCode = `
    this.distPinCircle = hmUI.createWidget(hmUI.widget.ARC, { x: ${w.x + Math.round(4 * scale)}, y: ${w.y - Math.round(8 * scale)}, w: Math.round(10 * scale), h: Math.round(10 * scale), start_angle: 0, end_angle: 360, color: 0x000000, line_width: 2 })
    this.distPinLine = hmUI.createWidget(hmUI.widget.FILL_RECT, { x: ${w.x + Math.round(8 * scale)}, y: ${w.y + Math.round(1 * scale)}, w: Math.round(2 * scale), h: Math.round(5 * scale), color: 0x000000 })
        `;
      }

      if (w.color === 'custom') {
        const fontArr = getFontArrayStrForTheme('d', true, w.id, '0');
        buildWidgets += `
    // Distance Complication (Custom Color)
    ${drawIconCode}
    const distTextW = hmUI.createWidget(hmUI.widget.TEXT_IMG, {
      x: ${w.x + textXOffset},
      y: ${w.y - 16},
      w: 74,
      h: 30,
      font_array: ${fontArr},
      h_space: 1,
      text: ''
    })
    this.distanceTextWidgets = [distTextW, distTextW, distTextW, distTextW, distTextW, distTextW]
    ${shortcutWidget}
        `;
      } else {
        buildWidgets += `
    // Distance Complication (one per theme)
    ${drawIconCode}
    this.distanceTextWidgets = []
    for (let i = 0; i < THEMES.length; i++) {
      this.distanceTextWidgets.push(hmUI.createWidget(hmUI.widget.TEXT_IMG, {
        x: ${w.x + textXOffset},
        y: ${w.y - 16},
        w: 74,
        h: 30,
        font_array: ${getFontArrayStrForTheme('d', false, w.id, 'i')},
        h_space: 1,
        text: ''
      }))
    }
    ${shortcutWidget}
        `;
      }
    } else if (w.type === 'WEEKDAY') {
      const srcExpr = w.color === 'custom' ? `'font_custom_${w.id}_week_1.png'` : `'w_' + this.currentThemeIndex + '_week_1.png'`;
      buildWidgets += `
    // Weekday Widget (IMG)
    this.weekdayTextWidget = hmUI.createWidget(hmUI.widget.IMG, {
      x: ${w.x},
      y: ${w.y - 12},
      src: ${srcExpr}
    })
    ${shortcutWidget}
      `;
    } else if (w.type === 'DATE') {
      const srcExpr = w.color === 'custom' ? `'font_custom_${w.id}_month_1.png'` : `'mon_' + this.currentThemeIndex + '_month_1.png'`;
      
      if (w.color === 'custom') {
        const fontArr = getFontArrayStrForTheme('dt', true, w.id, '0');
        buildWidgets += `
    // Date Widget (Custom Color)
    this.monthWidget = hmUI.createWidget(hmUI.widget.IMG, {
      x: ${w.x},
      y: ${w.y - 12},
      src: ${srcExpr}
    })
    const dayW = hmUI.createWidget(hmUI.widget.TEXT_IMG, {
      x: ${w.x + Math.round(w.size * 2.1)},
      y: ${w.y - 12},
      font_array: ${fontArr},
      h_space: 1,
      text: '01'
    })
    this.dayWidgets = [dayW, dayW, dayW, dayW, dayW, dayW]
    ${shortcutWidget}
        `;
      } else {
        buildWidgets += `
    // Date Widget (one per theme)
    this.monthWidget = hmUI.createWidget(hmUI.widget.IMG, {
      x: ${w.x},
      y: ${w.y - 12},
      src: ${srcExpr}
    })
    this.dayWidgets = []
    for (let i = 0; i < THEMES.length; i++) {
      this.dayWidgets.push(hmUI.createWidget(hmUI.widget.TEXT_IMG, {
        x: ${w.x + Math.round(w.size * 2.1)},
        y: ${w.y - 12},
        font_array: ${getFontArrayStrForTheme('dt', false, w.id, 'i')},
        h_space: 1,
        text: '01'
      }))
    }
    ${shortcutWidget}
        `;
      }
    }
  });

  if (config.backgroundStyle && config.backgroundStyle !== 'none') {
    const bgScale = config.backgroundScale || 100;
    const bgX = config.backgroundX || 0;
    const bgY = config.backgroundY || 0;
    const w = Math.round(454 * (bgScale / 100));
    const h = Math.round(454 * (bgScale / 100));
    const x = Math.round(- (w - 454) / 2 + bgX);
    const y = Math.round(- (h - 454) / 2 + bgY);
    const alphaVal = Math.round(255 * ((config.backgroundOpacity !== undefined ? config.backgroundOpacity : 40) / 100));

    buildWidgets = `
    // Background Image Pattern
    hmUI.createWidget(hmUI.widget.IMG, {
      x: ${x},
      y: ${y},
      w: ${w},
      h: ${h},
      alpha: ${alphaVal},
      src: 'bg_${config.backgroundStyle}.png'
    })
    ` + buildWidgets;
  }

  let registerListeners = '';
  if (activeSensors.has('BATTERY')) registerListeners += "    this.batterySensor.addEventListener(hmSensor.event.CHANGE, updateBatteryCb)\n";
  if (activeSensors.has('STEP')) registerListeners += "    this.stepSensor.addEventListener(hmSensor.event.CHANGE, updateStepsCb)\n";
  if (activeSensors.has('HEART')) registerListeners += "    this.heartSensor.addEventListener(hmSensor.event.CHANGE, updateHeartCb)\n";
  if (activeSensors.has('CAL')) registerListeners += "    this.calSensor.addEventListener(hmSensor.event.CHANGE, updateCalCb)\n";
  if (activeSensors.has('DISTANCE')) registerListeners += "    this.distanceSensor.addEventListener(hmSensor.event.CHANGE, updateDistanceCb)\n";

  let resumeUpdates = '';
  activeSensors.forEach(s => {
    if (s === 'BATTERY') resumeUpdates += '        this.updateBattery()\n';
    if (s === 'STEP') resumeUpdates += '        this.updateSteps()\n';
    if (s === 'HEART') resumeUpdates += '        this.updateHeart()\n';
    if (s === 'CAL') resumeUpdates += '        this.updateCal()\n';
    if (s === 'DISTANCE') resumeUpdates += '        this.updateDistance()\n';
  });

  let helperUpdateFunctions = '';
  if (activeSensors.has('BATTERY')) {
    const batWidget = widgetsList.find(x => x.type === 'BATTERY');
    const hasBatteryArc = batWidget && batWidget.showProgress;
    const arcUpdateCode = hasBatteryArc ? `
    if (this.batteryArcVal) {
      this.batteryArcVal.setProperty(hmUI.prop.MORE, {
        end_angle: -90 + Math.round(360 * (batteryVal / 100))
      })
    }
    ` : '';

    helperUpdateFunctions += `
  updateBattery() {
    if (!this.batteryTextWidgets) return
    const batteryVal = this.batterySensor.current
    for (let i = 0; i < THEMES.length; i++) {
      if (this.batteryTextWidgets[i]) this.batteryTextWidgets[i].setProperty(hmUI.prop.TEXT, batteryVal.toString())
    }

    // Update battery fill color and width
    const maxW = ${(widgetsList.find(x => x.type === 'BATTERY') && widgetsList.find(x => x.type === 'BATTERY').iconSize <= 16) ? 12 : 18};
    const w_charge = Math.max(1, Math.round(maxW * (batteryVal / 100)))
    let batteryColor = 0xeaf4ff
    if (batteryVal <= ${config.batteryLow}) {
      batteryColor = 0xff2c2c // Red
    } else if (batteryVal >= ${config.batteryHigh}) {
      batteryColor = 0x00ff7f // Green
    }
    
    if (this.batteryFillWidget) {
      this.batteryFillWidget.setProperty(hmUI.prop.MORE, {
        w: w_charge,
        color: batteryColor
      })
    }
    ${arcUpdateCode}
  },`;
  }

  if (activeSensors.has('STEP')) {
    const stepWidget = widgetsList.find(x => x.type === 'STEP');
    const hasStepArc = stepWidget && stepWidget.showProgress;
    const arcUpdateCode = hasStepArc ? `
    if (this.stepsArcVal) {
      const stepGoalPct = Math.min(1.0, stepsVal / 10000)
      this.stepsArcVal.setProperty(hmUI.prop.MORE, {
        end_angle: -90 + Math.round(360 * stepGoalPct)
      })
    }
    ` : '';

    helperUpdateFunctions += `
  updateSteps() {
    if (!this.stepsTextWidgets) return
    const stepsVal = this.stepSensor.current
    for (let i = 0; i < THEMES.length; i++) {
      if (this.stepsTextWidgets[i]) this.stepsTextWidgets[i].setProperty(hmUI.prop.TEXT, stepsVal.toString())
    }
    ${arcUpdateCode}
  },`;
  }

  if (activeSensors.has('HEART')) {
    helperUpdateFunctions += `
  updateHeart() {
    if (!this.heartTextWidgets) return
    const hrVal = this.heartSensor.last || 0
    const valStr = hrVal > 0 ? hrVal.toString() : '0'
    for (let i = 0; i < THEMES.length; i++) {
      if (this.heartTextWidgets[i]) this.heartTextWidgets[i].setProperty(hmUI.prop.TEXT, valStr)
    }
  },`;
  }

  if (activeSensors.has('CAL')) {
    helperUpdateFunctions += `
  updateCal() {
    if (!this.calTextWidgets) return
    const calVal = this.calSensor.current || 0
    for (let i = 0; i < THEMES.length; i++) {
      if (this.calTextWidgets[i]) this.calTextWidgets[i].setProperty(hmUI.prop.TEXT, calVal.toString())
    }
  },`;
  }

  if (activeSensors.has('DISTANCE')) {
    helperUpdateFunctions += `
  updateDistance() {
    if (!this.distanceTextWidgets) return
    const distVal = this.distanceSensor.current || 0
    const kmVal = Math.round(distVal / 1000)
    for (let i = 0; i < THEMES.length; i++) {
      if (this.distanceTextWidgets[i]) this.distanceTextWidgets[i].setProperty(hmUI.prop.TEXT, kmVal.toString())
    }
  },`;
  }

  let themeApplyColors = `
    for (let i = 0; i < THEMES.length; i++) {
      const visible = (i === t)
      if (this.hourTextWidgets && this.hourTextWidgets[i]) this.hourTextWidgets[i].setProperty(hmUI.prop.VISIBLE, visible)
      if (this.minuteTextWidgets && this.minuteTextWidgets[i]) this.minuteTextWidgets[i].setProperty(hmUI.prop.VISIBLE, visible)
      if (this.batteryTextWidgets && this.batteryTextWidgets[i]) this.batteryTextWidgets[i].setProperty(hmUI.prop.VISIBLE, visible)
      if (this.stepsTextWidgets && this.stepsTextWidgets[i]) this.stepsTextWidgets[i].setProperty(hmUI.prop.VISIBLE, visible)
      if (this.heartTextWidgets && this.heartTextWidgets[i]) this.heartTextWidgets[i].setProperty(hmUI.prop.VISIBLE, visible)
      if (this.calTextWidgets && this.calTextWidgets[i]) this.calTextWidgets[i].setProperty(hmUI.prop.VISIBLE, visible)
      if (this.distanceTextWidgets && this.distanceTextWidgets[i]) this.distanceTextWidgets[i].setProperty(hmUI.prop.VISIBLE, visible)
      if (this.dayWidgets && this.dayWidgets[i]) this.dayWidgets[i].setProperty(hmUI.prop.VISIBLE, visible)
    }
  `;

  widgetsList.forEach(w => {
    if (w.type === 'NONE') return;

    if (w.type === 'DIVIDER') {
      themeApplyColors += `    if (this.centerLineWidget) {
      this.centerLineWidget.setProperty(hmUI.prop.COLOR, theme.line)
    }\n`;
    } else if (w.type === 'BATTERY') {
      themeApplyColors += `    if (this.batteryOutline) this.batteryOutline.setProperty(hmUI.prop.COLOR, theme.line)
    if (this.batteryTip) this.batteryTip.setProperty(hmUI.prop.COLOR, theme.line)\n`;
      if (w.showProgress) {
        themeApplyColors += "    if (this.batteryArcVal) this.batteryArcVal.setProperty(hmUI.prop.COLOR, theme.line)\n";
      }
    } else if (w.type === 'STEP') {
      themeApplyColors += `    if (this.stepsIconWidget) {
      this.stepsIconWidget.setProperty(hmUI.prop.SRC, 'step_' + t + '.png')
    }\n`;
      if (w.showProgress) {
        themeApplyColors += "    if (this.stepsArcVal) this.stepsArcVal.setProperty(hmUI.prop.COLOR, theme.line)\n";
      }
    } else if (w.type === 'HEART') {
      themeApplyColors += `    if (this.heartIconWidget) {
      this.heartIconWidget.setProperty(hmUI.prop.SRC, 'heart_' + t + '.png')
    }\n`;
    } else if (w.type === 'CAL') {
      themeApplyColors += `    if (this.calFlame1) this.calFlame1.setProperty(hmUI.prop.COLOR, theme.line)
    if (this.calFlame2) this.calFlame2.setProperty(hmUI.prop.COLOR, theme.line)\n`;
    } else if (w.type === 'DISTANCE') {
      themeApplyColors += `    if (this.distPinCircle) this.distPinCircle.setProperty(hmUI.prop.COLOR, theme.line)
    if (this.distPinLine) this.distPinLine.setProperty(hmUI.prop.COLOR, theme.line)\n`;
    } else if (w.type === 'WEEKDAY') {
      themeApplyColors += `    if (this.weekdayTextWidget) {
      const weekIndex = this.timeSensor.week
      this.weekdayTextWidget.setProperty(hmUI.prop.SRC, 'w_' + t + '_week_' + weekIndex + '.png')
    }\n`;
    } else if (w.type === 'DATE') {
      themeApplyColors += `    if (this.monthWidget) {
      const monthIndex = this.timeSensor.month
      this.monthWidget.setProperty(hmUI.prop.SRC, 'mon_' + t + '_month_' + monthIndex + '.png')
    }\n`;
    }
  });

  return `const THEMES = [
  {
    line: ${config.lineColor.replace('#', '0x')},
    minute: ${config.minuteColor.replace('#', '0x')},
    steps: ${config.stepsColor.replace('#', '0x')}
  },
  {
    line: 0xff7b90,    // Strawberry Yogurt
    minute: 0xfff0f2,
    steps: 0xff7b90
  },
  {
    line: 0x7cd1a1,    // Mint Pistachio
    minute: 0xf0faf4,
    steps: 0x7cd1a1
  },
  {
    line: 0x8f9eff,    // Blueberry Lavender
    minute: 0xf2f4ff,
    steps: 0x8f9eff
  },
  {
    line: 0xffd670,    // Banana Cream
    minute: 0xfffcf2,
    steps: 0xffd670
  },
  {
    line: 0xff9e7d,    // Soft Peach Melba
    minute: 0xfff5f2,
    steps: 0xff9e7d
  }
]

WatchFace({
  onInit() {
    console.log('index page.js on init invoke')
    this.timeSensor = hmSensor.createSensor(hmSensor.id.TIME)
${onInitSensors}
    this.currentThemeIndex = ${config.themeIndex}
    try {
      this.currentThemeIndex = hmFS.SysProGetInt('theme_idx') !== undefined ? hmFS.SysProGetInt('theme_idx') : ${config.themeIndex}
      if (this.currentThemeIndex < 0 || this.currentThemeIndex >= THEMES.length) {
        this.currentThemeIndex = ${config.themeIndex}
      }
    } catch (e) {
      console.log('Read theme index failed', e)
    }
  },

  build() {
    console.log('index page.js on build invoke')

    hmUI.createWidget(hmUI.widget.ARC, {
      x: 12,
      y: 12,
      w: 430,
      h: 430,
      start_angle: 0,
      end_angle: 360,
      color: 0x222633,
      line_width: 1
    })

${buildWidgets}
    this.applyThemeColors()
    this.updateTime()
${resumeUpdates}
    this.setupListeners()
  },

  setupListeners() {
    const updateTimeCb = () => this.updateTime()
${
  activeSensors.has('BATTERY') ? '    const updateBatteryCb = () => this.updateBattery()\n' : ''
}${
  activeSensors.has('STEP') ? '    const updateStepsCb = () => this.updateSteps()\n' : ''
}${
  activeSensors.has('HEART') ? '    const updateHeartCb = () => this.updateHeart()\n' : ''
}${
  activeSensors.has('CAL') ? '    const updateCalCb = () => this.updateCal()\n' : ''
}${
  activeSensors.has('DISTANCE') ? '    const updateDistanceCb = () => this.updateDistance()\n' : ''
}
    // Register sensor change listeners
${registerListeners}
    this.timeTimer = timer.createTimer(0, 1000, updateTimeCb)

    hmUI.createWidget(hmUI.widget.WIDGET_DELEGATE, {
      resume_call: () => {
        console.log('Watchface resumed')
        if (!this.timeTimer) {
          this.timeTimer = timer.createTimer(0, 1000, updateTimeCb)
        }
        this.applyThemeColors()
        this.updateTime()
${resumeUpdates}      },
      pause_call: () => {
        console.log('Watchface paused')
        if (this.timeTimer) {
          timer.stopTimer(this.timeTimer)
          this.timeTimer = null
        }
      }
    })
  },

  cycleTheme() {
    this.currentThemeIndex = (this.currentThemeIndex + 1) % THEMES.length
    try {
      hmFS.SysProSetInt('theme_idx', this.currentThemeIndex)
    } catch (e) {
      console.log('Save theme index failed', e)
    }
    this.applyThemeColors()
  },

  applyThemeColors() {
    const t = this.currentThemeIndex
    const theme = THEMES[t]
    
${themeApplyColors}
    this.updateBattery()
  },

  updateTime() {
    const hour = this.timeSensor.hour
    const minute = this.timeSensor.minute
    
    const hh = hour < 10 ? '0' + hour : '' + hour
    const mm = minute < 10 ? '0' + minute : '' + minute

    if (this.hourTextWidgets) {
      for (let i = 0; i < THEMES.length; i++) {
        if (this.hourTextWidgets[i]) this.hourTextWidgets[i].setProperty(hmUI.prop.TEXT, hh)
      }
    }
    if (this.minuteTextWidgets) {
      for (let i = 0; i < THEMES.length; i++) {
        if (this.minuteTextWidgets[i]) this.minuteTextWidgets[i].setProperty(hmUI.prop.TEXT, mm)
      }
    }

    const weekIndex = this.timeSensor.week
    if (this.weekdayTextWidget) {
      const t = this.currentThemeIndex
      this.weekdayTextWidget.setProperty(hmUI.prop.SRC, 'w_' + t + '_week_' + weekIndex + '.png')
    }

    const day = this.timeSensor.day
    const monthIndex = this.timeSensor.month
    if (this.monthWidget) {
      const t = this.currentThemeIndex
      this.monthWidget.setProperty(hmUI.prop.SRC, 'mon_' + t + '_month_' + monthIndex + '.png')
    }
    if (this.dayWidgets) {
      const dd = day < 10 ? '0' + day : '' + day
      for (let i = 0; i < THEMES.length; i++) {
        if (this.dayWidgets[i]) this.dayWidgets[i].setProperty(hmUI.prop.TEXT, dd)
      }
    }
  },
${helperUpdateFunctions}
  onDestroy() {
    console.log('index page.js on destroy invoke')
    if (this.timeTimer) {
      timer.stopTimer(this.timeTimer)
      this.timeTimer = null
    }
  }
})`
}

function generateAodJs(config) {
  const widgetsList = config.widgets || [];
  let buildWidgets = '';

  widgetsList.forEach(w => {
    if (w.type === 'NONE') return;

    if (w.type === 'HOUR') {
      buildWidgets += `
    // Hour Widgets (AOD - one per theme)
    this.hourTextWidgets = []
    for (let i = 0; i < THEMES.length; i++) {
      this.hourTextWidgets.push(hmUI.createWidget(hmUI.widget.TEXT_IMG, {
        x: ${w.x},
        y: ${w.y - 14},
        w: 180,
        h: 130,
        font_array: [
          'h_' + i + '_0.png', 'h_' + i + '_1.png', 'h_' + i + '_2.png', 'h_' + i + '_3.png', 'h_' + i + '_4.png',
          'h_' + i + '_5.png', 'h_' + i + '_6.png', 'h_' + i + '_7.png', 'h_' + i + '_8.png', 'h_' + i + '_9.png'
        ],
        h_space: 2,
        text: '00'
      }))
    }
      `;
    } else if (w.type === 'MINUTE') {
      buildWidgets += `
    // Minute Widgets (AOD - one per theme)
    this.minuteTextWidgets = []
    for (let i = 0; i < THEMES.length; i++) {
      this.minuteTextWidgets.push(hmUI.createWidget(hmUI.widget.TEXT_IMG, {
        x: ${w.x},
        y: ${w.y - 14},
        w: 180,
        h: 130,
        font_array: [
          'm_' + i + '_0.png', 'm_' + i + '_1.png', 'm_' + i + '_2.png', 'm_' + i + '_3.png', 'm_' + i + '_4.png',
          'm_' + i + '_5.png', 'm_' + i + '_6.png', 'm_' + i + '_7.png', 'm_' + i + '_8.png', 'm_' + i + '_9.png'
        ],
        h_space: 2,
        text: '00'
      }))
    }
      `;
    } else if (w.type === 'DIVIDER') {
      buildWidgets += `
    // Divider Accent Line (AOD)
    this.centerLineWidget = hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: ${w.x},
      y: ${w.y},
      w: ${w.w || 2},
      h: ${w.h || 320},
      color: 0x4a4e5d
    })
      `;
    }
  });

  return `const THEMES = [
  {
    line: ${config.lineColor.replace('#', '0x')},
    minute: ${config.minuteColor.replace('#', '0x')},
    steps: ${config.stepsColor.replace('#', '0x')}
  },
  {
    line: 0xff7b90,    // Strawberry Yogurt
    minute: 0xfff0f2,
    steps: 0xff7b90
  },
  {
    line: 0x7cd1a1,    // Mint Pistachio
    minute: 0xf0faf4,
    steps: 0x7cd1a1
  },
  {
    line: 0x8f9eff,    // Blueberry Lavender
    minute: 0xf2f4ff,
    steps: 0x8f9eff
  },
  {
    line: 0xffd670,    // Banana Cream
    minute: 0xfffcf2,
    steps: 0xffd670
  },
  {
    line: 0xff9e7d,    // Soft Peach Melba
    minute: 0xfff5f2,
    steps: 0xff9e7d
  }
]

WatchFace({
  onInit() {
    console.log('aod page.js on init invoke')
    this.timeSensor = hmSensor.createSensor(hmSensor.id.TIME)
    this.currentThemeIndex = ${config.themeIndex}
    try {
      this.currentThemeIndex = hmFS.SysProGetInt('theme_idx') !== undefined ? hmFS.SysProGetInt('theme_idx') : ${config.themeIndex}
      if (this.currentThemeIndex < 0 || this.currentThemeIndex >= THEMES.length) {
        this.currentThemeIndex = ${config.themeIndex}
      }
    } catch (e) {
      console.log('Read theme index failed', e)
    }
  },

  build() {
    console.log('aod page.js on build invoke')
    
    // Outer boundary ring
    hmUI.createWidget(hmUI.widget.ARC, {
      x: 12,
      y: 12,
      w: 430,
      h: 430,
      start_angle: 0,
      end_angle: 360,
      color: 0x11131a,
      line_width: 1
    })

${buildWidgets}
    this.applyThemeColors()
    this.updateTime()
    this.setupListeners()
  },

  setupListeners() {
    const updateTimeCb = () => this.updateTime()
    // Timer updates every 60 seconds inside AOD mode to conserve battery
    this.timeTimer = timer.createTimer(0, 60000, updateTimeCb)

    hmUI.createWidget(hmUI.widget.WIDGET_DELEGATE, {
      resume_call: () => {
        if (!this.timeTimer) {
          this.timeTimer = timer.createTimer(0, 60000, updateTimeCb)
        }
        this.applyThemeColors()
        this.updateTime()
      },
      pause_call: () => {
        if (this.timeTimer) {
          timer.stopTimer(this.timeTimer)
          this.timeTimer = null
        }
      }
    })
  },

  applyThemeColors() {
    const t = this.currentThemeIndex
    const theme = THEMES[t]
    
    for (let i = 0; i < THEMES.length; i++) {
      const visible = (i === t)
      if (this.hourTextWidgets && this.hourTextWidgets[i]) this.hourTextWidgets[i].setProperty(hmUI.prop.VISIBLE, visible)
      if (this.minuteTextWidgets && this.minuteTextWidgets[i]) this.minuteTextWidgets[i].setProperty(hmUI.prop.VISIBLE, visible)
    }

    if (this.centerLineWidget) {
      this.centerLineWidget.setProperty(hmUI.prop.COLOR, theme.line)
    }
  },

  updateTime() {
    const hour = this.timeSensor.hour
    const minute = this.timeSensor.minute
    
    const hh = hour < 10 ? '0' + hour : '' + hour
    const mm = minute < 10 ? '0' + minute : '' + minute

    if (this.hourTextWidgets) {
      for (let i = 0; i < THEMES.length; i++) {
        if (this.hourTextWidgets[i]) this.hourTextWidgets[i].setProperty(hmUI.prop.TEXT, hh)
      }
    }
    if (this.minuteTextWidgets) {
      for (let i = 0; i < THEMES.length; i++) {
        if (this.minuteTextWidgets[i]) this.minuteTextWidgets[i].setProperty(hmUI.prop.TEXT, mm)
      }
    }
  },

  onDestroy() {
    console.log('aod page.js on destroy invoke')
    if (this.timeTimer) {
      timer.stopTimer(this.timeTimer)
      this.timeTimer = null
    }
  }
})`
}

async function generateAllFontAssets(config) {
  const fontFilename = FONT_FILENAMES[config.fontFamily] || 'Outfit-ExtraBold.ttf';
  const fontPath = path.join(__dirname, 'test_wf', 'assets', 'fonts', fontFilename);
  
  if (!fs.existsSync(fontPath)) {
    await downloadFont(config.fontFamily);
  }

  const PImage = require('pureimage');
  const fontName = `Font_${Date.now()}`;
  const font = PImage.registerFont(fontPath, fontName);
  font.loadSync();

  const assetsDir = path.join(__dirname, 'test_wf', 'assets', '454x454-amazfit-gtr-3');

  const renderDigits = async (prefixName, size, colorHex) => {
    const fontSize = Math.round(size * 0.9);
    
    // Create a temporary canvas/context to measure character widths
    const tempImg = PImage.make(1, 1);
    const tempCtx = tempImg.getContext('2d');
    tempCtx.font = `${fontSize}pt ${fontName}`;

    for (let i = 0; i <= 9; i++) {
      const charStr = i.toString();
      const metrics = PImage.measureText(tempCtx, charStr);
      
      const paddingX = 4; // Add 4px padding (2 on each side) to prevent clipping
      const canvasW = Math.ceil(metrics.width) + paddingX;
      const canvasH = Math.round(size * 1.3);
      const baselineY = Math.round(size * 1.05);
      const startX = Math.round(paddingX / 2);

      const img = PImage.make(canvasW, canvasH);
      img.data.fill(0); // Clear to fully transparent
      const ctx = img.getContext('2d');
      ctx.fillStyle = colorHex;
      ctx.font = `${fontSize}pt ${fontName}`;
      ctx.fillText(charStr, startX, baselineY);

      const filePath = path.join(assetsDir, `${prefixName}_${i}.png`);
      await PImage.encodePNGToStream(img, fs.createWriteStream(filePath));
    }
  };

  const renderWords = async (prefixName, size, colorHex, words, prefix) => {
    // Words canvas needs to be wider to contain 3-letter strings
    const canvasW = Math.round(size * 3.0);
    const canvasH = Math.round(size * 1.4);
    const fontSize = Math.round(size * 0.9);
    const baselineY = Math.round(size * 1.1);
    const startX = Math.round(size * 0.1);

    for (let i = 0; i < words.length; i++) {
      const img = PImage.make(canvasW, canvasH);
      img.data.fill(0); // Clear to fully transparent
      const ctx = img.getContext('2d');
      ctx.fillStyle = colorHex;
      ctx.font = `${fontSize}pt ${fontName}`;
      ctx.fillText(words[i], startX, baselineY);

      const filePath = path.join(assetsDir, `${prefixName}_${prefix}_${i + 1}.png`);
      await PImage.encodePNGToStream(img, fs.createWriteStream(filePath));
    }
  };

  const drawHeartPng = async (t, colorHex) => {
    const size = 24;
    const img = PImage.make(size, size);
    img.data.fill(0); // Clear to fully transparent
    const ctx = img.getContext('2d');
    
    // Draw beautiful filled heart shape
    ctx.fillStyle = colorHex;
    ctx.beginPath();
    ctx.moveTo(12, 6);
    ctx.bezierCurveTo(9, 2, 2, 2, 2, 8.5);
    ctx.bezierCurveTo(2, 13.5, 9, 18, 12, 21.5);
    ctx.bezierCurveTo(15, 18, 22, 13.5, 22, 8.5);
    ctx.bezierCurveTo(22, 2, 15, 2, 12, 6);
    ctx.fill();

    const filePath = path.join(assetsDir, `heart_${t}.png`);
    await PImage.encodePNGToStream(img, fs.createWriteStream(filePath));
  };

  const drawStepPng = async (t, colorHex) => {
    const size = 24;
    const img = PImage.make(size, size);
    img.data.fill(0); // Clear to fully transparent
    const ctx = img.getContext('2d');
    ctx.fillStyle = colorHex;
    
    // Left footprint
    ctx.beginPath();
    ctx.arc(8, 17, 2.5, 0, Math.PI * 2);
    ctx.arc(7, 10, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4, 5, 0.8, 0, Math.PI * 2);
    ctx.arc(6, 4, 1.0, 0, Math.PI * 2);
    ctx.arc(8.5, 4.2, 1.0, 0, Math.PI * 2);
    ctx.arc(10.5, 5.2, 0.8, 0, Math.PI * 2);
    ctx.arc(12, 6.7, 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Right footprint
    ctx.beginPath();
    ctx.arc(16, 13, 2.5, 0, Math.PI * 2);
    ctx.arc(17, 6, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(14, 2, 0.8, 0, Math.PI * 2);
    ctx.arc(16, 1, 1.0, 0, Math.PI * 2);
    ctx.arc(18.5, 1.2, 1.0, 0, Math.PI * 2);
    ctx.arc(20.5, 2.2, 0.8, 0, Math.PI * 2);
    ctx.arc(22, 3.7, 0.6, 0, Math.PI * 2);
    ctx.fill();

    const filePath = path.join(assetsDir, `step_${t}.png`);
    await PImage.encodePNGToStream(img, fs.createWriteStream(filePath));
  };

  const widgetsList = config.widgets || [];

  // Loop through all 6 theme presets to pre-generate all asset colors
  for (let t = 0; t < 6; t++) {
    const activePreset = PRESETS[t];
    const primaryColor = activePreset.primary;
    const secondaryColor = activePreset.secondary;

    for (const w of widgetsList) {
      if (w.type === 'NONE') continue;

      // Rule: Icon is primary theme color; Text is secondary theme color (unless custom color selected)
      const isComplication = ['BATTERY', 'STEP', 'HEART', 'CAL', 'DISTANCE', 'WEEKDAY', 'DATE'].includes(w.type);
      const isCustomColor = w.color === 'custom';
      
      let textColorHex = secondaryColor;
      if (isCustomColor) {
        textColorHex = w.customColor || '#ffffff';
      } else if (w.type === 'HOUR') {
        textColorHex = primaryColor;
      }
      
      if (!textColorHex.startsWith('#')) textColorHex = '#' + textColorHex;

      const iconColorHex = isCustomColor ? (w.customColor || '#ffffff') : primaryColor;

      if (w.type === 'HOUR') {
        await renderDigits(`h_${t}`, w.size, textColorHex);
      } else if (w.type === 'MINUTE') {
        await renderDigits(`m_${t}`, w.size, textColorHex);
      } else if (w.type === 'BATTERY') {
        await renderDigits(`b_${t}`, w.size, textColorHex);
      } else if (w.type === 'STEP') {
        await drawStepPng(t, iconColorHex);
        await renderDigits(`s_${t}`, w.size, textColorHex);
      } else if (w.type === 'HEART') {
        await drawHeartPng(t, iconColorHex);
        await renderDigits(`hr_${t}`, w.size, textColorHex);
      } else if (w.type === 'CAL') {
        await renderDigits(`c_${t}`, w.size, textColorHex);
      } else if (w.type === 'DISTANCE') {
        await renderDigits(`d_${t}`, w.size, textColorHex);
      } else if (w.type === 'WEEKDAY') {
        const WEEK_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
        await renderWords(`w_${t}`, w.size, textColorHex, WEEK_DAYS, 'week');
      } else if (w.type === 'DATE') {
        const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        await renderWords(`mon_${t}`, w.size, textColorHex, MONTH_NAMES, 'month');
        await renderDigits(`dt_${t}`, w.size, textColorHex);
      }
    }
  }
}

app.listen(PORT, () => {
  console.log(`Watchface Theme Editor Server running on http://localhost:${PORT}`);
});
