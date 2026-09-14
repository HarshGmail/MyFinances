/* eslint-disable @typescript-eslint/no-require-imports */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SOURCE_LOGO = path.resolve('./public/logo.png');
const OUTPUT_DIR = path.resolve('./public/icons');

const ICON_BACKGROUND = { r: 255, g: 255, b: 255, alpha: 1 };
const MASKABLE_CONTENT_RATIO = 0.6;
const APPLE_CONTENT_RATIO = 0.82;

async function renderIcon({ fileName, size, contentRatio }) {
  const contentSize = Math.round(size * contentRatio);
  const logo = await sharp(SOURCE_LOGO)
    .trim({ threshold: 1 })
    .resize(contentSize, contentSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();

  await sharp({
    create: { width: size, height: size, channels: 4, background: ICON_BACKGROUND },
  })
    .composite([{ input: logo, gravity: 'centre' }])
    .flatten({ background: ICON_BACKGROUND })
    .removeAlpha()
    .png()
    .toFile(path.join(OUTPUT_DIR, fileName));

  return fileName;
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const icons = [
    { fileName: 'icon-192.png', size: 192, contentRatio: APPLE_CONTENT_RATIO },
    { fileName: 'icon-512.png', size: 512, contentRatio: APPLE_CONTENT_RATIO },
    { fileName: 'icon-192-maskable.png', size: 192, contentRatio: MASKABLE_CONTENT_RATIO },
    { fileName: 'icon-512-maskable.png', size: 512, contentRatio: MASKABLE_CONTENT_RATIO },
    { fileName: 'apple-touch-icon.png', size: 180, contentRatio: APPLE_CONTENT_RATIO },
  ];

  for (const icon of icons) {
    const written = await renderIcon(icon);
    console.log(`generated public/icons/${written}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
