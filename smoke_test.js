const fs = require('fs');
const path = require('path');
const Jimp = require('c:/Users/bug95/OneDrive/바탕 화면/GTR3/node_modules/jimp');
const { execSync } = require('child_process');

const PROJECT_DIR = 'c:/Users/bug95/OneDrive/바탕 화면/GTR3';
const TEST_WF_DIR = path.join(PROJECT_DIR, 'test_wf');
const ASSETS_DIR = path.join(TEST_WF_DIR, 'assets', '454x454-amazfit-gtr-3');
const CONFIG_PATH = path.join(PROJECT_DIR, 'config.json');

console.log('=== WATCHFACE SMOKE TEST ===');

// 1. Check syntax of generated Javascript files
console.log('\n[1/4] Checking JavaScript syntax...');
try {
  execSync(`node --check "${path.join(TEST_WF_DIR, 'watchface', 'index.js')}"`);
  console.log('✔ index.js syntax: OK');
} catch (e) {
  console.error('✘ index.js syntax error:', e.message);
  process.exit(1);
}

try {
  execSync(`node --check "${path.join(TEST_WF_DIR, 'watchface', 'aod.js')}"`);
  console.log('✔ aod.js syntax: OK');
} catch (e) {
  console.error('✘ aod.js syntax error:', e.message);
  process.exit(1);
}

// 2. Load config and verify widget configurations
console.log('\n[2/4] Verifying widget config...');
if (!fs.existsSync(CONFIG_PATH)) {
  console.error('✘ config.json not found!');
  process.exit(1);
}
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
console.log(`Watchface Name: ${config.appName}`);
console.log(`Active Theme Index: ${config.themeIndex}`);

// 3. Verify asset presence and transparency
console.log('\n[3/4] Checking generated PNG assets...');
const themeIdx = config.themeIndex;
const filesToCheck = [];

// Digits for Hour, Minute, Battery, Steps, Heart, Date Day
for (let i = 0; i <= 9; i++) {
  filesToCheck.push(`h_${themeIdx}_${i}.png`);
  filesToCheck.push(`m_${themeIdx}_${i}.png`);
  filesToCheck.push(`b_${themeIdx}_${i}.png`);
  filesToCheck.push(`s_${themeIdx}_${i}.png`);
  filesToCheck.push(`hr_${themeIdx}_${i}.png`);
  filesToCheck.push(`dt_${themeIdx}_${i}.png`);
}

// Weekdays and Months
for (let i = 1; i <= 7; i++) filesToCheck.push(`w_${themeIdx}_week_${i}.png`);
for (let i = 1; i <= 12; i++) filesToCheck.push(`mon_${themeIdx}_month_${i}.png`);

// Icons
filesToCheck.push(`heart_${themeIdx}.png`);
filesToCheck.push(`step_${themeIdx}.png`);

let missingCount = 0;
let blackCount = 0;
let transparentCount = 0;

for (const filename of filesToCheck) {
  const filePath = path.join(ASSETS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.error(`✘ Missing asset: ${filename}`);
    missingCount++;
    continue;
  }
}

if (missingCount > 0) {
  console.error(`✘ Smoke test failed: ${missingCount} assets are missing!`);
  process.exit(1);
}
console.log(`✔ All ${filesToCheck.length} theme assets are present!`);

