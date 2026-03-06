// @ts-ignore
import Phaser from 'phaser';
import { INTRO } from '@midforge/shared/constants/game';

// ═══════════════════════════════════════════════════════════
//  TAVERN SCENE — Interior of The Rusty Sword inn
//  Innkeeper NPC gives delivery quest to Blacksmith
// ═══════════════════════════════════════════════════════════

const TILE = 16;
const SCALE = 2;
const COLS = 12;
const ROWS = 10;
const ROOM_W = COLS * TILE * SCALE;
const ROOM_H = ROWS * TILE * SCALE;

export default class TavernScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private dialogueActive = false;
  private returnPos = { x: 688, y: 480 }; // exterior door pixel pos

  constructor() {
    super({ key: 'TavernScene' });
  }

  init(data: { returnX?: number; returnY?: number }) {
    if (data.returnX != null) this.returnPos.x = data.returnX;
    if (data.returnY != null) this.returnPos.y = data.returnY;
  }

  create() {
    this.dialogueActive = false;
    this.cameras.main.setBackgroundColor('#1a0e0a');
    this.cameras.main.fadeIn(500, 0, 0, 0);

    // ── Floor ──
    if (this.textures.exists('dg1_tileset')) {
      const floor = this.add.tileSprite(ROOM_W / 2, ROOM_H / 2, ROOM_W, ROOM_H, 'dg1_tileset')
        .setScale(SCALE).setDepth(0);
      floor.setTilePosition(96, 96);
    } else {
      this.add.rectangle(ROOM_W / 2, ROOM_H / 2, ROOM_W, ROOM_H, 0x3b2217).setDepth(0);
    }

    // ── Walls ──
    const wc = 0x2a1508;
    const wt = TILE * SCALE;
    this.add.rectangle(ROOM_W / 2, wt / 2, ROOM_W, wt, wc).setDepth(1);
    this.add.rectangle(ROOM_W / 2, ROOM_H - wt / 2, ROOM_W, wt, wc).setDepth(1);
    this.add.rectangle(wt / 2, ROOM_H / 2, wt, ROOM_H, wc).setDepth(1);
    this.add.rectangle(ROOM_W - wt / 2, ROOM_H / 2, wt, ROOM_H, wc).setDepth(1);

    // ── Bar counter (horizontal, top third) ──
    const barY = wt + TILE * SCALE * 2;
    const barW = ROOM_W - wt * 4;
    this.add.rectangle(ROOM_W / 2, barY, barW, TILE * SCALE, 0x5c3a1e).setDepth(3);
    this.add.rectangle(ROOM_W / 2, barY - 4, barW, 4, 0x8B6914).setDepth(4); // bar top edge

    // ── Stools (below bar) ──
    for (let i = 0; i < 4; i++) {
      const sx = wt * 2 + i * (barW / 4) + barW / 8;
      this.add.ellipse(sx, barY + TILE * SCALE + 4, 12, 8, 0x5c3a1e, 0.8).setDepth(2);
    }

    // ── Tables (lower area) ──
    const tableY = ROOM_H - wt * 3;
    for (let t = 0; t < 2; t++) {
      const tx = wt * 3 + t * (ROOM_W - wt * 6);
      this.add.rectangle(tx, tableY, TILE * SCALE * 2, TILE * SCALE, 0x4a2a0a).setDepth(3);
      // Chairs
      this.add.ellipse(tx - 20, tableY, 10, 8, 0x3a1a06, 0.7).setDepth(2);
      this.add.ellipse(tx + 20, tableY, 10, 8, 0x3a1a06, 0.7).setDepth(2);
    }

    // ── Torches on walls ──
    if (this.textures.exists('cf_torch_small')) {
      const positions = [
        { x: wt + 8, y: wt + 8 },
        { x: ROOM_W - wt - 8, y: wt + 8 },
        { x: wt + 8, y: ROOM_H / 2 },
        { x: ROOM_W - wt - 8, y: ROOM_H / 2 },
      ];
      for (const p of positions) {
        const torch = this.add.sprite(p.x, p.y, 'cf_torch_small').setScale(SCALE).setDepth(5);
        if (this.anims.exists('cf_torch_small_anim')) torch.play('cf_torch_small_anim');
      }
    }

    // ── Innkeeper NPC (behind bar) ──
    const innkeeperX = ROOM_W / 2;
    const innkeeperY = barY - TILE * SCALE;
    const cfKey = 'cf_npc_Bartender_Katy';
    const useCF = this.textures.exists(cfKey);

    let innkeeper: Phaser.GameObjects.Sprite;
    if (useCF) {
      innkeeper = this.add.sprite(innkeeperX, innkeeperY, cfKey).setScale(SCALE).setDepth(6);
      const idleKey = `${cfKey}_idle_down`;
      if (this.anims.exists(idleKey)) innkeeper.play(idleKey);
    } else {
      innkeeper = this.add.sprite(innkeeperX, innkeeperY, '__DEFAULT').setDepth(6);
    }

    // NPC label
    this.add.text(innkeeperX, innkeeperY - (useCF ? 40 : 12), 'INNKEEPER', {
      fontFamily: '"Press Start 2P", monospace', fontSize: '5px',
      color: '#FFB800', stroke: '#000000', strokeThickness: 3, resolution: 4,
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

    // ── Zone label ──
    this.add.text(ROOM_W / 2, 12, 'THE RUSTY SWORD', {
      fontFamily: '"Press Start 2P"', fontSize: '8px',
      color: '#FFB800', resolution: 4,
    }).setOrigin(0.5).setDepth(20).setScrollFactor(0);

    // ── Exit hint ──
    this.add.text(ROOM_W / 2, ROOM_H - 8, '[ESC] or walk south to exit', {
      fontFamily: '"Press Start 2P"', fontSize: '5px',
      color: '#ffffff60', resolution: 4,
    }).setOrigin(0.5).setDepth(20).setScrollFactor(0);

    // ── ESC to return ──
    this.input.keyboard!.on('keydown-ESC', () => {
      if (!this.dialogueActive) this.returnToWorld();
    });

    // ── Auto-dialogue after short delay ──
    this.time.delayedCall(600, () => {
      this.runInnkeeperDialogue();
    });

    // Track building visit for daily quest
    this.game.events.emit('building_visited', 'tavern');
  }

  update() {
    if (!this.player || this.dialogueActive) return;

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

    // Animate
    const useCF = this.textures.exists('cf_player');
    if (useCF) {
      if (vx < 0 && this.anims.exists('cf_player_walk_left')) this.player.play('cf_player_walk_left', true);
      else if (vx > 0 && this.anims.exists('cf_player_walk_right')) this.player.play('cf_player_walk_right', true);
      else if (vy < 0 && this.anims.exists('cf_player_walk_up')) this.player.play('cf_player_walk_up', true);
      else if (vy > 0 && this.anims.exists('cf_player_walk_down')) this.player.play('cf_player_walk_down', true);
      else if (this.anims.exists('cf_player_idle_down')) this.player.play('cf_player_idle_down', true);
    }

    // Exit: walk to south wall
    if (this.player.y > ROOM_H - TILE * SCALE * 1.5) {
      this.returnToWorld();
    }
  }

  private async runInnkeeperDialogue() {
    this.dialogueActive = true;
    this.player.setVelocity(0, 0);

    const hasDeliveryQuest = typeof window !== 'undefined' && localStorage.getItem('midforge_quest_delivery_active');
    const deliveryDone = typeof window !== 'undefined' && localStorage.getItem('midforge_quest_delivery_done');

    let lines: { speaker: string; text: string }[];

    if (deliveryDone) {
      lines = [
        { speaker: 'INNKEEPER', text: 'Glad you helped the Blacksmith.' },
        { speaker: 'INNKEEPER', text: 'You\'re always welcome here, traveler.' },
      ];
    } else if (hasDeliveryQuest) {
      lines = [
        { speaker: 'INNKEEPER', text: 'The Blacksmith is waiting for that package.' },
        { speaker: 'INNKEEPER', text: 'He\'s south-west of the plaza.' },
      ];
    } else {
      lines = [
        { speaker: 'INNKEEPER', text: 'Welcome to the Rusty Sword.' },
        { speaker: 'INNKEEPER', text: 'Heard you had a run-in with a Brigand earlier.' },
        { speaker: 'INNKEEPER', text: 'I\'ve got a job if you want it.' },
        { speaker: 'INNKEEPER', text: 'Deliver this package to the Blacksmith.' },
        { speaker: 'INNKEEPER', text: 'He\'s south-west of the plaza. Can\'t miss it.' },
        { speaker: 'SYSTEM', text: '\u{1F4E6} Quest received: "Blacksmith\'s Delivery"\nDeliver the package to the Blacksmith.\nReward: 50 XP + 30 Gold' },
      ];
    }

    await this.showDialogue(lines);

    // Set quest flag if first time
    if (!hasDeliveryQuest && !deliveryDone && typeof window !== 'undefined') {
      localStorage.setItem('midforge_quest_delivery_active', 'true');
    }

    this.dialogueActive = false;
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
      const bTop = this.add.rectangle(boxX + boxW / 2, boxY, boxW, 2, 0xFFB800, 1)
        .setScrollFactor(0).setDepth(601);
      const bBot = this.add.rectangle(boxX + boxW / 2, boxY + boxH, boxW, 2, 0xFFB800, 1)
        .setScrollFactor(0).setDepth(601);
      const bL = this.add.rectangle(boxX, boxY + boxH / 2, 2, boxH, 0xFFB800, 1)
        .setScrollFactor(0).setDepth(601);
      const bR = this.add.rectangle(boxX + boxW, boxY + boxH / 2, 2, boxH, 0xFFB800, 1)
        .setScrollFactor(0).setDepth(601);

      const speakerText = this.add.text(boxX + 12, boxY + 8, '', {
        fontFamily: '"Press Start 2P", monospace', fontSize: '10px',
        color: '#FFB800', resolution: 4,
      }).setScrollFactor(0).setDepth(602);

      const dialogText = this.add.text(boxX + 12, boxY + 26, '', {
        fontFamily: '"Press Start 2P", monospace', fontSize: '8px',
        color: '#FFFFFF', resolution: 4, wordWrap: { width: boxW - 24 },
      }).setScrollFactor(0).setDepth(602);

      const hint = this.add.text(boxX + boxW - 12, boxY + boxH - 10, '[ TAP ]', {
        fontFamily: '"Press Start 2P", monospace', fontSize: '5px',
        color: '#FFB800', resolution: 4,
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
        speakerText.setColor(line.speaker === 'SYSTEM' ? '#4A90D9' : '#FFB800');

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
    if (this.dialogueActive) return;
    this.dialogueActive = true; // prevent double-trigger
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.game.events.emit('interior_exit', {
        returnX: this.returnPos.x,
        returnY: this.returnPos.y + 16,
      });
      this.scene.stop('TavernScene');
    });
  }
}
