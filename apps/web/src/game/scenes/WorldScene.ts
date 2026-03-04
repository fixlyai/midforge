// @ts-ignore — Phaser exports default from ESM build
import Phaser from 'phaser';

// Map dimensions in tiles
const MAP_COLS = 40;
const MAP_ROWS = 30;
const TILE_SIZE = 32;
const MAP_WIDTH = MAP_COLS * TILE_SIZE;
const MAP_HEIGHT = MAP_ROWS * TILE_SIZE;

// Simple map layout: 0=grass, 1=path, 2=stone(wall), 3=water
const MAP_DATA: number[][] = generateMapData();

function generateMapData(): number[][] {
  const map: number[][] = [];
  for (let r = 0; r < MAP_ROWS; r++) {
    const row: number[] = [];
    for (let c = 0; c < MAP_COLS; c++) {
      // Border walls
      if (r === 0 || r === MAP_ROWS - 1 || c === 0 || c === MAP_COLS - 1) {
        row.push(2);
      }
      // Horizontal path through middle
      else if (r >= 14 && r <= 15 && c > 2 && c < MAP_COLS - 3) {
        row.push(1);
      }
      // Vertical path
      else if (c >= 19 && c <= 20 && r > 2 && r < MAP_ROWS - 3) {
        row.push(1);
      }
      // Small pond (top-right area)
      else if (r >= 4 && r <= 7 && c >= 28 && c <= 33) {
        row.push(3);
      }
      // Stone buildings/obstacles
      else if (r >= 5 && r <= 8 && c >= 5 && c <= 8) {
        row.push(2);
      }
      else if (r >= 20 && r <= 23 && c >= 30 && c <= 34) {
        row.push(2);
      }
      else if (r >= 22 && r <= 25 && c >= 8 && c <= 11) {
        row.push(2);
      }
      // Everything else is grass
      else {
        row.push(0);
      }
    }
    map.push(row);
  }
  return map;
}

const TIER_COLORS: Record<string, string> = {
  villager: '#8B7355', apprentice: '#4A90D9',
  merchant: '#7B68EE', warrior: '#E74C3C', legend: '#F39C12',
};

