import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import * as gifenc from 'gifenc';

const GIFEncoder = (gifenc as any).GIFEncoder || (gifenc as any).default?.GIFEncoder;
const quantize = (gifenc as any).quantize || (gifenc as any).default?.quantize;
const applyPalette = (gifenc as any).applyPalette || (gifenc as any).default?.applyPalette;

function getSvgFrame(angle1: number, angle2: number, glowScale: number, size = 160): string {
  // Center is 100, 100 on 200x200 canvas
  const glowAlpha = 0.5 + Math.sin(angle1 * Math.PI / 180) * 0.3;
  
  return `<svg width="${size}" height="${size}" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <!-- Background Radial Gradient -->
      <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#0B1D51" />
        <stop offset="65%" stop-color="#050B1E" />
        <stop offset="100%" stop-color="#020612" />
      </radialGradient>

      <!-- Neon Cyan Border Gradient -->
      <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#00F0FF" />
        <stop offset="50%" stop-color="#5DE2E7" />
        <stop offset="100%" stop-color="#0077FE" />
      </linearGradient>

      <!-- OTL Text Fill Gradient -->
      <linearGradient id="textGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#70F3FF" />
        <stop offset="50%" stop-color="#00D2FF" />
        <stop offset="100%" stop-color="#0088FF" />
      </linearGradient>

      <!-- Glow filter -->
      <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="3.5" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    <!-- Outer Glow Aura Background Disc -->
    <circle cx="100" cy="100" r="${92 * glowScale}" fill="none" stroke="#5DE2E7" stroke-width="4" stroke-opacity="${glowAlpha * 0.7}" filter="url(#glow)" />

    <!-- Main Outer Border Disc -->
    <circle cx="100" cy="100" r="92" fill="url(#bgGrad)" stroke="url(#borderGrad)" stroke-width="6.5" />

    <!-- Animated Orbiting Neon Particle Ring 1 (Rotating Clockwise) -->
    <circle cx="100" cy="100" r="85" stroke="#00F0FF" stroke-width="4" stroke-dasharray="24 110" stroke-linecap="round" fill="none" transform="rotate(${angle1}, 100, 100)" />

    <!-- Inner Accent Dashed Ring (Rotating Counter-Clockwise) -->
    <circle cx="100" cy="100" r="79" stroke="#5DE2E7" stroke-width="2" stroke-opacity="0.65" stroke-dasharray="6 4" fill="none" transform="rotate(${angle2}, 100, 100)" />

    <!-- Core Fine Line -->
    <circle cx="100" cy="100" r="73" stroke="#00D2FF" stroke-width="1.2" stroke-opacity="0.4" fill="none" />

    <!-- Center OTL Text -->
    <text x="100" y="119" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="900" fill="url(#textGrad)" text-anchor="middle" letter-spacing="2" filter="url(#glow)">OTL</text>
  </svg>`;
}

async function main() {
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  console.log('Generating crisp static logo PNG...');
  const staticSvg = getSvgFrame(45, -30, 1.03, 300);
  const staticPngBuffer = await sharp(Buffer.from(staticSvg)).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'otl-logo.png'), staticPngBuffer);
  console.log('Saved public/otl-logo.png (' + staticPngBuffer.length + ' bytes)');

  console.log('Generating animated GIF frames...');
  const totalFrames = 24;
  const fps = 15;
  const delay = Math.round(1000 / fps);
  const gifSize = 140;

  const gif = GIFEncoder();

  for (let i = 0; i < totalFrames; i++) {
    const angle1 = (i / totalFrames) * 360;
    const angle2 = -((i / totalFrames) * 360);
    const glowScale = 1.0 + Math.sin((i / totalFrames) * Math.PI * 2) * 0.04;

    const frameSvg = getSvgFrame(angle1, angle2, glowScale, gifSize);
    
    // Convert SVG to raw RGBA buffer using sharp
    const { data, info } = await sharp(Buffer.from(frameSvg))
      .resize(gifSize, gifSize)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Quantize palette (256 colors)
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);

    // Write frame to GIF
    gif.writeFrame(index, info.width, info.height, {
      palette,
      delay,
      transparent: true,
      dispose: 2 // Restore to background
    });
  }

  gif.finish();
  const gifBuffer = Buffer.from(gif.bytes());
  fs.writeFileSync(path.join(publicDir, 'otl-logo-animated.gif'), gifBuffer);
  console.log('Saved public/otl-logo-animated.gif (' + gifBuffer.length + ' bytes)');
}

main().catch(console.error);
