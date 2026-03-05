// @ts-ignore — Phaser exports default from ESM build
import Phaser from 'phaser';
import {
  TILE_SIZE, MAP_COLS, MAP_ROWS, MAP_WIDTH, MAP_HEIGHT,
  CAMERA_ZOOM, CAMERA_LERP,
  PLAYER_SPEED, PLAYER_HITBOX, PLAYER_DEPTH, PLAYER_LABEL_DEPTH,
  NPC_INTERACT_DISTANCE, FOOTSTEP_TILE_INTERVAL,
  TILESHEET_TOWN, TILESHEET_BATTLE, TILESHEET_DUNGEON,
  TOWN_TILES, BATTLE_TILES,
  TIER_SPRITE_MAP, TIER_COLORS,
  NPCS, ZONES, TERRAIN,
  INTRO, TEXT_STYLES,
} from '@midforge/shared/constants/game';

// ── Programmatic Map Generation ──────────────────────────────
function generateMapData(): number[][] {
  const T = TERRAIN;
  const map: number[][] = [];
  for (let r = 0; r < MAP_ROWS; r++) {
    const row: number[] = [];
    for (let c = 0; c < MAP_COLS; c++) {
      // Default: grass
      let tile = T.GRASS;

      // ── Border walls ───────────────────────────────────
      if (r <= 1 || r >= MAP_ROWS - 2 || c <= 1 || c >= MAP_COLS - 2) {
        tile = T.TREE;
      }
      // ── Main vertical road (from gate south to spawn) ──
      else if (c >= 29 && c <= 31 && r >= 5 && r <= 40) {
        tile = T.PATH;
      }
      // ── Main horizontal road (east-west through village)
      else if (r >= 19 && r <= 21 && c >= 10 && c <= 50) {
        tile = T.PATH;
      }
      // ── Secondary path to blacksmith ───────────────────
      else if (c >= 14 && c <= 16 && r >= 10 && r <= 19) {
        tile = T.PATH;
      }
      // ── Secondary path to marketplace ──────────────────
      else if (c >= 34 && c <= 36 && r >= 10 && r <= 19) {
        tile = T.PATH;
      }
      // ── Castle gate area (far north) ───────────────────
      else if (r >= 3 && r <= 6 && c >= 27 && c <= 33) {
        tile = T.STONE_WALL;
      }
      // ── Castle gate opening ────────────────────────────
      else if (r === 6 && c >= 29 && c <= 31) {
        tile = T.DOOR;
      }
      // ── Blacksmith building ────────────────────────────
      else if (r >= 9 && r <= 12 && c >= 12 && c <= 17) {
        tile = T.WOOD_WALL;
      }
      // ── Blacksmith door ────────────────────────────────
      else if (r === 12 && c === 15) {
        tile = T.DOOR;
      }
      // ── Marketplace building ───────────────────────────
      else if (r >= 9 && r <= 12 && c >= 33 && c <= 38) {
        tile = T.WOOD_WALL;
      }
      // ── Marketplace door ───────────────────────────────
      else if (r === 12 && c === 35) {
        tile = T.DOOR;
      }
      // ── Arena building (east) ──────────────────────────
      else if (r >= 17 && r <= 23 && c >= 43 && c <= 49) {
        tile = T.STONE_WALL;
      }
      // ── Arena entrance ─────────────────────────────────
      else if (r >= 19 && r <= 21 && c === 43) {
        tile = T.DOOR;
      }
      // ── Quest giver hut ───────────────────────────────
      else if (r >= 14 && r <= 17 && c >= 20 && c <= 24) {
        tile = T.WOOD_WALL;
      }
      else if (r === 17 && c === 22) {
        tile = T.DOOR;
      }
      // ── Pond (southwest) ──────────────────────────────
      else if (r >= 25 && r <= 29 && c >= 8 && c <= 13) {
        tile = T.WATER;
      }
      // ── Village gate (south entry) ────────────────────
      else if (r >= 31 && r <= 33 && c >= 27 && c <= 33) {
        if (r === 33 && c >= 29 && c <= 31) {
          tile = T.PATH;
        } else if (c === 27 || c === 33) {
          tile = T.STONE_WALL;
        } else if (r === 31) {
          tile = T.STONE_WALL;
        } else {
          tile = T.PATH;
        }
      }
      // ── Scattered trees for atmosphere ─────────────────
      else if (
        (r === 8 && c === 8) || (r === 10 && c === 25) || (r === 7 && c === 40) ||
        (r === 15 && c === 42) || (r === 26 && c === 20) || (r === 28 && c === 40) ||
        (r === 13 && c === 5) || (r === 24 && c === 50) || (r === 30 && c === 15) ||
        (r === 8 && c === 50) || (r === 35 && c === 8) || (r === 35 && c === 45) ||
        (r === 38 && c === 25) || (r === 15 && c === 8) || (r === 22 && c === 15)
      ) {
        tile = T.TREE;
      }
      // ── Fences along paths ────────────────────────────
      else if (
        (r === 18 && c >= 10 && c <= 50 && c % 4 === 0) ||
        (r === 22 && c >= 10 && c <= 50 && c % 4 === 2)
      ) {
        tile = T.FENCE;
      }

      row.push(tile);
    }
    map.push(row);
  }
  return map;
}

