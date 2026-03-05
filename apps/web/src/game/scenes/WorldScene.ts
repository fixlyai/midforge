// @ts-ignore — Phaser exports default from ESM build
import Phaser from 'phaser';
import {
  TILE_SIZE, MAP_WIDTH, MAP_HEIGHT,
  CAMERA_ZOOM, CAMERA_LERP,
  PLAYER_SPEED, PLAYER_HITBOX, PLAYER_DEPTH, PLAYER_LABEL_DEPTH,
  NPC_INTERACT_DISTANCE, FOOTSTEP_TILE_INTERVAL,
  TILESHEET_TOWN, TILESHEET_BATTLE, TILESHEET_DUNGEON,
  FIRSTGID_TOWN, FIRSTGID_DUNGEON,
  TIER_SPRITE_MAP, TIER_COLORS,
  NPC_SPRITE_NAMES, NPC_TYPE_EVENT,
  ANIMATED_TILES, WANDERING_NPC,
  INTRO, TEXT_STYLES,
  getCharacterSpriteKey, TIER_PARTICLE_COLORS,
} from '@midforge/shared/constants/game';
import { QuestManager } from '@/game/managers/QuestManager';
import { NPC_QUEST_CHAINS } from '@/game/data/npcQuests';
import { getAmbientLine } from '@/game/data/ambientDialogue';

// ── TMJ type helpers ─────────────────────────────────────────
interface TmjProperty { name: string; type: string; value: any }
interface TmjObject {
  id: number; name: string; type: string;
  x: number; y: number; width: number; height: number;
  visible: boolean; rotation: number;
  properties?: TmjProperty[];
}
interface TmjTileLayer {
  id: number; name: string; type: 'tilelayer';
  width: number; height: number; data: number[];
  visible: boolean; opacity: number;
}
interface TmjObjectLayer {
  id: number; name: string; type: 'objectgroup';
  objects: TmjObject[]; visible: boolean; opacity: number;
}
type TmjLayer = TmjTileLayer | TmjObjectLayer;
interface TmjMap {
  width: number; height: number;
  tilewidth: number; tileheight: number;
  layers: TmjLayer[];
  tilesets: { firstgid: number; source: string }[];
  properties?: TmjProperty[];
}

function getProp(obj: { properties?: TmjProperty[] }, name: string): any {
  return obj.properties?.find(p => p.name === name)?.value;
}

export class WorldScene extends Phaser.Scene {
  public player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private lastDirection = 'down';
  private playerTier = 'villager';
  private spriteKey = '';           // resolved 48×48 sprite key (e.g. 'villager_base')
  private useNewSprites = false;    // true if 48×48 assets loaded successfully
  private nameLabel!: Phaser.GameObjects.Text;
  private inputEnabled = false;

  private footstepCounter = 0;
  private stuckFrames = 0;
  private groundData: number[] = [];
  private mapCols = 80;
  private mapRows = 70;

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

  // Zones
  private fogGraphics: Phaser.GameObjects.Graphics[] = [];
  private fogLabels: Phaser.GameObjects.Text[] = [];
  private zoneOverlaps: Phaser.GameObjects.Zone[] = [];

  // Animated tiles
  private animatedTileSprites: { sprite: Phaser.GameObjects.Image; frames: number[]; sheet: string; frameIndex: number }[] = [];
  private campfireGlows: Phaser.GameObjects.Graphics[] = [];
  private waterTileSprites: { sprite: Phaser.GameObjects.Image; frames: number[]; sheet: string; frameIndex: number; staggerOffset: number }[] = [];

  // Wandering NPCs
  private wanderingNpcs: {
    sprite: Phaser.GameObjects.Image;
    label: Phaser.GameObjects.Text;
    originX: number; originY: number;
    state: 'idle' | 'walking';
    targetX: number; targetY: number;
    timer: Phaser.Time.TimerEvent | null;
  }[] = [];

  // Map transition zones
  private transitionZones: { zone: Phaser.GameObjects.Zone; targetMap: string }[] = [];

  // NPC exclamation marks (FIX 4 — Zelda-style)
  private npcExclamations = new Map<string, Phaser.GameObjects.Text>();

  // Zone entry tracking (FIX 6)
  private lastZoneEntered = '';
  private zoneEntryZones: { zone: Phaser.GameObjects.Zone; zoneName: string; zoneType: string }[] = [];

  // Quest system
  public questManager!: QuestManager;

  // XP Nuggets — glowing amber orbs on the map
  private xpNuggets: {
    orb: Phaser.GameObjects.Arc;
    glow: Phaser.GameObjects.Arc;
    x: number; y: number;
    collected: boolean;
  }[] = [];
  private readonly XP_NUGGET_COUNT = 8;
  private readonly XP_NUGGET_REWARD = 15;
  private readonly XP_NUGGET_RESPAWN_MS = 10 * 60 * 1000; // 10 minutes
  private readonly XP_NUGGET_PICKUP_DIST = 20;
  private xpNuggetRespawnTimer: Phaser.Time.TimerEvent | null = null;

  // Brigands — hostile encounter NPCs
  private static readonly BRIGAND_TYPES = [
    { name: 'Forest Brigand', color: 0x2D5A27, tier: 'villager', levelRange: [1, 3], xpRange: [15, 40], goldRange: [5, 15],
      zones: [{ x: 380, y: 100, w: 200, h: 300 }, { x: 800, y: 100, w: 160, h: 280 }] },
    { name: 'Cave Troll', color: 0x6B5B4F, tier: 'apprentice', levelRange: [3, 6], xpRange: [40, 80], goldRange: [15, 30],
      zones: [{ x: 100, y: 500, w: 250, h: 200 }, { x: 900, y: 550, w: 200, h: 200 }] },
    { name: 'Deserter Knight', color: 0x8B2500, tier: 'merchant', levelRange: [5, 8], xpRange: [80, 150], goldRange: [30, 60],
      zones: [{ x: 480, y: 200, w: 300, h: 150 }] },
  ] as const;
  private brigands: {
    sprite: Phaser.GameObjects.Arc;
    excl: Phaser.GameObjects.Text;
    glow: Phaser.GameObjects.Arc;
    x: number; y: number;
    typeIdx: number;
    alive: boolean;
  }[] = [];
  private readonly BRIGAND_COUNT = 5;
  private readonly BRIGAND_PICKUP_DIST = 24;
  private readonly BRIGAND_RESPAWN_MS = 5 * 60 * 1000; // 5 minutes
  private brigandRespawnTimer: Phaser.Time.TimerEvent | null = null;
  private brigandEncounterCooldown = 0;

  // Shooting Star — silent random event
  private readonly STAR_MIN_INTERVAL_MS = 20 * 60 * 1000; // 20 minutes
  private readonly STAR_MAX_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
  private readonly STAR_LANDING_DURATION_MS = 3 * 60 * 1000; // 3 minutes
  private readonly STAR_LANDING_PICKUP_DIST = 22;
  private readonly STAR_XP_REWARD = 75;
  private starTimer: Phaser.Time.TimerEvent | null = null;
  private starLanding: {
    glow: Phaser.GameObjects.Arc;
    pulse: Phaser.GameObjects.Arc;
    x: number; y: number;
    active: boolean;
    expireTimer: Phaser.Time.TimerEvent | null;
  } | null = null;

  // Ambient dialogue cooldowns (NPC name → last trigger time)
  private ambientCooldowns = new Map<string, number>();
  private readonly AMBIENT_COOLDOWN_MS = 30_000; // 30 seconds per NPC
  private readonly AMBIENT_RANGE = 120;

  // Mobile touch controls (driven by React MobileControlPanel via CustomEvents)
  private isMobile = false;
  private mobileState = { left: false, right: false, up: false, down: false };
  private mobileJoystickHandler: ((e: Event) => void) | null = null;
  private mobileInteractHandler: (() => void) | null = null;
  private mobileInventoryHandler: (() => void) | null = null;

  // Spawn points from map
  private spawnDefault = { x: 624, y: 736 };
  private spawnNewGame = { x: 624, y: 240 };
  private questGiverPos = { x: 640, y: 592 };

  constructor() {
    super({ key: 'WorldScene' });
  }

