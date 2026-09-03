/** Genera le icone PWA da un SVG. Rilancia solo se cambi il disegno: npm run icons */
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PUB = join(process.cwd(), 'public');

// pallone stilizzato su fondo viola
const ball = (cx: number, cy: number, r: number) => {
  const pent = (a: number) => {
    const pts = Array.from({ length: 5 }, (_, i) => {
      const t = (Math.PI / 2) * -1 + (i * 2 * Math.PI) / 5 + a;
      return `${cx + r * 0.32 * Math.cos(t)},${cy + r * 0.32 * Math.sin(t)}`;
    });
    return `<polygon points="${pts.join(' ')}" fill="#12121a"/>`;
  };
  const spokes = Array.from({ length: 5 }, (_, i) => {
    const t = (Math.PI / 2) * -1 + (i * 2 * Math.PI) / 5;
    const x1 = cx + r * 0.32 * Math.cos(t + Math.PI / 5);
    const y1 = cy + r * 0.32 * Math.sin(t + Math.PI / 5);
    const x2 = cx + r * 0.9 * Math.cos(t + Math.PI / 5);
    const y2 = cy + r * 0.9 * Math.sin(t + Math.PI / 5);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#12121a" stroke-width="${r * 0.06}" stroke-linecap="round"/>`;
  }).join('');
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffffff"/>${spokes}${pent(0)}`;
};

function svg(size: number, pad: number) {
  const r = (size / 2 - pad) * 0.82;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="#6d28d9"/>
    ${ball(size / 2, size / 2, r)}
  </svg>`;
}

async function png(name: string, size: number, pad: number) {
  const buf = await sharp(Buffer.from(svg(size, pad))).png().toBuffer();
  writeFileSync(join(PUB, name), buf);
  console.log('  ', name);
}

await png('pwa-192x192.png', 192, 8);
await png('pwa-512x512.png', 512, 16);
await png('pwa-maskable-512x512.png', 512, 64); // safe zone per maschera
await png('apple-touch-icon.png', 180, 0);
writeFileSync(join(PUB, 'favicon.svg'), svg(64, 2));
console.log('Icone generate in public/');
