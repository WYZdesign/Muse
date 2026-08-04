const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const ICONS_DIR = path.join(PUBLIC_DIR, 'icons');

const ICON_SPECS = [
  { name: 'muse-192.png', size: 192 },
  { name: 'muse-512.png', size: 512 },
  { name: 'icon-512x512.png', size: 512 },
];

const SOURCE_ICON = path.join(PUBLIC_DIR, 'muse-icon.png');
const BG_COLOR = '#0a0612';

async function generateIcon({ name, size }) {
  const img = await loadImage(SOURCE_ICON);
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, size, size);

  const iconSize = Math.floor(size * 0.85);
  const x = (size - iconSize) / 2;
  const y = (size - iconSize) / 2;
  ctx.drawImage(img, x, y, iconSize, iconSize);

  const outPath = path.join(ICONS_DIR, name);
  fs.mkdirSync(ICONS_DIR, { recursive: true });
  fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
  console.log(`Generated ${name} (${size}x${size})`);
}

async function main() {
  for (const spec of ICON_SPECS) {
    await generateIcon(spec);
  }
  console.log('All PWA icons generated with solid background!');
}

main().catch(console.error);