// @ts-ignore
import Phaser from 'phaser';
import { INTRO } from '@midforge/shared/constants/game';

// ═══════════════════════════════════════════════════════════
//  CHURCH SCENE — Interior of the Church / Elder's Chapel
//  Daily HP restore mechanic
// ═══════════════════════════════════════════════════════════

const TILE = 16;
const SCALE = 2;
const COLS = 12;
const ROWS = 10;
const ROOM_W = COLS * TILE * SCALE;
const ROOM_H = ROWS * TILE * SCALE;

export default class ChurchScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private dialogueActive = false;
  private returnPos = { x: 176, y: 144 };

  constructor() {
    super({ key: 'ChurchScene' });
  }

  init(data: { returnX?: number; returnY?: number }) {
    if (data.returnX != null) this.returnPos.x = data.returnX;
    if (data.returnY != null) this.returnPos.y = data.returnY;
  }

  create() {
    this.dialogueActive = false;
    this.cameras.main.setBackgroundColor('#0a0a1e');
    this.cameras.main.fadeIn(500, 0, 0, 0);

    // ── Floor — lighter stone ──
    if (this.textures.exists('dg1_tileset')) {
      const floor = this.add.tileSprite(ROOM_W / 2, ROOM_H / 2, ROOM_W, ROOM_H, 'dg1_tileset')
        .setScale(SCALE).setDepth(0);
      floor.setTilePosition(80, 80);
    } else {
      this.add.rectangle(ROOM_W / 2, ROOM_H / 2, ROOM_W, ROOM_H, 0x2a2a3e).setDepth(0);
    }

    // ── Walls — dark blue stone ──
    const wc = 0x1a1a30;
    const wt = TILE * SCALE;
    this.add.rectangle(ROOM_W / 2, wt / 2, ROOM_W, wt, wc).setDepth(1);
    this.add.rectangle(ROOM_W / 2, ROOM_H - wt / 2, ROOM_W, wt, wc).setDepth(1);
    this.add.rectangle(wt / 2, ROOM_H / 2, wt, ROOM_H, wc).setDepth(1);
    this.add.rectangle(ROOM_W - wt / 2, ROOM_H / 2, wt, ROOM_H, wc).setDepth(1);

    // ── Altar (top center) ──
    const altarY = wt + TILE * SCALE;
    this.add.rectangle(ROOM_W / 2, altarY, TILE * SCALE * 3, TILE * SCALE, 0x4a4a6a).setDepth(3);
    // Cross symbol above altar
    this.add.text(ROOM_W / 2, altarY - TILE, '\u2720', {
      fontSize: '20px', color: '#FFD700', resolution: 4,
    }).setOrigin(0.5).setDepth(5);

    // ── Pews (rows of benches) ──
    for (let row = 0; row < 3; row++) {
      const py = ROOM_H / 2 + row * TILE * SCALE * 1.2;
      // Left pew
      this.add.rectangle(ROOM_W / 3, py, TILE * SCALE * 2.5, TILE * SCALE * 0.6, 0x4a3a2a).setDepth(3);
      // Right pew
      this.add.rectangle(ROOM_W * 2 / 3, py, TILE * SCALE * 2.5, TILE * SCALE * 0.6, 0x4a3a2a).setDepth(3);
    }

    // ── Stained glass glow (top wall, center) ──
    this.add.ellipse(ROOM_W / 2, wt, 80, 40, 0x4488FF, 0.12).setDepth(2);
    this.add.ellipse(ROOM_W / 2, wt, 50, 25, 0x88BBFF, 0.08).setDepth(2);

    // ── Candles ──
    if (this.textures.exists('cf_torch_small')) {
      const candlePositions = [
        { x: ROOM_W / 2 - 50, y: altarY },
        { x: ROOM_W / 2 + 50, y: altarY },
        { x: wt + 8, y: ROOM_H / 2 },
        { x: ROOM_W - wt - 8, y: ROOM_H / 2 },
      ];
      for (const p of candlePositions) {
        const c = this.add.sprite(p.x, p.y, 'cf_torch_small').setScale(SCALE).setDepth(5);
        if (this.anims.exists('cf_torch_small_anim')) c.play('cf_torch_small_anim');
      }
    }

    // ── Elder NPC (at altar) ──
    const elderX = ROOM_W / 2;
    const elderY = altarY + TILE * SCALE * 1.5;
    const cfKey = 'cf_npc_Farmer_Bob'; // reuse as elder stand-in
    const useCF = this.textures.exists(cfKey);

    if (useCF) {
      this.add.sprite(elderX, elderY, cfKey).setScale(SCALE).setDepth(6)
        .play(this.anims.exists(`${cfKey}_idle_down`) ? `${cfKey}_idle_down` : '');
    } else {
      this.add.sprite(elderX, elderY, '__DEFAULT').setDepth(6);
    }

    this.add.text(elderX, elderY - (useCF ? 40 : 12), 'CHURCH ELDER', {
      fontFamily: '"Press Start 2P", monospace', fontSize: '5px',
      color: '#88BBFF', stroke: '#000000', strokeThickness: 3, resolution: 4,
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
    this.add.text(ROOM_W / 2, 12, 'THE CHAPEL', {
      fontFamily: '"Press Start 2P"', fontSize: '8px',
      color: '#88BBFF', resolution: 4,
    }).setOrigin(0.5).setDepth(20).setScrollFactor(0);

    this.add.text(ROOM_W / 2, ROOM_H - 8, '[ESC] or walk south to exit', {
      fontFamily: '"Press Start 2P"', fontSize: '5px',
      color: '#ffffff60', resolution: 4,
    }).setOrigin(0.5).setDepth(20).setScrollFactor(0);

    this.input.keyboard!.on('keydown-ESC', () => {
      if (!this.dialogueActive) this.returnToWorld();
    });

    // ── Auto-dialogue ──
    this.time.delayedCall(600, () => {
      this.runElderDialogue();
    });

    this.game.events.emit('building_visited', 'church');
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

  private async runElderDialogue() {
    this.dialogueActive = true;
    this.player.setVelocity(0, 0);

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const healKey = `midforge_church_healed_${today}`;
    const alreadyHealed = typeof window !== 'undefined' && localStorage.getItem(healKey);

    let lines: { speaker: string; text: string }[];

    if (alreadyHealed) {
      lines = [
        { speaker: 'CHURCH ELDER', text: 'You\'ve already received today\'s blessing.' },
        { speaker: 'CHURCH ELDER', text: 'Return tomorrow.' },
      ];
    } else {
      lines = [
        { speaker: 'CHURCH ELDER', text: 'Rest, traveler. The light restores you.' },
        { speaker: 'SYSTEM', text: '\uD83D\uDC9A HP fully restored.\n(Free heal \u2014 once per day)' },
      ];
    }

    await this.showDialogue(lines);

    if (!alreadyHealed && typeof window !== 'undefined') {
      localStorage.setItem(healKey, 'true');
      // Emit heal event to React layer
      this.game.events.emit('church_heal');
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
      const bTop = this.add.rectangle(boxX + boxW / 2, boxY, boxW, 2, 0x88BBFF, 1)
        .setScrollFactor(0).setDepth(601);
      const bBot = this.add.rectangle(boxX + boxW / 2, boxY + boxH, boxW, 2, 0x88BBFF, 1)
        .setScrollFactor(0).setDepth(601);
      const bL = this.add.rectangle(boxX, boxY + boxH / 2, 2, boxH, 0x88BBFF, 1)
        .setScrollFactor(0).setDepth(601);
      const bR = this.add.rectangle(boxX + boxW, boxY + boxH / 2, 2, boxH, 0x88BBFF, 1)
        .setScrollFactor(0).setDepth(601);

      const speakerText = this.add.text(boxX + 12, boxY + 8, '', {
        fontFamily: '"Press Start 2P", monospace', fontSize: '10px',
        color: '#88BBFF', resolution: 4,
      }).setScrollFactor(0).setDepth(602);

      const dialogText = this.add.text(boxX + 12, boxY + 26, '', {
        fontFamily: '"Press Start 2P", monospace', fontSize: '8px',
        color: '#FFFFFF', resolution: 4, wordWrap: { width: boxW - 24 },
      }).setScrollFactor(0).setDepth(602);

      const hint = this.add.text(boxX + boxW - 12, boxY + boxH - 10, '[ TAP ]', {
        fontFamily: '"Press Start 2P", monospace', fontSize: '5px',
        color: '#88BBFF', resolution: 4,
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
        speakerText.setColor(line.speaker === 'SYSTEM' ? '#4A90D9' : '#88BBFF');

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
    this.dialogueActive = true;
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.game.events.emit('interior_exit', {
        returnX: this.returnPos.x,
        returnY: this.returnPos.y + 16,
      });
      this.scene.stop('ChurchScene');
    });
  }
}
