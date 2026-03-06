// ─────────────────────────────────────────────────────────────
//  MIDFORGE — PlayerCharacter: 6-Layer Rendered Character
//
//  Layer 0: BASE BODY       — walking/idle animation (always present)
//  Layer 1: OUTFIT TINT     — color tint on base sprite (tier-based)
//  Layer 2: ARMOR OVERLAY   — gear worn (helmet, chest, weapon, shield, boots)
//  Layer 3: LABEL           — username text (color by tier)
//  Layer 4: BADGES          — tier badge + follower count badge
//  Layer 5: EFFECTS         — particles, aura glow (tier-based)
// ─────────────────────────────────────────────────────────────

// @ts-ignore — Phaser exports default from ESM build
import Phaser from 'phaser';
import {
  type CharacterData,
  type GearItem,
  type GearSlot,
  type VisualTier,
  TIER_CONFIG,
  GEAR_OFFSETS,
  GEAR_TIER_COLORS,
  AURA_COLORS,
  getFollowerBadgeColor,
} from '@midforge/shared/character';
import { PLAYER_DEPTH, PLAYER_LABEL_DEPTH } from '@midforge/shared/constants/game';

// ── Gear shape configs (fallback when no spritesheet overlay exists) ──
const GEAR_SHAPE: Record<GearSlot, { w: number; h: number; shape: 'rect' | 'circle' | 'triangle' }> = {
  weapon:  { w: 4, h: 14, shape: 'rect' },
  shield:  { w: 10, h: 12, shape: 'rect' },
  helmet:  { w: 12, h: 8,  shape: 'rect' },
  chest:   { w: 14, h: 10, shape: 'rect' },
  boots:   { w: 10, h: 5,  shape: 'rect' },
};

export class PlayerCharacter {
  // The Phaser container holding all layers
  container: Phaser.GameObjects.Container;

  // Layer 0: Base body
  baseSprite: Phaser.GameObjects.Sprite;

  // Layer 1: Outfit tint (applied to baseSprite directly)
  private outfitTint: number | null = null;

  // Layer 2: Gear overlay graphics (one per slot)
  private gearOverlays = new Map<GearSlot, Phaser.GameObjects.Graphics>();

  // Layer 3: Username label
  usernameLabel: Phaser.GameObjects.Text;

  // Layer 4: Badges
  private tierBadge: Phaser.GameObjects.Graphics | null = null;
  private followerBadge: Phaser.GameObjects.Arc | null = null;

  // Layer 5: Effects
  private auraGraphics: Phaser.GameObjects.Graphics | null = null;
  private particleTimer: Phaser.Time.TimerEvent | null = null;
  private particlePool: Phaser.GameObjects.Arc[] = [];

  // Shadow + glow (rendered below container via scene, not inside container)
  shadow: Phaser.GameObjects.Ellipse;
  glow: Phaser.GameObjects.Ellipse;

