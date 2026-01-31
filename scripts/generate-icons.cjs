
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '../public/logoApp.png');
const outputDir = path.join(__dirname, '../public/icons');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  try {
    // 192x192
    await sharp(inputFile)
      .resize(192, 192)
      .toFile(path.join(outputDir, 'icon-192x192.png'));
    console.log('✅ Generated icon-192x192.png');

    // 512x512
    await sharp(inputFile)
      .resize(512, 512)
      .toFile(path.join(outputDir, 'icon-512x512.png'));
    console.log('✅ Generated icon-512x512.png');
    
    // 180x180 (Apple Touch Icon)
    await sharp(inputFile)
      .resize(180, 180)
      .toFile(path.join(outputDir, 'apple-touch-icon.png'));
    console.log('✅ Generated apple-touch-icon.png');

  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons();
