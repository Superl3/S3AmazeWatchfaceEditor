const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');

// 2x Supersampling Resolution (for perfect anti-aliasing on downscale)
const WIDTH = 908;
const HEIGHT = 908;
const COLOR_BLACK = 0x000000ff;
const COLOR_GREY = 0x4a5061ff; // Dominant, clearly visible dark grey
const COLOR_GREY_LIGHT = 0x5c6275ff; // Slightly lighter for accents

// Target Resolution
const TARGET_W = 454;
const TARGET_H = 454;

const assetsDir = path.join(__dirname, 'test_wf', 'assets', '454x454-amazfit-gtr-3');
const publicDir = path.join(__dirname, 'public');

if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

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

// 1. Tech Grid (Spacious: 120px grid at 2x)
async function generateGrid() {
  const img = await new Jimp(WIDTH, HEIGHT, COLOR_BLACK);
  const spacing = 120;
  for (let x = spacing; x < WIDTH; x += spacing) {
    drawLine(img, x, 0, x, HEIGHT, COLOR_GREY, 3);
  }
  for (let y = spacing; y < HEIGHT; y += spacing) {
    drawLine(img, 0, y, WIDTH, y, COLOR_GREY, 3);
  }
  return img;
}

// 2. Concentric Radar Circles (Spacious: 100px spacing at 2x)
async function generateRadar() {
  const img = await new Jimp(WIDTH, HEIGHT, COLOR_BLACK);
  const spacing = 100;
  const xc = WIDTH / 2;
  const yc = HEIGHT / 2;
  
  for (let r = spacing; r < 460; r += spacing) {
    drawCircle(img, xc, yc, r, COLOR_GREY, 3);
  }
  
  drawLine(img, xc, 40, xc, HEIGHT - 40, COLOR_GREY, 3);
  drawLine(img, 40, yc, WIDTH - 40, yc, COLOR_GREY, 3);
  
  return img;
}

// 3. Dot Matrix Pattern (Dense: 48px spacing at 2x, smaller 4x4 dots)
async function generateDots() {
  const img = await new Jimp(WIDTH, HEIGHT, COLOR_BLACK);
  const spacing = 48;
  for (let x = spacing; x < WIDTH; x += spacing) {
    for (let y = spacing; y < HEIGHT; y += spacing) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const px = x + dx;
          const py = y + dy;
          if (px >= 0 && px < WIDTH && py >= 0 && py < HEIGHT) {
            img.setPixelColor(COLOR_GREY, px, py);
          }
        }
      }
    }
  }
  return img;
}

// 4. Luxury Damask Wallpaper (Spacious: large ornate rose curve)
async function generateFloral() {
  const img = await new Jimp(WIDTH, HEIGHT, COLOR_BLACK);
  const xc = WIDTH / 2;
  const yc = HEIGHT / 2;
  
  const drawMotif = (cx, cy) => {
    const step = 0.01;
    for (let theta = 0; theta < 2 * Math.PI; theta += step) {
      const r = 100 * Math.cos(4 * theta);
      const x = Math.round(cx + r * Math.cos(theta));
      const y = Math.round(cy + r * Math.sin(theta));
      
      for (let ox = -2; ox <= 2; ox++) {
        for (let oy = -2; oy <= 2; oy++) {
          img.setPixelColor(COLOR_GREY_LIGHT, x + ox, y + oy);
        }
      }
    }
    drawCircle(img, cx, cy, 120, COLOR_GREY, 3);
  };

  drawMotif(xc, yc);
  drawMotif(160, 160);
  drawMotif(WIDTH - 160, 160);
  drawMotif(160, HEIGHT - 160);
  drawMotif(WIDTH - 160, HEIGHT - 160);

  return img;
}

// 5. Geometric Mandala (Spacious: bold centered mandala)
async function generateMandala() {
  const img = await new Jimp(WIDTH, HEIGHT, COLOR_BLACK);
  const xc = WIDTH / 2;
  const yc = HEIGHT / 2;

  drawCircle(img, xc, yc, 80, COLOR_GREY, 3);
  drawCircle(img, xc, yc, 180, COLOR_GREY, 3);
  drawCircle(img, xc, yc, 280, COLOR_GREY, 3);
  drawCircle(img, xc, yc, 380, COLOR_GREY, 3);

  for (let angle = 0; angle < 360; angle += 30) {
    const rad = angle * Math.PI / 180;
    const x0 = xc + 80 * Math.cos(rad);
    const y0 = yc + 80 * Math.sin(rad);
    const x1 = xc + 380 * Math.cos(rad);
    const y1 = yc + 380 * Math.sin(rad);
    drawLine(img, x0, y0, x1, y1, COLOR_GREY, 3);
  }

  return img;
}

