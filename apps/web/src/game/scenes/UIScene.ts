// @ts-ignore — Phaser exports default from ESM build
import Phaser from 'phaser';
import { TILE_SIZE, FORM_UNLOCK_XP, getDailyQuest } from '@midforge/shared/constants/game';

export class UIScene extends Phaser.Scene {
  private hpBar!: Phaser.GameObjects.Graphics;
  private xpBar!: Phaser.GameObjects.Graphics;
  private xpBarFill!: Phaser.GameObjects.Graphics;
  private xpLabel!: Phaser.GameObjects.Text;

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

    // XP bar — shows progress toward next form
    this.xpBar = this.add.graphics();
    this.xpBarFill = this.add.graphics();
    const formThresholds = FORM_UNLOCK_XP[tier] ?? { upgraded: 300, ascended: 1000 };
    const form = playerData?.characterForm ?? 'base';
    const prevXP = form === 'base' ? 0 : form === 'upgraded' ? formThresholds.upgraded : formThresholds.ascended;
    const nextXP = form === 'base' ? formThresholds.upgraded : form === 'upgraded' ? formThresholds.ascended : formThresholds.ascended * 2;
    const xpProgress = Math.min(1, Math.max(0, (xp - prevXP) / (nextXP - prevXP)));
    this.drawBar(this.xpBar, 16, 42, 120, 8, 0, 0x4A90D9);
    this.drawBar(this.xpBarFill, 16, 42, 120, 8, xpProgress, 0x4A90D9);
    const remaining = Math.max(0, nextXP - xp);
    const formLabel = form === 'base' ? 'II' : form === 'upgraded' ? 'III' : 'MAX';
    this.xpLabel = this.add.text(140, 42, formLabel === 'MAX' ? 'MAX' : `${remaining}`, {
      fontSize: '6px', fontFamily: '"Press Start 2P", monospace',
      color: '#4A90D9', resolution: R,
    });

