/**
 * Generates the PNG app icons from a small amount of geometry, so the repo
 * carries no binary source assets and the icons can be regenerated on demand:
 *
 *   node scripts/make-icons.mjs
 *
 * The mark is two overlapping discs — yellow over blue — on the navy brand
 * ground, which reads clearly at 32px and at 512px.
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

const NAVY = [0x08, 0x2b, 0x75];
const BLUE = [0x19, 0x76, 0xf3];
const YELLOW = [0xff, 0xd4, 0x00];

/* --- minimal PNG writer (truecolour, no alpha) --------------------- */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, pixelAt) {
  const stride = size * 3;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixelAt(x, y);
      const p = rowStart + 1 + x * 3;
      raw[p] = r;
      raw[p + 1] = g;
      raw[p + 2] = b;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* --- the mark ------------------------------------------------------ */

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

function markPixel(size) {
  const r = size * 0.235;
  const blue = { x: size * 0.405, y: size * 0.5 };
  const yellow = { x: size * 0.6, y: size * 0.5 };
  // One pixel of feathering keeps the disc edges from looking jagged.
  const feather = Math.max(1, size / 180);

  const coverage = (x, y, c) => {
    const d = Math.hypot(x + 0.5 - c.x, y + 0.5 - c.y);
    return Math.min(1, Math.max(0, (r - d) / feather + 0.5));
  };

  return (x, y) => {
    let colour = NAVY;
    const b = coverage(x, y, blue);
    if (b > 0) colour = mix(colour, BLUE, b);
    const w = coverage(x, y, yellow);
    if (w > 0) colour = mix(colour, YELLOW, w);
    return colour;
  };
}

mkdirSync(OUT_DIR, { recursive: true });

for (const [name, size] of [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["apple-icon.png", 180],
]) {
  writeFileSync(join(OUT_DIR, name), encodePng(size, markPixel(size)));
  console.log(`wrote public/${name} (${size}x${size})`);
}