  create() {
    const playerData = this.registry.get('playerData');
    this.playerTier = playerData?.tier ?? 'villager';

    const mapData = this.cache.json.get('map_data') as TmjMap;
    if (!mapData) {
      this.add.text(100, 100, 'Map data missing — drop starter_village_v2.tmj in /public/maps/',
        { color: '#ff0000', fontSize: '14px' });
      return;
    }

    this.mapCols = mapData.width;
    this.mapRows = mapData.height;
    const ts = mapData.tilewidth;
    const mapW = this.mapCols * ts;
    const mapH = this.mapRows * ts;

    const cameraZoom = getProp(mapData, 'cameraZoom') ?? CAMERA_ZOOM;

    this.walls = this.physics.add.staticGroup();

    // ── Render layers ────────────────────────────────────
    this.renderGroundLayer(mapData);
    this.renderCollisionLayer(mapData);
    this.parseSpawnPoints(mapData);
    this.spawnNpcsFromMap(mapData);
    this.parseZones(mapData);
    this.initAnimatedTiles(mapData);
    this.initWanderingNpcs();

    // ── Player ──────────────────────────────────────────
    const isFirstLogin = playerData?.firstLogin !== false;
    const spawnPos = isFirstLogin ? this.spawnNewGame : this.spawnDefault;

    // Resolve 64×64 LPC sprite key; fall back to 16×16 Kenney if not loaded
    this.spriteKey = getCharacterSpriteKey(this.playerTier, playerData?.xp ?? 0);
    this.useNewSprites = this.textures.exists(this.spriteKey);

    if (this.useNewSprites) {
      this.player = this.physics.add.sprite(spawnPos.x, spawnPos.y, this.spriteKey);
      this.player.setDepth(PLAYER_DEPTH);
      const pBody = this.player.body as Phaser.Physics.Arcade.Body;
      pBody.setSize(28, 16);
      pBody.setOffset(18, 46);    // feet-level collision for 64×64 sprite
      this.player.play(`${this.spriteKey}_idle`);
    } else {
      const spriteFrame = TIER_SPRITE_MAP[this.playerTier] ?? TIER_SPRITE_MAP.villager;
      this.player = this.physics.add.sprite(spawnPos.x, spawnPos.y, TILESHEET_DUNGEON.key, spriteFrame);
      this.player.setDepth(PLAYER_DEPTH);
      const pBody = this.player.body as Phaser.Physics.Arcade.Body;
      pBody.setSize(PLAYER_HITBOX.width, PLAYER_HITBOX.height);
      pBody.setOffset(PLAYER_HITBOX.offsetX, PLAYER_HITBOX.offsetY);
    }
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.walls);

    // ── Camera ──────────────────────────────────────────
    this.cameras.main.startFollow(this.player, true, CAMERA_LERP, CAMERA_LERP);
    this.cameras.main.setZoom(cameraZoom);
    this.cameras.main.setBounds(0, 0, mapW, mapH);
    this.physics.world.setBounds(0, 0, mapW, mapH);

    // ── Input ───────────────────────────────────────────
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,S,A,D') as Record<string, Phaser.Input.Keyboard.Key>;
    this.interactKey = this.input.keyboard!.addKey('E');

    // ── Mobile controls (React-driven via CustomEvents) ───
    this.isMobile = this.registry.get('isMobile') === true;
    if (this.isMobile) {
      this.cameras.main.setZoom(1);
      this.input.addPointer(1); // allow 2 touch points for joystick+button simultaneously
      this.setupMobileEventListeners();
    }

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
    const worldName = getProp(mapData, 'worldName') ?? 'Starter Village';
    this.add.text(8, 8, worldName, TEXT_STYLES.zoneName)
      .setScrollFactor(0).setDepth(100);

    // ── Decide: intro sequence or normal play ───────────
    if (isFirstLogin) {
      this.startIntroSequence(username);
    } else {
      this.inputEnabled = true;
    }

    // ── Expanding world: fetch unlock status ────────────
    this.fetchUnlockStatus();

    // ── Show pending notifications (daily login XP, etc.) ──
    this.showPendingNotifications(playerData);

    // ── Quest Manager (Solo Content Layer) ──
    this.questManager = new QuestManager(this, this.playerTier, playerData?.id ?? '');
    this.questManager.loadFromServer();
    this.questManager.setOnQuestComplete((questId, reward) => {
      // Gold flash + floating reward text
      this.flashScreen(0xFFD700, 300);
      const txt = this.add.text(
        this.player.x, this.player.y - 30,
        `+${reward.xp} XP  +${reward.gold}G`,
        { fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#F39C12', stroke: '#000000', strokeThickness: 3, resolution: 4 }
      ).setOrigin(0.5).setDepth(200);
      this.tweens.add({
        targets: txt, y: txt.y - 50, alpha: 0,
        duration: 3000, ease: 'Power2',
        onComplete: () => txt.destroy(),
      });
    });

    // ── XP Nuggets — glowing discovery orbs ──
    this.spawnXpNuggets();

    // ── Brigands — hostile encounter NPCs ──
    this.spawnBrigands();

    // ── Shooting Star — silent random event ──
    this.initShootingStar();

    this.connectMultiplayer(playerData);
    this.game.events.emit('world_ready');
  }

