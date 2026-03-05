// @ts-ignore — Phaser exports default from ESM build
import Phaser from 'phaser';
import { TILE_SIZE } from '@midforge/shared/constants/game';

export class UIScene extends Phaser.Scene {
  private hpBar!: Phaser.GameObjects.Graphics;
  private xpBar!: Phaser.GameObjects.Graphics;

  // Minimap (FIX 5)
  private minimapPlayer!: Phaser.GameObjects.Rectangle;
  private mmOriginX = 0;
  private mmOriginY = 0;
  private mmScale = 1;

  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    const playerData = this.registry.get('playerData');
    const tier = playerData?.tier ?? 'villager';
    const level = playerData?.level ?? 1;
    const xp = playerData?.xp ?? 0;
    const gold = playerData?.gold ?? 0;
    const mrr = playerData?.mrr ?? 0;
    const followers = playerData?.xFollowers ?? 0;

    const tierColors: Record<string, string> = {
      villager: '#8B7355', apprentice: '#4A90D9',
      merchant: '#7B68EE', warrior: '#E74C3C', legend: '#F39C12',
    };

    const R = 4; // resolution for all text

    // Background panel (top-left)
    const panel = this.add.graphics();
    panel.fillStyle(0x0d0a1e, 0.85);
    panel.fillRoundedRect(8, 8, 200, 70, 4);
    panel.lineStyle(1, 0xF39C12, 0.4);
    panel.strokeRoundedRect(8, 8, 200, 70, 4);

    // Tier + Level
    this.add.text(16, 14, `${tier.toUpperCase()} LV.${level}`, {
      fontSize: '7px', fontFamily: '"Press Start 2P", monospace',
      color: tierColors[tier] || '#ffffff', resolution: R,
    });

    // HP bar
    this.hpBar = this.add.graphics();
    this.drawBar(this.hpBar, 16, 30, 120, 8, 1.0, 0xE74C3C);
    this.add.text(140, 30, 'HP', {
      fontSize: '6px', fontFamily: '"Press Start 2P", monospace',
      color: '#E74C3C', resolution: R,
    });

    // XP bar
    this.xpBar = this.add.graphics();
    const xpProgress = Math.min(1, (xp % 1000) / 1000);
    this.drawBar(this.xpBar, 16, 42, 120, 8, xpProgress, 0x4A90D9);
    this.add.text(140, 42, 'XP', {
      fontSize: '6px', fontFamily: '"Press Start 2P", monospace',
      color: '#4A90D9', resolution: R,
    });

    // Gold + MRR
    this.add.text(16, 56, `${gold}G`, {
      fontSize: '6px', fontFamily: '"Press Start 2P", monospace',
      color: '#F39C12', resolution: R,
    });
    this.add.text(70, 56, `$${(mrr / 100).toLocaleString()}`, {
      fontSize: '6px', fontFamily: '"Press Start 2P", monospace',
      color: '#27AE60', resolution: R,
    });
    this.add.text(140, 56, `${followers >= 1000 ? (followers / 1000).toFixed(1) + 'K' : followers}`, {
      fontSize: '6px', fontFamily: '"Press Start 2P", monospace',
      color: '#4A90D9', resolution: R,
    });

    // Controls hint (bottom-right) — desktop only
    const isMobile = this.registry.get('isMobile') === true;
    if (!isMobile) {
      const hintPanel = this.add.graphics();
      hintPanel.fillStyle(0x0d0a1e, 0.7);
      hintPanel.fillRoundedRect(this.cameras.main.width - 130, this.cameras.main.height - 28, 122, 20, 3);
      this.add.text(this.cameras.main.width - 124, this.cameras.main.height - 24, 'WASD / ARROWS to move', {
        fontSize: '5px', fontFamily: '"Press Start 2P", monospace',
        color: '#F5DEB3', resolution: R,
      }).setAlpha(0.5);
    }

    // ── Minimap (FIX 5) ──
    this.createMinimap();

