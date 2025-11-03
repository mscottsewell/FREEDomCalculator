# Icon Generation Instructions

## Current Setup

The PWA icons are located in the `public/` folder:
- `icon.svg` - Vector icon (scalable)
- `icon-192.png` - 192x192 Android icon (placeholder)
- `icon-512.png` - 512x512 Android/PWA icon (placeholder)
- `apple-touch-icon.png` - 180x180 iOS icon (placeholder)

## To Generate Actual PNG Icons

You have several options to convert the SVG to proper PNG files:

### Option 1: Online Tools (Easiest)
1. Open https://svgtopng.com or https://cloudconvert.com/svg-to-png
2. Upload `public/icon.svg`
3. Generate PNGs at these sizes:
   - 192x192 → save as `icon-192.png`
   - 512x512 → save as `icon-512.png`
   - 180x180 → save as `apple-touch-icon.png`
4. Replace the placeholder files in `public/` folder

### Option 2: Using Figma/Sketch/Adobe XD
1. Import `icon.svg`
2. Export as PNG at required sizes
3. Replace placeholder files

### Option 3: Command Line (Requires ImageMagick)
```bash
# Install ImageMagick first
# Windows: choco install imagemagick
# Mac: brew install imagemagick

cd public
magick icon.svg -resize 192x192 icon-192.png
magick icon.svg -resize 512x512 icon-512.png
magick icon.svg -resize 180x180 apple-touch-icon.png
```

### Option 4: Use PWA Asset Generator (NPM)
```bash
npm install -g pwa-asset-generator

# Generate all sizes from SVG
pwa-asset-generator public/icon.svg public/ --icon-only --background "#4f46e5"
```

## Custom Icon Design

If you want to create a custom icon instead:
1. Design your icon (512x512 or larger)
2. Save as SVG for `icon.svg`
3. Generate PNGs at required sizes
4. Ensure icon works on both light and dark backgrounds

## Icon Requirements

- **Format**: PNG with transparency (or solid background)
- **Safe Zone**: Keep important elements in center 80%
- **Aspect Ratio**: Square (1:1)
- **Background**: Transparent or solid color
- **Colors**: Should match app theme (#4f46e5)

The current SVG icon features a calculator design that will work well once converted to PNG.