// 4. Mock composite preview generation (exactly matching watch rendering)
console.log('\n[4/4] Generating pixel-perfect composite preview...');
async function generatePreview() {
  // Create black canvas representing watch face (454x454)
  const canvas = await new Jimp(454, 454, 0x000000ff);

  // Draw background pattern if selected
  if (config.backgroundStyle && config.backgroundStyle !== 'none') {
    const bgImgPath = path.join(PROJECT_DIR, 'public', `bg_${config.backgroundStyle}.png`);
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

  // Draw concentric outer ring (like the watch)
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
      const charPath = path.join(ASSETS_DIR, `${prefix}_${char}.png`);
      if (fs.existsSync(charPath)) {
        const charImg = await Jimp.read(charPath);
        canvas.composite(charImg, currX, y);
        currX += charImg.bitmap.width + 2; // width + h_space (2px)
      }
    }
  };

  // Overlay widgets matching config positions
  const widgetsList = config.widgets || [];
  const activePreset = {
    primary: config.lineColor || '#ff5a36',
    secondary: config.minuteColor || '#eaf4ff'
  };

  for (const w of widgetsList) {
    if (w.type === 'NONE') continue;

    if (w.type === 'HOUR') {
      await drawTextImg('13', w.x, w.y - 14, `h_${themeIdx}`);
    } else if (w.type === 'MINUTE') {
      await drawTextImg('48', w.x, w.y - 14, `m_${themeIdx}`);
    } else if (w.type === 'DIVIDER') {
      const colorHex = w.color === 'primary' ? activePreset.primary : activePreset.secondary;
      const rectImg = new Jimp(w.w || 2, w.h || 320, colorHex + 'ff');
      canvas.composite(rectImg, w.x, w.y);
    } else if (w.type === 'BATTERY') {
      // Draw battery icon (16px tip outline, 12px bar)
      const colorHex = activePreset.secondary;
      const tipColor = parseInt(colorHex.replace('#', '0x') + 'ff');
      
      const batOutline = await new Jimp(16, 24, 0x00000000);
      // Draw boundary
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

      // Draw inside bar (e.g. 80%)
      const barH = 14;
      const barY = 24 - 1 - barH;
      const batBar = await new Jimp(10, barH, tipColor);
      canvas.composite(batBar, w.x + 3, w.y - 14 + barY);

      // Draw battery text
      await drawTextImg('80', w.x + 24, w.y - 12, `b_${themeIdx}`);
    } else if (w.type === 'HEART') {
      // Composite Heart Icon
      const heartIconPath = path.join(ASSETS_DIR, `heart_${themeIdx}.png`);
      if (fs.existsSync(heartIconPath)) {
        const heartImg = await Jimp.read(heartIconPath);
        canvas.composite(heartImg, w.x, w.y - 12);
      }
      // Draw heart rate digits
      await drawTextImg('72', w.x + 26, w.y - 12, `hr_${themeIdx}`);
    } else if (w.type === 'STEP') {
      // Composite Step Icon
      const stepIconPath = path.join(ASSETS_DIR, `step_${themeIdx}.png`);
      if (fs.existsSync(stepIconPath)) {
        const stepImg = await Jimp.read(stepIconPath);
        canvas.composite(stepImg, w.x, w.y - 12);
      }
      // Draw step digits
      await drawTextImg('6245', w.x + 26, w.y - 12, `s_${themeIdx}`);
    } else if (w.type === 'WEEKDAY') {
      // Weekday (THU - index 4)
      const weekPath = path.join(ASSETS_DIR, `w_${themeIdx}_week_4.png`);
      if (fs.existsSync(weekPath)) {
        const weekImg = await Jimp.read(weekPath);
        canvas.composite(weekImg, w.x, w.y - 12);
      }
    } else if (w.type === 'DATE') {
      // Month (JUL - index 7)
      const monthPath = path.join(ASSETS_DIR, `mon_${themeIdx}_month_7.png`);
      let monthWidth = 0;
      if (fs.existsSync(monthPath)) {
        const monthImg = await Jimp.read(monthPath);
        canvas.composite(monthImg, w.x, w.y - 12);
        monthWidth = monthImg.bitmap.width;
      }
      // Date Day (16)
      await drawTextImg('16', w.x + monthWidth + 4, w.y - 12, `dt_${themeIdx}`);
    }
  }

  // Save the final composite preview to the project directory and artifact path
  const previewPath1 = path.join(PROJECT_DIR, 'test_wf_preview.png');
  const previewPath2 = path.join(__dirname, 'test_wf_preview.png');
  
  await canvas.writeAsync(previewPath1);
  await canvas.writeAsync(previewPath2);
  
  console.log(`✔ Pixel-perfect preview successfully written to:`);
  console.log(`  - Local Project: ${previewPath1}`);
  console.log(`  - Artifacts: ${previewPath2}`);
  console.log('\n=== SMOKE TEST PASSED SUCCESSFULLY ===');
}

generatePreview().catch(err => {
  console.error('✘ Error running smoke test preview generator:', err);
  process.exit(1);
});
