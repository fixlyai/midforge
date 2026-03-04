// @ts-ignore — Phaser exports default from ESM build
import Phaser from 'phaser';

const TIER_COLORS: Record<string, number> = {
  villager:   0x8B7355,
  apprentice: 0x4A90D9,
  merchant:   0x7B68EE,
  warrior:    0xE74C3C,
  legend:     0xF39C12,
};

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    // Nothing external to load — we generate everything
  }

  create() {
    // Generate placeholder sprites for each tier (colored rectangles)
    const tiers = Object.keys(TIER_COLORS);
    for (const tier of tiers) {
      this.generateSpriteSheet(tier, TIER_COLORS[tier]);
    }

    // Generate tileset textures
    this.generateTileset();

    this.scene.start('WorldScene');
  }

  private generateSpriteSheet(tier: string, color: number) {
    // 48x48 frames, 4 directions × 3 frames each = 12 frames total
    // Layout: row0=down(3), row1=left(3), row2=right(3), row3=up(3)
    const frameW = 48;
    const frameH = 48;
    const cols = 3;
    const rows = 4;
    const canvas = document.createElement('canvas');
    canvas.width = frameW * cols;
    canvas.height = frameH * rows;
    const ctx = canvas.getContext('2d')!;

    const baseColor = '#' + color.toString(16).padStart(6, '0');
    const darkerColor = this.darkenColor(baseColor, 0.7);
    const lighterColor = this.lightenColor(baseColor, 1.3);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * frameW;
        const y = row * frameH;

        // Body
        ctx.fillStyle = baseColor;
        ctx.fillRect(x + 14, y + 16, 20, 24);

        // Head
        ctx.fillStyle = lighterColor;
        ctx.fillRect(x + 16, y + 4, 16, 14);

        // Eyes (direction-based)
        ctx.fillStyle = '#000000';
        if (row === 0) { // down
          ctx.fillRect(x + 19, y + 10, 3, 3);
          ctx.fillRect(x + 26, y + 10, 3, 3);
        } else if (row === 1) { // left
          ctx.fillRect(x + 17, y + 10, 3, 3);
        } else if (row === 2) { // right
          ctx.fillRect(x + 28, y + 10, 3, 3);
        } else { // up — no eyes visible
        }

        // Legs with walk animation offset
        ctx.fillStyle = darkerColor;
        const legOffset = (col === 1) ? 3 : (col === 2) ? -3 : 0;
        ctx.fillRect(x + 16 + legOffset, y + 38, 7, 8);
        ctx.fillRect(x + 25 - legOffset, y + 38, 7, 8);
      }
    }

    // Add to Phaser texture cache as a sprite sheet
    const tex = this.textures.addCanvas(tier, canvas);
    if (!tex) return;
    tex.add(0, 0, 0, 0, frameW, frameH); // overwrite frame 0

    // Manually add all 12 frames
    for (let i = 0; i < rows * cols; i++) {
      const fc = i % cols;
      const fr = Math.floor(i / cols);
      tex.add(i, 0, fc * frameW, fr * frameH, frameW, frameH);
    }
  }

  private generateTileset() {
    // Grass tile (32x32)
    const grassCanvas = document.createElement('canvas');
    grassCanvas.width = 32;
    grassCanvas.height = 32;
    const gCtx = grassCanvas.getContext('2d')!;
    gCtx.fillStyle = '#2d5a1e';
    gCtx.fillRect(0, 0, 32, 32);
    // Add some texture dots
    gCtx.fillStyle = '#3a6b28';
    for (let i = 0; i < 8; i++) {
      const dx = Math.floor(Math.random() * 28) + 2;
      const dy = Math.floor(Math.random() * 28) + 2;
      gCtx.fillRect(dx, dy, 2, 2);
    }
    this.textures.addCanvas('tile_grass', grassCanvas);

    // Stone/wall tile
    const stoneCanvas = document.createElement('canvas');
    stoneCanvas.width = 32;
    stoneCanvas.height = 32;
    const sCtx = stoneCanvas.getContext('2d')!;
    sCtx.fillStyle = '#555566';
    sCtx.fillRect(0, 0, 32, 32);
    sCtx.fillStyle = '#666677';
    sCtx.fillRect(1, 1, 14, 14);
    sCtx.fillRect(17, 1, 14, 14);
    sCtx.fillRect(1, 17, 14, 14);
    sCtx.fillRect(17, 17, 14, 14);
    this.textures.addCanvas('tile_stone', stoneCanvas);

    // Water tile
    const waterCanvas = document.createElement('canvas');
    waterCanvas.width = 32;
    waterCanvas.height = 32;
    const wCtx = waterCanvas.getContext('2d')!;
    wCtx.fillStyle = '#1a4a7a';
    wCtx.fillRect(0, 0, 32, 32);
    wCtx.fillStyle = '#2060a0';
    wCtx.fillRect(4, 8, 24, 3);
    wCtx.fillRect(8, 20, 20, 3);
    this.textures.addCanvas('tile_water', waterCanvas);

    // Path/dirt tile
    const pathCanvas = document.createElement('canvas');
    pathCanvas.width = 32;
    pathCanvas.height = 32;
    const pCtx = pathCanvas.getContext('2d')!;
    pCtx.fillStyle = '#8B7355';
    pCtx.fillRect(0, 0, 32, 32);
    pCtx.fillStyle = '#9a8060';
    pCtx.fillRect(3, 5, 4, 3);
    pCtx.fillRect(20, 15, 5, 3);
    pCtx.fillRect(10, 25, 4, 3);
    this.textures.addCanvas('tile_path', pathCanvas);
  }

  private darkenColor(hex: string, factor: number): string {
    const r = Math.floor(parseInt(hex.slice(1, 3), 16) * factor);
    const g = Math.floor(parseInt(hex.slice(3, 5), 16) * factor);
    const b = Math.floor(parseInt(hex.slice(5, 7), 16) * factor);
    return `rgb(${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)})`;
  }

  private lightenColor(hex: string, factor: number): string {
    return this.darkenColor(hex, factor);
  }
}