const MAP_DATA = generateMapData();

// ── Helper: tile index to pixel center ──────────────────────
function tileToPixel(tileX: number, tileY: number): { x: number; y: number } {
  return {
    x: tileX * TILE_SIZE + TILE_SIZE / 2,
    y: tileY * TILE_SIZE + TILE_SIZE / 2,
  };
}

export class WorldScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private lastDirection = 'down';
  private playerTier = 'villager';
  private nameLabel!: Phaser.GameObjects.Text;
  private inputEnabled = false;

  // Audio
  private footstepCounter = 0;

  // Multiplayer
  private colyseusRoom: any = null;
  private otherPlayers = new Map<string, Phaser.GameObjects.Image>();
  private otherLabels = new Map<string, Phaser.GameObjects.Text>();
  private sendTimer = 0;
  private lastSentX = 0;
  private lastSentY = 0;

  // NPCs
  private npcSprites = new Map<string, Phaser.GameObjects.Image>();
  private npcLabels = new Map<string, Phaser.GameObjects.Text>();
  private npcPromptLabel: Phaser.GameObjects.Text | null = null;
  private nearbyNpcId: string | null = null;
  private interactKey!: Phaser.Input.Keyboard.Key;

  // Intro
  private introActive = false;
  private dialogueBox: Phaser.GameObjects.Container | null = null;
  private dialogueText: Phaser.GameObjects.Text | null = null;

  // Map tile type lookup for audio
  private tileTypeMap: number[][] = MAP_DATA;

  constructor() {
    super({ key: 'WorldScene' });
  }

  create() {
    const playerData = this.registry.get('playerData');
    this.playerTier = playerData?.tier ?? 'villager';

    this.buildMap();
    this.spawnNpcs();

    // ── Player ──────────────────────────────────────────
    const spawn = ZONES.spawn;
    const spawnPos = tileToPixel(spawn.x, spawn.y);
    const spriteFrame = TIER_SPRITE_MAP[this.playerTier] ?? TIER_SPRITE_MAP.villager;

    this.player = this.physics.add.sprite(spawnPos.x, spawnPos.y, TILESHEET_DUNGEON.key, spriteFrame);
    this.player.setDepth(PLAYER_DEPTH);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(PLAYER_HITBOX.width, PLAYER_HITBOX.height);
    body.setOffset(PLAYER_HITBOX.offsetX, PLAYER_HITBOX.offsetY);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.walls);

    // ── Camera ──────────────────────────────────────────
    this.cameras.main.startFollow(this.player, true, CAMERA_LERP, CAMERA_LERP);
    this.cameras.main.setZoom(CAMERA_ZOOM);
    this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    this.physics.world.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // ── Input ───────────────────────────────────────────
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,S,A,D') as Record<string, Phaser.Input.Keyboard.Key>;
    this.interactKey = this.input.keyboard!.addKey('E');

    // ── Player Name Label ───────────────────────────────
    const username = playerData?.xUsername ?? 'player';
    this.nameLabel = this.add.text(spawnPos.x, spawnPos.y - 12, `@${username}`, {
      ...TEXT_STYLES.playerName,
      color: TIER_COLORS[this.playerTier] || '#ffffff',
    }).setOrigin(0.5).setDepth(PLAYER_LABEL_DEPTH);

    // ── Interaction Prompt ──────────────────────────────
    this.npcPromptLabel = this.add.text(0, 0, '', TEXT_STYLES.interactPrompt)
      .setOrigin(0.5).setDepth(100).setVisible(false);

    // ── Zone Label ──────────────────────────────────────
    this.add.text(8, 8, 'Starter Village', TEXT_STYLES.zoneName)
      .setScrollFactor(0).setDepth(100);

    // ── Decide: intro sequence or normal play ───────────
    const isFirstLogin = playerData?.firstLogin !== false;
    if (isFirstLogin) {
      this.startIntroSequence(username);
    } else {
      this.inputEnabled = true;
    }

    this.connectMultiplayer(playerData);
    this.game.events.emit('world_ready');
  }

  // ═══════════════════════════════════════════════════════════
  //  MAP BUILDING
  // ═══════════════════════════════════════════════════════════
  private buildMap() {
    this.walls = this.physics.add.staticGroup();
    const T = TERRAIN;
    const townKey = TILESHEET_TOWN.key;
    const tt = TOWN_TILES;

    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        const tile = MAP_DATA[r][c];
        const pos = tileToPixel(c, r);

        // Always draw grass base
        this.add.image(pos.x, pos.y, townKey, tt.grassLight + ((r + c) % 2)).setDepth(0);

        switch (tile) {
          case T.GRASS:
            break;

          case T.PATH:
            this.add.image(pos.x, pos.y, townKey, tt.pathCenter).setDepth(1);
            break;

          case T.STONE_WALL: {
            this.add.image(pos.x, pos.y, townKey, tt.stoneWallMid).setDepth(2);
            const wall = this.physics.add.staticImage(pos.x, pos.y, townKey, tt.stoneWallMid);
            wall.setVisible(false).setDepth(0);
            body(wall).setSize(TILE_SIZE, TILE_SIZE);
            this.walls.add(wall);
            break;
          }

          case T.WATER: {
            const battleKey = TILESHEET_BATTLE.key;
            this.add.image(pos.x, pos.y, battleKey, BATTLE_TILES.waterFull).setDepth(1);
            const w = this.physics.add.staticImage(pos.x, pos.y, battleKey, BATTLE_TILES.waterFull);
            w.setVisible(false).setDepth(0);
            body(w).setSize(TILE_SIZE, TILE_SIZE);
            this.walls.add(w);
            break;
          }

          case T.WOOD_WALL: {
            this.add.image(pos.x, pos.y, townKey, tt.woodWallTL).setDepth(2);
            const ww = this.physics.add.staticImage(pos.x, pos.y, townKey, tt.woodWallTL);
            ww.setVisible(false).setDepth(0);
            body(ww).setSize(TILE_SIZE, TILE_SIZE);
            this.walls.add(ww);
            break;
          }

          case T.DOOR:
            this.add.image(pos.x, pos.y, townKey, tt.woodDoor).setDepth(1);
            break;

          case T.TREE: {
            this.add.image(pos.x, pos.y, townKey, tt.treePineBottom).setDepth(2);
            this.add.image(pos.x, pos.y - TILE_SIZE, townKey, tt.treePineTop).setDepth(12);
            const tw = this.physics.add.staticImage(pos.x, pos.y, townKey, tt.treePineBottom);
            tw.setVisible(false).setDepth(0);
            body(tw).setSize(TILE_SIZE, TILE_SIZE);
            this.walls.add(tw);
            break;
          }

          case T.FENCE: {
            this.add.image(pos.x, pos.y, townKey, tt.fenceH).setDepth(3);
            const fw = this.physics.add.staticImage(pos.x, pos.y, townKey, tt.fenceH);
            fw.setVisible(false).setDepth(0);
            body(fw).setSize(TILE_SIZE, TILE_SIZE / 2).setOffset(0, TILE_SIZE / 4);
            this.walls.add(fw);
            break;
          }

          case T.DECORATION:
            this.add.image(pos.x, pos.y, townKey, tt.barrel).setDepth(3);
            break;
        }
      }
    }

    // ── Decorative details ─────────────────────────────
    // Well at village center
    const wellPos = tileToPixel(30, 18);
    this.add.image(wellPos.x, wellPos.y, townKey, tt.well).setDepth(3);

    // Sign posts near key locations
    const signQuest = tileToPixel(22, 18);
    this.add.image(signQuest.x, signQuest.y, townKey, tt.signPost).setDepth(3);

    const signArena = tileToPixel(42, 20);
    this.add.image(signArena.x, signArena.y, townKey, tt.signPost).setDepth(3);

    // Torches on arena walls
    const torchL = tileToPixel(43, 18);
    const torchR = tileToPixel(43, 22);
    this.add.image(torchL.x, torchL.y, townKey, tt.torch).setDepth(4);
    this.add.image(torchR.x, torchR.y, townKey, tt.torch).setDepth(4);

    // Barrels near blacksmith
    const barrelPos = tileToPixel(18, 11);
    this.add.image(barrelPos.x, barrelPos.y, townKey, tt.barrel).setDepth(3);
    const cratePos = tileToPixel(18, 12);
    this.add.image(cratePos.x, cratePos.y, townKey, tt.crate).setDepth(3);
  }

  // ═══════════════════════════════════════════════════════════
  //  NPC SPAWNING
  // ═══════════════════════════════════════════════════════════
  private spawnNpcs() {
    const dungeonKey = TILESHEET_DUNGEON.key;

    for (const npc of NPCS) {
      const pos = tileToPixel(npc.tileX, npc.tileY);

      const sprite = this.add.image(pos.x, pos.y, dungeonKey, npc.spriteIndex)
        .setDepth(8);

      sprite.setData('npcId', npc.id);
      sprite.setData('interactionEvent', npc.interactionEvent);
      sprite.setData('name', npc.name);
      this.npcSprites.set(npc.id, sprite);

      const label = this.add.text(pos.x, pos.y - 14, `${npc.name}\n${npc.role}`, {
        ...TEXT_STYLES.npcName,
        color: '#F39C12',
      }).setOrigin(0.5).setDepth(PLAYER_LABEL_DEPTH);
      this.npcLabels.set(npc.id, label);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  INTRO SEQUENCE (Phase A)
  // ═══════════════════════════════════════════════════════════
  private startIntroSequence(username: string) {
    this.introActive = true;
    this.inputEnabled = false;

    // Camera zoom in slowly
    this.cameras.main.setZoom(INTRO.zoomStart * CAMERA_ZOOM);
    this.tweens.add({
      targets: this.cameras.main,
      zoom: INTRO.zoomEnd * CAMERA_ZOOM,
      duration: INTRO.zoomDuration,
      ease: 'Sine.easeInOut',
    });

    // Create the Forge Master sprite walking toward player
    const fmNpc = NPCS.find(n => n.id === 'forge_master')!;
    const gatePos = tileToPixel(ZONES.gatePosition.x, ZONES.gatePosition.y);
    const fmSprite = this.add.image(gatePos.x, gatePos.y, TILESHEET_DUNGEON.key, fmNpc.spriteIndex)
      .setDepth(PLAYER_DEPTH + 1);

    // Walk Forge Master down to player
    const playerPos = tileToPixel(ZONES.spawn.x, ZONES.spawn.y);
    const walkDuration = Math.abs(playerPos.y - gatePos.y) / INTRO.forgeMasterWalkSpeed * 1000;

    this.tweens.add({
      targets: fmSprite,
      y: playerPos.y - TILE_SIZE * 2,
      duration: walkDuration,
      ease: 'Linear',
      onComplete: () => {
        // Show dialogue
        const lines = INTRO.dialogLines.map(l => l.replace('@{username}', `@${username}`));
        this.showTypewriterDialogue(lines, () => {
          // After dialogue: zoom back out, open gate, enable input
          fmSprite.destroy();
          this.tweens.add({
            targets: this.cameras.main,
            zoom: CAMERA_ZOOM,
            duration: 1000,
            ease: 'Sine.easeOut',
          });

          // Show glowing path toward quest giver
          this.showGlowingPath();

          this.introActive = false;
          this.inputEnabled = true;
        });
      },
    });
  }

  private showTypewriterDialogue(lines: string[], onComplete: () => void) {
    // Create dialogue box at bottom of screen (fixed to camera)
    const cam = this.cameras.main;
    const boxH = 50;
    const boxW = cam.width;

    const bg = this.add.rectangle(boxW / 2, cam.height - boxH / 2, boxW, boxH, 0x0d0a1e, 0.9)
      .setScrollFactor(0).setDepth(200);
    const border = this.add.rectangle(boxW / 2, cam.height - boxH, boxW, 2, 0xF39C12, 0.8)
      .setScrollFactor(0).setDepth(201);

    this.dialogueText = this.add.text(16, cam.height - boxH + 10, '', TEXT_STYLES.dialogue)
      .setScrollFactor(0).setDepth(202);

    const advanceHint = this.add.text(boxW - 16, cam.height - 10, '[SPACE]', {
      fontSize: '4px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#F39C12',
      stroke: '#000000',
      strokeThickness: 1,
    }).setOrigin(1, 1).setScrollFactor(0).setDepth(202).setAlpha(0);

    this.dialogueBox = this.add.container(0, 0, [bg, border, this.dialogueText, advanceHint])
      .setDepth(200);

    let lineIndex = 0;
    const showLine = () => {
      if (lineIndex >= lines.length) {
        // Cleanup dialogue
        this.dialogueBox?.destroy();
        this.dialogueBox = null;
        this.dialogueText = null;
        onComplete();
        return;
      }

      const text = lines[lineIndex];
      let charIndex = 0;
      this.dialogueText!.setText('');
      advanceHint.setAlpha(0);

      const typeTimer = this.time.addEvent({
        delay: INTRO.typewriterSpeed,
        repeat: text.length - 1,
        callback: () => {
          charIndex++;
          this.dialogueText!.setText(text.substring(0, charIndex));
          if (charIndex >= text.length) {
            advanceHint.setAlpha(0.6);
          }
        },
      });

      // Wait for space or click to advance
      const spaceKey = this.input.keyboard!.addKey('SPACE');
      const advanceListener = () => {
        if (charIndex < text.length) {
          typeTimer.remove();
          this.dialogueText!.setText(text);
          charIndex = text.length;
          advanceHint.setAlpha(0.6);
          return;
        }
        spaceKey.off('down', advanceListener);
        this.input.off('pointerdown', advanceListener);
        lineIndex++;
        showLine();
      };
      spaceKey.on('down', advanceListener);
      this.input.on('pointerdown', advanceListener);
    };

    showLine();
  }

  private showGlowingPath() {
    // Draw amber-tinted tiles from spawn to quest giver
    const startX = ZONES.spawn.x as number;
    const startY = ZONES.spawn.y as number;
    const endX = ZONES.questGiver.x as number;
    const endY = ZONES.questGiver.y as number;

    const pathTiles: Phaser.GameObjects.Rectangle[] = [];

    // Vertical segment
    const yDir = endY < startY ? -1 : 1;
    for (let y = startY; y !== endY; y += yDir) {
      const pos = tileToPixel(startX, y);
      const glow = this.add.rectangle(pos.x, pos.y, TILE_SIZE, TILE_SIZE, 0xF39C12, 0.15)
        .setDepth(1);
      pathTiles.push(glow);
    }
    // Horizontal segment
    const xDir = endX < startX ? -1 : 1;
    for (let x = startX; x !== endX + xDir; x += xDir) {
      const pos = tileToPixel(x, endY);
      const glow = this.add.rectangle(pos.x, pos.y, TILE_SIZE, TILE_SIZE, 0xF39C12, 0.15)
        .setDepth(1);
      pathTiles.push(glow);
    }

    // Fade out after duration
    this.time.delayedCall(INTRO.glowPathFadeDuration, () => {
      this.tweens.add({
        targets: pathTiles,
        alpha: 0,
        duration: 2000,
        onComplete: () => pathTiles.forEach(t => t.destroy()),
      });
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  MULTIPLAYER
  // ═══════════════════════════════════════════════════════════
  private async connectMultiplayer(playerData: any) {
    try {
      const { Client } = await import('colyseus.js');
      const wsUrl = (typeof window !== 'undefined' && (window as any).__COLYSEUS_URL)
        || process.env.NEXT_PUBLIC_COLYSEUS_URL
        || 'ws://localhost:2567';
      const client = new Client(wsUrl);
      const room = await client.joinOrCreate('world_room', { playerData });
      this.colyseusRoom = room;

      room.state.players.onAdd((player: any, sessionId: string) => {
        if (sessionId === room.sessionId) return;

        const tier = player.tier || 'villager';
        const frame = TIER_SPRITE_MAP[tier] ?? TIER_SPRITE_MAP.villager;
        const sprite = this.add.image(player.x, player.y, TILESHEET_DUNGEON.key, frame)
          .setDepth(9);
        this.otherPlayers.set(sessionId, sprite);

        const label = this.add.text(player.x, player.y - 12, `@${player.username}`, {
          ...TEXT_STYLES.playerName,
          color: TIER_COLORS[tier] || '#ffffff',
        }).setOrigin(0.5).setDepth(PLAYER_LABEL_DEPTH);
        this.otherLabels.set(sessionId, label);

        sprite.setInteractive();
        sprite.on('pointerdown', () => {
          this.game.events.emit('show_player_card', {
            username: player.username,
            tier: player.tier,
            mrr: player.mrr,
            followers: player.followers,
            level: player.level,
          });
        });

        player.onChange(() => {
          const s = this.otherPlayers.get(sessionId);
          const l = this.otherLabels.get(sessionId);
          if (s) {
            this.tweens.add({ targets: s, x: player.x, y: player.y, duration: 100, ease: 'Linear' });
          }
          if (l) {
            this.tweens.add({ targets: l, x: player.x, y: player.y - 12, duration: 100, ease: 'Linear' });
          }
        });
      });

      room.state.players.onRemove((_player: any, sessionId: string) => {
        this.otherPlayers.get(sessionId)?.destroy();
        this.otherLabels.get(sessionId)?.destroy();
        this.otherPlayers.delete(sessionId);
        this.otherLabels.delete(sessionId);
      });
    } catch (_err) {
      // Multiplayer unavailable — game continues in solo mode
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  AUDIO
  // ═══════════════════════════════════════════════════════════
  private playFootstep() {
    const tileX = Math.floor(this.player.x / TILE_SIZE);
    const tileY = Math.floor(this.player.y / TILE_SIZE);
    const tileType = this.tileTypeMap[tileY]?.[tileX] ?? TERRAIN.GRASS;
    const isStone = tileType === TERRAIN.STONE_WALL || tileType === TERRAIN.PATH;

    const prefix = isStone ? 'footstep_stone' : 'footstep_grass';
    const count = isStone ? 3 : 3;
    const idx = Math.floor(Math.random() * count);
    const key = `${prefix}_${idx}`;

    if (this.sound.get(key) || this.cache.audio.exists(key)) {
      this.sound.play(key, { volume: 0.15 });
    }
  }

  private playInteractSound() {
    if (this.cache.audio.exists('sfx_interact')) {
      this.sound.play('sfx_interact', { volume: 0.3 });
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  UPDATE LOOP
  // ═══════════════════════════════════════════════════════════
  update(_time: number, delta: number) {
    if (!this.inputEnabled || this.introActive) return;

    let vx = 0;
    let vy = 0;
    let moving = false;
    let direction = this.lastDirection;

    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;

    if (left) { vx = -PLAYER_SPEED; direction = 'left'; moving = true; }
    if (right) { vx = PLAYER_SPEED; direction = 'right'; moving = true; }
    if (up) { vy = -PLAYER_SPEED; direction = 'up'; moving = true; }
    if (down) { vy = PLAYER_SPEED; direction = 'down'; moving = true; }

    if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }

    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setVelocity(vx, vy);

    if (moving) {
      this.lastDirection = direction;
      this.footstepCounter++;
      if (this.footstepCounter >= FOOTSTEP_TILE_INTERVAL * 4) {
        this.footstepCounter = 0;
        this.playFootstep();
      }
    } else {
      this.footstepCounter = 0;
    }

    this.nameLabel.setPosition(this.player.x, this.player.y - 12);

    // Multiplayer position sync (~15 fps)
    this.sendTimer += delta;
    if (this.colyseusRoom && this.sendTimer > 66) {
      this.sendTimer = 0;
      const px = Math.round(this.player.x);
      const py = Math.round(this.player.y);
      if (px !== this.lastSentX || py !== this.lastSentY) {
        this.colyseusRoom.send('move', { x: px, y: py, direction: this.lastDirection });
        this.lastSentX = px;
        this.lastSentY = py;
      }
    }

    this.checkNpcProximity();
  }

  // ═══════════════════════════════════════════════════════════
  //  NPC INTERACTION
  // ═══════════════════════════════════════════════════════════
  private checkNpcProximity() {
    let closestId: string | null = null;
    let closestDist = Infinity;

    this.npcSprites.forEach((sprite, npcId) => {
      const dx = this.player.x - sprite.x;
      const dy = this.player.y - sprite.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < NPC_INTERACT_DISTANCE && dist < closestDist) {
        closestDist = dist;
        closestId = npcId;
      }
    });

    if (closestId) {
      this.nearbyNpcId = closestId;
      const sprite = this.npcSprites.get(closestId)!;
      const name = sprite.getData('name');
      if (this.npcPromptLabel) {
        this.npcPromptLabel.setText(`[E] ${name}`);
        this.npcPromptLabel.setPosition(sprite.x, sprite.y + 14);
        this.npcPromptLabel.setVisible(true);
      }

      if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
        this.playInteractSound();
        const event = sprite.getData('interactionEvent');
        this.game.events.emit(event, { npcId: closestId });
      }
    } else {
      this.nearbyNpcId = null;
      this.npcPromptLabel?.setVisible(false);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  CLEANUP
  // ═══════════════════════════════════════════════════════════
  shutdown() {
    if (this.colyseusRoom) {
      this.colyseusRoom.leave();
      this.colyseusRoom = null;
    }
    this.otherPlayers.forEach((s) => s.destroy());
    this.otherLabels.forEach((l) => l.destroy());
    this.otherPlayers.clear();
    this.otherLabels.clear();
    this.dialogueBox?.destroy();
  }
}

// ── Utility: get physics body from static image ─────────────
function body(img: Phaser.Physics.Arcade.Image): Phaser.Physics.Arcade.Body {
  return img.body as Phaser.Physics.Arcade.Body;
}
