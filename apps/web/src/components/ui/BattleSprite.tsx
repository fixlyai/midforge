'use client';

import { useRef, useEffect, useState } from 'react';

// ═══════════════════════════════════════════════════════════
//  BATTLE SPRITE — renders Cute Fantasy spritesheets on canvas
//  Supports: player (cf_player), enemy characters (Goblins,
//  Knights, Orcs, Angels), and LPC fallback.
// ═══════════════════════════════════════════════════════════

// ── Cute Fantasy enemy sprite configs ──
// Each enemy type defines: file path, frame dimensions, cols,
// and which row contains idle-down animation + frame count.
interface EnemySpriteConfig {
  src: string;
  frameW: number;
  frameH: number;
  cols: number;
  idleRow: number;      // row index for idle-down
  idleFrames: number;   // how many frames in that row
}

const ENEMY_SPRITES: Record<string, EnemySpriteConfig> = {
  // Goblins — 32×32 frames, 6 cols × 13 rows
  // Row 0: idle down (6 frames)
  goblin_thief:    { src: '/assets/characters/enemies/Goblins/Goblin_Thief.png',    frameW: 32, frameH: 32, cols: 6, idleRow: 0, idleFrames: 6 },
  goblin_archer:   { src: '/assets/characters/enemies/Goblins/Goblin_Archer.png',   frameW: 48, frameH: 48, cols: 6, idleRow: 0, idleFrames: 6 },
  goblin_maceman:  { src: '/assets/characters/enemies/Goblins/Goblin_Maceman.png',  frameW: 32, frameH: 32, cols: 6, idleRow: 0, idleFrames: 6 },
  goblin_spearman: { src: '/assets/characters/enemies/Goblins/Goblin_Spearman.png', frameW: 48, frameH: 48, cols: 6, idleRow: 0, idleFrames: 6 },

  // Knights — 48×48 frames, 6 cols × 13 rows
  knight_swordman: { src: '/assets/characters/enemies/Knights/Swordman.png',  frameW: 48, frameH: 48, cols: 6, idleRow: 0, idleFrames: 6 },
  knight_archer:   { src: '/assets/characters/enemies/Knights/Archer.png',    frameW: 48, frameH: 48, cols: 6, idleRow: 0, idleFrames: 6 },
  knight_spearman: { src: '/assets/characters/enemies/Knights/Spearman.png',  frameW: 48, frameH: 48, cols: 6, idleRow: 0, idleFrames: 6 },
  knight_templar:  { src: '/assets/characters/enemies/Knights/Templar.png',   frameW: 48, frameH: 48, cols: 6, idleRow: 0, idleFrames: 6 },

  // Orcs — 64×64 frames, 8 cols × 8 rows
  orc_grunt:  { src: '/assets/characters/enemies/Orcs/Orc_Grunt.png',  frameW: 64, frameH: 64, cols: 8, idleRow: 0, idleFrames: 4 },
  orc_chief:  { src: '/assets/characters/enemies/Orcs/Orc_Chief.png',  frameW: 64, frameH: 64, cols: 8, idleRow: 0, idleFrames: 4 },
  orc_archer: { src: '/assets/characters/enemies/Orcs/Orc_Archer.png', frameW: 48, frameH: 48, cols: 6, idleRow: 0, idleFrames: 6 },
  orc_peon:   { src: '/assets/characters/enemies/Orcs/Orc_Peon.png',   frameW: 64, frameH: 64, cols: 6, idleRow: 0, idleFrames: 4 },

  // Angels — 64×64 frames, 8 cols × 13 rows
  angel_1: { src: '/assets/characters/enemies/Angels/Angel_1.png', frameW: 64, frameH: 64, cols: 8, idleRow: 0, idleFrames: 6 },
  angel_2: { src: '/assets/characters/enemies/Angels/Angel_2.png', frameW: 64, frameH: 64, cols: 8, idleRow: 0, idleFrames: 6 },
};

// Tier → enemy sprite mapping (for ghost arena fights)
export const TIER_ENEMY_MAP: Record<string, string> = {
  villager:   'goblin_thief',
  apprentice: 'goblin_archer',
  merchant:   'knight_swordman',
  warrior:    'orc_grunt',
  legend:     'angel_1',
};

// Brigand name → enemy sprite mapping
export const BRIGAND_ENEMY_MAP: Record<string, string> = {
  'Forest Brigand': 'goblin_thief',
  'Cave Troll':     'orc_chief',
  'Deserter Knight':'knight_templar',
};

// Player sprite: Cute Fantasy Player_Base_animations.png
// 9 cols × 56 rows, 64×64 frames
// Row 0: Idle Down (6 frames) — used for battle idle
const PLAYER_SPRITE = {
  src: '/assets/characters/Player_Base_animations.png',
  frameW: 64,
  frameH: 64,
  cols: 9,
  idleRow: 0,
  idleFrames: 6,
};

// Display size in the fight scene
const DISPLAY_W = 64;
const DISPLAY_H = 64;
const IDLE_FPS = 6;

