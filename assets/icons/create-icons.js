const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const svg2img = require('svg2img');

const sizes = [16, 32, 64, 128, 256, 512];
const outputDir = path.join(__dirname);
const svgPath = path.join(__dirname, 'icon.svg');

// Read SVG file
const svgContent = fs.readFileSync(svgPath, 'utf8');

// Convert SVG to PNG for each size
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

// Also create icon.png (512px) for main icon reference
svg2img(svgContent, { width: 512, height: 512 }, (error, buffer) => {
  if (error) {
    console.error('Error creating main icon:', error);
    return;
  }
  
  const outputPath = path.join(outputDir, 'icon.png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Created ${outputPath}`);
}); 