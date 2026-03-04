// @ts-ignore — Phaser exports default from ESM build
import Phaser from 'phaser';

export class UIScene extends Phaser.Scene {
  private hpBar!: Phaser.GameObjects.Graphics;
  private xpBar!: Phaser.GameObjects.Graphics;
  private statsText!: Phaser.GameObjects.Text;

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

    // Background panel (top-left)
    const panel = this.add.graphics();
    panel.fillStyle(0x0d0a1e, 0.85);
    panel.fillRoundedRect(8, 8, 200, 70, 4);
    panel.lineStyle(1, 0xF39C12, 0.4);
    panel.strokeRoundedRect(8, 8, 200, 70, 4);

    // Tier + Level
    this.add.text(16, 14, `${tier.toUpperCase()} LV.${level}`, {
      fontSize: '7px',
      fontFamily: '"Press Start 2P", monospace',
      color: tierColors[tier] || '#ffffff',
    });

    // HP bar
    this.hpBar = this.add.graphics();
    this.drawBar(this.hpBar, 16, 30, 120, 8, 1.0, 0xE74C3C);
    this.add.text(140, 30, 'HP', {
      fontSize: '6px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#E74C3C',
    });

    // XP bar
    this.xpBar = this.add.graphics();
    const xpProgress = Math.min(1, (xp % 1000) / 1000);
    this.drawBar(this.xpBar, 16, 42, 120, 8, xpProgress, 0x4A90D9);
    this.add.text(140, 42, 'XP', {
      fontSize: '6px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#4A90D9',
    });

    // Gold + MRR
    this.add.text(16, 56, `${gold}G`, {
      fontSize: '6px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#F39C12',
    });

    this.add.text(70, 56, `$${(mrr / 100).toLocaleString()}`, {
      fontSize: '6px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#27AE60',
    });

    this.add.text(140, 56, `${followers >= 1000 ? (followers / 1000).toFixed(1) + 'K' : followers}`, {
      fontSize: '6px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#4A90D9',
    });

    // Controls hint (bottom-right)
    const hintPanel = this.add.graphics();
    hintPanel.fillStyle(0x0d0a1e, 0.7);
    hintPanel.fillRoundedRect(this.cameras.main.width - 130, this.cameras.main.height - 28, 122, 20, 3);
    this.add.text(this.cameras.main.width - 124, this.cameras.main.height - 24, 'WASD / ARROWS to move', {
      fontSize: '5px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#F5DEB3',
    }).setAlpha(0.5);
  }

  private drawBar(graphics: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, pct: number, color: number) {
    // Background
    graphics.fillStyle(0x1a0a2e, 1);
    graphics.fillRect(x, y, w, h);
    // Fill
    graphics.fillStyle(color, 1);
    graphics.fillRect(x, y, w * pct, h);
    // Border
    graphics.lineStyle(1, 0xF39C12, 0.3);
    graphics.strokeRect(x, y, w, h);
  }
}
