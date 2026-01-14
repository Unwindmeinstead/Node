const fs = require('fs');
const path = require('path');

// Icon sizes used by the app / manifest
const sizes = [16, 32, 64, 128, 256, 512];
const outputDir = path.join(__dirname);
const svgPath = path.join(__dirname, 'icon.svg');

// Read SVG file
const svgContent = fs.readFileSync(svgPath, 'utf8');

// Try to use svg2img if available, otherwise provide instructions
try {
  const svg2img = require('svg2img');
  
  // Convert SVG to PNG for each size as icon<size>.png
  sizes.forEach(size => {
    svg2img(svgContent, { width: size, height: size }, (error, buffer) => {
      if (error) {
        console.error(`Error converting ${size}x${size}:`, error);
        return;
      }
      
      const outputPath = path.join(outputDir, `icon${size}.png`);
      fs.writeFileSync(outputPath, buffer);
      console.log(`Created ${outputPath}`);
    });
  });

} catch (e) {
  console.log('svg2img not available. To generate PNG icons:');
  console.log('1. Install dependencies: npm install svg2img canvas');
  console.log('2. Run this script again: node create-icons.js');
  console.log('\nAlternatively, use an online SVG to PNG converter to create:');
  sizes.forEach(size => {
    console.log(`  - icon${size}.png (${size}x${size})`);
  });
}
