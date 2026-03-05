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
    'feet/shoes/basic/male/walk/brown.png',
    'hair/bangsshort/adult/walk/dark_brown.png',
  ],
  villager_upgraded: [
    'body/bodies/male/walk/light.png',
    'legs/pants/male/walk/teal.png',
    'feet/shoes/basic/male/walk/brown.png',
    'hair/bangsshort/adult/walk/dark_brown.png',
  ],
  villager_ascended: [
    'body/bodies/male/walk/light.png',
    'legs/pants/male/walk/teal.png',
    'feet/armour/plate/male/walk/steel.png',
    'hair/bangsshort/adult/walk/dark_brown.png',
    'hat/helmet/barbarian/adult/walk/steel.png',
  ],

  // ═══ APPRENTICE TIER ═══
  apprentice_base: [
    'body/bodies/male/walk/light.png',
    'legs/pants/male/walk/white.png',
    'feet/shoes/basic/male/walk/black.png',
    'hair/messy1/adult/walk/black.png',
  ],
  apprentice_upgraded: [
    'body/bodies/male/walk/light.png',
    'legs/pants/male/walk/white.png',
    'feet/shoes/basic/male/walk/black.png',
    'hair/messy1/adult/walk/black.png',
  ],
  apprentice_ascended: [
    'body/bodies/male/walk/light.png',
    'legs/pants/male/walk/white.png',
    'feet/armour/plate/male/walk/steel.png',
    'hair/messy1/adult/walk/black.png',
    'hat/helmet/barbarian/adult/walk/steel.png',
  ],

  // ═══ MERCHANT TIER ═══
  merchant_base: [
    'body/bodies/male/walk/olive.png',
    'legs/pants/male/walk/red.png',
    'feet/shoes/basic/male/walk/brown.png',
    'hair/bangsshort/adult/walk/light_brown.png',
  ],
  merchant_upgraded: [
    'body/bodies/male/walk/olive.png',
    'legs/pants/male/walk/red.png',
    'feet/shoes/basic/male/walk/brown.png',
    'hair/bangsshort/adult/walk/light_brown.png',
  ],
  merchant_ascended: [
    'body/bodies/male/walk/olive.png',
    'legs/pants/male/walk/red.png',
    'feet/armour/plate/male/walk/gold.png',
    'hair/bangsshort/adult/walk/light_brown.png',
    'hat/helmet/barbarian/adult/walk/gold.png',
  ],

  // ═══ WARRIOR TIER ═══
  warrior_base: [
    'body/bodies/male/walk/light.png',
    'legs/pants/male/walk/red.png',
    'feet/armour/plate/male/walk/steel.png',
    'hair/buzzcut/adult/walk/black.png',
  ],
  warrior_upgraded: [
    'body/bodies/male/walk/light.png',
    'legs/pants/male/walk/red.png',
    'feet/armour/plate/male/walk/steel.png',
    'hair/buzzcut/adult/walk/black.png',
    'hat/helmet/barbarian/adult/walk/steel.png',
  ],
  warrior_ascended: [
    'body/bodies/male/walk/light.png',
    'legs/pants/male/walk/red.png',
    'feet/armour/plate/male/walk/gold.png',
    'hair/buzzcut/adult/walk/black.png',
    'hat/helmet/barbarian/adult/walk/gold.png',
  ],

  // ═══ LEGEND TIER ═══
  legend_base: [
    'body/bodies/male/walk/light.png',
    'legs/pants/male/walk/white.png',
    'feet/armour/plate/male/walk/gold.png',
    'hair/bangsshort/adult/walk/gold.png',
  ],
  legend_upgraded: [
    'body/bodies/male/walk/light.png',
    'legs/pants/male/walk/white.png',
    'feet/armour/plate/male/walk/gold.png',
    'hair/bangsshort/adult/walk/gold.png',
    'hat/helmet/barbarian/adult/walk/gold.png',
  ],
  legend_ascended: [
    'body/bodies/male/walk/light.png',
    'legs/pants/male/walk/white.png',
    'feet/armour/plate/male/walk/gold.png',
    'hair/bangsshort/adult/walk/gold.png',
    'hat/helmet/barbarian/adult/walk/gold.png',
  ],

  // ═══ NPCs ═══
  npc_elder: [
    'body/bodies/male/walk/light.png',
    'legs/pants/male/walk/white.png',
    'feet/shoes/basic/male/walk/black.png',
    'hair/bangsshort/adult/walk/white.png',
  ],
  npc_guard: [
    'body/bodies/male/walk/light.png',
    'legs/pants/male/walk/teal.png',
    'feet/armour/plate/male/walk/steel.png',
    'hair/buzzcut/adult/walk/black.png',
    'hat/helmet/barbarian/adult/walk/steel.png',
  ],
  npc_merchant: [
    'body/bodies/male/walk/olive.png',
    'legs/pants/male/walk/red.png',
    'feet/shoes/basic/male/walk/brown.png',
    'hair/bangsshort/adult/walk/dark_brown.png',
  ],
  npc_villager: [
    'body/bodies/male/walk/light.png',
    'legs/pants/male/walk/teal.png',
    'feet/shoes/basic/male/walk/brown.png',
    'hair/bangsshort/adult/walk/dark_brown.png',
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

// ── Verify mode: check all URLs without generating ──────────────
async function verifyAll() {
  console.log('Verifying all LPC layer URLs...\n');
  let okCount = 0;
  let failCount = 0;
  for (const [name, layers] of Object.entries(CHARACTERS)) {
    console.log(`  ${name}:`);
    for (const layerPath of layers) {
      const url = `${BASE_URL}/${layerPath}`;
      try {
        await downloadFile(url);
        console.log(`    ✓ ${layerPath}`);
        okCount++;
      } catch (err) {
        console.log(`    ✗ ${layerPath} — ${err.message}`);
        failCount++;
      }
    }
  }
  console.log(`\nVerified: ${okCount} OK, ${failCount} FAILED`);
  if (failCount > 0) process.exit(1);
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  const args = process.argv.slice(2);

  // --verify: check all URLs
  if (args.includes('--verify')) {
    await verifyAll();
    return;
  }

  // --character <name>: generate only one character
  const charIdx = args.indexOf('--character');
  const singleChar = charIdx >= 0 ? args[charIdx + 1] : null;

  const entries = singleChar
    ? [[singleChar, CHARACTERS[singleChar]]].filter(([, v]) => v)
    : Object.entries(CHARACTERS);

  if (entries.length === 0) {
    console.error(`Character "${singleChar}" not found.`);
    process.exit(1);
  }

  console.log(`Generating ${entries.length} LPC 64×64 walk-cycle sprite sheet(s)...\n`);

  let success = 0;
  let fail = 0;

  for (const [name, layers] of entries) {
    const ok = await generateSheet(name, layers);
    if (ok) success++; else fail++;
  }

  console.log(`\nDone! ${success} generated, ${fail} failed.`);
  console.log(`Output: ${OUTPUT_DIR}`);

  if (fail > 0) {
    console.log('\nSome layers failed to download. Run with --verify to check all URLs.');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
