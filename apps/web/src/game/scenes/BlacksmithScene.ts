// @ts-ignore
import Phaser from 'phaser';
import { INTRO } from '@midforge/shared/constants/game';
import {
  type GearItem,
  type GearSlot,
  GEAR_CATALOG,
  GEAR_TIER_COLORS,
  GEAR_TIER_COLOR_STR,
  getShopItems,
} from '@midforge/shared/character';

// ═══════════════════════════════════════════════════════════
//  BLACKSMITH SCENE — Interior of the Blacksmith's Forge
//  Delivery quest completion + upgrade shop
// ═══════════════════════════════════════════════════════════

const TILE = 16;
const SCALE = 2;
const COLS = 12;
const ROWS = 10;
const ROOM_W = COLS * TILE * SCALE;
const ROOM_H = ROWS * TILE * SCALE;

const SHOP_TABS: { label: string; slot: GearSlot; icon: string }[] = [
  { label: 'WEAPONS', slot: 'weapon', icon: '\u2694' },
  { label: 'HELMETS', slot: 'helmet', icon: '\u26D1' },
  { label: 'ARMOR',   slot: 'chest',  icon: '\uD83D\uDC55' },
  { label: 'SHIELDS', slot: 'shield', icon: '\uD83D\uDEE1' },
  { label: 'BOOTS',   slot: 'boots',  icon: '\uD83D\uDC62' },
];