  // State
  private scene: Phaser.Scene;
  private characterData: CharacterData;
  private isOtherPlayer: boolean;
  private useCuteFantasy: boolean;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    characterData: CharacterData,
    options?: { isOtherPlayer?: boolean; useCuteFantasy?: boolean },
  ) {
    this.scene = scene;
    this.characterData = characterData;
    this.isOtherPlayer = options?.isOtherPlayer ?? false;
    this.useCuteFantasy = options?.useCuteFantasy ?? scene.textures.exists('cf_player');

    this.container = scene.add.container(x, y);

    // Layer 0: Base sprite
    if (this.useCuteFantasy) {
      this.baseSprite = scene.add.sprite(0, 0, 'cf_player');
      this.baseSprite.setScale(this.isOtherPlayer ? 2 : 3);
      if (scene.anims.exists('cf_player_idle_down')) {
        this.baseSprite.play('cf_player_idle_down');
      }
    } else {
      this.baseSprite = scene.add.sprite(0, 0, 'tiles_dungeon', 26);
      this.baseSprite.setScale(this.isOtherPlayer ? 1 : 1);
    }
    this.container.add(this.baseSprite);

    // Layer 3: Username label
    const tierCfg = TIER_CONFIG[characterData.tier] ?? TIER_CONFIG.VILLAGER;
    this.usernameLabel = scene.add.text(0, this.getLabelY(), `@${characterData.username}`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '6px',
      color: tierCfg.usernameColor,
      stroke: '#000000',
      strokeThickness: 2,
      resolution: 4,
    }).setOrigin(0.5, 1);
    this.container.add(this.usernameLabel);

    // Shadow + glow (outside container for proper depth ordering)
    const shadowAlpha = this.isOtherPlayer ? 0.25 : 0.4;
    this.shadow = scene.add.ellipse(x, y + 18, 28, 7, 0x000000, shadowAlpha)
      .setDepth(PLAYER_DEPTH - 1);
    this.glow = scene.add.ellipse(x, y + 18, 40, 12, 0xFFB800, 0.0)
      .setDepth(PLAYER_DEPTH - 2);

    // Container depth
    this.container.setDepth(PLAYER_DEPTH);

    if (this.isOtherPlayer) {
      this.baseSprite.setAlpha(0.7);
    }

    // Apply all visuals
    this.applyTierVisuals();
    this.applyGearVisuals();
  }

  // ── Label Y offset (depends on sprite system) ──────────────
  private getLabelY(): number {
    if (this.useCuteFantasy) {
      return this.isOtherPlayer ? -28 : -42;
    }
    return -16;
  }

  private getBadgeY(): number {
    return this.getLabelY() - 8;
  }

  // ═══════════════════════════════════════════════════════════
  //  TIER VISUALS (Layer 1, 3, 4, 5)
  // ═══════════════════════════════════════════════════════════

  applyTierVisuals() {
    const cfg = TIER_CONFIG[this.characterData.tier] ?? TIER_CONFIG.VILLAGER;
    this.applyOutfitTint(cfg.outfitTint);
    this.applyUsernameColor(cfg.usernameColor);
    this.applyAura(cfg.aura);
    this.applyTierBadge(cfg.badgeKey, cfg.outfitTint);
    this.applyFollowerBadge(this.characterData.xFollowers);
    this.applyParticles(cfg.particles);

    // Glow visibility: only for WARRIOR+ tiers
    if (cfg.aura) {
      const auraColor = AURA_COLORS[cfg.aura] ?? 0xFFB800;
      this.glow.setFillStyle(auraColor, 0.35);
    } else {
      this.glow.setFillStyle(0xFFB800, 0.0);
    }
  }

  private applyOutfitTint(tint: number | null) {
    this.outfitTint = tint;
    if (tint) {
      this.baseSprite.setTint(tint);
    } else {
      this.baseSprite.clearTint();
    }
  }

  private applyUsernameColor(color: string) {
    this.usernameLabel.setColor(color);
  }

  private applyAura(auraKey: string | null) {
    if (this.auraGraphics) {
      this.auraGraphics.destroy();
      this.auraGraphics = null;
    }
    if (!auraKey) return;

    const color = AURA_COLORS[auraKey] ?? 0xFFFFFF;
    this.auraGraphics = this.scene.add.graphics();
    this.auraGraphics.fillStyle(color, 0.25);
    this.auraGraphics.fillEllipse(0, 12, 32, 12);
    // Insert at bottom of container (below base sprite)
    this.container.addAt(this.auraGraphics, 0);

    // Gentle pulsing
    this.scene.tweens.add({
      targets: this.auraGraphics,
      alpha: { from: 0.6, to: 1.0 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private applyTierBadge(badgeKey: string | null, tint: number | null) {
    if (this.tierBadge) {
      this.tierBadge.destroy();
      this.tierBadge = null;
    }
    if (!badgeKey || !tint) return;

    const by = this.getBadgeY();
    this.tierBadge = this.scene.add.graphics();

    // Small colored diamond shape as tier badge
    this.tierBadge.fillStyle(tint, 1);
    this.tierBadge.fillRect(6, by, 6, 6);
    this.tierBadge.lineStyle(1, 0xFFFFFF, 0.5);
    this.tierBadge.strokeRect(6, by, 6, 6);
    this.container.add(this.tierBadge);
  }

  private applyFollowerBadge(followers: number) {
    if (this.followerBadge) {
      this.followerBadge.destroy();
      this.followerBadge = null;
    }
    const color = getFollowerBadgeColor(followers);
    if (!color) return;

    const by = this.getBadgeY();
    this.followerBadge = this.scene.add.circle(-8, by + 3, 3, color);
    this.container.add(this.followerBadge);
  }

  private applyParticles(config: typeof TIER_CONFIG.CHAMPION.particles) {
    // Clean up existing
    if (this.particleTimer) {
      this.particleTimer.destroy();
      this.particleTimer = null;
    }
    for (const p of this.particlePool) p.destroy();
    this.particlePool = [];

    if (!config) return;

    // Use a simple timer-based particle system (lightweight, no ParticleEmitterManager)
    this.particleTimer = this.scene.time.addEvent({
      delay: config.frequency,
      loop: true,
      callback: () => {
        if (this.particlePool.length > 20) return; // cap pool size

        const px = this.container.x + (Math.random() - 0.5) * 16;
        const py = this.container.y + (Math.random() - 0.5) * 16;
        const dot = this.scene.add.circle(px, py, 2, config.tint, 0.8)
          .setDepth(this.container.depth - 1);
        this.particlePool.push(dot);

        this.scene.tweens.add({
          targets: dot,
          y: py - (config.speed.min + Math.random() * (config.speed.max - config.speed.min)),
          alpha: 0,
          scale: config.scale.end,
          duration: config.lifespan,
          onComplete: () => {
            dot.destroy();
            const idx = this.particlePool.indexOf(dot);
            if (idx > -1) this.particlePool.splice(idx, 1);
          },
        });
      },
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  GEAR VISUALS (Layer 2)
  // ═══════════════════════════════════════════════════════════

  applyGearVisuals() {
    const gear = this.characterData.equippedGear;
    this.updateGearSlot('weapon', gear.weapon);
    this.updateGearSlot('shield', gear.shield);
    this.updateGearSlot('helmet', gear.helmet);
    this.updateGearSlot('chest',  gear.chest);
    this.updateGearSlot('boots',  gear.boots);
  }

  private updateGearSlot(slot: GearSlot, item: GearItem | null) {
    // Remove old overlay
    const existing = this.gearOverlays.get(slot);
    if (existing) {
      this.container.remove(existing, true);
      this.gearOverlays.delete(slot);
    }
    if (!item) return;

    const offset = GEAR_OFFSETS[slot];
    const shape = GEAR_SHAPE[slot];
    const tint = item.visualTint ?? GEAR_TIER_COLORS[item.tier] ?? 0x888888;

    // Draw gear as a small colored shape at the slot offset
    const gfx = this.scene.add.graphics();
    gfx.fillStyle(tint, 0.85);
    gfx.fillRoundedRect(
      offset.x - shape.w / 2,
      offset.y - shape.h / 2,
      shape.w,
      shape.h,
      1,
    );
    // Outline for visibility
    gfx.lineStyle(1, 0xFFFFFF, 0.4);
    gfx.strokeRoundedRect(
      offset.x - shape.w / 2,
      offset.y - shape.h / 2,
      shape.w,
      shape.h,
      1,
    );

    // High-tier gear gets a glow
    if (item.tier >= 4) {
      gfx.fillStyle(tint, 0.3);
      gfx.fillCircle(offset.x, offset.y, shape.w);
    }

    this.gearOverlays.set(slot, gfx);
    // Insert after base sprite but before label
    const labelIdx = this.container.list.indexOf(this.usernameLabel);
    this.container.addAt(gfx, Math.max(1, labelIdx));
  }

  // ═══════════════════════════════════════════════════════════
  //  UPDATE (call every frame from scene update)
  // ═══════════════════════════════════════════════════════════

  update() {
    // Y-sort depth
    this.container.setDepth(this.container.y);

    // Sync shadow + glow to container position
    this.shadow.setPosition(this.container.x, this.container.y + 18);
    this.glow.setPosition(this.container.x, this.container.y + 18);
  }

  // ═══════════════════════════════════════════════════════════
  //  DATA SETTERS (call when data changes)
  // ═══════════════════════════════════════════════════════════

  setCharacterData(data: CharacterData) {
    const tierChanged = data.tier !== this.characterData.tier;
    this.characterData = data;
    if (tierChanged) this.applyTierVisuals();
    this.applyGearVisuals();
  }

  setPosition(x: number, y: number) {
    this.container.setPosition(x, y);
    this.update();
  }

  getPosition() {
    return { x: this.container.x, y: this.container.y };
  }

  playAnimation(key: string) {
    if (this.scene.anims.exists(key)) {
      this.baseSprite.play(key, true);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  CLEANUP
  // ═══════════════════════════════════════════════════════════

  destroy() {
    if (this.particleTimer) this.particleTimer.destroy();
    for (const p of this.particlePool) p.destroy();
    this.shadow.destroy();
    this.glow.destroy();
    this.container.destroy();
  }
}

export default PlayerCharacter;