    // ── Zone entry banner listener (FIX 6) ──
    this.game.events.on('zone_enter_banner', (label: string) => {
      this.showZoneBanner(label);
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  MINIMAP (FIX 5 — top-right corner, 1px per tile)
  // ═══════════════════════════════════════════════════════════
  private createMinimap() {
    const MAP_W = 80;
    const MAP_H = 70;
    const MM_W = 80;
    const MM_H = 70;
    const SCALE = 1;
    const PAD = 8;

    const mmX = this.cameras.main.width - MM_W - PAD;
    const mmY = PAD;

    this.mmOriginX = mmX;
    this.mmOriginY = mmY;
    this.mmScale = SCALE;

    // Dark background
    const bg = this.add.rectangle(mmX + MM_W / 2, mmY + MM_H / 2, MM_W + 4, MM_H + 4, 0x0d0a1e, 0.85)
      .setStrokeStyle(1, 0xF39C12, 0.6).setDepth(200);

    // Key location dots
    const KEY_LOCS = [
      { name: 'Arena',   x: 40, y: 62, color: 0xFF4444 },
      { name: 'Market',  x: 55, y: 36, color: 0x22cc88 },
      { name: 'Forge',   x: 25, y: 32, color: 0xFF8C00 },
      { name: 'Elder',   x: 40, y: 37, color: 0xF39C12 },
      { name: 'Castle',  x: 39, y: 5,  color: 0xFFD700 },
      { name: 'Campfire',x: 40, y: 46, color: 0xFF6600 },
    ];

    for (const loc of KEY_LOCS) {
      this.add.rectangle(mmX + loc.x * SCALE, mmY + loc.y * SCALE, 3, 3, loc.color)
        .setDepth(201);
    }

    // Player dot (updates each frame)
    this.minimapPlayer = this.add.rectangle(mmX, mmY, 4, 4, 0xffffff).setDepth(202);
  }

  // ═══════════════════════════════════════════════════════════
  //  ZONE ENTRY BANNER (FIX 6 — Pokémon-style slide-in)
  // ═══════════════════════════════════════════════════════════
  private showZoneBanner(label: string) {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    const bgWidth = Math.min(W - 32, 260);
    const startX = -bgWidth / 2 - 20;
    const endX = bgWidth / 2 + 16;

    const bg = this.add.rectangle(startX, H / 2 - 30, bgWidth, 36, 0x0d0a1e, 0.92)
      .setStrokeStyle(2, 0xF39C12).setScrollFactor(0).setDepth(300);

    const text = this.add.text(startX, H / 2 - 30, label, {
      fontFamily: '"Press Start 2P"', fontSize: '8px',
      color: '#F39C12', resolution: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(301);

    // Slide in from left
    this.tweens.add({
      targets: [bg, text],
      x: `+=${endX - startX}`,
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Hold 2s then fade out
        this.time.delayedCall(2000, () => {
          this.tweens.add({
            targets: [bg, text],
            alpha: 0,
            duration: 500,
            onComplete: () => { bg.destroy(); text.destroy(); },
          });
        });
      },
    });
  }

  update() {
    // Update minimap player dot
    if (!this.minimapPlayer) return;

    const worldScene = this.scene.get('WorldScene') as any;
    if (!worldScene?.player) return;

    const playerTileX = worldScene.player.x / TILE_SIZE;
    const playerTileY = worldScene.player.y / TILE_SIZE;

    this.minimapPlayer.setPosition(
      this.mmOriginX + playerTileX * this.mmScale,
      this.mmOriginY + playerTileY * this.mmScale,
    );
  }

  private drawBar(graphics: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, pct: number, color: number) {
    graphics.fillStyle(0x1a0a2e, 1);
    graphics.fillRect(x, y, w, h);
    graphics.fillStyle(color, 1);
    graphics.fillRect(x, y, w * pct, h);
    graphics.lineStyle(1, 0xF39C12, 0.3);
    graphics.strokeRect(x, y, w, h);
  }
}
