// ─────────────────────────────────────────────────────────────
//  MIDFORGE — InventoryScene: Full-screen equipment overlay
//  Triggered by INV button or I key. Shows equipped gear,
//  inventory grid, player preview, and stats.
// ─────────────────────────────────────────────────────────────

// @ts-ignore — Phaser exports default from ESM build
import Phaser from 'phaser';
import {
  type CharacterData,
  type GearItem,
  type GearSlot,
  GEAR_TIER_COLORS,
  GEAR_TIER_COLOR_STR,
  GEAR_CATALOG,
  TIER_CONFIG,
} from '@midforge/shared/character';

const R = 4; // resolution multiplier
const FONT = '"Press Start 2P", monospace';

export class InventoryScene extends Phaser.Scene {
  private elements: Phaser.GameObjects.GameObject[] = [];
  private characterData!: CharacterData;

  constructor() {
    super({ key: 'InventoryScene' });
  }

  init(data: { characterData: CharacterData }) {
    this.characterData = data.characterData;
  }

  create() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    // ── Full-screen dark overlay ──
    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.85)
      .setScrollFactor(0).setDepth(0).setInteractive();
    this.elements.push(overlay);

    // ── Title ──
    this.el(this.add.text(12, 8, 'INVENTORY', {
      fontFamily: FONT, fontSize: '10px', color: '#FFB800', resolution: R,
    }));

    // ── Close button ──
    const closeBtn = this.add.text(W - 14, 8, 'X', {
      fontFamily: FONT, fontSize: '10px', color: '#FF4444', resolution: R,
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.closeInventory());
    this.el(closeBtn);

    // ESC to close
    this.input.keyboard!.once('keydown-ESC', () => this.closeInventory());
    this.input.keyboard!.once('keydown-I', () => this.closeInventory());

    // ── Layout ──
    const leftW = 100;  // player preview panel
    const rightW = W - leftW - 24;
    const startY = 28;

    // ════════════════════════════════════════
    // LEFT PANEL: Player preview + stats
    // ════════════════════════════════════════
    const lpX = 8;

    // Preview background
    this.el(this.add.rectangle(lpX + leftW / 2, startY + 50, leftW, 100, 0x1a0a2e, 0.9)
      .setStrokeStyle(1, 0xFFB800, 0.3));

    // Player sprite preview (static)
    if (this.textures.exists('cf_player')) {
      const preview = this.add.sprite(lpX + leftW / 2, startY + 42, 'cf_player').setScale(1.5);
      if (this.anims.exists('cf_player_idle_down')) preview.play('cf_player_idle_down');
      this.el(preview);

      // Tier tint on preview
      const tierCfg = this.getTierConfig();
      if (tierCfg.outfitTint) preview.setTint(tierCfg.outfitTint);
    }

    // Username
    this.el(this.add.text(lpX + leftW / 2, startY + 72, `@${this.characterData.username}`, {
      fontFamily: FONT, fontSize: '5px', color: '#FFFFFF', resolution: R,
    }).setOrigin(0.5));

    // Stats
    const statsY = startY + 86;
    this.el(this.add.text(lpX + 4, statsY, `Level ${this.characterData.level}`, {
      fontFamily: FONT, fontSize: '5px', color: '#FFB800', resolution: R,
    }));
    this.el(this.add.text(lpX + 4, statsY + 12, `ATK: ${this.characterData.atk}`, {
      fontFamily: FONT, fontSize: '5px', color: '#FF6666', resolution: R,
    }));
    this.el(this.add.text(lpX + 4, statsY + 22, `DEF: ${this.characterData.def}`, {
      fontFamily: FONT, fontSize: '5px', color: '#6699FF', resolution: R,
    }));
    this.el(this.add.text(lpX + 4, statsY + 32, `HP: ${this.characterData.hp}/${this.characterData.maxHp}`, {
      fontFamily: FONT, fontSize: '5px', color: '#44CC44', resolution: R,
    }));
    this.el(this.add.text(lpX + 4, statsY + 42, `Gold: ${this.characterData.gold}`, {
      fontFamily: FONT, fontSize: '5px', color: '#F5D442', resolution: R,
    }));

    // ════════════════════════════════════════
    // RIGHT PANEL: Equipped gear
    // ════════════════════════════════════════
    const rpX = lpX + leftW + 8;
    const eqY = startY;

    this.el(this.add.text(rpX, eqY, 'EQUIPPED', {
      fontFamily: FONT, fontSize: '6px', color: '#FFB800', resolution: R,
    }));

    const slots: GearSlot[] = ['weapon', 'helmet', 'chest', 'shield', 'boots'];
    const slotIcons: Record<GearSlot, string> = {
      weapon: '\u2694', helmet: '\u26D1', chest: '\uD83D\uDC55',
      shield: '\uD83D\uDEE1', boots: '\uD83D\uDC62',
    };

    slots.forEach((slot, i) => {
      const sy = eqY + 14 + i * 18;
      const item = this.characterData.equippedGear[slot];
      const icon = slotIcons[slot];
      const tierColor = item ? GEAR_TIER_COLOR_STR[item.tier] : '#444444';
      const name = item ? item.name : `(empty ${slot})`;

      // Slot row background
      const rowBg = this.add.rectangle(rpX + rightW / 2, sy + 6, rightW, 16, 0x1a0a2e, 0.7)
        .setStrokeStyle(1, item ? GEAR_TIER_COLORS[item.tier] : 0x333333, 0.5);
      this.el(rowBg);

      // Icon + name
      this.el(this.add.text(rpX + 4, sy + 2, `${icon} ${name}`, {
        fontFamily: FONT, fontSize: '5px', color: tierColor, resolution: R,
      }));

      // Stat bonus
      if (item) {
        const statStr = item.atk ? `+${item.atk} ATK` : item.def ? `+${item.def} DEF` : '';
        this.el(this.add.text(rpX + rightW - 4, sy + 2, statStr, {
          fontFamily: FONT, fontSize: '4px', color: '#888888', resolution: R,
        }).setOrigin(1, 0));

        // Click to unequip
        rowBg.setInteractive({ useHandCursor: true });
        rowBg.on('pointerdown', () => {
          const worldScene = this.scene.get('WorldScene') as any;
          if (worldScene?.unequipSlot) {
            worldScene.unequipSlot(slot);
            this.characterData = worldScene.getCharacterData();
            this.refreshUI();
          }
        });
      }
    });

    // ════════════════════════════════════════
    // BOTTOM: Inventory grid
    // ════════════════════════════════════════
    const gridY = eqY + 14 + slots.length * 18 + 10;
    const gridX = rpX;
    const cellSize = 28;
    const cols = 6;
    const maxSlots = 12;

    this.el(this.add.text(gridX, gridY - 12, 'INVENTORY', {
      fontFamily: FONT, fontSize: '6px', color: '#AAAAAA', resolution: R,
    }));

    for (let i = 0; i < maxSlots; i++) {
      const cx = gridX + (i % cols) * (cellSize + 2);
      const cy = gridY + Math.floor(i / cols) * (cellSize + 2);
      const item = this.characterData.inventory[i] ?? null;

      const borderColor = item ? GEAR_TIER_COLORS[item.tier] : 0x333333;
      const cell = this.add.rectangle(cx + cellSize / 2, cy + cellSize / 2, cellSize, cellSize, 0x1a0a2e, 0.8)
        .setStrokeStyle(1, borderColor, item ? 0.8 : 0.3);
      this.el(cell);

      if (item) {
        // Item name (abbreviated)
        const abbr = item.name.split(' ').map(w => w[0]).join('');
        this.el(this.add.text(cx + cellSize / 2, cy + cellSize / 2 - 4, abbr, {
          fontFamily: FONT, fontSize: '6px',
          color: GEAR_TIER_COLOR_STR[item.tier], resolution: R,
        }).setOrigin(0.5));

        // Item type label
        this.el(this.add.text(cx + cellSize / 2, cy + cellSize / 2 + 6, item.type.slice(0, 3), {
          fontFamily: FONT, fontSize: '3px', color: '#888888', resolution: R,
        }).setOrigin(0.5));

        // Tier 5: pulsing border
        if (item.tier >= 5) {
          this.tweens.add({
            targets: cell,
            strokeAlpha: { from: 0.4, to: 1 },
            duration: 600, yoyo: true, repeat: -1,
          });
        }

        // Click to equip
        cell.setInteractive({ useHandCursor: true });
        cell.on('pointerdown', () => {
          const worldScene = this.scene.get('WorldScene') as any;
          if (worldScene?.equipItem) {
            worldScene.equipItem(item.id);
            this.characterData = worldScene.getCharacterData();
            this.refreshUI();
          }
        });
      }
    }

    // ── Hint text ──
    this.el(this.add.text(W / 2, H - 8, 'Tap equipped item to unequip  |  Tap inventory item to equip', {
      fontFamily: FONT, fontSize: '3px', color: '#666666', resolution: R,
    }).setOrigin(0.5));
  }

  private getTierConfig() {
    return TIER_CONFIG[this.characterData.tier] ?? TIER_CONFIG.VILLAGER;
  }

  private el(obj: Phaser.GameObjects.GameObject): Phaser.GameObjects.GameObject {
    this.elements.push(obj);
    return obj;
  }

  private refreshUI() {
    // Destroy all elements and re-create
    for (const el of this.elements) el.destroy();
    this.elements = [];
    this.create();
  }

  private closeInventory() {
    this.scene.stop('InventoryScene');
    this.scene.resume('WorldScene');
  }
}

export default InventoryScene;
