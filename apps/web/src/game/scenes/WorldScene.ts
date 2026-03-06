// ═══════════════════════════════════════════════════════════════════════════
//  MIDFORGE DESIGN SYSTEM — THE LAWS
//  Every visual decision in this file references these rules.
//  Do not deviate. Do not add exceptions.
// ═══════════════════════════════════════════════════════════════════════════
//
//  SCALE HIERARCHY:
//    Player (local):      3x sprite scale
//    Other players:       2.5x sprite scale
//    NPCs:                2x sprite scale
//    Animals:             1.5x sprite scale
//    Small decorations:   1x sprite scale
//    Trees/buildings:     fixed pixel size per asset
//
//  DEPTH LAYER ORDER (back to front):
//    Layer 0: Sky/background (clouds, parallax)
//    Layer 1: Ground tiles (grass, paths, water)
//    Layer 2: Ground decorations (flowers, rocks)
//    Layer 3: Building bases + tree trunks (collidable)
//    Layer 4: Characters + NPCs (Y-sorted within layer)
//    Layer 5: Building rooftops + tree canopies (above chars)
//    Layer 6: Particles + effects
//    Layer 7: UI overlays (HP bar, name labels)
//    Layer 8: React UI (joystick, buttons, panels)
//
//  WALKABILITY RULE:
//    A tile is walkable if and only if it is:
//      - Grass tile OR dirt/path tile OR stone path tile
//    A tile is NOT walkable if it is:
//      - Building footprint tile
//      - Water tile
//      - Mountain/cliff tile
//    No other exceptions. Ever.
//
//  COLOR ZONES:
//    Village center: warm tones (golds, browns, greens)
//    Forest:         cool greens, deep shadows
//    Arena area:     red/orange accents
//    Water areas:    blues, teals
//    Castle zone:    grey stone, purple accents
//
//  SPACING RULE:
//    Minimum 4 tile gap between any two buildings
//    Minimum 3 tile wide path on all main routes
//    Minimum 2 tile yard around every building entrance
//    Central plaza: minimum 8×8 open tiles
//
// ═══════════════════════════════════════════════════════════════════════════

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
  CF_NPC_MAP, CF_NPC_VILLAGER_ALTS,
  ANIMATED_TILES, WANDERING_NPC,
  INTRO, TEXT_STYLES,
  getCharacterSpriteKey, TIER_PARTICLE_COLORS,
} from '@midforge/shared/constants/game';
import { QuestManager } from '@/game/managers/QuestManager';
import { MusicManager } from '@/game/managers/MusicManager';
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
  private useCuteFantasy = false;   // true if Cute Fantasy player spritesheet loaded
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private playerGlow!: Phaser.GameObjects.Ellipse;
  private cloudLayer: Phaser.GameObjects.TileSprite | null = null;
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
  private npcSprites = new Map<string, Phaser.GameObjects.Image | Phaser.GameObjects.Sprite>();
  private npcShadows = new Map<string, Phaser.GameObjects.Ellipse>();
  private cfVillagerIdx = 0; // alternates Farmer_Buba / Chef_Chloe for ambient NPCs
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

  // Music system
  private musicManager!: MusicManager;

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

  // Zone first-visit XP
  private visitedZones = new Set<string>();
  private readonly ZONE_FIRST_VISIT_XP = 20;

  // Cinematic Village Scenes — time-based ambient events
  private earlyRiserAwarded = false;
  private midnightBellPlayed = false;
  private campfireGatheringPlayed = false;
  private sceneCheckTimer: Phaser.Time.TimerEvent | null = null;
  private stormActive = false;
  private stormOverlay: Phaser.GameObjects.Rectangle | null = null;
  private stormWindParticles: Phaser.GameObjects.Arc[] = [];
  private readonly STORM_DURATION_MS = 5 * 60 * 1000; // 5 minutes
  private readonly STORM_XP_REWARD = 50;

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
    this.placeCuteFantasyBuildings();
    this.placeDecorations();
    this.placeTrees();
    this.placeMilitaryCamp();
    this.spawnVillageAnimals();

    // ── Player ──────────────────────────────────────────
    const isFirstLogin = playerData?.firstLogin !== false;
    const spawnPos = isFirstLogin ? this.spawnNewGame : this.spawnDefault;

    // Resolve sprite: prefer Cute Fantasy → LPC 64×64 → 16×16 Kenney fallback
    this.useCuteFantasy = this.textures.exists('cf_player');
    this.spriteKey = getCharacterSpriteKey(this.playerTier, playerData?.xp ?? 0);
    this.useNewSprites = this.textures.exists(this.spriteKey);

    if (this.useCuteFantasy) {
      // Cute Fantasy player — 64×64 frames rendered at 3× scale (Design System: player = 3x)
      this.player = this.physics.add.sprite(spawnPos.x, spawnPos.y, 'cf_player');
      this.player.setScale(3);
      this.player.setDepth(PLAYER_DEPTH);
      const pBody = this.player.body as Phaser.Physics.Arcade.Body;
      pBody.setSize(12, 8);        // tight feet-level hitbox (pre-scale coords)
      pBody.setOffset(26, 52);
      this.player.play('cf_player_idle_down');
    } else if (this.useNewSprites) {
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

    // Shadow ellipse under player feet (Design System: 40% opacity)
    this.playerShadow = this.add.ellipse(spawnPos.x, spawnPos.y + 18, 28, 7, 0x000000, 0.40)
      .setDepth(PLAYER_DEPTH - 1);

    // Gold position indicator glow beneath player (Phase 4: visual gravity)
    this.playerGlow = this.add.ellipse(spawnPos.x, spawnPos.y + 18, 40, 12, 0xFFB800, 0.35)
      .setDepth(PLAYER_DEPTH - 2);

    // ── Camera ──────────────────────────────────────────
    this.cameras.main.startFollow(this.player, true, CAMERA_LERP, CAMERA_LERP);
    this.cameras.main.setZoom(cameraZoom);
    this.cameras.main.setBounds(0, 0, mapW, mapH);
    this.physics.world.setBounds(0, 0, mapW, mapH);

    // ── Cloud layer (parallax scrolling, above world but below UI) ──
    if (this.textures.exists('cf_clouds')) {
      this.cloudLayer = this.add.tileSprite(0, 0, mapW * 2, mapH * 2, 'cf_clouds')
        .setOrigin(0, 0)
        .setAlpha(0.25)
        .setDepth(50)
        .setScrollFactor(0.2); // parallax: moves at 20% of camera scroll
    }

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

    // ── Music Manager ──
    this.musicManager = new MusicManager(this);
    this.musicManager.playZoneMusic('village');

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

    // ── Cinematic Village Scenes — time-based ambient events ──
    this.initCinematicScenes();

    // ── Shooting Star — silent random event ──
    this.initShootingStar();

    this.connectMultiplayer(playerData);

    // ── Dungeon exit handler — resume WorldScene when DungeonScene exits ──
    this.game.events.on('dungeon_exit', () => {
      this.scene.resume('WorldScene');
      this.cameras.main.fadeIn(400, 0, 0, 0);
      this.inputEnabled = true;
      // Resume village music
      if (this.musicManager) this.musicManager.playZoneMusic('village');
    });

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

      const px = obj.x + 8;
      const py = obj.y + 8;
      const isLocked = tierRequired.startsWith('locked_until_');

      // Resolve Cute Fantasy texture key
      let cfKey = CF_NPC_MAP[spriteName] ?? '';
      // Tavern villager → Bartender_Bruno
      if (spriteName === 'villager' && npcType === 'tavern') {
        cfKey = 'cf_npc_Bartender_Bruno';
      }
      // Ambient villagers alternate between Farmer_Buba and Chef_Chloe
      if (spriteName === 'villager' && npcType === 'ambient') {
        cfKey = CF_NPC_VILLAGER_ALTS[this.cfVillagerIdx % CF_NPC_VILLAGER_ALTS.length];
        this.cfVillagerIdx++;
      }

      const useCF = cfKey && this.textures.exists(cfKey);
      let sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;

      if (useCF) {
        // Cute Fantasy animated NPC — 64×64 at 2x scale
        const s = this.add.sprite(px, py, cfKey)
          .setScale(2)
          .setDepth(8)
          .setVisible(!isLocked);
        // Start idle breathing animation facing down
        const idleKey = `${cfKey}_idle_down`;
        if (this.anims.exists(idleKey)) s.play(idleKey);
        sprite = s;

        // Shadow under NPC
        if (!isLocked) {
          const shadow = this.add.ellipse(px, py + 12, 20, 5, 0x000000, 0.35)
            .setDepth(7);
          this.npcShadows.set(obj.name, shadow);
        }
      } else {
        // Fallback: 16×16 Kenney dungeon tile
        const frame = NPC_SPRITE_NAMES[spriteName] ?? NPC_SPRITE_NAMES.villager;
        sprite = this.add.image(px, py, dungeonKey, frame)
          .setDepth(8)
          .setVisible(!isLocked);
      }

      const eventName = NPC_TYPE_EVENT[npcType] ?? 'npc_ambient';
      sprite.setData('npcId', obj.name);
      sprite.setData('interactionEvent', eventName);
      sprite.setData('name', obj.name);
      sprite.setData('dialogue', dialogue);
      sprite.setData('npcType', npcType);
      sprite.setData('tierRequired', tierRequired);
      sprite.setData('wandering', wandering);
      sprite.setData('cfKey', useCF ? cfKey : '');

      if (!isLocked) {
        this.npcSprites.set(obj.name, sprite);

        const labelY = useCF ? py - 24 : py - 14;
        const label = this.add.text(px, labelY, obj.name, {
          ...TEXT_STYLES.npcName,
          color: '#F39C12',
        }).setOrigin(0.5).setDepth(PLAYER_LABEL_DEPTH);
        this.npcLabels.set(obj.name, label);

        // Zelda-style exclamation mark (hidden until player is near)
        const exclY = useCF ? py - 38 : py - 28;
        const excl = this.add.text(px, exclY, '!', {
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
  //  BUILDINGS — place Cute Fantasy building sprites at collision coords
  // ═══════════════════════════════════════════════════════════
  private placeCuteFantasyBuildings() {
    // Building placement: texture key → collision box center-bottom position
    // Buildings are anchored bottom-center on the collision box, rendered at 2x
    const buildings: { key: string; cx: number; by: number; depth?: number }[] = [
      // tavern → Inn_Blue (collision: x:704 y:672 w:176 h:144)
      { key: 'cf_inn', cx: 704 + 88, by: 672 + 144 },
      // blacksmith (collision: x:320 y:432 w:160 h:128)
      { key: 'cf_blacksmith', cx: 320 + 80, by: 432 + 128 },
      // marketplace (collision: x:800 y:432 w:176 h:192)
      { key: 'cf_market', cx: 800 + 88, by: 432 + 192 },
      // elder_house → Church (collision: x:992 y:448 w:144 h:128)
      { key: 'cf_church', cx: 992 + 72, by: 448 + 128 },
    ];

    for (const b of buildings) {
      if (!this.textures.exists(b.key)) continue;
      this.add.image(b.cx, b.by, b.key)
        .setOrigin(0.5, 1) // anchor bottom-center
        .setScale(2)
        .setDepth(b.depth ?? 3); // behind NPCs & player
    }

    // Windmill (place at an open area near village edge, ~200, 300)
    if (this.textures.exists('cf_windmill')) {
      this.add.image(200, 350, 'cf_windmill')
        .setOrigin(0.5, 1).setScale(2).setDepth(3);

      // Animated sail overlay on top of windmill
      if (this.textures.exists('cf_windmill_sail')) {
        const sail = this.add.sprite(200, 280, 'cf_windmill_sail')
          .setScale(2).setDepth(4);
        if (this.anims.exists('cf_windmill_sail_anim')) sail.play('cf_windmill_sail_anim');
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  DECORATIONS — flowers, torches, campfire, fountain
  // ═══════════════════════════════════════════════════════════
  private placeDecorations() {
    // Helper: place animated sprite if texture exists
    const placeAnim = (key: string, animKey: string, x: number, y: number, scale = 2, depth = 2) => {
      if (!this.textures.exists(key)) return;
      const s = this.add.sprite(x, y, key).setScale(scale).setDepth(depth);
      if (this.anims.exists(animKey)) s.play(animKey);
    };

    // Scattered flowers near paths and buildings
    const flowerSpots = [
      { x: 360, y: 580 }, { x: 420, y: 560 }, { x: 500, y: 590 },
      { x: 750, y: 650 }, { x: 850, y: 600 }, { x: 680, y: 480 },
    ];
    flowerSpots.forEach((pos, i) => {
      const fi = (i % 3) + 1;
      placeAnim(`cf_flower_${fi}`, `cf_flower_${fi}_anim`, pos.x, pos.y);
    });

    // Potted flowers near inn and market entrances
    const pottedSpots = [
      { x: 770, y: 815 }, { x: 810, y: 815 }, // near tavern door
      { x: 830, y: 625 }, // near market
    ];
    pottedSpots.forEach((pos, i) => {
      const fi = (i % 2) + 1;
      placeAnim(`cf_flower_pot_${fi}`, `cf_flower_pot_${fi}_anim`, pos.x, pos.y);
    });

    // Campfire near village center
    placeAnim('cf_campfire', 'cf_campfire_anim', 620, 600, 2, 5);

    // Torches along paths
    const torchSpots = [
      { x: 540, y: 500 }, { x: 660, y: 500 },
      { x: 450, y: 700 }, { x: 900, y: 700 },
    ];
    torchSpots.forEach(pos => {
      placeAnim('cf_torch', 'cf_torch_anim', pos.x, pos.y, 2, 5);
    });

    // Small torches near buildings
    const smallTorchSpots = [
      { x: 340, y: 430 }, { x: 480, y: 430 }, // blacksmith
      { x: 700, y: 670 }, { x: 880, y: 670 }, // tavern area
    ];
    smallTorchSpots.forEach(pos => {
      placeAnim('cf_torch_small', 'cf_torch_small_anim', pos.x, pos.y, 2, 5);
    });

    // Fountain in village square
    placeAnim('cf_fountain', 'cf_fountain_anim', 620, 500, 2, 5);
  }

  // ═══════════════════════════════════════════════════════════
  //  CUTE FANTASY TREES — replace old tilemap trees
  // ═══════════════════════════════════════════════════════════

  // Tree config: key, frame index for mature variant, species for particle matching
  private static readonly TREE_TYPES: { key: string; frame: number; species: 'birch' | 'oak' | 'spruce' | 'fruit' }[] = [
    { key: 'tree_small_birch',  frame: 2, species: 'birch' },
    { key: 'tree_small_oak',    frame: 2, species: 'oak' },
    { key: 'tree_small_spruce', frame: 2, species: 'spruce' },
    { key: 'tree_small_fruit',  frame: 2, species: 'fruit' },
    { key: 'tree_med_birch',    frame: 1, species: 'birch' },
    { key: 'tree_med_oak',      frame: 1, species: 'oak' },
    { key: 'tree_med_spruce',   frame: 1, species: 'spruce' },
    { key: 'tree_med_fruit',    frame: 1, species: 'fruit' },
    { key: 'tree_big_birch',    frame: 1, species: 'birch' },
    { key: 'tree_big_oak',      frame: 2, species: 'oak' },
    { key: 'tree_big_spruce',   frame: 2, species: 'spruce' },
    { key: 'tree_big_fruit',    frame: 1, species: 'fruit' },
  ];

  private static readonly PARTICLE_KEYS: Record<string, string> = {
    birch: 'particle_birch',
    oak: 'particle_oak',
    spruce: 'particle_spruce',
  };

  private placeTrees() {
    const SCALE = 2;
    const seededRng = (seed: number) => {
      let s = seed;
      return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
    };
    const rng = seededRng(42);

    // Place a tree sprite anchored bottom-center, depth-sorted by Y
    const placeTree = (key: string, frame: number, x: number, y: number) => {
      if (!this.textures.exists(key)) return null;
      const s = this.add.sprite(x, y, key, frame);
      s.setScale(SCALE);
      s.setOrigin(0.5, 1); // bottom-center anchor
      s.setDepth(y); // depth-sort by Y so player walks in front/behind
      return s;
    };

    // Place a cluster: 1 big tree + 2-3 medium + 1-2 small of same species
    const placeCluster = (cx: number, cy: number, species: 'birch' | 'oak' | 'spruce' | 'fruit', density: 'dense' | 'normal' | 'sparse') => {
      const types = WorldScene.TREE_TYPES.filter(t => t.species === species);
      const big = types.find(t => t.key.includes('big'));
      const med = types.find(t => t.key.includes('med'));
      const small = types.find(t => t.key.includes('small'));

      // Big tree at center
      if (big) placeTree(big.key, big.frame, cx, cy);

      // Medium trees around
      const medCount = density === 'dense' ? 3 : density === 'normal' ? 2 : 1;
      for (let i = 0; i < medCount; i++) {
        const angle = (i / medCount) * Math.PI * 2 + rng() * 0.5;
        const dist = 30 + rng() * 20;
        if (med) placeTree(med.key, med.frame, cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist * 0.6);
      }

      // Small trees at edges
      const smCount = density === 'dense' ? 2 : 1;
      for (let i = 0; i < smCount; i++) {
        const angle = rng() * Math.PI * 2;
        const dist = 45 + rng() * 25;
        if (small) placeTree(small.key, small.frame, cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist * 0.5);
      }

      // Leaf particles near cluster (max 5 per cluster)
      const particleKey = WorldScene.PARTICLE_KEYS[species];
      if (particleKey && this.textures.exists(particleKey)) {
        const pCount = Math.min(5, density === 'dense' ? 4 : density === 'normal' ? 3 : 2);
        for (let i = 0; i < pCount; i++) {
          const px = cx + (rng() - 0.5) * 80;
          const py = cy + (rng() - 0.5) * 50;
          const leaf = this.add.image(px, py, particleKey).setScale(SCALE).setAlpha(0.4).setDepth(py + 100);
          // Slow drift tween — loop forever
          this.tweens.add({
            targets: leaf,
            x: leaf.x + (rng() - 0.5) * 30,
            y: leaf.y + 15 + rng() * 10,
            alpha: 0,
            duration: 3000 + rng() * 2000,
            ease: 'Sine.easeInOut',
            repeat: -1,
            yoyo: true,
          });
        }
      }
    };

    // Place individual scattered trees (for variety between clusters)
    const placeScattered = (x: number, y: number, size: 'small' | 'med' | 'big', species: 'birch' | 'oak' | 'spruce' | 'fruit') => {
      const t = WorldScene.TREE_TYPES.find(tt => tt.key.includes(size) && tt.species === species);
      if (t) placeTree(t.key, t.frame, x, y);
    };

    // ══════════════════════════════════════════
    // FOREST NW (x=64..368, y=64..480) — dense spruce + oak forest
    // ══════════════════════════════════════════
    placeCluster(120, 140, 'spruce', 'dense');
    placeCluster(250, 120, 'oak', 'dense');
    placeCluster(160, 260, 'oak', 'normal');
    placeCluster(300, 200, 'spruce', 'normal');
    placeCluster(110, 380, 'spruce', 'dense');
    placeCluster(280, 350, 'oak', 'normal');
    placeCluster(200, 440, 'spruce', 'normal');
    placeCluster(340, 440, 'oak', 'sparse');
    // Edge scattered trees
    placeScattered(80, 200, 'small', 'spruce');
    placeScattered(350, 150, 'small', 'oak');
    placeScattered(100, 470, 'med', 'spruce');
    placeScattered(340, 100, 'small', 'spruce');
    placeScattered(200, 100, 'med', 'oak');

    // ══════════════════════════════════════════
    // FOREST NE (x=976..1248, y=64..432) — birch + oak forest
    // ══════════════════════════════════════════
    placeCluster(1020, 140, 'birch', 'dense');
    placeCluster(1150, 120, 'oak', 'normal');
    placeCluster(1050, 280, 'birch', 'normal');
    placeCluster(1200, 250, 'oak', 'dense');
    placeCluster(1000, 400, 'birch', 'normal');
    placeCluster(1140, 380, 'oak', 'normal');
    placeCluster(1220, 130, 'birch', 'sparse');
    // Edge scattered
    placeScattered(990, 200, 'small', 'birch');
    placeScattered(1230, 350, 'small', 'oak');
    placeScattered(1100, 100, 'med', 'birch');
    placeScattered(1180, 420, 'small', 'birch');

    // ══════════════════════════════════════════
    // VILLAGE EDGES — fruit trees near buildings, scattered oaks
    // ══════════════════════════════════════════
    // Near elder house (992, 448)
    placeCluster(1080, 520, 'fruit', 'sparse');
    placeScattered(950, 550, 'med', 'fruit');

    // Near tavern (704, 672)
    placeScattered(660, 620, 'small', 'fruit');
    placeScattered(890, 640, 'med', 'oak');

    // Near pond (960, 384) — birch near water
    placeScattered(920, 360, 'med', 'birch');
    placeScattered(1100, 380, 'small', 'birch');

    // Village south border — scattered medium trees
    placeScattered(200, 600, 'med', 'oak');
    placeScattered(400, 650, 'small', 'oak');
    placeScattered(600, 700, 'med', 'spruce');

    // Near arena (448-832, 880-1088) — sparse perimeter oaks
    placeScattered(420, 860, 'med', 'oak');
    placeScattered(850, 870, 'small', 'oak');
    placeScattered(380, 1050, 'small', 'spruce');
    placeScattered(870, 1060, 'small', 'spruce');

    // Map borders — fill sparse trees along edges
    // West border
    placeScattered(40, 530, 'med', 'spruce');
    placeScattered(30, 650, 'small', 'spruce');
    placeScattered(50, 770, 'med', 'oak');
    placeScattered(35, 900, 'small', 'spruce');

    // East border
    placeScattered(1250, 480, 'small', 'oak');
    placeScattered(1240, 600, 'med', 'birch');
    placeScattered(1255, 720, 'small', 'birch');
    placeScattered(1245, 850, 'med', 'oak');

    // South border
    placeScattered(100, 1070, 'med', 'spruce');
    placeScattered(300, 1080, 'small', 'oak');
    placeScattered(950, 1070, 'small', 'spruce');
    placeScattered(1100, 1060, 'med', 'oak');

    // North border (between forests)
    placeScattered(500, 80, 'small', 'oak');
    placeScattered(700, 60, 'med', 'spruce');
    placeScattered(850, 70, 'small', 'birch');
  }

  // ═══════════════════════════════════════════════════════════
  //  MILITARY CAMP — decorative zone east of the arena
  // ═══════════════════════════════════════════════════════════
  private placeMilitaryCamp() {
    // Camp center: ~780, 980 (east of arena area)
    const cx = 780, cy = 980;
    const placeImg = (key: string, x: number, y: number, scale = 2, depth = 3) => {
      if (!this.textures.exists(key)) return;
      this.add.image(x, y, key).setScale(scale).setDepth(depth);
    };
    const placeAnim = (key: string, animKey: string, x: number, y: number, scale = 2, depth = 4) => {
      if (!this.textures.exists(key)) return;
      const s = this.add.sprite(x, y, key).setScale(scale).setDepth(depth);
      if (this.anims.exists(animKey)) s.play(animKey);
    };

    // Tents — main structures (use cropped frame from spritesheet)
    placeImg('mc_tent', cx - 40, cy - 40, 1.5, 3);

    // Lookout towers at zone corners
    placeImg('mc_tower', cx - 100, cy - 80, 1.5, 3);
    placeImg('mc_tower', cx + 100, cy - 80, 1.5, 3);

    // Palisade walls along perimeter
    placeImg('mc_palisade', cx, cy - 100, 2, 2);
    placeImg('mc_palisade', cx, cy + 80, 2, 2);

    // Animated gate at entrance
    placeAnim('mc_gate', 'mc_gate_anim', cx, cy + 50, 2, 4);

    // Cannon near gate
    placeImg('mc_cannon', cx - 50, cy + 40, 2, 4);
    placeImg('mc_cannon', cx + 50, cy + 40, 2, 4);

    // Catapult inside zone
    placeImg('mc_catapult', cx + 60, cy - 20, 2, 4);

    // Mantlets scattered as defensive props
    placeImg('mc_mantlet', cx - 80, cy, 2, 4);
    placeImg('mc_mantlet', cx + 80, cy + 20, 2, 4);

    // Spiked barriers along perimeter
    placeImg('mc_spikes', cx - 90, cy + 60, 2, 2);
    placeImg('mc_spikes', cx + 90, cy + 60, 2, 2);

    // Wood spikes near perimeter
    placeImg('mc_wood_spikes', cx - 100, cy + 40, 2, 2);

    // Archery targets in open area
    placeImg('mc_target', cx + 40, cy + 20, 2, 4);
    placeImg('mc_target', cx + 60, cy + 30, 2, 4);

    // Target dummies
    placeImg('mc_dummy', cx + 30, cy + 10, 2, 4);
    placeImg('mc_dummy', cx + 70, cy + 15, 2, 4);

    // Weapon stands near tent entrances
    placeImg('mc_weapon_stand', cx - 20, cy - 20, 2, 4);

    // Split log benches near campfire
    placeImg('mc_bench', cx - 30, cy + 10, 2, 4);
    placeImg('mc_bench', cx + 10, cy + 10, 2, 4);

    // Animated flags on towers
    placeAnim('mc_flag', 'mc_flag_anim', cx - 100, cy - 100, 2, 5);
    placeAnim('mc_flag', 'mc_flag_anim', cx + 100, cy - 100, 2, 5);
    placeAnim('mc_flag', 'mc_flag_anim', cx, cy - 60, 2, 5);

    // Campfire pot near tents
    placeAnim('mc_campfire_pot', 'mc_campfire_pot_anim', cx - 10, cy + 5, 2, 5);
  }

  // ═══════════════════════════════════════════════════════════
  //  VILLAGE ANIMALS — decorative ducks, horses, duck_in_a_hat
  // ═══════════════════════════════════════════════════════════
  private spawnVillageAnimals() {
    // 3 ducks near the pond area (~960, 410)
    const duckPositions = [
      { x: 940, y: 420 }, { x: 970, y: 440 }, { x: 920, y: 450 },
    ];
    duckPositions.forEach((pos, i) => {
      const key = `cf_duck_${(i % 4) + 1}`;
      if (!this.textures.exists(key)) return;
      const duck = this.add.sprite(pos.x, pos.y, key).setScale(1.5).setDepth(6);
      if (this.anims.exists(`${key}_idle`)) duck.play(`${key}_idle`);
      // Slow wander in small radius
      this.duckWander(duck, pos.x, pos.y);
    });

    // Duck in a hat near the tavern (~780, 760)
    if (this.textures.exists('cf_duck_hat')) {
      const hatDuck = this.add.sprite(760, 760, 'cf_duck_hat').setScale(1.5).setDepth(6);
      if (this.anims.exists('cf_duck_hat_idle')) hatDuck.play('cf_duck_hat_idle');
      this.duckWander(hatDuck, 760, 760);
    }

    // 2 horses near village edge (south side, ~400, 900)
    const horsePositions = [{ x: 380, y: 860 }, { x: 440, y: 870 }];
    horsePositions.forEach((pos, i) => {
      const key = `cf_horse_${(i % 2) + 1}`;
      if (!this.textures.exists(key)) return;
      const horse = this.add.sprite(pos.x, pos.y, key).setScale(1.5).setDepth(6);
      if (this.anims.exists(`${key}_idle`)) horse.play(`${key}_idle`);
      // Horses don't move — just idle
    });
  }

  private duckWander(duck: Phaser.GameObjects.Sprite, originX: number, originY: number) {
    const wander = () => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * 20;
      const tx = originX + Math.cos(angle) * dist;
      const ty = originY + Math.sin(angle) * dist;
      const dur = 2000 + Math.random() * 3000;
      this.tweens.add({
        targets: duck, x: tx, y: ty, duration: dur, ease: 'Linear',
        delay: 3000 + Math.random() * 5000,
        onComplete: () => wander(),
      });
    };
    this.time.delayedCall(Math.random() * 4000, () => wander());
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

        // Dungeon entrance — launch DungeonScene
        if (targetMap === 'dungeon_interior') {
          this.inputEnabled = false;
          this.cameras.main.fadeOut(400, 0, 0, 0);
          this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.pause('WorldScene');
            this.scene.launch('DungeonScene');
            // Music crossfade to cave
            if (this.musicManager) this.musicManager.playZoneMusic('cave');
          });
          return;
        }

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
      this.game.events.emit('solo_mode');
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

    // Play walk/idle animations
    if (this.useCuteFantasy) {
      if (moving) {
        this.player.play(`cf_player_walk_${direction}`, true);
      } else {
        // Idle in last walked direction — don't snap to face-down
        this.player.play(`cf_player_idle_${this.lastDirection}`, true);
      }
    } else if (this.useNewSprites) {
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

    // Update shadow + glow + name label position
    if (this.playerShadow) {
      this.playerShadow.setPosition(this.player.x, this.player.y + 18);
    }
    if (this.playerGlow) {
      this.playerGlow.setPosition(this.player.x, this.player.y + 18);
    }
    this.nameLabel.setPosition(this.player.x, this.player.y - (this.useCuteFantasy ? 36 : 12));

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

    // Slow cloud drift
    if (this.cloudLayer) {
      this.cloudLayer.tilePositionX += 0.15;
      this.cloudLayer.tilePositionY += 0.05;
    }
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

      // Cute Fantasy NPC face-toward-player when within 48px
      const cfKey = sprite.getData('cfKey') as string;
      if (cfKey && dist < 48 && sprite instanceof Phaser.GameObjects.Sprite) {
        const adx = Math.abs(dx);
        const ady = Math.abs(dy);
        let faceDir = 'down';
        if (adx > ady) faceDir = dx > 0 ? 'right' : 'left';
        else faceDir = dy > 0 ? 'down' : 'up';
        const faceKey = `${cfKey}_idle_${faceDir}`;
        if (this.anims.exists(faceKey)) sprite.play(faceKey, true);
      }

      // Design System: pulsing "!" above NPC — scale 1→1.2→1 on 800ms loop
      const excl = this.npcExclamations.get(npcId);
      const exclOffset = cfKey ? -42 : -28;
      if (excl) {
        const inRange = dist < NPC_INTERACT_DISTANCE;
        if (inRange && !excl.visible) {
          excl.setVisible(true);
          excl.setPosition(sprite.x, sprite.y + exclOffset);
          excl.setScale(1);
          this.tweens.add({
            targets: excl,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
        } else if (inRange && excl.visible) {
          excl.setPosition(sprite.x, sprite.y + exclOffset);
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
  //  CINEMATIC VILLAGE SCENES — time-based ambient events
  // ═══════════════════════════════════════════════════════════
  private initCinematicScenes() {
    // Check immediately on load, then every 60 seconds
    this.checkTimeBasedScenes();
    this.sceneCheckTimer = this.time.addEvent({
      delay: 60_000,
      loop: true,
      callback: () => this.checkTimeBasedScenes(),
    });
  }

  private checkTimeBasedScenes() {
    const h = new Date().getHours();

    // Scene 2: ForgeMaster's Morning (05:00–08:00)
    if (h >= 5 && h < 8 && !this.earlyRiserAwarded) {
      this.earlyRiserAwarded = true;
      this.time.delayedCall(3000, () => this.playForgeMasterMorning());
    }

    // Scene 1: Midnight Bell (23:00–00:00)
    if (h === 23 && !this.midnightBellPlayed) {
      this.midnightBellPlayed = true;
      this.time.delayedCall(5000, () => this.playMidnightBell());
    }

    // Scene 4: Campfire Gathering (20:00–22:00)
    if (h >= 20 && h < 22 && !this.campfireGatheringPlayed) {
      this.campfireGatheringPlayed = true;
      this.time.delayedCall(8000, () => this.playCampfireGathering());
    }

    // Scene 5: Storm Warning — random ~1/7 chance per session (once per week feel)
    // Only triggers once, uses date-seeded RNG so same day = same result
    if (!this.stormActive) {
      const dayKey = new Date().toISOString().slice(0, 10);
      const dayHash = dayKey.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      if (dayHash % 7 === 0) {
        // Schedule storm 10 minutes after login
        this.time.delayedCall(10 * 60 * 1000, () => this.playStormWarning());
      }
    }
  }

  // ─── Scene 2: ForgeMaster's Morning ───
  private playForgeMasterMorning() {
    const fm = this.npcSprites.get('ForgeMaster');
    if (!fm) return;

    const fx = fm.x;
    const fy = fm.y;

    // Forge glow — orange square near the ForgeMaster
    const forgeGlow = this.add.circle(fx + 12, fy + 4, 8, 0xF39C12, 0.3).setDepth(5);
    this.tweens.add({
      targets: forgeGlow,
      alpha: 0.5, scaleX: 1.3, scaleY: 1.3,
      duration: 800, yoyo: true, repeat: 3, ease: 'Sine.easeInOut',
      onComplete: () => forgeGlow.destroy(),
    });

    // Sparks — 12 small orange dots floating upward
    for (let i = 0; i < 12; i++) {
      this.time.delayedCall(i * 200, () => {
        const sx = fx + 8 + Math.random() * 10;
        const sy = fy;
        const spark = this.add.circle(sx, sy, 1.5, 0xF39C12, 0.9).setDepth(201);
        this.tweens.add({
          targets: spark,
          y: sy - 20 - Math.random() * 15,
          x: sx + (Math.random() - 0.5) * 12,
          alpha: 0,
          duration: 600 + Math.random() * 400,
          ease: 'Power2',
          onComplete: () => spark.destroy(),
        });
      });
    }

    // Ambient dialogue bubble
    this.time.delayedCall(800, () => {
      this.showAmbientBubble(fm.x, fm.y - 24, 'Early riser. Good.\nThe forge never sleeps.');
    });

    // Early riser bonus
    this.time.delayedCall(2500, () => {
      if (!this.player) return;
      const txt = this.add.text(
        this.player.x, this.player.y - 20,
        '+10 XP — Early Riser Bonus',
        { fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#F39C12', stroke: '#000000', strokeThickness: 3, resolution: 4 }
      ).setOrigin(0.5).setDepth(202);
      this.tweens.add({
        targets: txt, y: txt.y - 40, alpha: 0,
        duration: 3000, ease: 'Power2',
        onComplete: () => txt.destroy(),
      });

      fetch('/api/player/award-xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 10, source: 'early_riser' }),
      }).then(r => r.json()).then(d => {
        if (d.newXP !== undefined) this.game.events.emit('xp_updated', d.newXP);
      }).catch(() => {});
    });
  }

  // ─── Scene 1: Midnight Bell ───
  private playMidnightBell() {
    if (!this.player) return;

    // Bell visual — white circle above center of map
    const bellX = 640;
    const bellY = 100;
    const bell = this.add.circle(bellX, bellY, 6, 0xFFFFFF, 0.8).setDepth(200);
    const bellRing = this.add.text(bellX, bellY - 14, '🔔', {
      fontSize: '16px', resolution: 4,
    }).setOrigin(0.5).setDepth(201);

    // Swing animation — 3 tolls
    let swingCount = 0;
    const swingOnce = () => {
      if (swingCount >= 3) {
        this.tweens.add({
          targets: [bell, bellRing],
          alpha: 0, duration: 800,
          onComplete: () => { bell.destroy(); bellRing.destroy(); },
        });
        return;
      }
      swingCount++;
      this.tweens.add({
        targets: bellRing,
        x: bellX - 8, duration: 300, ease: 'Sine.easeInOut',
        onComplete: () => {
          this.tweens.add({
            targets: bellRing,
            x: bellX + 8, duration: 300, ease: 'Sine.easeInOut',
            onComplete: () => {
              this.tweens.add({
                targets: bellRing,
                x: bellX, duration: 200, ease: 'Sine.easeOut',
                onComplete: () => this.time.delayedCall(400, swingOnce),
              });
            },
          });
        },
      });
    };
    swingOnce();

    // Elder dialogue
    const elder = this.npcSprites.get('TheElder');
    if (elder) {
      this.time.delayedCall(2000, () => {
        this.showAmbientBubble(elder.x, elder.y - 24, 'Another day ends.\nAnother begins.');
      });
    }

    // Pause wandering NPCs briefly
    this.wanderingNpcs.forEach(w => {
      w.timer?.remove();
      (w.sprite.body as Phaser.Physics.Arcade.Body)?.setVelocity(0, 0);
    });
    this.time.delayedCall(6000, () => {
      this.wanderingNpcs.forEach(w => this.scheduleWanderAction(w));
    });
  }

  // ─── Scene 4: Campfire Gathering ───
  private playCampfireGathering() {
    // Find campfire glow objects (already created in initAnimatedTiles)
    // Intensify them temporarily
    this.campfireGlows.forEach(g => {
      this.tweens.add({
        targets: g,
        alpha: 0.6, scaleX: 2.5, scaleY: 2.5,
        duration: 2000, ease: 'Sine.easeInOut',
      });
    });

    // Sequential NPC dialogue — staged conversation
    const dialogues = [
      { npc: 'ForgeMaster', text: 'The castle won\'t\nopen itself.', delay: 2000 },
      { npc: 'TheElder', text: 'Patience. The right\none will come.', delay: 6000 },
      { npc: 'CastleGuard', text: '...', delay: 10000 },
    ];

    for (const d of dialogues) {
      this.time.delayedCall(d.delay, () => {
        const npc = this.npcSprites.get(d.npc);
        if (npc) this.showAmbientBubble(npc.x, npc.y - 24, d.text);
      });
    }

    // Return campfire to normal after 60 seconds
    this.time.delayedCall(60000, () => {
      this.campfireGlows.forEach(g => {
        this.tweens.add({
          targets: g,
          alpha: 0.15, scaleX: 1, scaleY: 1,
          duration: 3000, ease: 'Sine.easeInOut',
        });
      });
    });
  }

  // ─── Scene 5: Storm Warning ───
  private playStormWarning() {
    if (this.stormActive || !this.player) return;
    this.stormActive = true;

    const cam = this.cameras.main;

    // Activity feed announcement (emitted to React)
    this.game.events.emit('activity_feed', '⛈ A storm approaches Midforge. Seek shelter.');

    // Tavernkeeper dialogue
    const tavernkeep = this.npcSprites.get('Tavernkeep');
    if (tavernkeep) {
      this.time.delayedCall(3000, () => {
        this.showAmbientBubble(tavernkeep.x, tavernkeep.y - 24, 'Storm\'s coming.\nGet inside.');
      });
    }

    // Dark overlay — gradual darken over 2 minutes (but we speed up for feel: 8s)
    const mapW = cam.getBounds().width || 1280;
    const mapH = cam.getBounds().height || 960;
    this.stormOverlay = this.add.rectangle(mapW / 2, mapH / 2, mapW, mapH, 0x000000, 0)
      .setDepth(150).setScrollFactor(0);
    this.tweens.add({
      targets: this.stormOverlay,
      alpha: 0.35,
      duration: 8000,
      ease: 'Sine.easeIn',
    });

    // Wind particles — horizontal white streaks
    const windTimer = this.time.addEvent({
      delay: 200,
      loop: true,
      callback: () => {
        if (!this.stormActive) { windTimer.remove(); return; }
        const sx = cam.scrollX - 20;
        const sy = cam.scrollY + Math.random() * cam.height;
        const streak = this.add.circle(sx, sy, 1, 0xFFFFFF, 0.15 + Math.random() * 0.15).setDepth(151);
        this.stormWindParticles.push(streak);
        this.tweens.add({
          targets: streak,
          x: sx + cam.width + 40,
          duration: 800 + Math.random() * 600,
          ease: 'Linear',
          onComplete: () => {
            streak.destroy();
            const idx = this.stormWindParticles.indexOf(streak);
            if (idx >= 0) this.stormWindParticles.splice(idx, 1);
          },
        });
      },
    });

    // Pause wandering NPCs (shelter behavior)
    this.wanderingNpcs.forEach(w => {
      w.timer?.remove();
      (w.sprite.body as Phaser.Physics.Arcade.Body)?.setVelocity(0, 0);
    });

    // Storm ends after 5 minutes
    this.time.delayedCall(this.STORM_DURATION_MS, () => {
      this.endStorm();
    });
  }

  private endStorm() {
    if (!this.stormActive) return;
    this.stormActive = false;

    // Fade overlay out
    if (this.stormOverlay) {
      this.tweens.add({
        targets: this.stormOverlay,
        alpha: 0,
        duration: 5000,
        ease: 'Sine.easeOut',
        onComplete: () => { this.stormOverlay?.destroy(); this.stormOverlay = null; },
      });
    }

    // Clean up wind particles
    this.stormWindParticles.forEach(p => p.destroy());
    this.stormWindParticles = [];

    // Resume wandering NPCs
    this.wanderingNpcs.forEach(w => this.scheduleWanderAction(w));

    // Award Storm Survivor XP
    if (this.player) {
      const txt = this.add.text(
        this.player.x, this.player.y - 20,
        `+${this.STORM_XP_REWARD} XP — Storm Survivor`,
        { fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#95A5A6', stroke: '#000000', strokeThickness: 3, resolution: 4 }
      ).setOrigin(0.5).setDepth(202);
      this.tweens.add({
        targets: txt, y: txt.y - 40, alpha: 0,
        duration: 3000, ease: 'Power2',
        onComplete: () => txt.destroy(),
      });

      fetch('/api/player/award-xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: this.STORM_XP_REWARD, source: 'storm_survivor' }),
      }).then(r => r.json()).then(d => {
        if (d.newXP !== undefined) this.game.events.emit('xp_updated', d.newXP);
      }).catch(() => {});
    }

    this.game.events.emit('activity_feed', '☀ The storm has passed.');
  }

  // ─── Scene 3: Wanderer Arrives ───
  private playWandererArrival(x: number, y: number) {
    // Screen edge amber flash
    this.flashScreen(0xF39C12, 200);

    // Portal shimmer — expanding radial ring
    const ring1 = this.add.circle(x, y, 4, 0xF39C12, 0.6).setDepth(199);
    const ring2 = this.add.circle(x, y, 2, 0xFFFFFF, 0.4).setDepth(200);

    this.tweens.add({
      targets: ring1,
      scaleX: 6, scaleY: 6, alpha: 0,
      duration: 800, ease: 'Power2',
      onComplete: () => ring1.destroy(),
    });

    this.tweens.add({
      targets: ring2,
      scaleX: 4, scaleY: 4, alpha: 0,
      duration: 600, delay: 100, ease: 'Power2',
      onComplete: () => ring2.destroy(),
    });

    // Sparkle burst — 8 particles
    this.time.delayedCall(300, () => {
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const sparkle = this.add.circle(x, y, 1.5, 0xF39C12, 0.8).setDepth(201);
        this.tweens.add({
          targets: sparkle,
          x: x + Math.cos(angle) * 25,
          y: y + Math.sin(angle) * 25,
          alpha: 0,
          duration: 500,
          ease: 'Power2',
          onComplete: () => sparkle.destroy(),
        });
      }
    });

    // Activity feed
    this.game.events.emit('activity_feed', '✨ A hooded figure was spotted near the old oak.');
  }

  // ─── Scene 6: Evolution Witness ───
  // Call this when another player evolves (tier change visible to all online)
  private playEvolutionWitness(playerX: number, playerY: number, username: string, newTier: string) {
    // Gold pillar of light shooting upward from that position
    const pillar = this.add.rectangle(playerX, playerY - 40, 6, 80, 0xF39C12, 0.6).setDepth(200);
    this.tweens.add({
      targets: pillar,
      scaleY: 2.5, alpha: 0,
      duration: 1500, ease: 'Power2',
      onComplete: () => pillar.destroy(),
    });

    // 10 gold particles burst from the pillar
    for (let i = 0; i < 10; i++) {
      const p = this.add.circle(
        playerX + (Math.random() - 0.5) * 20,
        playerY - 60 - Math.random() * 40,
        2, 0xF39C12, 0.8
      ).setDepth(201);
      this.tweens.add({
        targets: p,
        y: p.y - 30 - Math.random() * 20,
        x: p.x + (Math.random() - 0.5) * 30,
        alpha: 0,
        duration: 800 + Math.random() * 400,
        ease: 'Power2',
        onComplete: () => p.destroy(),
      });
    }

    // Screen-edge amber flash for this viewer
    this.flashScreen(0xF39C12, 300);

    // Activity feed
    this.game.events.emit('activity_feed', `⚡ @${username} just ascended to ${newTier} Tier!`);
  }

  // ─── Scene 8: Castle Awakening ───
  // One-time global event when first player reaches Warrior tier
  private playCastleAwakening() {
    // Red glow on castle area (roughly center-right of map)
    const castleX = 880;
    const castleY = 340;
    const glow = this.add.circle(castleX, castleY, 30, 0xFF0000, 0).setDepth(5);
    this.tweens.add({
      targets: glow,
      alpha: 0.2, scaleX: 2, scaleY: 2,
      duration: 3000, ease: 'Sine.easeInOut',
      yoyo: true, repeat: 2,
      onComplete: () => {
        // Leave a permanent faint glow
        glow.setAlpha(0.08).setScale(1.5);
      },
    });

    // CastleGuard new dialogue
    const guard = this.npcSprites.get('CastleGuard');
    if (guard) {
      this.time.delayedCall(2000, () => {
        this.showAmbientBubble(guard.x, guard.y - 24, 'Something stirs behind\nthe gate. Someone\ngrows strong enough.');
      });
    }

    // Activity feed
    this.game.events.emit('activity_feed', '🏰 The castle stirs. A Warrior walks among us.');

    // Award all online players +100 XP
    if (this.player) {
      this.time.delayedCall(4000, () => {
        if (!this.player) return;
        const txt = this.add.text(
          this.player.x, this.player.y - 20,
          '+100 XP — Witness to History',
          { fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#C0392B', stroke: '#000000', strokeThickness: 3, resolution: 4 }
        ).setOrigin(0.5).setDepth(202);
        this.tweens.add({
          targets: txt, y: txt.y - 40, alpha: 0,
          duration: 3000, ease: 'Power2',
          onComplete: () => txt.destroy(),
        });

        fetch('/api/player/award-xp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: 100, source: 'witness_to_history' }),
        }).then(r => r.json()).then(d => {
          if (d.newXP !== undefined) this.game.events.emit('xp_updated', d.newXP);
        }).catch(() => {});
      });
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

    // Zone-based music crossfade
    const zoneMusicMap: Record<string, string> = {
      'social_hub': 'village', 'tavern_door': 'tavern',
      'arena_entrance': 'battle', 'castle_gate_trigger': 'castle',
      'hall_of_legends': 'castle',
    };
    const musicKey = zoneMusicMap[zoneName];
    if (musicKey && this.musicManager) {
      this.musicManager.playZoneMusic(musicKey);
    }

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

    // Zone first-visit XP bonus
    if (!this.visitedZones.has(zoneName)) {
      this.visitedZones.add(zoneName);
      this.game.events.emit('zone_enter_banner', `${label} — +${this.ZONE_FIRST_VISIT_XP} XP Discovery`);

      if (this.player) {
        const txt = this.add.text(
          this.player.x, this.player.y - 20,
          `+${this.ZONE_FIRST_VISIT_XP} XP — New Area!`,
          { fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#27AE60', stroke: '#000000', strokeThickness: 3, resolution: 4 }
        ).setOrigin(0.5).setDepth(202);
        this.tweens.add({
          targets: txt, y: txt.y - 40, alpha: 0,
          duration: 2500, ease: 'Power2',
          onComplete: () => txt.destroy(),
        });
      }

      fetch('/api/player/award-xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: this.ZONE_FIRST_VISIT_XP, source: 'zone_discovery' }),
      }).then(r => r.json()).then(d => {
        if (d.newXP !== undefined) this.game.events.emit('xp_updated', d.newXP);
      }).catch(() => {});
    } else {
      this.game.events.emit('zone_enter_banner', label);
    }
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
    this.sceneCheckTimer?.remove();
    this.stormOverlay?.destroy();
    this.stormWindParticles.forEach(p => p.destroy());
    this.stormWindParticles = [];
  }
}