// 6. Luxury Guilloché Waves (Dense: fine wavy dial pattern)
async function generateWaves() {
  const img = await new Jimp(WIDTH, HEIGHT, COLOR_BLACK);
  const spacing = 24; // Dense waves
  const amplitude = 8;
  const frequency = 0.04;

  for (let y = spacing; y < HEIGHT; y += spacing) {
    for (let x = 0; x < WIDTH; x++) {
      const dy = Math.round(amplitude * Math.sin(x * frequency));
      const py = y + dy;
      
      if (py >= 0 && py < HEIGHT) img.setPixelColor(COLOR_GREY, x, py);
      if (py + 1 >= 0 && py + 1 < HEIGHT) img.setPixelColor(COLOR_GREY, x, py + 1);
      if (py - 1 >= 0 && py - 1 < HEIGHT) img.setPixelColor(COLOR_GREY, x, py - 1);
    }
  }

  return img;
}

// 7. Carbon Fiber Weave (Dense Weave: fine premium watch strap style)
async function generateCarbon() {
  const img = await new Jimp(WIDTH, HEIGHT, COLOR_BLACK);
  const blockSize = 12; // Dense blocks
  
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
  return img;
}

// 8. Honeycomb Hex Mesh (Spacious Hexagons)
async function generateHoneycomb() {
  const img = await new Jimp(WIDTH, HEIGHT, COLOR_BLACK);
  const size = 50; 
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

  for (let x = -size; x < WIDTH + size; x += size * 3) {
    for (let y = -h; y < HEIGHT + h; y += h) {
      drawHex(x, y);
      drawHex(x + size * 1.5, y + h / 2);
    }
  }
  return img;
}

// 9. Guilloché Sunburst (Spacious: radiating rays)
async function generateSunburst() {
  const img = await new Jimp(WIDTH, HEIGHT, COLOR_BLACK);
  const xc = WIDTH / 2;
  const yc = HEIGHT / 2;

  for (let angle = 0; angle < 360; angle += 15) {
    const rad = angle * Math.PI / 180;
    const x1 = Math.round(xc + 440 * Math.cos(rad));
    const y1 = Math.round(yc + 440 * Math.sin(rad));
    drawLine(img, xc, yc, x1, y1, COLOR_GREY, 3);
  }
  return img;
}

// 10. Star Constellations (Spacious)
async function generateStars() {
  const img = await new Jimp(WIDTH, HEIGHT, COLOR_BLACK);
  
  const stars = [
    {x: 200, y: 240}, {x: 400, y: 160}, {x: 700, y: 220}, {x: 160, y: 480},
    {x: 460, y: 420}, {x: 760, y: 500}, {x: 300, y: 700}, {x: 600, y: 760},
    {x: 440, y: 620}, {x: 540, y: 300}, {x: 360, y: 560}, {x: 800, y: 720}
  ];

  stars.forEach(s => {
    for (let dx = -4; dx <= 4; dx++) {
      for (let dy = -4; dy <= 4; dy++) {
        img.setPixelColor(COLOR_GREY_LIGHT, s.x + dx, s.y + dy);
      }
    }
  });

  const connections = [
    [0, 1], [1, 9], [9, 2], [2, 5], [5, 4], [4, 8], [8, 10], [10, 6], [6, 7], [7, 11]
  ];
  connections.forEach(([i, j]) => {
    drawLine(img, stars[i].x, stars[i].y, stars[j].x, stars[j].y, COLOR_GREY, 3);
  });

  return img;
}

// 11. Electronic Circuitry (Spacious: clean cyberpunk layout)
async function generateCircuit() {
  const img = await new Jimp(WIDTH, HEIGHT, COLOR_BLACK);

  const drawNode = (x, y) => {
    for (let dx = -5; dx <= 5; dx++) {
      for (let dy = -5; dy <= 5; dy++) {
        img.setPixelColor(COLOR_GREY_LIGHT, x + dx, y + dy);
      }
    }
  };

  drawLine(img, 120, 200, 360, 200, COLOR_GREY, 4);
  drawLine(img, 360, 200, 454, 294, COLOR_GREY, 4);
  drawNode(120, 200);
  drawNode(454, 294);

  drawLine(img, 788, 200, 548, 200, COLOR_GREY, 4);
  drawLine(img, 548, 200, 454, 294, COLOR_GREY, 4);
  drawNode(788, 200);

  drawLine(img, 200, 708, 400, 708, COLOR_GREY, 4);
  drawLine(img, 400, 708, 454, 654, COLOR_GREY, 4);
  drawLine(img, 454, 654, 454, 480, COLOR_GREY, 4);
  drawNode(200, 708);
  drawNode(454, 480);

  drawLine(img, 708, 708, 508, 708, COLOR_GREY, 4);
  drawLine(img, 508, 708, 454, 654, COLOR_GREY, 4);
  drawNode(708, 708);

  return img;
}