    // Listen for XP updates to animate the bar
    this.game.events.on('xp_updated', (data: { xp: number; tier: string; form: string }) => {
      this.updateXPBar(data.xp, data.tier, data.form);
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

    // ── Solo mode label (when multiplayer unavailable) ──
    this.game.events.on('solo_mode', () => {
      const camW = this.cameras.main.width;
      const soloPanel = this.add.graphics();
      soloPanel.fillStyle(0x0d0a1e, 0.7);
      soloPanel.fillRoundedRect(camW / 2 - 50, 8, 100, 16, 3);
      this.add.text(camW / 2, 16, '🗡 SOLO MODE', {
        fontSize: '5px', fontFamily: '"Press Start 2P", monospace',
        color: '#F39C12', resolution: 4,
      }).setOrigin(0.5).setAlpha(0.7);
    });

    // ── Activity feed ticker (social proof) ──
    this.loadActivityFeed();

    // ── Phase E.2: Daily quests HUD (right side) ──
    this.loadDailyQuests();

    // ── Step 8: Login streak HUD + notification listener ──
    this.createStreakHUD();
    this.game.events.on('login_streak_update', (data: { streak: number }) => {
      this.updateStreakHUD(data.streak);
    });
    this.game.events.on('login_streak_notification', (data: { streak: number; xp: number; gold: number; username: string }) => {
      this.showStreakNotification(data);
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

  // ═══════════════════════════════════════════════════════════
  //  ACTIVITY FEED TICKER (social proof)
  // ═══════════════════════════════════════════════════════════
  private feedLines: string[] = [];
  private feedText: Phaser.GameObjects.Text | null = null;
  private feedBg: Phaser.GameObjects.Rectangle | null = null;
  private feedIndex = 0;

  private async loadActivityFeed() {
    try {
      const res = await fetch('/api/events/feed');
      if (!res.ok) return;
      const data = await res.json();
      this.feedLines = data.feed ?? [];
      if (this.feedLines.length > 0) this.startFeedTicker();
    } catch (_e) {
      // Silent fail
    }
  }

  private startFeedTicker() {
    if (this.feedLines.length === 0) return;

    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const y = 22; // Below the top-left zone label

    if (!this.feedBg) {
      this.feedBg = this.add.rectangle(W / 2, y, W, 12, 0x0d0a1e, 0.6)
        .setScrollFactor(0).setDepth(98);
    }
    if (!this.feedText) {
      this.feedText = this.add.text(W + 10, y, '', {
        fontFamily: '"Press Start 2P"', fontSize: '4px',
        color: '#aaaaaa', resolution: 4,
      }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(99);
    }

    this.showNextFeedItem();
  }

  private showNextFeedItem() {
    if (this.feedLines.length === 0 || !this.feedText) return;

    const line = this.feedLines[this.feedIndex % this.feedLines.length];
    this.feedIndex++;

    const W = this.cameras.main.width;
    this.feedText.setText(line).setX(W + 10).setAlpha(1);

    // Scroll from right to left
    this.tweens.add({
      targets: this.feedText,
      x: -this.feedText.width - 20,
      duration: 8000,
      ease: 'Linear',
      onComplete: () => {
        // Next item after a brief pause
        this.time.delayedCall(2000, () => this.showNextFeedItem());
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

    // Update quest tracker HUD
    this.updateQuestTracker(worldScene);
  }

  // ═══════════════════════════════════════════════════════════
  //  QUEST TRACKER HUD (bottom-left, shows active quest)
  // ═══════════════════════════════════════════════════════════
  private questTrackerText: Phaser.GameObjects.Text | null = null;
  private questTrackerBg: Phaser.GameObjects.Rectangle | null = null;
  private lastQuestLabel = '';

  private updateQuestTracker(worldScene: any) {
    const qm = worldScene?.questManager;
    if (!qm) return;

    const active = qm.getActiveQuests();
    if (active.length === 0) {
      if (this.questTrackerText) {
        this.questTrackerText.setVisible(false);
        this.questTrackerBg?.setVisible(false);
      }
      return;
    }

    const q = active[0];
    const label = `QUEST: ${q.questId.replace(/_/g, ' ')} (${q.progress}/${q.target})`;
    if (label === this.lastQuestLabel) return;
    this.lastQuestLabel = label;

    const H = this.cameras.main.height;

    if (!this.questTrackerBg) {
      this.questTrackerBg = this.add.rectangle(8, H - 20, 220, 16, 0x0d0a1e, 0.8)
        .setOrigin(0, 0.5).setStrokeStyle(1, 0xF39C12, 0.3).setDepth(100);
    }
    if (!this.questTrackerText) {
      this.questTrackerText = this.add.text(14, H - 20, '', {
        fontFamily: '"Press Start 2P"', fontSize: '5px',
        color: '#F39C12', resolution: 4,
      }).setOrigin(0, 0.5).setDepth(101);
    }

    this.questTrackerText.setText(label).setVisible(true);
    this.questTrackerBg.setVisible(true);
  }

  private updateXPBar(currentXP: number, tier: string, form: string) {
    const thresholds = FORM_UNLOCK_XP[tier] ?? { upgraded: 300, ascended: 1000 };
    const prevXP = form === 'base' ? 0 : form === 'upgraded' ? thresholds.upgraded : thresholds.ascended;
    const nextXP = form === 'base' ? thresholds.upgraded : form === 'upgraded' ? thresholds.ascended : thresholds.ascended * 2;
    const progress = Math.min(1, Math.max(0, (currentXP - prevXP) / (nextXP - prevXP)));

    // Animate bar fill
    this.xpBarFill.clear();
    this.xpBarFill.fillStyle(0x1a0a2e, 1);
    this.xpBarFill.fillRect(16, 42, 120, 8);
    this.xpBarFill.fillStyle(0x4A90D9, 1);
    this.xpBarFill.fillRect(16, 42, 120 * progress, 8);
    this.xpBarFill.lineStyle(1, 0xF39C12, 0.3);
    this.xpBarFill.strokeRect(16, 42, 120, 8);

    // Update label
    const remaining = Math.max(0, nextXP - currentXP);
    const formLabel = form === 'base' ? 'II' : form === 'upgraded' ? 'III' : 'MAX';
    this.xpLabel.setText(formLabel === 'MAX' ? 'MAX' : `${remaining}`);

    // Flash amber at milestones
    if (progress >= 0.9 && progress < 1) {
      this.xpLabel.setColor('#F39C12');
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  STEP 6 — DAILY QUEST HUD (bottom-right, prominent)
  // ═══════════════════════════════════════════════════════════
  private dailyQuestElements: Phaser.GameObjects.GameObject[] = [];
  private dqCountdownText: Phaser.GameObjects.Text | null = null;
  private dqProgressText: Phaser.GameObjects.Text | null = null;
  private dqProgressBar: Phaser.GameObjects.Graphics | null = null;
  private dqStatusText: Phaser.GameObjects.Text | null = null;
  private dqBorderGfx: Phaser.GameObjects.Graphics | null = null;
  private dqCompleted = false;

  private loadDailyQuests() {
    const quest = getDailyQuest();
    const today = new Date().toISOString().slice(0, 10);
    const storageKey = `midforge_daily_${quest.id}_${today}`;
    const completedKey = `midforge_daily_completed_${today}`;

    let progress = 0;
    let completed = false;
    if (typeof window !== 'undefined') {
      progress = parseInt(localStorage.getItem(storageKey) ?? '0', 10);
      completed = localStorage.getItem(completedKey) === 'true';
      // Auto-grant 'login' quest
      if (quest.type === 'login' && progress === 0 && !completed) {
        progress = 1;
        localStorage.setItem(storageKey, '1');
      }
    }
    this.dqCompleted = completed || progress >= quest.target;

    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const panelW = 170;
    const panelH = 56;
    const panelX = W - panelW - 8;
    const panelY = H - panelH - 8;
    const R = 4;

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x0d0a1e, 0.9);
    bg.fillRoundedRect(panelX, panelY, panelW, panelH, 4);
    this.dailyQuestElements.push(bg);

    // Border (gold, will flash on completion)
    this.dqBorderGfx = this.add.graphics();
    this.dqBorderGfx.lineStyle(2, this.dqCompleted ? 0x27AE60 : 0xFFB800, 0.7);
    this.dqBorderGfx.strokeRoundedRect(panelX, panelY, panelW, panelH, 4);
    this.dailyQuestElements.push(this.dqBorderGfx);

    // Title + countdown
    this.add.text(panelX + 6, panelY + 4, 'DAILY QUEST', {
      fontFamily: '"Press Start 2P"', fontSize: '5px',
      color: '#FFB800', resolution: R,
    }).setDepth(101);

    // Countdown to midnight UTC
    this.dqCountdownText = this.add.text(panelX + panelW - 6, panelY + 4, '', {
      fontFamily: '"Press Start 2P"', fontSize: '5px',
      color: '#888888', resolution: R,
    }).setOrigin(1, 0).setDepth(101);
    this.updateDailyCountdown();

    // Quest text
    this.dqStatusText = this.add.text(panelX + 6, panelY + 16, this.dqCompleted ? 'QUEST COMPLETE!' : quest.text, {
      fontFamily: '"Press Start 2P"', fontSize: '5px',
      color: this.dqCompleted ? '#27AE60' : '#FFFFFF', resolution: R,
      wordWrap: { width: panelW - 12 },
    }).setDepth(101);

    // Progress bar
    const barX = panelX + 6;
    const barY = panelY + 30;
    const barW = panelW - 50;
    const barH = 6;
    const pct = Math.min(1, progress / quest.target);

    this.dqProgressBar = this.add.graphics();
    this.dqProgressBar.fillStyle(0x1a0a2e, 1);
    this.dqProgressBar.fillRect(barX, barY, barW, barH);
    this.dqProgressBar.fillStyle(this.dqCompleted ? 0x27AE60 : 0x4A90D9, 1);
    this.dqProgressBar.fillRect(barX, barY, barW * pct, barH);
    this.dqProgressBar.lineStyle(1, 0xFFB800, 0.3);
    this.dqProgressBar.strokeRect(barX, barY, barW, barH);
    this.dqProgressBar.setDepth(101);

    // Progress label
    this.dqProgressText = this.add.text(barX + barW + 4, barY + 1, `${Math.min(progress, quest.target)} / ${quest.target}`, {
      fontFamily: '"Press Start 2P"', fontSize: '4px',
      color: this.dqCompleted ? '#27AE60' : '#AAAAAA', resolution: R,
    }).setDepth(101);

    // Reward hint
    this.add.text(panelX + 6, panelY + panelH - 12, `Reward: ${quest.xp} XP + ${quest.gold} Gold`, {
      fontFamily: '"Press Start 2P"', fontSize: '3px',
      color: '#888888', resolution: R,
    }).setDepth(101);

    // Listen for daily quest progress events
    this.game.events.on('daily_quest_progress', (data: { type: string; amount: number }) => {
      this.incrementDailyQuest(data.type, data.amount);
    });

    // Also listen for building visits (from interior scenes)
    this.game.events.on('building_visited', (_building: string) => {
      this.incrementDailyQuest('explore', 1);
    });

    // Update countdown every 30s
    this.time.addEvent({
      delay: 30000,
      callback: () => this.updateDailyCountdown(),
      loop: true,
    });
  }

  private updateDailyCountdown() {
    if (!this.dqCountdownText) return;
    const now = new Date();
    const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    const diff = midnight.getTime() - now.getTime();
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    this.dqCountdownText.setText(`${hours}:${mins.toString().padStart(2, '0')}`);
  }

  private incrementDailyQuest(type: string, amount: number) {
    if (this.dqCompleted) return;

    const quest = getDailyQuest();
    if (quest.type !== type) return;

    const today = new Date().toISOString().slice(0, 10);
    const storageKey = `midforge_daily_${quest.id}_${today}`;
    const completedKey = `midforge_daily_completed_${today}`;

    let progress = 0;
    if (typeof window !== 'undefined') {
      progress = parseInt(localStorage.getItem(storageKey) ?? '0', 10);
      progress += amount;
      localStorage.setItem(storageKey, String(progress));
    }

    // Update HUD
    const pct = Math.min(1, progress / quest.target);
    if (this.dqProgressText) {
      this.dqProgressText.setText(`${Math.min(progress, quest.target)} / ${quest.target}`);
    }

    // Redraw progress bar
    if (this.dqProgressBar) {
      const W = this.cameras.main.width;
      const panelW = 170;
      const panelX = W - panelW - 8;
      const panelH = 56;
      const panelY = this.cameras.main.height - panelH - 8;
      const barX = panelX + 6;
      const barY = panelY + 30;
      const barW = panelW - 50;
      const barH = 6;

      this.dqProgressBar.clear();
      this.dqProgressBar.fillStyle(0x1a0a2e, 1);
      this.dqProgressBar.fillRect(barX, barY, barW, barH);
      this.dqProgressBar.fillStyle(pct >= 1 ? 0x27AE60 : 0x4A90D9, 1);
      this.dqProgressBar.fillRect(barX, barY, barW * pct, barH);
      this.dqProgressBar.lineStyle(1, 0xFFB800, 0.3);
      this.dqProgressBar.strokeRect(barX, barY, barW, barH);
    }

    // Check completion
    if (progress >= quest.target && !this.dqCompleted) {
      this.dqCompleted = true;
      if (typeof window !== 'undefined') {
        localStorage.setItem(completedKey, 'true');
      }
      this.playDailyQuestCompletion(quest.xp, quest.gold);
    }
  }

  private playDailyQuestCompletion(xp: number, gold: number) {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const panelW = 170;
    const panelX = W - panelW - 8;
    const panelH = 56;
    const panelY = H - panelH - 8;

    // 1. Flash gold border 3 times
    let flashCount = 0;
    const flashTimer = this.time.addEvent({
      delay: 200,
      repeat: 5,
      callback: () => {
        if (!this.dqBorderGfx) return;
        this.dqBorderGfx.clear();
        const show = flashCount % 2 === 0;
        this.dqBorderGfx.lineStyle(2, show ? 0xFFB800 : 0x27AE60, show ? 1 : 0.5);
        this.dqBorderGfx.strokeRoundedRect(panelX, panelY, panelW, panelH, 4);
        flashCount++;
      },
    });

    // 2. Update status text
    if (this.dqStatusText) {
      this.dqStatusText.setText('QUEST COMPLETE!').setColor('#FFB800');
    }
    if (this.dqProgressText) {
      this.dqProgressText.setColor('#27AE60');
    }

    // 3. XP float from quest box position
    const floatX = panelX + panelW / 2;
    const floatY = panelY - 10;
    const xpFloat = this.add.text(floatX, floatY, `+${xp} XP`, {
      fontFamily: '"Press Start 2P"', fontSize: '8px',
      color: '#FFB800', stroke: '#000000', strokeThickness: 3, resolution: 4,
    }).setOrigin(0.5).setDepth(200);

    const goldFloat = this.add.text(floatX, floatY + 14, `+${gold}G`, {
      fontFamily: '"Press Start 2P"', fontSize: '6px',
      color: '#F5D442', stroke: '#000000', strokeThickness: 3, resolution: 4,
    }).setOrigin(0.5).setDepth(200);

    this.tweens.add({
      targets: [xpFloat, goldFloat],
      y: `-=30`, alpha: 0,
      duration: 2000, ease: 'Power2',
      onComplete: () => { xpFloat.destroy(); goldFloat.destroy(); },
    });

    // 4. Emit award event
    this.game.events.emit('award_xp_gold', { xp, gold });

    // 5. After 3s, show "New quest tomorrow!"
    this.time.delayedCall(3000, () => {
      if (this.dqStatusText) {
        this.dqStatusText.setText('New quest tomorrow!').setColor('#888888');
      }
      // Final border state
      if (this.dqBorderGfx) {
        this.dqBorderGfx.clear();
        this.dqBorderGfx.lineStyle(2, 0x27AE60, 0.5);
        this.dqBorderGfx.strokeRoundedRect(panelX, panelY, panelW, panelH, 4);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  STEP 8 — LOGIN STREAK HUD + NOTIFICATION
  // ═══════════════════════════════════════════════════════════
  private streakText: Phaser.GameObjects.Text | null = null;
  private streakBg: Phaser.GameObjects.Graphics | null = null;

  private createStreakHUD() {
    const W = this.cameras.main.width;
    const R = 4;
    const x = W - 100;
    const y = 92; // Below minimap area

    this.streakBg = this.add.graphics();
    this.streakBg.fillStyle(0x0d0a1e, 0.8);
    this.streakBg.fillRoundedRect(x, y, 44, 16, 3);
    this.streakBg.lineStyle(1, 0xFFB800, 0.3);
    this.streakBg.strokeRoundedRect(x, y, 44, 16, 3);
    this.streakBg.setDepth(100);

    this.streakText = this.add.text(x + 22, y + 8, '0', {
      fontFamily: '"Press Start 2P"', fontSize: '6px',
      color: '#FFFFFF', resolution: R,
    }).setOrigin(0.5).setDepth(101);
  }

  private updateStreakHUD(streak: number) {
    if (!this.streakText) return;
    const prefix = streak >= 3 ? '\uD83D\uDD25 ' : '';
    this.streakText.setText(`${prefix}${streak}`);
    if (streak >= 7) {
      this.streakText.setColor('#FFB800');
    } else if (streak >= 3) {
      this.streakText.setColor('#FF6600');
    }
  }

  private showStreakNotification(data: { streak: number; xp: number; gold: number; username: string }) {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const R = 4;

    const boxW = 240;
    const boxH = 90;
    const bx = W / 2 - boxW / 2;
    const by = H / 2 - boxH / 2;
    const streak = data.streak;
    const xpBonus = 10 + streak * 5;

    // Background
    const bg = this.add.rectangle(W / 2, H / 2, boxW, boxH, 0x0D0D1A, 0.95)
      .setScrollFactor(0).setDepth(900);

    // Gold border
    const border = this.add.graphics().setScrollFactor(0).setDepth(901);
    border.lineStyle(2, 0xFFB800, 1);
    border.strokeRect(bx, by, boxW, boxH);

    // Title
    const firePrefix = streak >= 3 ? '\uD83D\uDD25 ' : '';
    const title = this.add.text(W / 2, by + 14, `${firePrefix}LOGIN STREAK`, {
      fontFamily: '"Press Start 2P"', fontSize: '8px',
      color: '#FFB800', resolution: R,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(902);

    // Streak number
    const streakNum = this.add.text(W / 2, by + 34, `${streak} DAYS IN A ROW!`, {
      fontFamily: '"Press Start 2P"', fontSize: '10px',
      color: '#FFFFFF', resolution: R,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(902);

    // XP bonus
    const xpText = this.add.text(W / 2, by + 54, `+${data.xp} XP  +${data.gold}G  bonus awarded`, {
      fontFamily: '"Press Start 2P"', fontSize: '5px',
      color: '#4A90D9', resolution: R,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(902);

    // Flavor
    const flavor = this.add.text(W / 2, by + boxH - 12, `Keep it up!`, {
      fontFamily: '"Press Start 2P"', fontSize: '5px',
      color: '#888888', resolution: R,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(902);

    const allElements = [bg, border, title, streakNum, xpText, flavor];

    // Scale-in animation
    for (const el of allElements) {
      if ('setScale' in el) (el as any).setScale(0);
    }
    this.tweens.add({
      targets: allElements,
      scaleX: 1, scaleY: 1,
      duration: 300, ease: 'Back.easeOut',
    });

    // Auto-dismiss after 3s
    this.time.delayedCall(3000, () => {
      this.tweens.add({
        targets: allElements,
        alpha: 0,
        duration: 400,
        onComplete: () => {
          for (const el of allElements) el.destroy();
        },
      });
    });
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
