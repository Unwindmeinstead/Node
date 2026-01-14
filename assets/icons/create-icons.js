const fs = require('fs');
const path = require('path');

// PWA icon sizes
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const outputDir = path.join(__dirname);
const svgPath = path.join(__dirname, 'icon.svg');

// Read SVG file
const svgContent = fs.readFileSync(svgPath, 'utf8');

// Try to use svg2img if available, otherwise provide instructions
try {
  const svg2img = require('svg2img');
  
  // Convert SVG to PNG for each size
  sizes.forEach(size => {
    svg2img(svgContent, { width: size, height: size }, (error, buffer) => {
      if (error) {
        console.error(`Error converting ${size}x${size}:`, error);
        return;
      }
      
      const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
      fs.writeFileSync(outputPath, buffer);
      console.log(`Created ${outputPath}`);
    });
  });
  
  // Create apple-touch-icon (180x180)
  svg2img(svgContent, { width: 180, height: 180 }, (error, buffer) => {
    if (error) {
      console.error('Error creating apple-touch-icon:', error);
      return;
    }
    
    const outputPath = path.join(outputDir, 'apple-touch-icon.png');
    fs.writeFileSync(outputPath, buffer);
    console.log(`Created ${outputPath}`);
  });
  
  // Create favicon.ico equivalent (32x32)
  svg2img(svgContent, { width: 32, height: 32 }, (error, buffer) => {
    if (error) {
      console.error('Error creating favicon:', error);
      return;
    }
    
    const outputPath = path.join(outputDir, 'favicon-32x32.png');
    fs.writeFileSync(outputPath, buffer);
    console.log(`Created ${outputPath}`);
  });

} catch (e) {
  console.log('svg2img not available. To generate PNG icons:');
  console.log('1. Install dependencies: npm install svg2img canvas');
  console.log('2. Run this script again: node create-icons.js');
  console.log('\nAlternatively, use an online SVG to PNG converter to create:');
  sizes.forEach(size => {
    console.log(`  - icon-${size}x${size}.png`);
  });
  console.log('  - apple-touch-icon.png (180x180)');
  console.log('  - favicon-32x32.png');
}