// 12. Ornate Damask Wallpaper Motif (Spacious wallpaper motifs)
async function generateDamask() {
  const img = await new Jimp(WIDTH, HEIGHT, COLOR_BLACK);
  const xc = WIDTH / 2;
  const yc = HEIGHT / 2;

  const drawDamaskMotif = (cx, cy) => {
    const step = 0.01;
    for (let theta = 0; theta < 2 * Math.PI; theta += step) {
      const r = 90 * Math.sin(3 * theta);
      const x = Math.round(cx + r * Math.cos(theta));
      const y = Math.round(cy + r * Math.sin(theta));
      
      for (let ox = -2; ox <= 2; ox++) {
        for (let oy = -2; oy <= 2; oy++) {
          img.setPixelColor(COLOR_GREY_LIGHT, x + ox, y + oy);
        }
      }
    }

    const dist = 130;
    drawLine(img, cx, cy - dist, cx + dist, cy, COLOR_GREY, 3);
    drawLine(img, cx + dist, cy, cx, cy + dist, COLOR_GREY, 3);
    drawLine(img, cx, cy + dist, cx - dist, cy, COLOR_GREY, 3);
    drawLine(img, cx - dist, cy, cx, cy - dist, COLOR_GREY, 3);
  };

  drawDamaskMotif(xc, yc);
  drawDamaskMotif(200, 200);
  drawDamaskMotif(WIDTH - 200, 200);
  drawDamaskMotif(200, HEIGHT - 200);
  drawDamaskMotif(WIDTH - 200, HEIGHT - 200);

  return img;
}

// 13. Diagonal Hatching Lines (Dense Texture: 36px spacing at 2x)
async function generateHatch() {
  const img = await new Jimp(WIDTH, HEIGHT, COLOR_BLACK);
  const spacing = 36;

  for (let offset = -HEIGHT; offset < WIDTH; offset += spacing) {
    drawLine(img, offset, 0, offset + HEIGHT, HEIGHT, COLOR_GREY, 3);
  }
  return img;
}

// 14. Tuxedo Pinstripes (Dense Texture: 36px spacing vertical at 2x)
async function generatePinstripe() {
  const img = await new Jimp(WIDTH, HEIGHT, COLOR_BLACK);
  const spacing = 36;

  for (let x = spacing; x < WIDTH; x += spacing) {
    drawLine(img, x, 0, x, HEIGHT, COLOR_GREY, 3);
  }
  return img;
}

// 15. Geometric Poly Mesh (Spacious mesh)
async function generatePoly() {
  const img = await new Jimp(WIDTH, HEIGHT, COLOR_BLACK);
  
  const nodes = [
    {x: 120, y: 120}, {x: 454, y: 80}, {x: 788, y: 120},
    {x: 80, y: 454}, {x: 454, y: 454}, {x: 828, y: 454},
    {x: 120, y: 788}, {x: 454, y: 828}, {x: 788, y: 788}
  ];

  nodes.forEach(n => {
    for (let dx = -4; dx <= 4; dx++) {
      for (let dy = -4; dy <= 4; dy++) {
        img.setPixelColor(COLOR_GREY_LIGHT, n.x + dx, n.y + dy);
      }
    }
  });

  const lines = [
    [0, 1], [1, 2], [0, 3], [1, 4], [2, 5],
    [3, 4], [4, 5], [3, 6], [4, 7], [5, 8],
    [6, 7], [7, 8], [0, 4], [2, 4], [6, 4], [8, 4]
  ];

  lines.forEach(([i, j]) => {
    drawLine(img, nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y, COLOR_GREY, 3);
  });

  return img;
}

// Helper to save image with BICUBIC downscale anti-aliasing
async function savePattern(name, imgPromise) {
  try {
    const img = await imgPromise;
    
    // Bicubic downscale to target size (454x454) for automatic anti-aliasing!
    img.resize(TARGET_W, TARGET_H, Jimp.RESIZE_BICUBIC);
    
    const dest1 = path.join(assetsDir, `bg_${name}.png`);
    const dest2 = path.join(publicDir, `bg_${name}.png`);
    
    await img.writeAsync(dest1);
    await img.writeAsync(dest2);
    console.log(`Successfully generated and saved bg_${name}.png (with anti-aliasing)`);
  } catch (err) {
    console.error(`Failed to generate bg_${name}.png:`, err);
  }
}

async function run() {
  console.log('Generating anti-aliased patterns with Jimp (2x Supersampling)...');
  await savePattern('grid', generateGrid());
  await savePattern('radar', generateRadar());
  await savePattern('dots', generateDots());
  await savePattern('floral', generateFloral());
  await savePattern('mandala', generateMandala());
  await savePattern('waves', generateWaves());
  await savePattern('carbon', generateCarbon());
  await savePattern('honeycomb', generateHoneycomb());
  await savePattern('sunburst', generateSunburst());
  await savePattern('stars', generateStars());
  await savePattern('circuit', generateCircuit());
  await savePattern('damask', generateDamask());
  await savePattern('hatch', generateHatch());
  await savePattern('pinstripe', generatePinstripe());
  await savePattern('poly', generatePoly());
  console.log('All patterns generated successfully!');
}

run();
