/**
 * Generate 19 character sprite sheets from LPC (Liberated Pixel Cup) layers.
 * Downloads individual walk-cycle layers from the LPC GitHub repo and composites
 * them into walk-only sprite sheets: 576×256px (9 cols × 4 rows of 64×64 frames).
 *
 * Row 0: Walk UP,    Row 1: Walk LEFT,
 * Row 2: Walk DOWN,  Row 3: Walk RIGHT
 * (LPC native row order — our AnimationManager maps these correctly)
 *
 * License: CC-BY-SA 3.0 / GNU GPL 3.0 (see CREDITS-LPC.md)
 */

const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const https = require('https');

const OUTPUT_DIR = path.join(__dirname, '..', 'apps', 'web', 'public', 'sprites', 'characters');
const CACHE_DIR = path.join(__dirname, '.lpc-cache');

// LPC walk sheets are 576×256 (9 frames × 4 directions × 64×64)
const SHEET_W = 576;
const SHEET_H = 256;

const BASE_URL = 'https://raw.githubusercontent.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator/master/spritesheets';

// ── Layer definitions for each character ──────────────────────────
// Each layer is a path relative to BASE_URL, pointing to a walk/ PNG.
// Layers are composited bottom-to-top (first = back, last = front).

const CHARACTERS = {
  // ═══ VILLAGER TIER ═══
  villager_base: [
    'body/bodies/male/walk/light.png',
    'legs/pants/male/walk/teal.png',
    'feet/shoes/male/walk/brown.png',
    'hair/plain/male/walk/brunette.png',
  ],
  villager_upgraded: [
    'body/bodies/male/walk/light.png',
    'legs/pants/male/walk/teal.png',
    'feet/shoes/male/walk/brown.png',
    'arms/hands/gloves/male/walk/brown.png',
    'hair/plain/male/walk/brunette.png',
  ],
  villager_ascended: [
    'body/bodies/male/walk/light.png',
    'legs/pants/male/walk/teal.png',
    'feet/armor/male/walk/brown.png',
    'arms/hands/gloves/male/walk/brown.png',
    'hair/plain/male/walk/brunette.png',
    'head/helms/male/walk/chainhat.png',
  ],

  // ═══ APPRENTICE TIER ═══
  apprentice_base: [
    'body/bodies/male/walk/light.png',
    'legs/pants/male/walk/white.png',
    'feet/shoes/male/walk/black.png',
    'hair/plain/male/walk/raven.png',
  ],
  apprentice_upgraded: [
    'body/bodies/male/walk/light.png',
    'legs/pants/male/walk/white.png',
    'feet/shoes/male/walk/black.png',
    'arms/hands/gloves/male/walk/white.png',
    'hair/plain/male/walk/raven.png',
  ],
  apprentice_ascended: [
    'body/bodies/male/walk/light.png',
    'legs/pants/male/walk/white.png',
    'feet/armor/male/walk/steel.png',
    'arms/hands/gloves/male/walk/white.png',
    'hair/plain/male/walk/raven.png',
    'head/helms/male/walk/chainhat.png',
  ],

  // ═══ MERCHANT TIER ═══
  merchant_base: [
    'body/bodies/male/walk/olive.png',
    'legs/pants/male/walk/red.png',
    'feet/shoes/male/walk/brown.png',
    'hair/plain/male/walk/brunette2.png',
  ],
  merchant_upgraded: [
    'body/bodies/male/walk/olive.png',
    'legs/pants/male/walk/red.png',
    'feet/shoes/male/walk/brown.png',
    'arms/hands/gloves/male/walk/brown.png',
    'hair/plain/male/walk/brunette2.png',
  ],
  merchant_ascended: [
    'body/bodies/male/walk/olive.png',
    'legs/pants/male/walk/red.png',
    'feet/armor/male/walk/golden.png',
    'arms/hands/gloves/male/walk/brown.png',
    'hair/plain/male/walk/brunette2.png',
    'hat/phrygian/male/walk/red.png',
  ],

  // ═══ WARRIOR TIER ═══
  warrior_base: [
    'body/bodies/male/walk/light.png',
    'legs/armor/male/walk/steel.png',
    'feet/armor/male/walk/steel.png',
    'hair/buzzcut/male/walk/raven.png',
  ],
  warrior_upgraded: [
    'body/bodies/male/walk/light.png',
    'legs/armor/male/walk/steel.png',
    'feet/armor/male/walk/steel.png',
    'arms/hands/gloves/male/walk/steel.png',
    'hair/buzzcut/male/walk/raven.png',
    'head/helms/male/walk/chainhat.png',
  ],
  warrior_ascended: [
    'body/bodies/male/walk/light.png',
    'legs/armor/male/walk/golden.png',
    'feet/armor/male/walk/golden.png',
    'arms/hands/gloves/male/walk/golden.png',
    'hair/buzzcut/male/walk/raven.png',
    'head/helms/male/walk/golden.png',
  ],

  // ═══ LEGEND TIER ═══
  legend_base: [
    'body/bodies/male/walk/light.png',
    'legs/armor/male/walk/golden.png',
    'feet/armor/male/walk/golden.png',
    'hair/plain/male/walk/gold.png',
  ],
  legend_upgraded: [
    'body/bodies/male/walk/light.png',
    'legs/armor/male/walk/golden.png',
    'feet/armor/male/walk/golden.png',
    'arms/hands/gloves/male/walk/golden.png',
    'hair/plain/male/walk/gold.png',
    'head/helms/male/walk/golden.png',
  ],
  legend_ascended: [
    'body/bodies/male/walk/light.png',
    'legs/armor/male/walk/golden.png',
    'feet/armor/male/walk/golden.png',
    'arms/hands/gloves/male/walk/golden.png',
    'hair/plain/male/walk/gold.png',
    'head/helms/male/walk/golden.png',
    'cape/normal/male/walk/white.png',
  ],

  // ═══ NPCs ═══
  npc_elder: [
    'body/bodies/male/walk/light.png',
    'legs/pants/male/walk/white.png',
    'feet/shoes/male/walk/black.png',
    'hair/plain/male/walk/white.png',
  ],
  npc_guard: [
    'body/bodies/male/walk/light.png',
    'legs/armor/male/walk/steel.png',
    'feet/armor/male/walk/steel.png',
    'arms/hands/gloves/male/walk/steel.png',
    'hair/buzzcut/male/walk/raven.png',
    'head/helms/male/walk/chainhat.png',
  ],
  npc_merchant: [
    'body/bodies/male/walk/olive.png',
    'legs/pants/male/walk/red.png',
    'feet/shoes/male/walk/brown.png',
    'hair/plain/male/walk/brunette.png',
    'hat/phrygian/male/walk/red.png',
  ],
  npc_villager: [
    'body/bodies/male/walk/light.png',
    'legs/pants/male/walk/teal.png',
    'feet/shoes/male/walk/brown.png',
    'hair/plain/male/walk/brunette.png',
  ],
};

