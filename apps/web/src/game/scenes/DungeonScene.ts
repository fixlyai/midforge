// @ts-ignore
import Phaser from 'phaser';

// ═══════════════════════════════════════════════════════════
//  DUNGEON SCENE — Cute Fantasy Dungeon_1 interior
//  Separate Phaser scene reached via arena/dungeon entrance.
//  Decoration and navigation only — no enemies yet.
// ═══════════════════════════════════════════════════════════

const TILE_SIZE = 16;
const SCALE = 2;
const ROOM_COLS = 12;
const ROOM_ROWS = 10;
const ROOM_W = ROOM_COLS * TILE_SIZE * SCALE;
const ROOM_H = ROOM_ROWS * TILE_SIZE * SCALE;

// Dungeon_1.png tileset: 208×208, 13×13 tiles at 16×16
// Key floor/wall tile indices (col-major, 0-indexed):
// Row 0: walls (top-left corner, top wall, top-right corner, ...)
// Row 6-7: floor tiles (stone variants)
// We'll paint a simple room using tileSprite for floor + wall border

export default class DungeonScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super({ key: 'DungeonScene' });
  }

  create() {
    // ── Dark background ──
    this.cameras.main.setBackgroundColor('#0a0a14');

    // ── Fade in from black ──
    this.cameras.main.fadeIn(600, 0, 0, 0);

    // ── Floor layer ── use tileset as tileSprite for the floor area
    if (this.textures.exists('dg1_tileset')) {
      // Floor fill using tileSprite (repeating dungeon tile pattern)
      const floor = this.add.tileSprite(
        ROOM_W / 2, ROOM_H / 2, ROOM_W, ROOM_H, 'dg1_tileset'
      ).setScale(SCALE).setDepth(0);
      floor.setTilePosition(96, 96); // offset into floor area of tileset
    }

    // ── Walls (dark border around the room) ──
    const wallColor = 0x1a1a2e;
    const wallThickness = TILE_SIZE * SCALE;
    // Top wall
    this.add.rectangle(ROOM_W / 2, wallThickness / 2, ROOM_W, wallThickness, wallColor).setDepth(1);
    // Bottom wall
    this.add.rectangle(ROOM_W / 2, ROOM_H - wallThickness / 2, ROOM_W, wallThickness, wallColor).setDepth(1);
    // Left wall
    this.add.rectangle(wallThickness / 2, ROOM_H / 2, wallThickness, ROOM_H, wallColor).setDepth(1);
    // Right wall
    this.add.rectangle(ROOM_W - wallThickness / 2, ROOM_H / 2, wallThickness, ROOM_H, wallColor).setDepth(1);

    // ── Pillars at corners and doorways ──
    const placeImg = (key: string, x: number, y: number, scale = SCALE, depth = 5) => {
      if (!this.textures.exists(key)) return;
      this.add.image(x, y, key).setScale(scale).setDepth(depth);
    };
    const placeAnim = (key: string, animKey: string, x: number, y: number, scale = SCALE, depth = 5) => {
      if (!this.textures.exists(key)) return;
      const s = this.add.sprite(x, y, key).setScale(scale).setDepth(depth);
      if (this.anims.exists(animKey)) s.play(animKey);
    };

    // Pillars at room corners (inset from walls)
    placeImg('dg1_pillars', 80, 80, SCALE, 4);
    placeImg('dg1_pillars', ROOM_W - 80, 80, SCALE, 4);
    placeImg('dg1_pillars', 80, ROOM_H - 80, SCALE, 4);
    placeImg('dg1_pillars', ROOM_W - 80, ROOM_H - 80, SCALE, 4);

    // ── Stairs (entry point — top of room) ──
    placeImg('dg1_stairs', ROOM_W / 2, 56, SCALE, 3);

    // ── Stairs down (exit — bottom of room) ──
    placeImg('dg1_stairs_down', ROOM_W / 2, ROOM_H - 56, SCALE, 3);

    // ── Animated door at bottom center ──
    placeAnim('dg1_door_anim', 'dg1_door_anim_play', ROOM_W / 2, ROOM_H - 40, SCALE, 6);

    // ── Arches on left and right walls ──
    placeImg('dg1_arch', 40, ROOM_H / 2, SCALE, 4);
    placeImg('dg1_arch_open', ROOM_W - 40, ROOM_H / 2, SCALE, 4);

    // ── Floor hazards — spikes in corridors ──
    placeImg('dg1_spikes', ROOM_W / 2 - 80, ROOM_H / 2, SCALE, 2);
    placeImg('dg1_spikes', ROOM_W / 2 + 80, ROOM_H / 2, SCALE, 2);

    // ── Sewer grate ──
    placeImg('dg1_sewer', ROOM_W / 2 + 120, ROOM_H / 2 + 40, SCALE, 2);
    placeAnim('dg1_sewer_anim', 'dg1_sewer_anim_play', ROOM_W / 2 - 120, ROOM_H / 2 + 40, SCALE, 2);

    // ── Pressure plate ──
    placeImg('dg1_pressure_plate', ROOM_W / 2, ROOM_H / 2 + 60, SCALE, 2);

    // ── Dungeon objects ──
    placeImg('dg_gold', ROOM_W / 2 - 60, ROOM_H / 2 - 30, SCALE, 4);
    placeImg('dg_grills', 60, ROOM_H / 2 - 40, SCALE, 3);

    // ── Chest (animated — opens on proximity later) ──
    if (this.textures.exists('dg_chest_anim')) {
      this.add.sprite(ROOM_W / 2 + 60, ROOM_H / 2 - 30, 'dg_chest_anim')
        .setScale(SCALE).setDepth(5).setFrame(0);
    }

    // ── Player ──
    const useCF = this.textures.exists('cf_player');
    const spawnX = ROOM_W / 2;
    const spawnY = 80;

    if (useCF) {
      this.player = this.physics.add.sprite(spawnX, spawnY, 'cf_player')
        .setScale(SCALE).setDepth(10).setCollideWorldBounds(true);
      const idleKey = 'cf_player_idle_down';
      if (this.anims.exists(idleKey)) this.player.play(idleKey);
    } else {
      // Minimal fallback
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

    // ── ESC to return to world ──
    this.input.keyboard!.on('keydown-ESC', () => {
      this.returnToWorld();
    });

    // ── Zone label ──
    this.add.text(ROOM_W / 2, 20, 'DUNGEON — LEVEL 1', {
      fontFamily: '"Press Start 2P"',
      fontSize: '8px',
      color: '#8888AA',
      resolution: 4,
    }).setOrigin(0.5).setDepth(20).setScrollFactor(0);

    // ── Exit hint ──
    this.add.text(ROOM_W / 2, ROOM_H - 12, '[ESC] Return to Village', {
      fontFamily: '"Press Start 2P"',
      fontSize: '6px',
      color: '#ffffff40',
      resolution: 4,
    }).setOrigin(0.5).setDepth(20).setScrollFactor(0);

    // ── Music crossfade to cave ──
    this.game.events.emit('dungeon_enter');
  }

  update() {
    if (!this.player) return;

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

    // Normalize diagonal
    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }

    this.player.setVelocity(vx, vy);

    // Animate player direction
    const useCF = this.textures.exists('cf_player');
    if (useCF && this.player instanceof Phaser.GameObjects.Sprite) {
      if (vx < 0) {
        const k = 'cf_player_walk_left';
        if (this.anims.exists(k)) this.player.play(k, true);
      } else if (vx > 0) {
        const k = 'cf_player_walk_right';
        if (this.anims.exists(k)) this.player.play(k, true);
      } else if (vy < 0) {
        const k = 'cf_player_walk_up';
        if (this.anims.exists(k)) this.player.play(k, true);
      } else if (vy > 0) {
        const k = 'cf_player_walk_down';
        if (this.anims.exists(k)) this.player.play(k, true);
      } else {
        const k = 'cf_player_idle_down';
        if (this.anims.exists(k)) this.player.play(k, true);
      }
    }

    // Exit trigger: walk to stairs (top of room)
    if (this.player.y < 48) {
      this.returnToWorld();
    }
  }

  private returnToWorld() {
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.game.events.emit('dungeon_exit');
      this.scene.stop('DungeonScene');
      this.scene.resume('WorldScene');
    });
  }
}