export class WorldScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private lastDirection: string = 'down';
  private playerTier: string = 'villager';
  private nameLabel!: Phaser.GameObjects.Text;

  // Multiplayer
  private colyseusRoom: any = null;
  private otherPlayers: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private otherLabels: Map<string, Phaser.GameObjects.Text> = new Map();
  private sendTimer: number = 0;
  private lastSentX: number = 0;
  private lastSentY: number = 0;

  // NPCs
  private npcSprites: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  private npcLabels: Map<string, Phaser.GameObjects.Text> = new Map();
  private npcPromptLabel: Phaser.GameObjects.Text | null = null;
  private nearbyNpcId: string | null = null;
  private interactKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: 'WorldScene' });
  }

  create() {
    const playerData = this.registry.get('playerData');
    this.playerTier = playerData?.tier ?? 'villager';

    // Build the tilemap from our generated data
    this.buildMap();

    // Create walk animations for each tier
    const tiers = ['villager', 'apprentice', 'merchant', 'warrior', 'legend'];
    for (const tier of tiers) {
      this.createAnimations(tier);
    }

    // Spawn player at a path intersection
    const spawnX = 20 * TILE_SIZE;
    const spawnY = 14 * TILE_SIZE;

    this.player = this.physics.add.sprite(spawnX, spawnY, this.playerTier, 0);
    this.player.setDepth(10);
    (this.player.body as Phaser.Physics.Arcade.Body).setSize(20, 24);
    (this.player.body as Phaser.Physics.Arcade.Body).setOffset(14, 20);
    this.player.setCollideWorldBounds(true);

    // Collide with walls
    this.physics.add.collider(this.player, this.walls);

    // Camera
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(2);
    this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // World bounds
    this.physics.world.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,S,A,D') as Record<string, Phaser.Input.Keyboard.Key>;

    // Name label
    const username = playerData?.xUsername ?? 'player';
    this.nameLabel = this.add.text(spawnX, spawnY - 28, `@${username}`, {
      fontSize: '7px',
      fontFamily: '"Press Start 2P", monospace',
      color: TIER_COLORS[this.playerTier] || '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(11);

    // Zone label in top-left
    this.add.text(16, 16, 'Starter Village', {
      fontSize: '6px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#F39C12',
      stroke: '#000000',
      strokeThickness: 2,
    }).setScrollFactor(0).setDepth(100);

    // Interact key (E)
    this.interactKey = this.input.keyboard!.addKey('E');

    // Spawn NPCs
    this.spawnNpcs();

    // Interaction prompt (hidden by default)
    this.npcPromptLabel = this.add.text(0, 0, '', {
      fontSize: '6px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#F39C12',
      stroke: '#000000',
      strokeThickness: 2,
      backgroundColor: '#0d0a1eCC',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5).setDepth(100).setVisible(false);

    // Connect to Colyseus multiplayer server
    this.connectMultiplayer(playerData);

    // Emit ready event for HUD
    this.game.events.emit('world_ready');
  }

  private spawnNpcs() {
    // Import NPC definitions inline to avoid circular/top-level issues
    const NPCS = [
      { id: 'quest_giver', name: 'Elder Forge', role: 'Quest Giver', color: 0xF39C12, tileX: 10, tileY: 14, interactionEvent: 'npc_quests' },
      { id: 'blacksmith', name: 'Ironhide', role: 'Blacksmith', color: 0xE74C3C, tileX: 6, tileY: 10, interactionEvent: 'npc_inventory' },
      { id: 'arena_master', name: 'Valkyra', role: 'Arena Master', color: 0x9B59B6, tileX: 30, tileY: 14, interactionEvent: 'npc_arena' },
      { id: 'merchant_npc', name: 'Goldbag', role: 'Marketplace', color: 0x27AE60, tileX: 20, tileY: 10, interactionEvent: 'npc_marketplace' },
    ];

    for (const npc of NPCS) {
      const x = npc.tileX * TILE_SIZE + TILE_SIZE / 2;
      const y = npc.tileY * TILE_SIZE + TILE_SIZE / 2;

      // NPC body (larger colored rectangle with outline)
      const rect = this.add.rectangle(x, y, 20, 28, npc.color).setDepth(8);
      // Head
      this.add.rectangle(x, y - 18, 16, 12, npc.color).setDepth(8).setAlpha(0.8);
      // Eyes
      this.add.rectangle(x - 3, y - 18, 3, 3, 0x000000).setDepth(9);
      this.add.rectangle(x + 3, y - 18, 3, 3, 0x000000).setDepth(9);

      this.npcSprites.set(npc.id, rect);

      // Name + role label
      const label = this.add.text(x, y - 32, `${npc.name}\n${npc.role}`, {
        fontSize: '5px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#' + npc.color.toString(16).padStart(6, '0'),
        stroke: '#000000',
        strokeThickness: 2,
        align: 'center',
      }).setOrigin(0.5).setDepth(11);
      this.npcLabels.set(npc.id, label);

      // Store the interaction event on the rectangle for lookup
      rect.setData('npcId', npc.id);
      rect.setData('interactionEvent', npc.interactionEvent);
      rect.setData('name', npc.name);
    }
  }

  private async connectMultiplayer(playerData: any) {
    try {
      const { Client } = await import('colyseus.js');
      const wsUrl = (typeof window !== 'undefined' && (window as any).__COLYSEUS_URL)
        || process.env.NEXT_PUBLIC_COLYSEUS_URL
        || 'ws://localhost:2567';
      const client = new Client(wsUrl);
      const room = await client.joinOrCreate('world_room', { playerData });

      this.colyseusRoom = room;
      console.log('[Midforge] Connected to world_room, sessionId:', room.sessionId);

      // Listen for other players joining
      room.state.players.onAdd((player: any, sessionId: string) => {
        if (sessionId === room.sessionId) return; // skip self

        const tier = player.tier || 'villager';
        const sprite = this.add.sprite(player.x, player.y, tier, 0);
        sprite.setDepth(9);
        this.otherPlayers.set(sessionId, sprite);

        const label = this.add.text(player.x, player.y - 28, `@${player.username}`, {
          fontSize: '7px',
          fontFamily: '"Press Start 2P", monospace',
          color: TIER_COLORS[tier] || '#ffffff',
          stroke: '#000000',
          strokeThickness: 3,
        }).setOrigin(0.5).setDepth(11);
        this.otherLabels.set(sessionId, label);

        // Click on other player to emit event for player card
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

        // Listen for state changes on this player
        player.onChange(() => {
          const s = this.otherPlayers.get(sessionId);
          const l = this.otherLabels.get(sessionId);
          if (s) {
            // Smooth interpolation toward target position
            this.tweens.add({
              targets: s,
              x: player.x,
              y: player.y,
              duration: 100,
              ease: 'Linear',
            });
            // Animate walk direction
            const dir = player.direction || 'down';
            const t = player.tier || 'villager';
            const animKey = `${t}_walk_${dir}`;
            if (s.anims?.currentAnim?.key !== animKey) {
              s.anims?.play(animKey, true);
            }
          }
          if (l) {
            this.tweens.add({
              targets: l,
              x: player.x,
              y: player.y - 28,
              duration: 100,
              ease: 'Linear',
            });
          }
        });
      });

      // Listen for other players leaving
      room.state.players.onRemove((_player: any, sessionId: string) => {
        const sprite = this.otherPlayers.get(sessionId);
        const label = this.otherLabels.get(sessionId);
        if (sprite) sprite.destroy();
        if (label) label.destroy();
        this.otherPlayers.delete(sessionId);
        this.otherLabels.delete(sessionId);
      });

    } catch (err) {
      console.warn('[Midforge] Could not connect to Colyseus:', err);
    }
  }

  private buildMap() {
    this.walls = this.physics.add.staticGroup();

    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        const tile = MAP_DATA[r][c];
        const x = c * TILE_SIZE + TILE_SIZE / 2;
        const y = r * TILE_SIZE + TILE_SIZE / 2;

        let tileKey: string;
        switch (tile) {
          case 1: tileKey = 'tile_path'; break;
          case 2: tileKey = 'tile_stone'; break;
          case 3: tileKey = 'tile_water'; break;
          default: tileKey = 'tile_grass'; break;
        }

        const sprite = this.add.image(x, y, tileKey).setDepth(0);

        // Stone and water are collidable
        if (tile === 2 || tile === 3) {
          const wall = this.physics.add.staticImage(x, y, tileKey);
          wall.setDepth(0);
          wall.setVisible(false); // hide physics body, the decorative sprite is already drawn
          this.walls.add(wall);
        }
      }
    }
  }

  private createAnimations(tier: string) {
    const directions = ['down', 'left', 'right', 'up'];
    directions.forEach((dir, i) => {
      // Walk animation: 3 frames per direction
      this.anims.create({
        key: `${tier}_walk_${dir}`,
        frames: [
          { key: tier, frame: i * 3 },
          { key: tier, frame: i * 3 + 1 },
          { key: tier, frame: i * 3 + 2 },
        ],
        frameRate: 8,
        repeat: -1,
      });

      // Idle: single frame
      this.anims.create({
        key: `${tier}_idle_${dir}`,
        frames: [{ key: tier, frame: i * 3 }],
        frameRate: 1,
      });
    });
  }

  update(_time: number, delta: number) {
    const speed = 100;
    let vx = 0;
    let vy = 0;
    let moving = false;
    let direction = this.lastDirection;

    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;

    if (left) { vx = -speed; direction = 'left'; moving = true; }
    if (right) { vx = speed; direction = 'right'; moving = true; }
    if (up) { vy = -speed; direction = 'up'; moving = true; }
    if (down) { vy = speed; direction = 'down'; moving = true; }

    // Normalize diagonal movement
    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }

    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(vx, vy);

    const tier = this.playerTier;
    const animKey = moving
      ? `${tier}_walk_${direction}`
      : `${tier}_idle_${direction}`;

    if (this.player.anims.currentAnim?.key !== animKey) {
      this.player.anims.play(animKey, true);
    }

    if (moving) {
      this.lastDirection = direction;
    }

    // Update name label position
    this.nameLabel.setPosition(this.player.x, this.player.y - 28);

    // Send position to Colyseus ~15 times/sec, only when moved
    this.sendTimer += delta;
    if (this.colyseusRoom && this.sendTimer > 66) {
      this.sendTimer = 0;
      const px = Math.round(this.player.x);
      const py = Math.round(this.player.y);
      if (px !== this.lastSentX || py !== this.lastSentY) {
        this.colyseusRoom.send('move', {
          x: px,
          y: py,
          direction: this.lastDirection,
        });
        this.lastSentX = px;
        this.lastSentY = py;
      }
    }

    // NPC proximity check
    this.checkNpcProximity();
  }

  private checkNpcProximity() {
    const interactDist = 48;
    let closestId: string | null = null;
    let closestDist = Infinity;

    this.npcSprites.forEach((rect, npcId) => {
      const dx = this.player.x - rect.x;
      const dy = this.player.y - rect.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < interactDist && dist < closestDist) {
        closestDist = dist;
        closestId = npcId;
      }
    });

    if (closestId) {
      this.nearbyNpcId = closestId;
      const rect = this.npcSprites.get(closestId)!;
      const name = rect.getData('name');
      if (this.npcPromptLabel) {
        this.npcPromptLabel.setText(`[E] Talk to ${name}`);
        this.npcPromptLabel.setPosition(rect.x, rect.y + 24);
        this.npcPromptLabel.setVisible(true);
      }

      // Handle E key press
      if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
        const event = rect.getData('interactionEvent');
        this.game.events.emit(event, { npcId: closestId });
      }
    } else {
      this.nearbyNpcId = null;
      if (this.npcPromptLabel) {
        this.npcPromptLabel.setVisible(false);
      }
    }
  }

  shutdown() {
    // Clean up Colyseus connection when scene is stopped
    if (this.colyseusRoom) {
      this.colyseusRoom.leave();
      this.colyseusRoom = null;
    }
    this.otherPlayers.forEach((s) => s.destroy());
    this.otherLabels.forEach((l) => l.destroy());
    this.otherPlayers.clear();
    this.otherLabels.clear();
  }
}