// ── Download helper ──────────────────────────────────────────────
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    // Check cache first
    const cacheKey = url.replace(/[^a-zA-Z0-9._-]/g, '_');
    const cachePath = path.join(CACHE_DIR, cacheKey);
    if (fs.existsSync(cachePath)) {
      resolve(fs.readFileSync(cachePath));
      return;
    }

    const request = (urlStr, redirectCount = 0) => {
      if (redirectCount > 5) { reject(new Error('Too many redirects')); return; }
      const protocol = urlStr.startsWith('https') ? https : require('http');
      protocol.get(urlStr, { headers: { 'User-Agent': 'Midforge-LPC-Generator' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          request(res.headers.location, redirectCount + 1);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${urlStr}`));
          return;
        }
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          fs.writeFileSync(cachePath, buf);
          resolve(buf);
        });
        res.on('error', reject);
      }).on('error', reject);
    };
    request(url);
  });
}

// ── Composite layers into a single walk sheet ────────────────────
async function generateSheet(name, layerPaths) {
  const canvas = createCanvas(SHEET_W, SHEET_H);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, SHEET_W, SHEET_H);

  let loadedCount = 0;
  for (const layerPath of layerPaths) {
    const url = `${BASE_URL}/${layerPath}`;
    try {
      const buf = await downloadFile(url);
      const img = await loadImage(buf);

      // LPC walk sheets can be 576×256 or smaller. Draw at origin.
      ctx.drawImage(img, 0, 0);
      loadedCount++;
    } catch (err) {
      console.warn(`    ⚠ Layer not found: ${layerPath} — ${err.message}`);
    }
  }

  if (loadedCount === 0) {
    console.error(`  ✗ ${name}.png — no layers loaded, skipping`);
    return false;
  }

  const outPath = path.join(OUTPUT_DIR, `${name}.png`);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outPath, buffer);
  console.log(`  ✓ ${name}.png (${loadedCount} layers, ${buffer.length} bytes)`);
  return true;
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  console.log('Generating LPC 64×64 walk-cycle sprite sheets...\n');

  let success = 0;
  let fail = 0;
  const entries = Object.entries(CHARACTERS);

  for (const [name, layers] of entries) {
    const ok = await generateSheet(name, layers);
    if (ok) success++; else fail++;
  }

  console.log(`\nDone! ${success} generated, ${fail} failed.`);
  console.log(`Output: ${OUTPUT_DIR}`);

  if (fail > 0) {
    console.log('\nSome layers failed to download. The LPC repo may have different paths.');
    console.log('Check the warnings above and adjust layer paths in this script.');
    console.log('Fallback: the placeholder sprites from the previous script still work.\n');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
