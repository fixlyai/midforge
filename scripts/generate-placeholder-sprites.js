/**
 * Generate 19 placeholder sprite sheets for the 48×48 character system.
 * Each sheet is 384×192px (8 cols × 4 rows of 48×48 frames).
 * 
 * Row 0: Walk DOWN  (frames 0-7)
 * Row 1: Walk LEFT  (frames 8-15)
 * Row 2: Walk RIGHT (frames 16-23)
 * Row 3: Walk UP    (frames 24-31)
 *
 * Each character is a simple humanoid silhouette with tier-appropriate colors.
 * Walk frames shift the legs/arms slightly for visible animation.
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'apps', 'web', 'public', 'sprites', 'characters');
const SHEET_W = 384;
const SHEET_H = 192;
const FRAME_W = 48;
const FRAME_H = 48;
const COLS = 8;
const ROWS = 4;

// Tier colors: body, armor/outfit, accent
const TIER_COLORS = {
  villager:   { body: '#D2B48C', outfit: '#8B7355', accent: '#6B5235', hair: '#5C3A1E' },
  apprentice: { body: '#D2B48C', outfit: '#4A90D9', accent: '#2E5FA1', hair: '#1A3A5C' },
  merchant:   { body: '#D2B48C', outfit: '#7B68EE', accent: '#5B48CE', hair: '#3A2870' },
  warrior:    { body: '#D2B48C', outfit: '#E74C3C', accent: '#C0392B', hair: '#8B1A1A' },
  legend:     { body: '#D2B48C', outfit: '#F39C12', accent: '#D4850F', hair: '#8B6914' },
};

// Form modifiers: base has simple outfit, upgraded adds shoulder pads, ascended adds crown + glow
const FORM_DETAILS = {
  base:      { shoulderPad: false, crown: false, glow: false, weaponSize: 0 },
  upgraded:  { shoulderPad: true,  crown: false, glow: false, weaponSize: 1 },
  ascended:  { shoulderPad: true,  crown: true,  glow: true,  weaponSize: 2 },
};

// NPC colors
const NPC_COLORS = {
  npc_elder:    { body: '#D2B48C', outfit: '#F39C12', accent: '#8B6914', hair: '#CCCCCC' },
  npc_guard:    { body: '#D2B48C', outfit: '#708090', accent: '#4A5568', hair: '#2D3748' },
  npc_merchant: { body: '#D2B48C', outfit: '#7B68EE', accent: '#5B48CE', hair: '#4A3070' },
  npc_villager: { body: '#D2B48C', outfit: '#8B7355', accent: '#6B5235', hair: '#5C3A1E' },
};

// Direction configs: which way the character faces
// down=0, left=1, right=2, up=3
const DIRECTIONS = ['down', 'left', 'right', 'up'];

function drawCharacter(ctx, cx, cy, direction, frameIdx, colors, formDetail) {
  const { body, outfit, accent, hair } = colors;
  const { shoulderPad, crown, glow, weaponSize } = formDetail;
  
  // Walk cycle: slight leg/arm offset based on frame
  const walkPhase = Math.sin((frameIdx / 8) * Math.PI * 2) * 3;
  const armSwing = Math.cos((frameIdx / 8) * Math.PI * 2) * 2;
  
  // Glow effect for ascended
  if (glow) {
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 18, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Legs
  ctx.fillStyle = accent;
  const legOffset = walkPhase;
  // Left leg
  ctx.fillRect(cx - 5, cy + 5, 4, 12 + legOffset * 0.5);
  // Right leg  
  ctx.fillRect(cx + 1, cy + 5, 4, 12 - legOffset * 0.5);
  
  // Boots
  ctx.fillStyle = '#3A2A1A';
  ctx.fillRect(cx - 6, cy + 15 + legOffset * 0.3, 6, 3);
  ctx.fillRect(cx, cy + 15 - legOffset * 0.3, 6, 3);
  
  // Body / torso
  ctx.fillStyle = outfit;
  ctx.fillRect(cx - 7, cy - 8, 14, 14);
  
  // Shoulder pads (upgraded+)
  if (shoulderPad) {
    ctx.fillStyle = accent;
    ctx.fillRect(cx - 10, cy - 8, 4, 6);
    ctx.fillRect(cx + 6, cy - 8, 4, 6);
  }
  
  // Arms
  ctx.fillStyle = body;
  // Arm positions change with direction
  if (direction === 'left') {
    ctx.fillRect(cx - 9, cy - 4 + armSwing, 3, 10);
  } else if (direction === 'right') {
    ctx.fillRect(cx + 6, cy - 4 + armSwing, 3, 10);
  } else {
    ctx.fillRect(cx - 9, cy - 4 + armSwing, 3, 10);
    ctx.fillRect(cx + 6, cy - 4 - armSwing, 3, 10);
  }
  
  // Weapon (based on form)
  if (weaponSize > 0) {
    ctx.fillStyle = '#A0A0A0';
    const wLen = weaponSize === 2 ? 14 : 10;
    if (direction === 'right') {
      ctx.fillRect(cx + 9, cy - 6 + armSwing, 2, wLen);
    } else {
      ctx.fillRect(cx - 11, cy - 6 + armSwing, 2, wLen);
    }
    // Blade tip
    ctx.fillStyle = '#D0D0D0';
    ctx.fillRect(cx + (direction === 'right' ? 9 : -11), cy - 6 + armSwing, 2, 3);
  }
  
  // Head
  ctx.fillStyle = body;
  const headY = cy - 16;
  ctx.fillRect(cx - 5, headY, 10, 10);
  
  // Hair
  ctx.fillStyle = hair;
  ctx.fillRect(cx - 6, headY - 2, 12, 5);
  
  // Crown (ascended)
  if (crown) {
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(cx - 5, headY - 5, 10, 3);
    // Crown points
    ctx.fillRect(cx - 5, headY - 7, 2, 2);
    ctx.fillRect(cx - 1, headY - 8, 2, 3);
    ctx.fillRect(cx + 3, headY - 7, 2, 2);
  }
  
  // Eyes
  ctx.fillStyle = '#000000';
  if (direction === 'down') {
    ctx.fillRect(cx - 3, headY + 4, 2, 2);
    ctx.fillRect(cx + 1, headY + 4, 2, 2);
  } else if (direction === 'up') {
    // No eyes visible from back
  } else if (direction === 'left') {
    ctx.fillRect(cx - 3, headY + 4, 2, 2);
  } else {
    ctx.fillRect(cx + 1, headY + 4, 2, 2);
  }
}

function generateSheet(filename, colors, formDetail) {
  const canvas = createCanvas(SHEET_W, SHEET_H);
  const ctx = canvas.getContext('2d');
  
  // Transparent background
  ctx.clearRect(0, 0, SHEET_W, SHEET_H);
  
  for (let row = 0; row < ROWS; row++) {
    const direction = DIRECTIONS[row];
    for (let col = 0; col < COLS; col++) {
      const cx = col * FRAME_W + FRAME_W / 2;
      const cy = row * FRAME_H + FRAME_H / 2 + 4; // offset down slightly for headroom
      drawCharacter(ctx, cx, cy, direction, col, colors, formDetail);
    }
  }
  
  const outPath = path.join(OUTPUT_DIR, filename);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outPath, buffer);
  console.log(`  ✓ ${filename} (${buffer.length} bytes)`);
}

// Ensure output dir exists
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

console.log('Generating 48×48 placeholder sprite sheets...\n');

// Player tier × form (15 sheets)
const tiers = ['villager', 'apprentice', 'merchant', 'warrior', 'legend'];
const forms = ['base', 'upgraded', 'ascended'];

for (const tier of tiers) {
  for (const form of forms) {
    generateSheet(`${tier}_${form}.png`, TIER_COLORS[tier], FORM_DETAILS[form]);
  }
}

// NPC characters (4 sheets)
const npcKeys = ['npc_elder', 'npc_guard', 'npc_merchant', 'npc_villager'];
for (const key of npcKeys) {
  generateSheet(`${key}.png`, NPC_COLORS[key], FORM_DETAILS.base);
}

console.log(`\nDone! Generated 19 sprite sheets in ${OUTPUT_DIR}`);
