const PImage = require('pureimage');
const fs = require('fs');
const path = require('path');

const fontPath = path.join(__dirname, 'test_wf', 'assets', 'fonts', 'Outfit-ExtraBold.ttf');

console.log('Loading font from:', fontPath);

if (!fs.existsSync(fontPath)) {
  console.error('Font file does not exist!');
  process.exit(1);
}

const font = PImage.registerFont(fontPath, 'Outfit');
font.loadSync();
console.log('Font loaded successfully!');

const img = PImage.make(100, 100);
const ctx = img.getContext('2d');
ctx.fillStyle = '#ff5a36';
ctx.font = "80pt 'Outfit'";
ctx.fillText('0', 10, 80);

const outPath = path.join(__dirname, 'out_char.png');
PImage.encodePNGToStream(img, fs.createWriteStream(outPath))
  .then(() => {
    console.log('Successfully wrote character image to:', outPath);
  })
  .catch(err => {
    console.error('Failed to write image:', err);
  });