  private async showPendingNotifications(playerData: any) {
    const notifications = playerData?.pendingNotifications as { type: string; message: string }[] | null;
    if (!notifications || notifications.length === 0) return;

    // Display each notification as floating text; evolution gets a special sequence
    let delay = 500;
    for (const notif of notifications) {
      if (notif.type === 'evolution') {
        this.time.delayedCall(delay, () => this.playEvolutionSequence(notif.message));
        delay += 4000; // evolution takes ~3.5s
      } else {
        this.time.delayedCall(delay, () => {
          const txt = this.add.text(
            this.player.x, this.player.y - 30,
            notif.message,
            { fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#F39C12', resolution: 4 }
          ).setOrigin(0.5).setDepth(200);

          this.tweens.add({
            targets: txt,
            y: txt.y - 40,
            alpha: 0,
            duration: 3000,
            ease: 'Power2',
            onComplete: () => txt.destroy(),
          });
        });
        delay += 1000;
      }
    }

    // Clear notifications on server
    try {
      await fetch('/api/player/clear-notifications', { method: 'POST' });
    } catch (e) {
      // non-critical, ignore
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  EVOLUTION SEQUENCE — plays when character form upgrades
  // ═══════════════════════════════════════════════════════════
  private playEvolutionSequence(message: string) {
    if (!this.player) return;

    const cam = this.cameras.main;
    const currentZoom = cam.zoom;
    const tierColor = TIER_PARTICLE_COLORS[this.playerTier] ?? 0xF39C12;

    // Pause movement
    this.inputEnabled = false;
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setVelocity(0, 0);

    // Phase 1: Camera zoom in (800ms)
    this.tweens.add({
      targets: cam,
      zoom: currentZoom + 0.5,
      duration: 800,
      ease: 'Power2',
    });

    // Phase 2: White flash on player (3× at 200ms intervals, starts at 400ms)
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(400 + i * 200, () => {
        this.player.setTint(0xffffff);
        this.time.delayedCall(100, () => this.player.clearTint());
      });
    }

    // Phase 3: Swap sprite texture if new form exists (at 1200ms)
    this.time.delayedCall(1200, () => {
      const newKey = getCharacterSpriteKey(this.playerTier, Infinity); // latest possible form
      if (this.textures.exists(newKey)) {
        this.spriteKey = newKey;
        this.player.setTexture(newKey);
        this.player.play(`${newKey}_idle`, true);
        this.useNewSprites = true;
      }
    });

    // Phase 4: Particle burst in tier color (at 1300ms)
    this.time.delayedCall(1300, () => {
      const particles: Phaser.GameObjects.Arc[] = [];
      for (let i = 0; i < 20; i++) {
        const angle = (Math.PI * 2 / 20) * i;
        const p = this.add.circle(this.player.x, this.player.y, 3, tierColor, 0.9)
          .setDepth(200);
        particles.push(p);
        this.tweens.add({
          targets: p,
          x: this.player.x + Math.cos(angle) * 40,
          y: this.player.y + Math.sin(angle) * 40,
          alpha: 0,
          scale: 0.2,
          duration: 800,
          ease: 'Power2',
          onComplete: () => p.destroy(),
        });
      }
    });

    // Phase 5: Floating evolution text (at 1400ms)
    this.time.delayedCall(1400, () => {
      const txt = this.add.text(
        this.player.x, this.player.y - 40,
        message,
        {
          fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#F39C12',
          stroke: '#000000', strokeThickness: 3, resolution: 4,
        }
      ).setOrigin(0.5).setDepth(200);

      this.tweens.add({
        targets: txt,
        y: txt.y - 50,
        alpha: 0,
        duration: 3000,
        ease: 'Power2',
        onComplete: () => txt.destroy(),
      });
    });

    // Phase 6: Camera zoom back out + re-enable input (at 2200ms)
    this.time.delayedCall(2200, () => {
      this.tweens.add({
        targets: cam,
        zoom: currentZoom,
        duration: 800,
        ease: 'Power2',
        onComplete: () => {
          this.inputEnabled = true;
        },
      });
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  GROUND LAYER — render tile-by-tile from .tmj data
  // ═══════════════════════════════════════════════════════════
  // GIDs 1-4 are base grass tiles; anything else is a decoration overlay
  private static readonly GRASS_GIDS = new Set([1, 2, 3, 4]);
  private static readonly DEFAULT_GRASS_GID = 4; // most common grass

  private renderGroundLayer(map: TmjMap) {
    const layer = map.layers.find(l => l.name === 'Ground' && l.type === 'tilelayer') as TmjTileLayer | undefined;
    if (!layer) return;

    this.groundData = layer.data;
    const ts = map.tilewidth;
    const townKey = TILESHEET_TOWN.key;
    const cols = map.width;

    for (let i = 0; i < layer.data.length; i++) {
      const gid = layer.data[i];
      if (gid === 0) continue;

      const c = i % cols;
      const r = Math.floor(i / cols);
      const px = c * ts + ts / 2;
      const py = r * ts + ts / 2;

      const localId = gid - FIRSTGID_TOWN;

      if (WorldScene.GRASS_GIDS.has(gid)) {
        // Base grass — render at depth 0
        this.add.image(px, py, townKey, localId).setDepth(0);
      } else {
        // Decoration tile (trees, water, etc.) — render grass underneath first
        const grassLocalId = WorldScene.DEFAULT_GRASS_GID - FIRSTGID_TOWN;
        this.add.image(px, py, townKey, grassLocalId).setDepth(0);
        // Overlay the decoration on top at depth 2 (above grass, below NPCs/player)
        this.add.image(px, py, townKey, localId).setDepth(2);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  COLLISION LAYER — create physics bodies from objects
  // ═══════════════════════════════════════════════════════════
  // Collision objects to SKIP — these should not block the player at all
  private static readonly SKIP_COLLISION = new Set([
    'forest_nw', 'forest_ne', 'pond',
    'future_mines_gate', 'future_harbor_wall', 'future_academy_wall',
    'arena_gate_w', 'arena_gate_e',
  ]);

  // Buildings: only block the back wall/roof, leaving entrance open for NPC approach
  // Format: { dx, dy, dw, dh } — applied as offsets to original rect
  private static readonly SHRINK_COLLISION: Record<string, { dx: number; dy: number; dw: number; dh: number }> = {
    blacksmith:    { dx: 8, dy: 0, dw: -16, dh: -80 },   // only top 48px of 128h
    marketplace:   { dx: 8, dy: 0, dw: -16, dh: -128 },  // only top 64px of 192h
    tavern:        { dx: 8, dy: 0, dw: -16, dh: -96 },   // only top 48px of 144h
    elder_house:   { dx: 8, dy: 0, dw: -16, dh: -80 },   // only top 48px of 128h
    castle_gate:   { dx: 16, dy: 0, dw: -32, dh: -48 },  // only top 64px of 112h
  };

  private renderCollisionLayer(map: TmjMap) {
    const layer = map.layers.find(l => l.name === 'Collision' && l.type === 'objectgroup') as TmjObjectLayer | undefined;
    if (!layer) return;

    for (const obj of layer.objects) {
      // Skip decorative collision (trees, ponds, future gates)
      if (WorldScene.SKIP_COLLISION.has(obj.name)) continue;

      let x = obj.x;
      let y = obj.y;
      let w = obj.width;
      let h = obj.height;

      // Shrink building collision rects so players can approach NPCs
      const shrink = WorldScene.SHRINK_COLLISION[obj.name];
      if (shrink) {
        x += shrink.dx;
        y += shrink.dy;
        w += shrink.dw;
        h += shrink.dh;
      }

      const cx = x + w / 2;
      const cy = y + h / 2;
      const wall = this.physics.add.staticImage(cx, cy, '__DEFAULT');
      wall.setVisible(false).setDepth(0);
      const b = wall.body as Phaser.Physics.Arcade.Body;
      b.setSize(w, h);
      b.setOffset(-w / 2, -h / 2);
      this.walls.add(wall);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  SPAWN POINTS — read from SpawnPoints layer
  // ═══════════════════════════════════════════════════════════
  private parseSpawnPoints(map: TmjMap) {
    const layer = map.layers.find(l => l.name === 'SpawnPoints' && l.type === 'objectgroup') as TmjObjectLayer | undefined;
    if (!layer) return;

    for (const obj of layer.objects) {
      if (obj.name === 'player_default') {
        this.spawnDefault = { x: obj.x + 8, y: obj.y + 8 };
      } else if (obj.name === 'player_new_game') {
        this.spawnNewGame = { x: obj.x + 8, y: obj.y + 8 };
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  NPCs — spawn from map objects, use sprite property string
  // ═══════════════════════════════════════════════════════════
  private spawnNpcsFromMap(map: TmjMap) {
    const layer = map.layers.find(l => l.name === 'NPCs' && l.type === 'objectgroup') as TmjObjectLayer | undefined;
    if (!layer) return;

    const dungeonKey = TILESHEET_DUNGEON.key;

    for (const obj of layer.objects) {
      const spriteName = getProp(obj, 'sprite') ?? 'villager';
      const npcType = getProp(obj, 'npcType') ?? 'ambient';
      const dialogue = getProp(obj, 'dialogue') ?? '';
      const tierRequired = getProp(obj, 'tierRequired') ?? '';
      const wandering = getProp(obj, 'wandering') ?? false;

      const frame = NPC_SPRITE_NAMES[spriteName] ?? NPC_SPRITE_NAMES.villager;
      const px = obj.x + 8;
      const py = obj.y + 8;

      const isLocked = tierRequired.startsWith('locked_until_');

      const sprite = this.add.image(px, py, dungeonKey, frame)
        .setDepth(8)
        .setVisible(!isLocked);

      const eventName = NPC_TYPE_EVENT[npcType] ?? 'npc_ambient';
      sprite.setData('npcId', obj.name);
      sprite.setData('interactionEvent', eventName);
      sprite.setData('name', obj.name);
      sprite.setData('dialogue', dialogue);
      sprite.setData('npcType', npcType);
      sprite.setData('tierRequired', tierRequired);
      sprite.setData('wandering', wandering);

      if (!isLocked) {
        this.npcSprites.set(obj.name, sprite);

        const label = this.add.text(px, py - 14, obj.name, {
          ...TEXT_STYLES.npcName,
          color: '#F39C12',
        }).setOrigin(0.5).setDepth(PLAYER_LABEL_DEPTH);
        this.npcLabels.set(obj.name, label);

        // Zelda-style exclamation mark (hidden until player is near)
        const excl = this.add.text(px, py - 28, '!', {
          fontFamily: '"Press Start 2P"',
          fontSize: '14px',
          color: '#F39C12',
          stroke: '#000000',
          strokeThickness: 4,
          resolution: 4,
        }).setOrigin(0.5, 1).setVisible(false).setDepth(PLAYER_LABEL_DEPTH + 1);
        this.npcExclamations.set(obj.name, excl);

        // Mobile: tap NPC to interact — uses unified interactWithNPC path
        sprite.setInteractive();
        sprite.on('pointerdown', () => {
          if (!this.player) return;
          const dist = Phaser.Math.Distance.Between(
            this.player.x, this.player.y, sprite.x, sprite.y
          );
          if (dist < NPC_INTERACT_DISTANCE) {
            this.interactWithNPC(obj.name);
          } else {
            const hint = this.add.text(sprite.x, sprite.y - 20, 'Get closer', {
              fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#F39C12', resolution: 4,
            }).setOrigin(0.5).setDepth(200);
            this.tweens.add({
              targets: hint, y: hint.y - 15, alpha: 0,
              duration: 1200, onComplete: () => hint.destroy(),
            });
          }
        });
      }

      // Store quest giver position for glowing path
      if (npcType === 'quest_giver') {
        this.questGiverPos = { x: px, y: py };
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  ZONES — parse zone triggers and future zones
  // ═══════════════════════════════════════════════════════════
  private parseZones(map: TmjMap) {
    const layer = map.layers.find(l => l.name === 'Zones' && l.type === 'objectgroup') as TmjObjectLayer | undefined;
    if (!layer) return;

    for (const obj of layer.objects) {
      const zoneType = getProp(obj, 'zoneType') ?? '';

      if (zoneType === 'future_zone') {
        // Render fog overlay (will be updated by fetchUnlockStatus)
        const gfx = this.add.graphics();
        gfx.fillStyle(0x0d0a1e, 0.65);
        gfx.fillRect(obj.x, obj.y, obj.width, obj.height);
        gfx.lineStyle(2, 0xF39C12, 0.4);
        gfx.strokeRect(obj.x, obj.y, obj.width, obj.height);
        gfx.setDepth(50);
        gfx.setData('zoneName', obj.name);
        gfx.setData('threshold', getProp(obj, 'unlockThreshold') ?? 9999);
        gfx.setData('lockedMessage', getProp(obj, 'lockedMessage') ?? '');
        gfx.setData('zoneDisplayName', getProp(obj, 'zoneName') ?? obj.name);
        this.fogGraphics.push(gfx);

        // Progress label
        const label = this.add.text(
          obj.x + obj.width / 2,
          obj.y + obj.height / 2,
          getProp(obj, 'zoneName') ?? obj.name,
          {
            fontSize: '5px',
            fontFamily: '"Press Start 2P", monospace',
            color: '#F39C12',
            stroke: '#000000',
            strokeThickness: 2,
            align: 'center' as const,
            resolution: 4,
          }
        ).setOrigin(0.5).setDepth(51);
        label.setData('zoneName', obj.name);
        this.fogLabels.push(label);
      }

      if (zoneType === 'social_hub') {
        // Campfire zone — warm amber glow when player enters
        const zone = this.add.zone(
          obj.x + obj.width / 2,
          obj.y + obj.height / 2,
          obj.width,
          obj.height
        );
        this.physics.world.enable(zone);
        (zone.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
        (zone.body as Phaser.Physics.Arcade.Body).moves = false;
        zone.setData('zoneType', 'social_hub');
        this.zoneOverlaps.push(zone);
      }

      if (zoneType === 'map_transition') {
        const targetMap = getProp(obj, 'targetMap') ?? '';
        const zone = this.add.zone(
          obj.x + obj.width / 2,
          obj.y + obj.height / 2,
          obj.width,
          obj.height
        );
        this.physics.world.enable(zone);
        (zone.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
        (zone.body as Phaser.Physics.Arcade.Body).moves = false;
        zone.setData('zoneType', 'map_transition');
        zone.setData('targetMap', targetMap);
        this.transitionZones.push({ zone, targetMap });
      }

      // FIX 6: Register all named zones for entry detection
      if (obj.name && zoneType) {
        const entryZone = this.add.zone(
          obj.x + obj.width / 2,
          obj.y + obj.height / 2,
          obj.width,
          obj.height
        );
        this.physics.world.enable(entryZone);
        (entryZone.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
        (entryZone.body as Phaser.Physics.Arcade.Body).moves = false;
        this.zoneEntryZones.push({ zone: entryZone, zoneName: obj.name, zoneType });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  ANIMATED TILES — campfire + water frame cycling
  // ═══════════════════════════════════════════════════════════
  private initAnimatedTiles(map: TmjMap) {
    // ── Campfire — place animated fire sprite at the social_hub zone center ──
    const zonesLayer = map.layers.find(l => l.name === 'Zones' && l.type === 'objectgroup') as TmjObjectLayer | undefined;
    if (zonesLayer) {
      for (const obj of zonesLayer.objects) {
        const zoneType = getProp(obj, 'zoneType') ?? '';
        if (zoneType === 'social_hub') {
          const cx = obj.x + obj.width / 2;
          const cy = obj.y + obj.height / 2;
          const cfg = ANIMATED_TILES.campfire;

          // Campfire sprite (cycles frames)
          const fireSprite = this.add.image(cx, cy, cfg.sheet, cfg.frames[0]).setDepth(5);
          this.animatedTileSprites.push({
            sprite: fireSprite,
            frames: [...cfg.frames],
            sheet: cfg.sheet,
            frameIndex: 0,
          });

          // Warm glow circle beneath the fire
          const glow = this.add.graphics();
          glow.fillStyle(cfg.glowColor, cfg.glowAlpha);
          glow.fillCircle(cx, cy, cfg.glowRadius);
          glow.setDepth(4);
          this.campfireGlows.push(glow);

          // Pulsing glow tween
          this.tweens.add({
            targets: glow,
            alpha: { from: 0.6, to: 1.0 },
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
        }
      }
    }

    // ── Water — animate any ground GIDs 25/26 (sand/water edge tiles) ──
    // Also animate the pond_area zone with water tile overlays
    if (zonesLayer) {
      for (const obj of zonesLayer.objects) {
        const zoneType = getProp(obj, 'zoneType') ?? '';
        if (zoneType === 'ambient_water') {
          const cfg = ANIMATED_TILES.water;
          const ts = map.tilewidth;
          const startCol = Math.floor(obj.x / ts);
          const startRow = Math.floor(obj.y / ts);
          const endCol = Math.ceil((obj.x + obj.width) / ts);
          const endRow = Math.ceil((obj.y + obj.height) / ts);

          let tileIndex = 0;
          for (let r = startRow; r < endRow; r++) {
            for (let c = startCol; c < endCol; c++) {
              const gid = this.groundData[r * this.mapCols + c] ?? 0;
              // Only animate sand/water-edge tiles (GIDs 25, 26)
              if (gid === 25 || gid === 26) {
                const px = c * ts + ts / 2;
                const py = r * ts + ts / 2;
                const startFrame = tileIndex % cfg.frames.length;
                const waterSprite = this.add.image(px, py, cfg.sheet, cfg.frames[startFrame]).setDepth(1).setAlpha(0.5);
                this.waterTileSprites.push({
                  sprite: waterSprite,
                  frames: [...cfg.frames],
                  sheet: cfg.sheet,
                  frameIndex: startFrame,
                  staggerOffset: tileIndex * cfg.staggerMs,
                });
                tileIndex++;
              }
            }
          }
        }
      }
    }

    // ── Start frame cycling timers ──
    // Campfire frame cycle
    if (this.animatedTileSprites.length > 0) {
      const cfgFire = ANIMATED_TILES.campfire;
      this.time.addEvent({
        delay: 1000 / cfgFire.frameRate,
        loop: true,
        callback: () => {
          for (const entry of this.animatedTileSprites) {
            entry.frameIndex = (entry.frameIndex + 1) % entry.frames.length;
            entry.sprite.setFrame(entry.frames[entry.frameIndex]);
          }
        },
      });
    }

    // Water frame cycle (staggered)
    if (this.waterTileSprites.length > 0) {
      const cfgWater = ANIMATED_TILES.water;
      this.time.addEvent({
        delay: 1000 / cfgWater.frameRate,
        loop: true,
        callback: () => {
          for (const entry of this.waterTileSprites) {
            entry.frameIndex = (entry.frameIndex + 1) % entry.frames.length;
            entry.sprite.setFrame(entry.frames[entry.frameIndex]);
          }
        },
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  WANDERING NPCs — random walk AI for ambient NPCs
  // ═══════════════════════════════════════════════════════════
  private initWanderingNpcs() {
    this.npcSprites.forEach((sprite, npcId) => {
      const isWanderer = sprite.getData('wandering') === true;
      if (!isWanderer) return;

      const label = this.npcLabels.get(npcId);
      if (!label) return;

      const entry = {
        sprite,
        label,
        originX: sprite.x,
        originY: sprite.y,
        state: 'idle' as const,
        targetX: sprite.x,
        targetY: sprite.y,
        timer: null as Phaser.Time.TimerEvent | null,
      };

      this.wanderingNpcs.push(entry);
      this.scheduleWanderAction(entry);
    });
  }

  private scheduleWanderAction(entry: typeof this.wanderingNpcs[number]) {
    const cfg = WANDERING_NPC;
    if (entry.state === 'idle') {
      // After a random pause, pick a new walk target
      const pauseDuration = cfg.pauseMin + Math.random() * (cfg.pauseMax - cfg.pauseMin);
      entry.timer = this.time.delayedCall(pauseDuration, () => {
        // Pick random point within maxRadius of origin
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * cfg.maxRadius;
        entry.targetX = entry.originX + Math.cos(angle) * dist;
        entry.targetY = entry.originY + Math.sin(angle) * dist;
        entry.state = 'walking';

        const dx = entry.targetX - entry.sprite.x;
        const dy = entry.targetY - entry.sprite.y;
        const walkDist = Math.sqrt(dx * dx + dy * dy);
        const walkDuration = Math.max(500, (walkDist / cfg.speed) * 1000);

        this.tweens.add({
          targets: entry.sprite,
          x: entry.targetX,
          y: entry.targetY,
          duration: walkDuration,
          ease: 'Linear',
          onUpdate: () => {
            entry.label.setPosition(entry.sprite.x, entry.sprite.y - 14);
          },
          onComplete: () => {
            entry.state = 'idle';
            this.scheduleWanderAction(entry);
          },
        });
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  MAP TRANSITION — check player overlap with transition zones
  // ═══════════════════════════════════════════════════════════
  private lastTransitionTime = 0;

  private checkMapTransitions() {
    if (!this.player || this.transitionZones.length === 0) return;

    // Cooldown: only trigger once every 3 seconds
    const now = this.time.now;
    if (now - this.lastTransitionTime < 3000) return;

    for (const { zone, targetMap } of this.transitionZones) {
      const zBody = zone.body as Phaser.Physics.Arcade.Body;
      const pBody = this.player.body as Phaser.Physics.Arcade.Body;

      if (Phaser.Geom.Intersects.RectangleToRectangle(
        new Phaser.Geom.Rectangle(pBody.x, pBody.y, pBody.width, pBody.height),
        new Phaser.Geom.Rectangle(zBody.x, zBody.y, zBody.width, zBody.height)
      )) {
        this.lastTransitionTime = now;
        const displayName = targetMap.replace(/_/g, ' ');

        // Show typewriter dialogue instead of just flashing
        this.inputEnabled = false;
        this.showTypewriterDialogue(
          [`The ${displayName} is being prepared... Come back soon.`],
          () => { this.inputEnabled = true; }
        );
        return;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  EXPANDING WORLD — fetch unlock status from API
  // ═══════════════════════════════════════════════════════════
  private async fetchUnlockStatus() {
    try {
      const res = await fetch('/api/world/unlock-status');
      if (!res.ok) return;
      const data = await res.json() as { userCount: number; unlockedZones: string[] };

      for (const gfx of this.fogGraphics) {
        const zoneName = gfx.getData('zoneName') as string;
        const threshold = gfx.getData('threshold') as number;
        const lockedMsg = gfx.getData('lockedMessage') as string;

        if (data.unlockedZones.includes(zoneName)) {
          // Zone unlocked — remove fog
          gfx.destroy();
          const label = this.fogLabels.find(l => l.getData('zoneName') === zoneName);
          label?.destroy();
        } else {
          // Update progress text
          const label = this.fogLabels.find(l => l.getData('zoneName') === zoneName);
          if (label) {
            const displayName = gfx.getData('zoneDisplayName') as string;
            label.setText(`${displayName}\n${data.userCount}/${threshold} builders`);
          }
        }
      }
    } catch (_err) {
      // API unavailable — fog stays as-is
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  INTRO SEQUENCE (Phase A)
  // ═══════════════════════════════════════════════════════════
  private startIntroSequence(username: string) {
    this.introActive = true;
    this.inputEnabled = false;

    const cameraZoom = this.cameras.main.zoom;

    this.cameras.main.setZoom(INTRO.zoomStart * cameraZoom);
    this.tweens.add({
      targets: this.cameras.main,
      zoom: INTRO.zoomEnd * cameraZoom,
      duration: INTRO.zoomDuration,
      ease: 'Sine.easeInOut',
    });

    // Find the ForgeMaster NPC sprite on the map
    const fmSprite = this.npcSprites.get('ForgeMaster');
    const fmPos = fmSprite ? { x: fmSprite.x, y: fmSprite.y } : this.spawnNewGame;

    // Create a walking Forge Master from above the player down toward them
    const walkSprite = this.add.image(fmPos.x, fmPos.y - 80, TILESHEET_DUNGEON.key,
      NPC_SPRITE_NAMES.elder).setDepth(PLAYER_DEPTH + 1);

    const walkDuration = 80 / INTRO.forgeMasterWalkSpeed * 1000;

    this.tweens.add({
      targets: walkSprite,
      y: fmPos.y,
      duration: walkDuration,
      ease: 'Linear',
      onComplete: () => {
        const lines = INTRO.dialogLines.map(l => l.replace('@{username}', `@${username}`));
        this.showTypewriterDialogue(lines, () => {
          walkSprite.destroy();
          this.tweens.add({
            targets: this.cameras.main,
            zoom: cameraZoom,
            duration: 1000,
            ease: 'Sine.easeOut',
          });

          this.showGlowingPath();
          this.introActive = false;
          this.inputEnabled = true;
          // FIX 7: After intro, show world tour panning to castle
          this.time.delayedCall(2000, () => this.showWorldTour());
        });
      },
    });
  }

  private showTypewriterDialogue(lines: string[], onComplete: () => void) {
    const cam = this.cameras.main;
    const boxH = 58;
    const boxW = cam.width;
    // Position dialogue box 8px above the bottom edge (above mobile control panel border)
    const boxY = cam.height - boxH - 8;

    const bg = this.add.rectangle(boxW / 2, boxY + boxH / 2, boxW, boxH, 0x0d0a1e, 0.95)
      .setScrollFactor(0).setDepth(600);
    const border = this.add.rectangle(boxW / 2, boxY, boxW, 2, 0xF39C12, 0.8)
      .setScrollFactor(0).setDepth(601);

    this.dialogueText = this.add.text(16, boxY + 10, '', TEXT_STYLES.dialogue)
      .setScrollFactor(0).setDepth(602);

    const advanceHint = this.add.text(boxW - 16, boxY + boxH - 8, '[SPACE]', {
      fontSize: '4px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#F39C12',
      stroke: '#000000',
      strokeThickness: 1,
    }).setOrigin(1, 1).setScrollFactor(0).setDepth(602).setAlpha(0);

    this.dialogueBox = this.add.container(0, 0, [bg, border, this.dialogueText, advanceHint])
      .setDepth(600);

    let lineIndex = 0;
    const showLine = () => {
      if (lineIndex >= lines.length) {
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

  // ═══════════════════════════════════════════════════════════
  //  WORLD TOUR — camera pan to castle on first login (FIX 7)
  // ═══════════════════════════════════════════════════════════
  private async showWorldTour() {
    if (!this.player) return;
    this.inputEnabled = false;

    // Pan to castle gate (tile ~39,5 → px 624,80)
    this.cameras.main.stopFollow();
    this.cameras.main.pan(624, 80, 1500, 'Sine.easeInOut');
    await this.wait(2000);
    this.game.events.emit('zone_enter_banner', 'THE CASTLE — Reach Legend Tier');
    await this.wait(2500);

    // Pan back to player
    this.cameras.main.pan(this.player.x, this.player.y, 1500, 'Sine.easeInOut');
    await this.wait(1500);
    this.cameras.main.startFollow(this.player, true, CAMERA_LERP, CAMERA_LERP);
    this.inputEnabled = true;
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => this.time.delayedCall(ms, resolve));
  }

  private showGlowingPath() {
    const startX = this.player.x;
    const startY = this.player.y;
    const endX = this.questGiverPos.x;
    const endY = this.questGiverPos.y;

    const pathTiles: Phaser.GameObjects.Rectangle[] = [];
    const steps = Math.max(Math.abs(endX - startX), Math.abs(endY - startY)) / TILE_SIZE;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = startX + (endX - startX) * t;
      const py = startY + (endY - startY) * t;
      const glow = this.add.rectangle(px, py, TILE_SIZE, TILE_SIZE, 0xF39C12, 0.15)
        .setDepth(1);
      pathTiles.push(glow);
    }

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
    // Use ground tile GID to determine surface type
    const tileX = Math.floor(this.player.x / TILE_SIZE);
    const tileY = Math.floor(this.player.y / TILE_SIZE);
    const idx = tileY * this.mapCols + tileX;
    const gid = this.groundData[idx] ?? 1;

    // GIDs 1-4 are grass variants, 25-26 are sand; anything else = stone path
    const isGrass = gid >= 1 && gid <= 4;
    const prefix = isGrass ? 'footstep_grass' : 'footstep_stone';
    const sfxIdx = Math.floor(Math.random() * 3);
    const key = `${prefix}_${sfxIdx}`;

    if (this.cache.audio.exists(key)) {
      this.sound.play(key, { volume: 0.15 });
    }
  }

  private flashScreen(color = 0xFFFFFF, duration = 200) {
    const flash = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      color, 0.7
    ).setScrollFactor(0).setDepth(999);
    this.tweens.add({
      targets: flash, alpha: 0, duration,
      onComplete: () => flash.destroy(),
    });
  }

  private showAmbientBubble(x: number, y: number, text: string) {
    const bubble = this.add.text(x, y, text, {
      fontFamily: '"Press Start 2P"', fontSize: '5px',
      color: '#cccccc', backgroundColor: '#1a0a2eCC',
      padding: { x: 4, y: 3 },
      resolution: 4,
      wordWrap: { width: 120 },
    }).setOrigin(0.5, 1).setDepth(150);

    this.tweens.add({
      targets: bubble,
      y: y - 12,
      alpha: 0,
      duration: 4000,
      ease: 'Power1',
      delay: 2000,
      onComplete: () => bubble.destroy(),
    });
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
    if (!this.inputEnabled || this.introActive || !this.player || !this.cursors) return;

    let vx = 0;
    let vy = 0;
    let moving = false;
    let direction = this.lastDirection;

    const left  = this.cursors.left?.isDown  || this.wasd?.A?.isDown  || this.mobileState.left  || false;
    const right = this.cursors.right?.isDown || this.wasd?.D?.isDown || this.mobileState.right || false;
    const up    = this.cursors.up?.isDown    || this.wasd?.W?.isDown    || this.mobileState.up    || false;
    const down  = this.cursors.down?.isDown  || this.wasd?.S?.isDown  || this.mobileState.down  || false;

    if (left) { vx = -PLAYER_SPEED; direction = 'left'; moving = true; }
    if (right) { vx = PLAYER_SPEED; direction = 'right'; moving = true; }
    if (up) { vy = -PLAYER_SPEED; direction = 'up'; moving = true; }
    if (down) { vy = PLAYER_SPEED; direction = 'down'; moving = true; }

    if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }

    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setVelocity(vx, vy);

    // BUG 4: Auto-unstuck — nudge player if stuck against collision for 10+ frames
    const actuallyMoved = Math.abs(playerBody.velocity.x) > 1 || Math.abs(playerBody.velocity.y) > 1;
    if (moving && !actuallyMoved) {
      this.stuckFrames++;
      if (this.stuckFrames > 10) {
        const cx = 624, cy = 560;
        this.player.setPosition(
          this.player.x + (cx > this.player.x ? 3 : -3),
          this.player.y + (cy > this.player.y ? 3 : -3),
        );
        this.stuckFrames = 0;
      }
    } else {
      this.stuckFrames = 0;
    }

    // Play walk/idle animations when 48×48 sprites are active
    if (this.useNewSprites) {
      if (moving) {
        this.player.play(`${this.spriteKey}_walk_${direction}`, true);
      } else {
        this.player.play(`${this.spriteKey}_idle`, true);
      }
    }

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
    this.checkMapTransitions();
    this.checkZoneEntry();
    this.checkXpNuggetPickup();
    this.checkBrigandEncounter();
    this.checkStarLandingPickup();
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

      // FIX 4: Zelda exclamation mark — show/hide + bounce
      const excl = this.npcExclamations.get(npcId);
      if (excl) {
        const inRange = dist < NPC_INTERACT_DISTANCE;
        if (inRange && !excl.visible) {
          excl.setVisible(true);
          excl.setPosition(sprite.x, sprite.y - 28);
          this.tweens.add({
            targets: excl,
            y: sprite.y - 36,
            duration: 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
        } else if (!inRange && excl.visible) {
          excl.setVisible(false);
          this.tweens.killTweensOf(excl);
        }
      }

      // Ambient dialogue bubble — within AMBIENT_RANGE, cooldown per NPC
      if (dist < this.AMBIENT_RANGE && dist > NPC_INTERACT_DISTANCE) {
        const now = Date.now();
        const lastTime = this.ambientCooldowns.get(npcId) ?? 0;
        if (now - lastTime > this.AMBIENT_COOLDOWN_MS) {
          this.ambientCooldowns.set(npcId, now);
          const npcName = sprite.getData('name') as string;
          const line = getAmbientLine(npcName);
          if (line) {
            this.showAmbientBubble(sprite.x, sprite.y - 24, line);
          }
        }
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
        this.interactWithNPC(closestId);
      }
    } else {
      this.nearbyNpcId = null;
      this.npcPromptLabel?.setVisible(false);
    }
  }

  private interactWithNPC(npcId: string) {
    const sprite = this.npcSprites.get(npcId);
    if (!sprite) return;
    this.playInteractSound();

    const npcName = sprite.getData('name') as string;
    const eventName = sprite.getData('interactionEvent') as string;
    const fallbackDialogue = sprite.getData('dialogue') as string;

    // Notify quest manager
    this.questManager?.onNPCTalked(npcName);

    // Check if NPC has a quest chain
    const npcKey = Object.keys(NPC_QUEST_CHAINS).find(
      k => NPC_QUEST_CHAINS[k].npcName === npcName
    );

    if (npcKey && this.questManager) {
      const { dialogue, questId, hasQuest } = this.questManager.getNPCDialogue(npcKey);
      if (dialogue) {
        // Show Zelda-style typewriter dialogue
        this.inputEnabled = false;
        this.showTypewriterDialogue([dialogue], () => {
          this.inputEnabled = true;
          // If there's a quest to accept, accept it
          if (hasQuest && questId) {
            this.questManager.acceptQuest(questId);
            this.game.events.emit('zone_enter_banner', `QUEST ACCEPTED`);
          }
          // If quest is complete (progress met), complete it
          if (!hasQuest && questId) {
            // Quest completion is handled by QuestManager internally
          }
        });
        return;
      }
    }

    // NPCs with React panels (arena, marketplace, inventory) → emit to React
    const REACT_PANEL_EVENTS = new Set(['npc_arena', 'npc_marketplace', 'npc_inventory']);
    if (REACT_PANEL_EVENTS.has(eventName)) {
      this.game.events.emit(eventName, { npcId, dialogue: fallbackDialogue });
    } else {
      // All other NPCs (ambient, tavern, intro, gate_guard, future, quest_giver) → typewriter
      if (fallbackDialogue) {
        this.inputEnabled = false;
        this.showTypewriterDialogue([fallbackDialogue], () => {
          this.inputEnabled = true;
        });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  XP NUGGETS — glowing amber discovery orbs
  // ═══════════════════════════════════════════════════════════
  private spawnXpNuggets() {
    // Clear any existing nuggets
    for (const n of this.xpNuggets) {
      n.orb.destroy();
      n.glow.destroy();
    }
    this.xpNuggets = [];

    // Walkable area bounds (avoid edges and collision-heavy areas)
    const margin = 80;
    const mapW = this.mapCols * TILE_SIZE;
    const mapH = this.mapRows * TILE_SIZE;

    for (let i = 0; i < this.XP_NUGGET_COUNT; i++) {
      const x = margin + Math.random() * (mapW - margin * 2);
      const y = margin + Math.random() * (mapH - margin * 2);

      // Outer glow (larger, faint, pulsing)
      const glow = this.add.circle(x, y, 10, 0xF39C12, 0.15).setDepth(3);
      this.tweens.add({
        targets: glow,
        scaleX: 1.8, scaleY: 1.8, alpha: 0.05,
        duration: 1200 + Math.random() * 400,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });

      // Inner orb (bright amber core)
      const orb = this.add.circle(x, y, 4, 0xF39C12, 0.9).setDepth(4);
      this.tweens.add({
        targets: orb,
        scaleX: 1.2, scaleY: 1.2, alpha: 0.6,
        duration: 800 + Math.random() * 300,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        delay: Math.random() * 500,
      });

      this.xpNuggets.push({ orb, glow, x, y, collected: false });
    }

    // Schedule respawn
    this.xpNuggetRespawnTimer = this.time.addEvent({
      delay: this.XP_NUGGET_RESPAWN_MS,
      loop: true,
      callback: () => this.respawnXpNuggets(),
    });
  }

  private respawnXpNuggets() {
    const mapW = this.mapCols * TILE_SIZE;
    const mapH = this.mapRows * TILE_SIZE;
    const margin = 80;

    for (const nugget of this.xpNuggets) {
      if (!nugget.collected) continue;
      // Relocate to new random position
      const x = margin + Math.random() * (mapW - margin * 2);
      const y = margin + Math.random() * (mapH - margin * 2);
      nugget.x = x;
      nugget.y = y;
      nugget.collected = false;

      nugget.glow.setPosition(x, y).setVisible(true).setAlpha(0.15);
      nugget.orb.setPosition(x, y).setVisible(true).setAlpha(0.9);

      // Restart pulse tweens
      this.tweens.add({
        targets: nugget.glow,
        scaleX: 1.8, scaleY: 1.8, alpha: 0.05,
        duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      this.tweens.add({
        targets: nugget.orb,
        scaleX: 1.2, scaleY: 1.2, alpha: 0.6,
        duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
  }

  private checkXpNuggetPickup() {
    if (!this.player) return;
    const px = this.player.x;
    const py = this.player.y;

    for (const nugget of this.xpNuggets) {
      if (nugget.collected) continue;
      const dx = px - nugget.x;
      const dy = py - nugget.y;
      if (dx * dx + dy * dy < this.XP_NUGGET_PICKUP_DIST * this.XP_NUGGET_PICKUP_DIST) {
        this.collectXpNugget(nugget);
      }
    }
  }

  private collectXpNugget(nugget: typeof this.xpNuggets[number]) {
    nugget.collected = true;

    // Kill pulse tweens and hide
    this.tweens.killTweensOf(nugget.orb);
    this.tweens.killTweensOf(nugget.glow);

    // Burst animation: orb scales up and fades
    this.tweens.add({
      targets: nugget.orb,
      scaleX: 3, scaleY: 3, alpha: 0,
      duration: 400, ease: 'Power2',
      onComplete: () => nugget.orb.setVisible(false),
    });
    this.tweens.add({
      targets: nugget.glow,
      scaleX: 4, scaleY: 4, alpha: 0,
      duration: 400, ease: 'Power2',
      onComplete: () => nugget.glow.setVisible(false),
    });

    // Floating "+15 XP" text
    const txt = this.add.text(
      nugget.x, nugget.y - 8,
      `+${this.XP_NUGGET_REWARD} XP`,
      {
        fontFamily: '"Press Start 2P"', fontSize: '8px',
        color: '#F39C12', stroke: '#000000', strokeThickness: 3, resolution: 4,
      }
    ).setOrigin(0.5).setDepth(200);

    this.tweens.add({
      targets: txt,
      y: txt.y - 40, alpha: 0,
      duration: 2000, ease: 'Power2',
      onComplete: () => txt.destroy(),
    });

    // Amber flash
    this.flashScreen(0xF39C12, 150);

    // Play chime if available
    if (this.cache.audio.exists('sfx_interact')) {
      this.sound.play('sfx_interact', { volume: 0.25 });
    }

    // Award XP via API (fire and forget)
    fetch('/api/player/award-xp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: this.XP_NUGGET_REWARD, source: 'xp_nugget' }),
    }).then(res => res.json()).then(data => {
      // Update UIScene XP bar if it exists
      if (data.newXP !== undefined) {
        this.game.events.emit('xp_updated', data.newXP);
      }
    }).catch(() => {});
  }

  // ═══════════════════════════════════════════════════════════
  //  BRIGANDS — hostile encounter NPCs on map
  // ═══════════════════════════════════════════════════════════
  private spawnBrigands() {
    for (const b of this.brigands) {
      b.sprite.destroy(); b.excl.destroy(); b.glow.destroy();
    }
    this.brigands = [];

    const types = WorldScene.BRIGAND_TYPES;
    for (let i = 0; i < this.BRIGAND_COUNT; i++) {
      const typeIdx = i % types.length;
      const bType = types[typeIdx];
      // Pick a random zone for this brigand type
      const zone = bType.zones[Math.floor(Math.random() * bType.zones.length)];
      const x = zone.x + Math.random() * zone.w;
      const y = zone.y + Math.random() * zone.h;

      // Red-tinged circle body
      const sprite = this.add.circle(x, y, 6, bType.color, 0.85).setDepth(7);

      // Pulsing red glow
      const glow = this.add.circle(x, y, 14, 0xE74C3C, 0.12).setDepth(6);
      this.tweens.add({
        targets: glow,
        scaleX: 1.6, scaleY: 1.6, alpha: 0.04,
        duration: 1000 + Math.random() * 400,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });

      // Red exclamation mark above
      const excl = this.add.text(x, y - 16, '!', {
        fontFamily: '"Press Start 2P"', fontSize: '10px',
        color: '#E74C3C', stroke: '#000000', strokeThickness: 3, resolution: 4,
      }).setOrigin(0.5).setDepth(8);

      // Bounce the exclamation
      this.tweens.add({
        targets: excl,
        y: y - 22,
        duration: 600,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });

      this.brigands.push({ sprite, excl, glow, x, y, typeIdx, alive: true });
    }

    // Schedule respawn
    this.brigandRespawnTimer = this.time.addEvent({
      delay: this.BRIGAND_RESPAWN_MS,
      loop: true,
      callback: () => this.respawnBrigands(),
    });
  }

  private respawnBrigands() {
    const types = WorldScene.BRIGAND_TYPES;
    for (const b of this.brigands) {
      if (b.alive) continue;
      const bType = types[b.typeIdx];
      const zone = bType.zones[Math.floor(Math.random() * bType.zones.length)];
      const x = zone.x + Math.random() * zone.w;
      const y = zone.y + Math.random() * zone.h;
      b.x = x; b.y = y; b.alive = true;

      b.sprite.setPosition(x, y).setVisible(true).setAlpha(0.85);
      b.glow.setPosition(x, y).setVisible(true).setAlpha(0.12);
      b.excl.setPosition(x, y - 16).setVisible(true);

      this.tweens.add({
        targets: b.glow,
        scaleX: 1.6, scaleY: 1.6, alpha: 0.04,
        duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      this.tweens.add({
        targets: b.excl,
        y: y - 22,
        duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
  }

  private checkBrigandEncounter() {
    if (!this.player) return;
    const now = this.time.now;
    if (now < this.brigandEncounterCooldown) return;

    const px = this.player.x;
    const py = this.player.y;

    for (const b of this.brigands) {
      if (!b.alive) continue;
      const dx = px - b.x;
      const dy = py - b.y;
      if (dx * dx + dy * dy < this.BRIGAND_PICKUP_DIST * this.BRIGAND_PICKUP_DIST) {
        this.triggerBrigandFight(b);
        return;
      }
    }
  }

  private async triggerBrigandFight(brigand: typeof this.brigands[number]) {
    brigand.alive = false;
    this.brigandEncounterCooldown = this.time.now + 3000;

    // Kill tweens and hide
    this.tweens.killTweensOf(brigand.sprite);
    this.tweens.killTweensOf(brigand.glow);
    this.tweens.killTweensOf(brigand.excl);

    // Burst animation
    this.tweens.add({
      targets: brigand.sprite,
      scaleX: 3, scaleY: 3, alpha: 0,
      duration: 300, ease: 'Power2',
      onComplete: () => brigand.sprite.setVisible(false),
    });
    this.tweens.add({
      targets: [brigand.glow, brigand.excl],
      alpha: 0, duration: 200,
      onComplete: () => { brigand.glow.setVisible(false); brigand.excl.setVisible(false); },
    });

    // Red screen flash
    this.flashScreen(0xE74C3C, 200);

    // Show encounter banner
    const bType = WorldScene.BRIGAND_TYPES[brigand.typeIdx];
    this.game.events.emit('zone_enter_banner', `${bType.name.toUpperCase()} ATTACKS!`);

    // Call ghost fight API to generate the fight
    try {
      const res = await fetch('/api/arena/ghost', { method: 'POST' });
      if (!res.ok) return;
      const data = await res.json();

      // Override ghost name/tier with brigand info
      if (data.fight?.ghost) {
        data.fight.ghost.username = bType.name;
        data.fight.ghost.tier = bType.tier;
      }

      // Emit to React — opens arena panel with brigand fight
      this.game.events.emit('brigand_encounter', {
        fight: data.fight,
        playerTier: data.playerTier ?? this.playerTier,
        brigandName: bType.name,
      });
    } catch {
      // API failed — just remove the brigand silently
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  SHOOTING STAR — silent random discovery event
  // ═══════════════════════════════════════════════════════════
  private initShootingStar() {
    this.scheduleNextStar();
  }

  private scheduleNextStar() {
    const delay = this.STAR_MIN_INTERVAL_MS + Math.random() * (this.STAR_MAX_INTERVAL_MS - this.STAR_MIN_INTERVAL_MS);
    this.starTimer = this.time.addEvent({
      delay,
      callback: () => this.fireShootingStar(),
    });
  }

  private fireShootingStar() {
    if (!this.player) { this.scheduleNextStar(); return; }

    // Create streak start/end points — diagonal across the visible area
    const cam = this.cameras.main;
    const startX = cam.scrollX + Math.random() * cam.width * 0.3;
    const startY = cam.scrollY + 10 + Math.random() * 30;
    const endX = cam.scrollX + cam.width * 0.6 + Math.random() * cam.width * 0.4;
    const endY = cam.scrollY + cam.height * 0.4 + Math.random() * cam.height * 0.3;

    // The streak — a bright white circle that flies diagonally
    const star = this.add.circle(startX, startY, 3, 0xFFFFFF, 1).setDepth(200);
    const trail1 = this.add.circle(startX, startY, 2, 0xFFFFFF, 0.6).setDepth(199);
    const trail2 = this.add.circle(startX, startY, 1.5, 0xF39C12, 0.4).setDepth(198);

    const duration = 1800 + Math.random() * 400;

    // Main star
    this.tweens.add({
      targets: star,
      x: endX, y: endY,
      duration,
      ease: 'Sine.easeIn',
      onComplete: () => star.destroy(),
    });

    // Trail particles follow with delay
    this.tweens.add({
      targets: trail1,
      x: endX, y: endY,
      duration,
      delay: 60,
      ease: 'Sine.easeIn',
      onUpdate: () => trail1.setAlpha(trail1.alpha * 0.995),
      onComplete: () => trail1.destroy(),
    });

    this.tweens.add({
      targets: trail2,
      x: endX, y: endY,
      duration,
      delay: 120,
      ease: 'Sine.easeIn',
      onUpdate: () => trail2.setAlpha(trail2.alpha * 0.99),
      onComplete: () => trail2.destroy(),
    });

    // After streak finishes, create a faint landing glow
    this.time.delayedCall(duration + 200, () => {
      this.createStarLanding(endX, endY);
    });

    // Schedule next star
    this.scheduleNextStar();
  }

  private createStarLanding(x: number, y: number) {
    // Clean up any existing landing
    this.removeStarLanding();

    // Faint amber glow at landing site
    const glow = this.add.circle(x, y, 10, 0xF39C12, 0.08).setDepth(5);
    const pulse = this.add.circle(x, y, 5, 0xFFFFFF, 0.15).setDepth(6);

    // Subtle pulse animation — players need to notice this on their own
    this.tweens.add({
      targets: pulse,
      scaleX: 1.8, scaleY: 1.8, alpha: 0.04,
      duration: 1500,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: glow,
      scaleX: 1.4, scaleY: 1.4, alpha: 0.03,
      duration: 2200,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Set landing state
    const expireTimer = this.time.addEvent({
      delay: this.STAR_LANDING_DURATION_MS,
      callback: () => this.removeStarLanding(),
    });

    this.starLanding = { glow, pulse, x, y, active: true, expireTimer };
  }

  private removeStarLanding() {
    if (!this.starLanding) return;
    this.tweens.killTweensOf(this.starLanding.glow);
    this.tweens.killTweensOf(this.starLanding.pulse);
    this.starLanding.glow.destroy();
    this.starLanding.pulse.destroy();
    this.starLanding.expireTimer?.remove();
    this.starLanding = null;
  }

  private checkStarLandingPickup() {
    if (!this.player || !this.starLanding?.active) return;

    const dx = this.player.x - this.starLanding.x;
    const dy = this.player.y - this.starLanding.y;
    if (dx * dx + dy * dy > this.STAR_LANDING_PICKUP_DIST * this.STAR_LANDING_PICKUP_DIST) return;

    // Collected!
    this.starLanding.active = false;
    const landing = this.starLanding;

    // Burst animation
    this.tweens.add({
      targets: [landing.glow, landing.pulse],
      scaleX: 4, scaleY: 4, alpha: 0,
      duration: 400, ease: 'Power2',
      onComplete: () => this.removeStarLanding(),
    });

    // Sparkle particles — 6 small white dots burst outward
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const sparkle = this.add.circle(landing.x, landing.y, 2, 0xFFFFFF, 0.9).setDepth(201);
      this.tweens.add({
        targets: sparkle,
        x: landing.x + Math.cos(angle) * 30,
        y: landing.y + Math.sin(angle) * 30,
        alpha: 0,
        duration: 500,
        ease: 'Power2',
        onComplete: () => sparkle.destroy(),
      });
    }

    // Floating text
    const txt = this.add.text(
      landing.x, landing.y - 10,
      `+${this.STAR_XP_REWARD} XP ✨ Star Fragment`,
      { fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#FFFFFF', stroke: '#000000', strokeThickness: 3, resolution: 4 }
    ).setOrigin(0.5).setDepth(202);

    this.tweens.add({
      targets: txt,
      y: txt.y - 50, alpha: 0,
      duration: 3000, ease: 'Power2',
      onComplete: () => txt.destroy(),
    });

    // White screen flash
    this.flashScreen(0xFFFFFF, 150);

    // Award XP via API
    fetch('/api/player/award-xp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: this.STAR_XP_REWARD, source: 'star_fragment' }),
    }).then(res => res.json()).then(data => {
      if (data.newXP !== undefined) {
        this.game.events.emit('xp_updated', data.newXP);
      }
    }).catch(() => {});
  }

  // ═══════════════════════════════════════════════════════════
  //  ZONE ENTRY DETECTION (FIX 6 — slide-in location banner)
  // ═══════════════════════════════════════════════════════════
  private checkZoneEntry() {
    if (!this.player) return;
    const px = this.player.x;
    const py = this.player.y;

    for (const { zone, zoneName, zoneType } of this.zoneEntryZones) {
      const zb = zone.body as Phaser.Physics.Arcade.Body;
      const inside = px >= zb.x && px <= zb.x + zb.width && py >= zb.y && py <= zb.y + zb.height;
      if (inside && this.lastZoneEntered !== zoneName) {
        this.lastZoneEntered = zoneName;
        this.onZoneEnter(zoneName, zoneType);
      }
    }
  }

  private onZoneEnter(zoneName: string, zoneType: string) {
    // Notify quest manager
    this.questManager?.onZoneEntered(zoneName);

    if (['safe_zone', 'atmosphere_dark', 'ambient_water'].includes(zoneType)) return;

    const displayNames: Record<string, string> = {
      'arena_entrance':     'THE ARENA',
      'marketplace_door':   'GOLDBAG MARKET',
      'blacksmith_door':    'IRONHIDE FORGE',
      'elder_door':         'ELDER FORGE',
      'tavern_door':        'THE TAVERN',
      'hall_of_legends':    'HALL OF LEGENDS',
      'castle_gate_trigger':'THE CASTLE',
      'social_hub':         'CAMPFIRE',
    };

    const label = displayNames[zoneName];
    if (!label) return;

    this.game.events.emit('zone_enter_banner', label);
  }

  // ═══════════════════════════════════════════════════════════
  //  MOBILE CONTROLS — React CustomEvent listeners
  // ═══════════════════════════════════════════════════════════
  private setupMobileEventListeners() {
    this.mobileJoystickHandler = (e: Event) => {
      const { left, right, up, down } = (e as CustomEvent).detail;
      this.mobileState = { left, right, up, down };
    };

    this.mobileInteractHandler = () => {
      this.handleMobileInteract();
    };

    this.mobileInventoryHandler = () => {
      this.game.events.emit('npc_inventory');
    };

    window.addEventListener('mobile-joystick', this.mobileJoystickHandler);
    window.addEventListener('mobile-interact', this.mobileInteractHandler);
    window.addEventListener('mobile-inventory', this.mobileInventoryHandler);
  }

  private handleMobileInteract() {
    if (!this.nearbyNpcId) return;
    this.interactWithNPC(this.nearbyNpcId);
  }

  // ═══════════════════════════════════════════════════════════
  //  CLEANUP
  // ═══════════════════════════════════════════════════════════
  shutdown() {
    // Remove mobile event listeners
    if (this.mobileJoystickHandler) {
      window.removeEventListener('mobile-joystick', this.mobileJoystickHandler);
      this.mobileJoystickHandler = null;
    }
    if (this.mobileInteractHandler) {
      window.removeEventListener('mobile-interact', this.mobileInteractHandler);
      this.mobileInteractHandler = null;
    }
    if (this.mobileInventoryHandler) {
      window.removeEventListener('mobile-inventory', this.mobileInventoryHandler);
      this.mobileInventoryHandler = null;
    }

    if (this.colyseusRoom) {
      this.colyseusRoom.leave();
      this.colyseusRoom = null;
    }
    this.otherPlayers.forEach((s) => s.destroy());
    this.otherLabels.forEach((l) => l.destroy());
    this.otherPlayers.clear();
    this.otherLabels.clear();
    this.fogGraphics.forEach(g => g.destroy());
    this.fogLabels.forEach(l => l.destroy());
    this.dialogueBox?.destroy();
    this.animatedTileSprites.forEach(e => e.sprite.destroy());
    this.campfireGlows.forEach(g => g.destroy());
    this.waterTileSprites.forEach(e => e.sprite.destroy());
    this.wanderingNpcs.forEach(w => w.timer?.remove());
    this.xpNuggets.forEach(n => { n.orb.destroy(); n.glow.destroy(); });
    this.xpNuggets = [];
    this.xpNuggetRespawnTimer?.remove();
    this.brigands.forEach(b => { b.sprite.destroy(); b.excl.destroy(); b.glow.destroy(); });
    this.brigands = [];
    this.brigandRespawnTimer?.remove();
    this.starTimer?.remove();
    this.removeStarLanding();
  }
}