export interface BattleSpriteProps {
  tier: string;
  spriteKey?: string;
  enemyType?: string;   // key into ENEMY_SPRITES — overrides tier-based lookup
  isPlayer?: boolean;   // true = use player sprite, false/undefined = use enemy
  flipped?: boolean;
  hit?: boolean;
  dead?: boolean;
  attacking?: boolean;
  tintColor?: string;
}

export default function BattleSprite({
  tier = 'villager',
  spriteKey,
  enemyType,
  isPlayer = false,
  flipped = false,
  hit = false,
  dead = false,
  attacking = false,
  tintColor,
}: BattleSpriteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const frameRef = useRef(0);
  const loadedRef = useRef(false);
  const [fallback, setFallback] = useState(false);

  // Resolve sprite config
  let config: { src: string; frameW: number; frameH: number; cols: number; idleRow: number; idleFrames: number };

  if (isPlayer) {
    config = PLAYER_SPRITE;
  } else if (enemyType && ENEMY_SPRITES[enemyType]) {
    config = ENEMY_SPRITES[enemyType];
  } else {
    // Auto-resolve from tier
    const autoEnemy = TIER_ENEMY_MAP[tier] ?? 'goblin_thief';
    config = ENEMY_SPRITES[autoEnemy] ?? ENEMY_SPRITES.goblin_thief;
  }

  const src = config.src;

  // Load the spritesheet image
  useEffect(() => {
    loadedRef.current = false;
    const img = new Image();
    img.src = src;
    img.onload = () => {
      imgRef.current = img;
      loadedRef.current = true;
      setFallback(false);
    };
    img.onerror = () => {
      imgRef.current = null;
      loadedRef.current = false;
      setFallback(true);
    };
  }, [src]);

  // Animation loop
  useEffect(() => {
    if (dead) return;
    const interval = setInterval(() => {
      frameRef.current = (frameRef.current + 1) % config.idleFrames;
    }, 1000 / IDLE_FPS);
    return () => clearInterval(interval);
  }, [dead, config.idleFrames]);

  // Render loop
  useEffect(() => {
    let raf: number;
    const draw = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) { raf = requestAnimationFrame(draw); return; }

      ctx.clearRect(0, 0, DISPLAY_W, DISPLAY_H);

      if (!loadedRef.current || !imgRef.current) {
        ctx.fillStyle = '#4A90D940';
        ctx.fillRect(8, 4, 48, 56);
        raf = requestAnimationFrame(draw);
        return;
      }

      const img = imgRef.current;
      const frameIdx = dead ? 0 : frameRef.current;
      const col = frameIdx % config.cols;
      const row = config.idleRow;
      const sx = col * config.frameW;
      const sy = row * config.frameH;

      ctx.save();

      if (flipped) {
        ctx.translate(DISPLAY_W, 0);
        ctx.scale(-1, 1);
      }

      if (hit) {
        ctx.filter = 'brightness(3)';
      }

      if (dead) {
        ctx.globalAlpha = 0.3;
      }

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, sx, sy, config.frameW, config.frameH, 0, 0, DISPLAY_W, DISPLAY_H);

      // Tint overlay for enemies (not player)
      if (tintColor && !hit && !isPlayer) {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = tintColor;
        ctx.fillRect(0, 0, DISPLAY_W, DISPLAY_H);
      }

      ctx.restore();
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [flipped, hit, dead, tintColor, isPlayer, config]);

  // Fallback to CSS PixelSprite style if spritesheet not found
  if (fallback) {
    const color = tintColor || '#4A90D9';
    return (
      <div style={{
        width: DISPLAY_W, height: DISPLAY_H + 8, position: 'relative',
        transform: `${flipped ? 'scaleX(-1)' : ''} ${dead ? 'rotate(90deg)' : ''}`,
        opacity: dead ? 0.3 : 1,
        filter: hit ? `brightness(3) drop-shadow(0 0 8px ${color})` : 'none',
        imageRendering: 'pixelated',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 14, width: 36, height: 28, backgroundColor: color, borderRadius: '3px 3px 0 0', boxShadow: hit ? `0 0 24px ${color}` : `0 0 8px ${color}40` }} />
        <div style={{ position: 'absolute', top: 10, left: 22, width: 4, height: 4, backgroundColor: '#000', borderRadius: 1 }} />
        <div style={{ position: 'absolute', top: 10, left: 38, width: 4, height: 4, backgroundColor: '#000', borderRadius: 1 }} />
        <div style={{ position: 'absolute', top: 28, left: 12, width: 40, height: 24, backgroundColor: `${color}CC` }} />
        <div style={{ position: 'absolute', top: 52, left: 14, width: 14, height: 20, backgroundColor: `${color}AA`, borderRadius: '0 0 3px 3px' }} />
        <div style={{ position: 'absolute', top: 52, right: 14, width: 14, height: 20, backgroundColor: `${color}AA`, borderRadius: '0 0 3px 3px' }} />
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={DISPLAY_W}
      height={DISPLAY_H}
      style={{
        width: DISPLAY_W,
        height: DISPLAY_H,
        imageRendering: 'pixelated',
        transform: dead ? 'rotate(90deg)' : undefined,
        opacity: dead ? 0.3 : 1,
        transition: 'opacity 0.4s, transform 0.4s',
      }}
    />
  );
}
