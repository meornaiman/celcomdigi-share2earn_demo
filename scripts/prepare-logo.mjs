/**
 * Turns the supplied AIdealist artwork into a web-ready wordmark:
 *
 *   node scripts/prepare-logo.mjs ~/Downloads/"AIdealist logo.png"
 *
 * The source is a square export with the mark floating in a large empty
 * margin. Dropped into a 44px app bar as-is it would render at about a third
 * of the available height, so this trims to the ink, then downscales with a
 * box filter to a size that stays crisp on a 3x display.
 */
import { deflateSync, inflateSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const SOURCE = process.argv[2];
if (!SOURCE) {
  console.error("usage: node scripts/prepare-logo.mjs <source.png>");
  process.exit(1);
}

/* --- PNG decode (8-bit RGBA, non-interlaced) ----------------------- */

function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG");
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  if (buf[24] !== 8 || buf[25] !== 6 || buf[28] !== 0) {
    throw new Error("expected 8-bit RGBA, non-interlaced");
  }

  const idat = [];
  let o = 8;
  while (o < buf.length) {
    const len = buf.readUInt32BE(o);
    const type = buf.slice(o + 4, o + 8).toString("ascii");
    if (type === "IDAT") idat.push(buf.slice(o + 8, o + 8 + len));
    o += 12 + len;
  }

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  const out = Buffer.alloc(stride * height);

  // Undo the per-scanline filters (PNG spec §9.2).
  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    const prev = dst - stride;
    for (let x = 0; x < stride; x++) {
      const value = raw[src + x];
      const a = x >= 4 ? out[dst + x - 4] : 0;
      const b = y > 0 ? out[prev + x] : 0;
      const c = x >= 4 && y > 0 ? out[prev + x - 4] : 0;
      let recon;
      switch (filter) {
        case 0: recon = value; break;
        case 1: recon = value + a; break;
        case 2: recon = value + b; break;
        case 3: recon = value + ((a + b) >> 1); break;
        case 4: recon = value + paeth(a, b, c); break;
        default: throw new Error(`bad filter ${filter}`);
      }
      out[dst + x] = recon & 0xff;
    }
  }

  return { width, height, data: out };
}

/* --- PNG encode ---------------------------------------------------- */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

const crc32 = (buf) => {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* --- trim and resize ----------------------------------------------- */

/**
 * A pixel counts as ink if it is neither transparent nor near-white. The
 * export carries both kinds of background depending on where you look, so
 * testing alpha alone would find no margin at all.
 */
function inkBounds(img) {
  let minX = img.width, minY = img.height, maxX = -1, maxY = -1;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4;
      const [r, g, b, a] = [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]];
      if (a < 24) continue;
      if (r > 244 && g > 244 && b > 244) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) throw new Error("image looks empty");
  return { minX, minY, maxX, maxY };
}

/** Box-filter downscale, averaging in premultiplied alpha to avoid fringing. */
function resize(img, x0, y0, srcW, srcH, outW, outH) {
  const out = Buffer.alloc(outW * outH * 4);
  for (let y = 0; y < outH; y++) {
    const sy0 = y0 + Math.floor((y * srcH) / outH);
    const sy1 = Math.max(sy0 + 1, y0 + Math.floor(((y + 1) * srcH) / outH));
    for (let x = 0; x < outW; x++) {
      const sx0 = x0 + Math.floor((x * srcW) / outW);
      const sx1 = Math.max(sx0 + 1, x0 + Math.floor(((x + 1) * srcW) / outW));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const i = (sy * img.width + sx) * 4;
          const alpha = img.data[i + 3] / 255;
          r += img.data[i] * alpha;
          g += img.data[i + 1] * alpha;
          b += img.data[i + 2] * alpha;
          a += img.data[i + 3];
          n++;
        }
      }
      const o = (y * outW + x) * 4;
      const avgA = a / n;
      const unpremul = avgA > 0 ? n / (a / 255) : 0;
      out[o] = Math.min(255, Math.round((r / n) * unpremul));
      out[o + 1] = Math.min(255, Math.round((g / n) * unpremul));
      out[o + 2] = Math.min(255, Math.round((b / n) * unpremul));
      out[o + 3] = Math.round(avgA);
    }
  }
  return out;
}

const img = decodePng(readFileSync(SOURCE));
const { minX, minY, maxX, maxY } = inkBounds(img);
const srcW = maxX - minX + 1;
const srcH = maxY - minY + 1;
console.log(
  `source ${img.width}x${img.height} → ink ${srcW}x${srcH} at (${minX},${minY})`
);

// The full lockup, for places with room for a wordmark. Tall enough to stay
// sharp at 3x.
const OUT_H = 132;
const OUT_W = Math.round((srcW / srcH) * OUT_H);
writeFileSync(
  join(OUT_DIR, "logo-aidealist.png"),
  encodePng(OUT_W, OUT_H, resize(img, minX, minY, srcW, srcH, OUT_W, OUT_H))
);
console.log(`wrote public/logo-aidealist.png (${OUT_W}x${OUT_H})`);

/*
 * The square monogram, for the app bar and anywhere else the slot is square.
 * The lockup is nearly 3:1, so fitting the whole thing into a square would
 * shrink the lettering to nothing. The "AI" glyph is already square-ish, so
 * the mark is that glyph alone.
 *
 * There is no empty column to split on — the swoosh runs unbroken beneath the
 * whole word — so the boundary is the sparsest column in the band where the
 * monogram gives way to the wordmark.
 */
function inkColumn(x) {
  let n = 0;
  for (let y = minY; y <= maxY; y++) {
    const i = (y * img.width + x) * 4;
    const [r, g, b, a] = [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]];
    if (a >= 24 && !(r > 244 && g > 244 && b > 244)) n++;
  }
  return n;
}

let splitX = minX + Math.round(srcW * 0.36);
let sparsest = Infinity;
for (
  let x = minX + Math.round(srcW * 0.25);
  x < minX + Math.round(srcW * 0.45);
  x++
) {
  const n = inkColumn(x);
  if (n < sparsest) {
    sparsest = n;
    splitX = x;
  }
}

const glyphW = splitX - minX + 1;
console.log(`monogram split at x=${splitX} (density ${sparsest}), glyph ${glyphW}x${srcH}`);

// Square box anchored at the glyph's left edge and stopping at the split, so
// widening the box to make it square can never reach into the wordmark.
// Breathing room is left to CSS padding rather than baked into the crop.
const side = Math.max(glyphW, srcH);
const markX = Math.max(0, splitX - side + 1);
const markY = Math.max(0, Math.round(minY + srcH / 2 - side / 2));
const markSide = Math.min(side, img.width - markX, img.height - markY);

const MARK_OUT = 160;
writeFileSync(
  join(OUT_DIR, "logo-mark.png"),
  encodePng(
    MARK_OUT,
    MARK_OUT,
    resize(img, markX, markY, markSide, markSide, MARK_OUT, MARK_OUT)
  )
);
console.log(`wrote public/logo-mark.png (${MARK_OUT}x${MARK_OUT}, crop ${markSide}px)`);
