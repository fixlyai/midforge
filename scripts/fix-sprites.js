/**
 * Fix hero sprites: paint a proper face (eyes, mouth, skin) onto the head region.
 * The sprites were generated with all-dark-brown heads (hair everywhere, no face).
 * This script paints a small face oval with eyes + mouth in the correct region.
 *
 * Run: node scripts/fix-sprites.js
 */
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

const SPRITES_DIR = path.join(__dirname, '..', 'apps', 'web', 'public', 'sprites', 'characters');

const FRAME_W = 64;
const FRAME_H = 64;

// Skin palette
const SKIN      = [0xF0, 0xC8, 0xA0, 255]; // base
const SKIN_SHADOW = [0xD4, 0x9E, 0x7A, 255];
const EYE_WHITE = [0xFF, 0xFF, 0xFF, 255];
const EYE_PUPIL = [0x20, 0x20, 0x30, 255];
const MOUTH     = [0xC0, 0x60, 0x50, 255];

// Per-row face definitions (row 0=UP, 1=LEFT, 2=DOWN, 3=RIGHT)
// Each face is relative to frame origin. Only DOWN and LEFT/RIGHT get visible faces.
// UP = back of head, no face needed.
const FACE_DEFS = {
  // Row 2: Walk DOWN — face fully visible
  2: {
    // Skin oval (relative to frame top-left)
    skin: [
      // y, x_start, x_end (inclusive)
      [21, 27, 36],
      [22, 26, 37],
      [23, 25, 38],
      [24, 25, 38],
      [25, 25, 38],
      [26, 26, 37],
      [27, 27, 36],
    ],
    eyes: [
      // [y, x] for left eye white, right eye white, left pupil, right pupil
      { ly: 23, lx: 28, ry: 23, rx: 35, ply: 24, plx: 28, pry: 24, prx: 35 },
    ],
    mouth: [
      [26, 30], [26, 31], [26, 32], [26, 33],
    ],
  },
  // Row 1: Walk LEFT — partial face on left side
  1: {
    skin: [
      [21, 25, 31],
      [22, 24, 32],
      [23, 24, 33],
      [24, 24, 33],
      [25, 24, 33],
      [26, 25, 32],
      [27, 26, 31],
    ],
    eyes: [
      { ly: 23, lx: 27, ry: 23, rx: 27, ply: 24, plx: 27, pry: 24, prx: 27 },
    ],
    mouth: [
      [26, 27], [26, 28], [26, 29],
    ],
  },
  // Row 3: Walk RIGHT — partial face on right side
  3: {
    skin: [
      [21, 32, 38],
      [22, 31, 39],
      [23, 30, 39],
      [24, 30, 39],
      [25, 30, 39],
      [26, 31, 38],
      [27, 32, 37],
    ],
    eyes: [
      { ly: 23, lx: 36, ry: 23, rx: 36, ply: 24, plx: 36, pry: 24, prx: 36 },
    ],
    mouth: [
      [26, 34], [26, 35], [26, 36],
    ],
  },
};

function setPixel(data, w, x, y, rgba) {
  const idx = (y * w + x) * 4;
  data[idx] = rgba[0];
  data[idx+1] = rgba[1];
  data[idx+2] = rgba[2];
  data[idx+3] = rgba[3];
}

async function fixSprite(filePath) {
  const img = await loadImage(filePath);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const w = canvas.width;

  const cols = Math.floor(img.width / FRAME_W);
  const rows = Math.floor(img.height / FRAME_H);
  let pixelsFixed = 0;

  for (let row = 0; row < rows; row++) {
    const faceDef = FACE_DEFS[row];
    if (!faceDef) continue; // Row 0 = back of head, skip

    for (let col = 0; col < cols; col++) {
      const fx = col * FRAME_W;
      const fy = row * FRAME_H;

      // Paint skin oval
      for (const [sy, sx_start, sx_end] of faceDef.skin) {
        for (let sx = sx_start; sx <= sx_end; sx++) {
          const px = fx + sx;
          const py = fy + sy;
          // Only paint on top of existing opaque pixels (don't extend into transparent areas)
          const idx = (py * w + px) * 4;
          if (data[idx+3] === 0) continue;
          // Edge pixels get shadow, center gets base skin
          const isEdge = sx === sx_start || sx === sx_end || sy === faceDef.skin[0][0] || sy === faceDef.skin[faceDef.skin.length-1][0];
          setPixel(data, w, px, py, isEdge ? SKIN_SHADOW : SKIN);
          pixelsFixed++;
        }
      }

      // Paint eyes
      for (const e of faceDef.eyes) {
        setPixel(data, w, fx + e.lx, fy + e.ly, EYE_WHITE);
        setPixel(data, w, fx + e.rx, fy + e.ry, EYE_WHITE);
        setPixel(data, w, fx + e.plx, fy + e.ply, EYE_PUPIL);
        setPixel(data, w, fx + e.prx, fy + e.pry, EYE_PUPIL);
        pixelsFixed += 4;
      }

      // Paint mouth
      for (const [my, mx] of faceDef.mouth) {
        setPixel(data, w, fx + mx, fy + my, MOUTH);
        pixelsFixed++;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filePath, buffer);
  return pixelsFixed;
}

async function main() {
  const files = fs.readdirSync(SPRITES_DIR).filter(f => f.endsWith('.png') && !f.startsWith('npc_'));

  for (const file of files) {
    const filePath = path.join(SPRITES_DIR, file);
    try {
      const fixed = await fixSprite(filePath);
      console.log(`${file}: ${fixed} pixels painted`);
    } catch (err) {
      console.error(`${file}: ERROR — ${err.message}`);
    }
  }

  console.log('\nDone! All player sprites now have visible faces.');
}

main().catch(console.error);