export default class BlacksmithScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private dialogueActive = false;
  private shopOpen = false;
  private shopElements: Phaser.GameObjects.GameObject[] = [];
  private returnPos = { x: 192, y: 816 };

  constructor() {
    super({ key: 'BlacksmithScene' });
  }

  init(data: { returnX?: number; returnY?: number }) {
    if (data.returnX != null) this.returnPos.x = data.returnX;
    if (data.returnY != null) this.returnPos.y = data.returnY;
  }

  create() {
    this.dialogueActive = false;
    this.shopOpen = false;
    this.shopElements = [];
    this.cameras.main.setBackgroundColor('#1a1008');
    this.cameras.main.fadeIn(500, 0, 0, 0);

    // ── Floor ──
    if (this.textures.exists('dg1_tileset')) {
      const floor = this.add.tileSprite(ROOM_W / 2, ROOM_H / 2, ROOM_W, ROOM_H, 'dg1_tileset')
        .setScale(SCALE).setDepth(0);
      floor.setTilePosition(96, 96);
    } else {
      this.add.rectangle(ROOM_W / 2, ROOM_H / 2, ROOM_W, ROOM_H, 0x3b2a17).setDepth(0);
    }

    // ── Walls ──
    const wc = 0x2a1a08;
    const wt = TILE * SCALE;
    this.add.rectangle(ROOM_W / 2, wt / 2, ROOM_W, wt, wc).setDepth(1);
    this.add.rectangle(ROOM_W / 2, ROOM_H - wt / 2, ROOM_W, wt, wc).setDepth(1);
    this.add.rectangle(wt / 2, ROOM_H / 2, wt, ROOM_H, wc).setDepth(1);
    this.add.rectangle(ROOM_W - wt / 2, ROOM_H / 2, wt, ROOM_H, wc).setDepth(1);

    // ── Anvil (center-left) ──
    this.add.rectangle(ROOM_W / 3, ROOM_H / 2, TILE * SCALE, TILE * SCALE * 0.8, 0x555555).setDepth(3);
    this.add.text(ROOM_W / 3, ROOM_H / 2 - 4, '\u2692', {
      fontSize: '16px', resolution: 4,
    }).setOrigin(0.5).setDepth(4);

    // ── Forge fire (campfire on right wall) ──
    if (this.textures.exists('cf_campfire')) {
      const fire = this.add.sprite(ROOM_W - wt * 2, wt + TILE * SCALE, 'cf_campfire')
        .setScale(SCALE).setDepth(5);
      if (this.anims.exists('cf_campfire_anim')) fire.play('cf_campfire_anim');
      // Glow
      this.add.ellipse(ROOM_W - wt * 2, wt + TILE * SCALE + 8, 60, 30, 0xFF6600, 0.15).setDepth(2);
    }

    // ── Weapon racks (left wall) ──
    if (this.textures.exists('mc_weapon_stand')) {
      this.add.image(wt + TILE, ROOM_H / 2 - TILE * SCALE, 'mc_weapon_stand').setScale(SCALE * 0.8).setDepth(4);
    }

    // ── Blacksmith NPC (behind anvil) ──
    const npcX = ROOM_W / 2 + TILE * SCALE * 2;
    const npcY = wt + TILE * SCALE * 2;
    const cfKey = 'cf_npc_Lumberjack_Jack';
    const useCF = this.textures.exists(cfKey);

    if (useCF) {
      this.add.sprite(npcX, npcY, cfKey).setScale(SCALE).setDepth(6)
        .play(this.anims.exists(`${cfKey}_idle_down`) ? `${cfKey}_idle_down` : '');
    } else {
      this.add.sprite(npcX, npcY, '__DEFAULT').setDepth(6);
    }

    this.add.text(npcX, npcY - (useCF ? 40 : 12), 'BLACKSMITH', {
      fontFamily: '"Press Start 2P", monospace', fontSize: '5px',
      color: '#FF6600', stroke: '#000000', strokeThickness: 3, resolution: 4,
    }).setOrigin(0.5).setDepth(10);

    // ── Player ──
    const spawnX = ROOM_W / 2;
    const spawnY = ROOM_H - wt - TILE * SCALE;
    const useCFPlayer = this.textures.exists('cf_player');

    if (useCFPlayer) {
      this.player = this.physics.add.sprite(spawnX, spawnY, 'cf_player')
        .setScale(SCALE).setDepth(10).setCollideWorldBounds(true);
      if (this.anims.exists('cf_player_idle_up')) this.player.play('cf_player_idle_up');
    } else {
      this.player = this.physics.add.sprite(spawnX, spawnY, '__DEFAULT')
        .setScale(SCALE).setDepth(10).setCollideWorldBounds(true);
    }
    this.player.setSize(12, 12).setOffset(26, 40);

    // ── Camera ──
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(2);
    this.cameras.main.setBounds(0, 0, ROOM_W, ROOM_H);
    this.physics.world.setBounds(0, 0, ROOM_W, ROOM_H);

    // ── Input ──
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,S,A,D') as Record<string, Phaser.Input.Keyboard.Key>;

    // ── Labels ──
    this.add.text(ROOM_W / 2, 12, 'BLACKSMITH\'S FORGE', {
      fontFamily: '"Press Start 2P"', fontSize: '8px',
      color: '#FF6600', resolution: 4,
    }).setOrigin(0.5).setDepth(20).setScrollFactor(0);

    this.add.text(ROOM_W / 2, ROOM_H - 8, '[ESC] or walk south to exit', {
      fontFamily: '"Press Start 2P"', fontSize: '5px',
      color: '#ffffff60', resolution: 4,
    }).setOrigin(0.5).setDepth(20).setScrollFactor(0);

    this.input.keyboard!.on('keydown-ESC', () => {
      if (this.shopOpen) { this.closeShop(); return; }
      if (!this.dialogueActive) this.returnToWorld();
    });

    // ── Auto-dialogue ──
    this.time.delayedCall(600, () => {
      this.runBlacksmithDialogue();
    });

    this.game.events.emit('building_visited', 'blacksmith');
  }

  update() {
    if (!this.player || this.dialogueActive || this.shopOpen) return;

    const speed = 100;
    const left = this.cursors.left.isDown || this.wasd.A?.isDown;
    const right = this.cursors.right.isDown || this.wasd.D?.isDown;
    const up = this.cursors.up.isDown || this.wasd.W?.isDown;
    const down = this.cursors.down.isDown || this.wasd.S?.isDown;

    let vx = 0, vy = 0;
    if (left) vx = -speed;
    if (right) vx = speed;
    if (up) vy = -speed;
    if (down) vy = speed;
    if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }
    this.player.setVelocity(vx, vy);

    const useCF = this.textures.exists('cf_player');
    if (useCF) {
      if (vx < 0 && this.anims.exists('cf_player_walk_left')) this.player.play('cf_player_walk_left', true);
      else if (vx > 0 && this.anims.exists('cf_player_walk_right')) this.player.play('cf_player_walk_right', true);
      else if (vy < 0 && this.anims.exists('cf_player_walk_up')) this.player.play('cf_player_walk_up', true);
      else if (vy > 0 && this.anims.exists('cf_player_walk_down')) this.player.play('cf_player_walk_down', true);
      else if (this.anims.exists('cf_player_idle_down')) this.player.play('cf_player_idle_down', true);
    }

    if (this.player.y > ROOM_H - TILE * SCALE * 1.5) {
      this.returnToWorld();
    }
  }

  private async runBlacksmithDialogue() {
    this.dialogueActive = true;
    this.player.setVelocity(0, 0);

    const hasQuest = typeof window !== 'undefined' && localStorage.getItem('midforge_quest_delivery_active');
    const questDone = typeof window !== 'undefined' && localStorage.getItem('midforge_quest_delivery_done');

    if (hasQuest && !questDone) {
      // Complete delivery quest
      const lines: { speaker: string; text: string }[] = [
        { speaker: 'BLACKSMITH', text: 'Ah. From the Tavern?' },
        { speaker: 'BLACKSMITH', text: 'Been waiting for this.' },
        { speaker: 'SYSTEM', text: '\u2705 Quest Complete: "Blacksmith\'s Delivery"\n+50 XP  +30 Gold' },
        { speaker: 'BLACKSMITH', text: 'Come back when you have gold. I make the best blades in Midforge.' },
      ];

      await this.showDialogue(lines);

      if (typeof window !== 'undefined') {
        localStorage.removeItem('midforge_quest_delivery_active');
        localStorage.setItem('midforge_quest_delivery_done', 'true');
      }

      // Fire XP + gold float via game event
      this.game.events.emit('award_xp_gold', { xp: 50, gold: 30 });
      // Increment quest daily counter
      this.game.events.emit('daily_quest_progress', { type: 'quest', amount: 1 });

      this.dialogueActive = false;
    } else {
      // Default dialogue → open shop
      const lines: { speaker: string; text: string }[] = [
        { speaker: 'BLACKSMITH', text: 'Need something sharpened?' },
      ];
      await this.showDialogue(lines);
      this.dialogueActive = false;
      this.openShop();
    }
  }

  private activeTab: GearSlot = 'weapon';

  private openShop() {
    this.shopOpen = true;
    this.player.setVelocity(0, 0);
    this.renderShopTab(this.activeTab);
  }

  private renderShopTab(slot: GearSlot) {
    // Clear old elements
    this.closeShop();
    this.shopOpen = true;
    this.activeTab = slot;

    const cam = this.cameras.main;
    const panelW = cam.width - 16;
    const panelH = cam.height - 20;
    const px = 8;
    const py = 10;
    const R = 4;

    const playerData = this.registry.get('playerData') || {};
    const playerGold = playerData.gold ?? 0;
    const playerLevel = playerData.level ?? 1;

    // Background
    this.el(this.add.rectangle(px + panelW / 2, py + panelH / 2, panelW, panelH, 0x0D0D1A, 0.95)
      .setScrollFactor(0).setDepth(700));

    // Top + bottom border
    this.el(this.add.rectangle(px + panelW / 2, py, panelW, 2, 0xFF6600)
      .setScrollFactor(0).setDepth(701));
    this.el(this.add.rectangle(px + panelW / 2, py + panelH, panelW, 2, 0xFF6600)
      .setScrollFactor(0).setDepth(701));

    // Title + gold
    this.el(this.add.text(px + 6, py + 4, 'BLACKSMITH\'S FORGE', {
      fontFamily: '"Press Start 2P"', fontSize: '6px', color: '#FF6600', resolution: R,
    }).setScrollFactor(0).setDepth(702));

    this.el(this.add.text(px + panelW - 6, py + 4, `Gold: ${playerGold}`, {
      fontFamily: '"Press Start 2P"', fontSize: '5px', color: '#F5D442', resolution: R,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(702));

    // ── Tabs ──
    const tabY = py + 18;
    let tabX = px + 4;
    for (const tab of SHOP_TABS) {
      const isActive = tab.slot === slot;
      const tabW = 46;
      const tabBg = this.add.rectangle(tabX + tabW / 2, tabY + 6, tabW, 14,
        isActive ? 0xFF6600 : 0x333333, isActive ? 0.9 : 0.5)
        .setScrollFactor(0).setDepth(703).setInteractive({ useHandCursor: true });
      this.el(tabBg);

      this.el(this.add.text(tabX + tabW / 2, tabY + 6, `${tab.icon}`, {
        fontFamily: '"Press Start 2P"', fontSize: '6px',
        color: isActive ? '#FFFFFF' : '#888888', resolution: R,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(704));

      tabBg.on('pointerdown', () => this.renderShopTab(tab.slot));
      tabX += tabW + 3;
    }

    // ── Items list ──
    const items = Object.values(GEAR_CATALOG).filter(g => g.type === slot);
    let itemY = tabY + 20;
    const itemH = 32;

    for (const item of items) {
      const isEarned = item.earnedBy != null;
      const canAfford = !isEarned && playerGold >= (item.price ?? 99999);
      const meetsLevel = playerLevel >= (item.levelRequired ?? 0);
      const available = canAfford && meetsLevel;
      const tierColor = GEAR_TIER_COLORS[item.tier] ?? 0x888888;
      const tierColorStr = GEAR_TIER_COLOR_STR[item.tier] ?? '#888888';

      // Item row background with tier border
      const rowBg = this.add.rectangle(px + panelW / 2, itemY + itemH / 2, panelW - 12, itemH, 0x1a0a2e, 0.8)
        .setStrokeStyle(1, tierColor, available || isEarned ? 0.8 : 0.3)
        .setScrollFactor(0).setDepth(702);
      this.el(rowBg);

      // Tier 5: pulsing border
      if (item.tier >= 5) {
        this.tweens.add({
          targets: rowBg, strokeAlpha: { from: 0.3, to: 1 },
          duration: 600, yoyo: true, repeat: -1,
        });
      }

      // Item name
      const nameColor = isEarned ? '#666666' : available ? '#FFFFFF' : meetsLevel ? '#AAAAAA' : '#666666';
      this.el(this.add.text(px + 12, itemY + 4, `${isEarned ? '\uD83C\uDFC6 ' : ''}${item.name}`, {
        fontFamily: '"Press Start 2P"', fontSize: '5px', color: nameColor, resolution: R,
      }).setScrollFactor(0).setDepth(703));

      // Stats line
      const statParts: string[] = [];
      if (item.atk) statParts.push(`+${item.atk} ATK`);
      if (item.def) statParts.push(`+${item.def} DEF`);
      if (item.speedBonus) statParts.push(`+${Math.round(item.speedBonus * 100)}% SPD`);
      const reqText = item.levelRequired && item.levelRequired > 1 ? `  Lv.${item.levelRequired}` : '';
      this.el(this.add.text(px + 12, itemY + 16, statParts.join('  ') + reqText, {
        fontFamily: '"Press Start 2P"', fontSize: '4px', color: tierColorStr, resolution: R,
      }).setScrollFactor(0).setDepth(703));

      // Price or earned text (right side)
      if (isEarned) {
        this.el(this.add.text(px + panelW - 12, itemY + 4, 'EARNED', {
          fontFamily: '"Press Start 2P"', fontSize: '4px', color: '#FFB800', resolution: R,
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(703));
        this.el(this.add.text(px + panelW - 12, itemY + 14, item.earnedBy ?? '', {
          fontFamily: '"Press Start 2P"', fontSize: '3px', color: '#888888', resolution: R,
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(703));
      } else {
        this.el(this.add.text(px + panelW - 12, itemY + 4, `${item.price ?? 0}G`, {
          fontFamily: '"Press Start 2P"', fontSize: '5px',
          color: canAfford ? '#F5D442' : '#FF4444', resolution: R,
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(703));

        if (available) {
          const btnX = px + panelW - 36;
          const btnY = itemY + 20;
          const btnBg = this.add.rectangle(btnX, btnY, 40, 12, 0x2a5a0a, 1)
            .setScrollFactor(0).setDepth(704).setInteractive({ useHandCursor: true });
          const btnTxt = this.add.text(btnX, btnY, 'BUY', {
            fontFamily: '"Press Start 2P"', fontSize: '5px', color: '#FFFFFF', resolution: R,
          }).setOrigin(0.5).setScrollFactor(0).setDepth(705);
          this.el(btnBg);
          this.el(btnTxt);

          btnBg.on('pointerdown', () => this.purchaseGearItem(item));
        } else if (!meetsLevel) {
          this.el(this.add.text(px + panelW - 12, itemY + 18, `\u26A0 Requires Lv.${item.levelRequired}`, {
            fontFamily: '"Press Start 2P"', fontSize: '3px', color: '#FF4444', resolution: R,
          }).setOrigin(1, 0).setScrollFactor(0).setDepth(703));
        }
      }

      itemY += itemH + 4;
    }

    // ── Close button ──
    const closeY = py + panelH - 12;
    const closeBg = this.add.rectangle(px + panelW / 2, closeY, 60, 14, 0x444444, 1)
      .setScrollFactor(0).setDepth(704).setInteractive({ useHandCursor: true });
    this.el(closeBg);
    this.el(this.add.text(px + panelW / 2, closeY, 'CLOSE', {
      fontFamily: '"Press Start 2P"', fontSize: '5px', color: '#FFFFFF', resolution: R,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(705));
    closeBg.on('pointerdown', () => this.closeShop());
  }

  private el(obj: Phaser.GameObjects.GameObject): Phaser.GameObjects.GameObject {
    this.shopElements.push(obj);
    return obj;
  }

  private purchaseGearItem(item: GearItem) {
    // Emit purchase event to React layer for gold deduction
    this.game.events.emit('blacksmith_purchase', {
      name: item.name,
      cost: item.price ?? 0,
      stat: item.atk ? 'atk' : 'def',
      bonus: item.atk ?? item.def ?? 0,
      itemId: item.id,
    });

    // Auto-equip via WorldScene
    const worldScene = this.scene.get('WorldScene') as any;
    if (worldScene?.equipItem) {
      worldScene.equipItem(item.id);
    }

    this.cameras.main.flash(150, 255, 200, 50);
    // Refresh shop to update gold display
    this.time.delayedCall(200, () => {
      if (this.shopOpen) this.renderShopTab(this.activeTab);
    });
  }

  private closeShop() {
    for (const el of this.shopElements) {
      el.destroy();
    }
    this.shopElements = [];
    this.shopOpen = false;
  }

  private showDialogue(lines: { speaker: string; text: string }[]): Promise<void> {
    return new Promise(resolve => {
      const cam = this.cameras.main;
      const boxH = 80;
      const boxW = cam.width - 16;
      const boxX = 8;
      const boxY = cam.height - boxH - 8;

      const bg = this.add.rectangle(boxX + boxW / 2, boxY + boxH / 2, boxW, boxH, 0x0D0D1A, 0.92)
        .setScrollFactor(0).setDepth(600);
      const bTop = this.add.rectangle(boxX + boxW / 2, boxY, boxW, 2, 0xFF6600, 1)
        .setScrollFactor(0).setDepth(601);
      const bBot = this.add.rectangle(boxX + boxW / 2, boxY + boxH, boxW, 2, 0xFF6600, 1)
        .setScrollFactor(0).setDepth(601);
      const bL = this.add.rectangle(boxX, boxY + boxH / 2, 2, boxH, 0xFF6600, 1)
        .setScrollFactor(0).setDepth(601);
      const bR = this.add.rectangle(boxX + boxW, boxY + boxH / 2, 2, boxH, 0xFF6600, 1)
        .setScrollFactor(0).setDepth(601);

      const speakerText = this.add.text(boxX + 12, boxY + 8, '', {
        fontFamily: '"Press Start 2P", monospace', fontSize: '10px',
        color: '#FF6600', resolution: 4,
      }).setScrollFactor(0).setDepth(602);

      const dialogText = this.add.text(boxX + 12, boxY + 26, '', {
        fontFamily: '"Press Start 2P", monospace', fontSize: '8px',
        color: '#FFFFFF', resolution: 4, wordWrap: { width: boxW - 24 },
      }).setScrollFactor(0).setDepth(602);

      const hint = this.add.text(boxX + boxW - 12, boxY + boxH - 10, '[ TAP ]', {
        fontFamily: '"Press Start 2P", monospace', fontSize: '5px',
        color: '#FF6600', resolution: 4,
      }).setOrigin(1, 1).setScrollFactor(0).setDepth(602).setAlpha(0);

      const all = [bg, bTop, bBot, bL, bR, speakerText, dialogText, hint];

      let idx = 0;
      const showLine = () => {
        if (idx >= lines.length) {
          all.forEach(el => el.destroy());
          resolve();
          return;
        }
        const line = lines[idx];
        speakerText.setText(line.speaker);
        speakerText.setColor(line.speaker === 'SYSTEM' ? '#4A90D9' : '#FF6600');

        let ci = 0;
        dialogText.setText('');
        hint.setAlpha(0);

        const timer = this.time.addEvent({
          delay: INTRO.typewriterSpeed,
          repeat: line.text.length - 1,
          callback: () => {
            ci++;
            dialogText.setText(line.text.substring(0, ci));
            if (ci >= line.text.length) hint.setAlpha(0.6);
          },
        });

        const advance = () => {
          if (ci < line.text.length) {
            timer.remove();
            dialogText.setText(line.text);
            ci = line.text.length;
            hint.setAlpha(0.6);
            return;
          }
          this.input.keyboard!.removeKey('SPACE');
          this.input.off('pointerdown', advance);
          idx++;
          showLine();
        };
        const spaceKey = this.input.keyboard!.addKey('SPACE');
        spaceKey.on('down', advance);
        this.input.on('pointerdown', advance);
      };
      showLine();
    });
  }

  private returnToWorld() {
    if (this.dialogueActive || this.shopOpen) return;
    this.dialogueActive = true;
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.game.events.emit('interior_exit', {
        returnX: this.returnPos.x,
        returnY: this.returnPos.y + 16,
      });
      this.scene.stop('BlacksmithScene');
    });
  }
}
