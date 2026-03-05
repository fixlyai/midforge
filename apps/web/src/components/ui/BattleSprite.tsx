'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════
//  BATTLE SPRITE — renders LPC 64×64 spritesheet on canvas
//  for the arena fight scene
// ═══════════════════════════════════════════════════════════

// LPC spritesheet layout: 9 cols × 4 rows, 64×64 per frame
// Row 0: Walk UP    (frames 0-8)
// Row 1: Walk LEFT  (frames 9-17)
// Row 2: Walk DOWN  (frames 18-26)
// Row 3: Walk RIGHT (frames 27-35)
const FRAME_W = 64;
const FRAME_H = 64;
const COLS = 9;

// For battle idle, we use walk-down row (row 2), frames 0-8
const IDLE_ROW = 2;
const IDLE_FRAMES = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const IDLE_FPS = 6;

// Display size in the fight scene
const DISPLAY_W = 56;
const DISPLAY_H = 56;

export interface BattleSpriteProps {
  tier: string;
  spriteKey?: string; // e.g. 'villager_base' — overrides tier
  flipped?: boolean;
  hit?: boolean;
  dead?: boolean;
  attacking?: boolean;
  tintColor?: string; // hex color for enemy tint overlay
}

export default function BattleSprite({
  tier = 'villager',
  spriteKey,
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

  // Resolve sprite path
  const key = spriteKey || `${tier}_base`;
  const src = `/sprites/characters/${key}.png`;

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
    if (dead) return; // No animation when dead

    const interval = setInterval(() => {
      frameRef.current = (frameRef.current + 1) % IDLE_FRAMES.length;
    }, 1000 / IDLE_FPS);

    return () => clearInterval(interval);
  }, [dead]);

  // Render loop
  useEffect(() => {
    let raf: number;
    const draw = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) { raf = requestAnimationFrame(draw); return; }

      ctx.clearRect(0, 0, DISPLAY_W, DISPLAY_H);

      if (!loadedRef.current || !imgRef.current) {
        // Draw placeholder while loading
        ctx.fillStyle = '#4A90D940';
        ctx.fillRect(8, 4, 40, 48);
        raf = requestAnimationFrame(draw);
        return;
      }

      const img = imgRef.current;
      const frameIdx = dead ? 0 : IDLE_FRAMES[frameRef.current];
      const col = frameIdx % COLS;
      const row = IDLE_ROW;
      const sx = col * FRAME_W;
      const sy = row * FRAME_H;

      ctx.save();

      // Flip for enemy sprites
      if (flipped) {
        ctx.translate(DISPLAY_W, 0);
        ctx.scale(-1, 1);
      }

      // Hit flash — white overlay
      if (hit) {
        ctx.filter = 'brightness(3)';
      }

      // Dead — dim and rotate
      if (dead) {
        ctx.globalAlpha = 0.3;
      }

      // Draw the sprite frame
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, sx, sy, FRAME_W, FRAME_H, 0, 0, DISPLAY_W, DISPLAY_H);

      // Tint overlay for enemies
      if (tintColor && !hit) {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = tintColor;
        ctx.fillRect(0, 0, DISPLAY_W, DISPLAY_H);
      }

      ctx.restore();
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [flipped, hit, dead, tintColor]);

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
        <div style={{ position: 'absolute', top: 0, left: 14, width: 28, height: 24, backgroundColor: color, borderRadius: '3px 3px 0 0', boxShadow: hit ? `0 0 24px ${color}` : `0 0 8px ${color}40` }} />
        <div style={{ position: 'absolute', top: 8, left: 19, width: 4, height: 4, backgroundColor: '#000', borderRadius: 1 }} />
        <div style={{ position: 'absolute', top: 8, left: 33, width: 4, height: 4, backgroundColor: '#000', borderRadius: 1 }} />
        <div style={{ position: 'absolute', top: 24, left: 12, width: 32, height: 24, backgroundColor: `${color}CC` }} />
        <div style={{ position: 'absolute', top: 48, left: 14, width: 12, height: 16, backgroundColor: `${color}AA`, borderRadius: '0 0 3px 3px' }} />
        <div style={{ position: 'absolute', top: 48, right: 14, width: 12, height: 16, backgroundColor: `${color}AA`, borderRadius: '0 0 3px 3px' }} />
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
