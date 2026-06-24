const sharp = require('c:/Project/ahizan/Storefront/node_modules/sharp');
const path = require('path');
const fs = require('fs');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function resizeIcons(srcPath, destDir, prefix = '') {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  for (const size of sizes) {
    const filename = `${prefix}icon-${size}x${size}.png`;
    const dest = path.join(destDir, filename);
    await sharp(srcPath)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(dest);
    console.log(`Created: ${dest}`);
  }
}

async function main() {
  // Storefront icons
  await resizeIcons(
    'c:/Project/ahizan/Storefront/recom/03.png',
    'c:/Project/ahizan/Storefront/public/icons',
    ''
  );

  // Seller icons
  await resizeIcons(
    'c:/Project/ahizan/seller/recom/03.png',
    'c:/Project/ahizan/seller/public/icons',
    'seller-'
  );

  console.log('All PWA icons generated successfully!');
}

main().catch(console.error);
