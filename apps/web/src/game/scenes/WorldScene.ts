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
import { PlayerCharacter } from '@/game/PlayerCharacter';
import { type CharacterData, type VisualTier, type GearItem, DEFAULT_CHARACTER_DATA, TIER_CONFIG, GEAR_CATALOG, equipGear, unequipGear } from '@midforge/shared/character';
import { QuestManager } from '@/game/managers/QuestManager';
import { MusicManager } from '@/game/managers/MusicManager';
import { SoundManager } from '@/game/managers/SoundManager';
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
  // Character Visual System — 6-layer renderer
  public playerCharacter: PlayerCharacter | null = null;
  private characterData: CharacterData = { ...DEFAULT_CHARACTER_DATA };
  private inputEnabled = false;

  private footstepCounter = 0;
  private stuckFrames = 0;
  private groundData: number[] = [];
  private mapCols = 64;
  private mapRows = 64;

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
  private interactPressed = false;

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
      zones: [{ x: 60, y: 60, w: 200, h: 200 }, { x: 760, y: 60, w: 200, h: 200 }] },
    { name: 'Cave Troll', color: 0x6B5B4F, tier: 'apprentice', levelRange: [3, 6], xpRange: [40, 80], goldRange: [15, 30],
      zones: [{ x: 60, y: 760, w: 200, h: 200 }, { x: 760, y: 760, w: 200, h: 200 }] },
    { name: 'Deserter Knight', color: 0x8B2500, tier: 'merchant', levelRange: [5, 8], xpRange: [80, 150], goldRange: [30, 60],
      zones: [{ x: 200, y: 300, w: 200, h: 150 }] },
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

  // Welcome chest (Phase B — First 60 seconds)
  private welcomeChest: {
    sprite: Phaser.GameObjects.Rectangle;
    glow: Phaser.GameObjects.Arc;
    label: Phaser.GameObjects.Text;
    x: number; y: number;
    opened: boolean;
  } | null = null;
  private readonly WELCOME_CHEST_PICKUP_DIST = 28;

  // Quest beacon (Phase B — floating arrow above target NPC)
  private questBeacon: Phaser.GameObjects.Text | null = null;
  private questBeaconTarget: string | null = null; // NPC id to point at

  // Ambient sound timer
  private ambientSoundTimer: Phaser.Time.TimerEvent | null = null;

  // Phase 1 — Tutorial state
  private gatekeeperSprite: Phaser.GameObjects.Sprite | null = null;
  private gatekeeperLabel: Phaser.GameObjects.Text | null = null;
  private gatekeeperShadow: Phaser.GameObjects.Ellipse | null = null;
  private gatekeeperTriggered = false;
  private tutorialBrigandSprite: Phaser.GameObjects.Sprite | null = null;
  private tutorialBrigandExcl: Phaser.GameObjects.Text | null = null;
  private tutorialBrigandTriggered = false;
  private static readonly GATEKEEPER_POS = { x: 520, y: 104 }; // tile (32, 6)
  private static readonly BRIGAND_POS = { x: 184, y: 504 };     // tile ~(11, 31)
  private static readonly GATEKEEPER_TRIGGER_DIST = 48;          // 3 tiles
  private static readonly BRIGAND_TRIGGER_DIST = 80;             // 5 tiles

  // Step 7 — Other players (polling)
  private static readonly NEARBY_POLL_MS = 30_000; // 30s
  private static readonly POSITION_SAVE_MS = 5_000; // 5s
  private nearbySprites = new Map<string, { pc: PlayerCharacter; clickZone: Phaser.GameObjects.Zone }>();
  private nearbyPopup: Phaser.GameObjects.GameObject[] = [];
  private lastPositionSaveTime = 0;
  private lastNearbyPollTime = 0;

  // Building door positions (pixel coords — south face of each building)
  private static readonly BUILDING_DOORS: { scene: string; x: number; y: number; w: number; h: number }[] = [
    { scene: 'TavernScene',     x: 688, y: 464, w: 32, h: 16 },  // Inn_Blue south face
    { scene: 'BlacksmithScene', x: 192, y: 816, w: 32, h: 16 },  // Blacksmith south face
    { scene: 'ChurchScene',     x: 176, y: 144, w: 32, h: 16 },  // Church south face
  ];
  private lastDoorTime = 0;

  // Mobile touch controls (driven by React MobileControlPanel via CustomEvents)
  private isMobile = false;
  private mobileState = { left: false, right: false, up: false, down: false };
  private mobileJoystickHandler: ((e: Event) => void) | null = null;
  private mobileInteractHandler: (() => void) | null = null;
  private mobileInventoryHandler: (() => void) | null = null;

  // Spawn points from map (new 64×64 map — plaza center)
  private spawnDefault = { x: 512, y: 512 };
  private spawnNewGame = { x: 512, y: 512 };
  private questGiverPos = { x: 176, y: 208 };

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
    this.renderAllTileLayers(mapData);
    this.renderCollisionLayer(mapData);
    this.parseSpawnPoints(mapData);
    this.spawnNpcsFromMap(mapData);
    this.spawnAnimalsFromMap(mapData);
    this.placeTreesFromMap(mapData);
    this.parseZones(mapData);
    this.initAnimatedTiles(mapData);
    this.initWanderingNpcs();
    this.placeCuteFantasyBuildings();
    this.placeDecorations();
    this.placeMilitaryCamp();

    // ── Player ──────────────────────────────────────────
    // Phase 1: Use localStorage flags for tutorial progression
    const isFirstVisit = typeof window !== 'undefined' && !localStorage.getItem('midforge_first_visit');
    const isFirstLogin = isFirstVisit || (playerData?.firstLogin !== false);
    const spawnPos = isFirstVisit
      ? { x: INTRO.northGateSpawn.x, y: INTRO.northGateSpawn.y } // north gate for cinematic
      : isFirstLogin ? this.spawnNewGame : this.spawnDefault;

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
    this.interactKey.on('down', () => { this.interactPressed = true; });

    // ── Inventory key (I) ──
    this.input.keyboard!.addKey('I').on('down', () => {
      if (!this.inputEnabled || this.introActive) return;
      if (this.scene.isActive('InventoryScene')) {
        this.scene.stop('InventoryScene');
        this.scene.resume('WorldScene');
      } else {
        this.scene.pause('WorldScene');
        this.scene.launch('InventoryScene', { characterData: this.characterData });
      }
    });

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

    // ── Character Visual System (6-layer renderer) ────
    const visualTier = (this.playerTier?.toUpperCase() ?? 'VILLAGER') as VisualTier;
    this.characterData = {
      ...DEFAULT_CHARACTER_DATA,
      userId: playerData?.id ?? '',
      username: username,
      level: playerData?.level ?? 1,
      xp: playerData?.xp ?? 0,
      gold: playerData?.gold ?? 0,
      tier: visualTier in TIER_CONFIG ? visualTier : 'VILLAGER',
      xFollowers: playerData?.xFollowers ?? 0,
    };
    this.playerCharacter = new PlayerCharacter(this, spawnPos.x, spawnPos.y, this.characterData, {
      useCuteFantasy: this.useCuteFantasy,
    });
    // Hide the PlayerCharacter's own base sprite — the physics sprite handles animation
    this.playerCharacter.baseSprite.setVisible(false);
    // The PlayerCharacter manages its own shadow/glow/label, but keep the old ones
    // as primary since they're referenced everywhere. The PC layers overlay on top.

    // ── Interaction Prompt ──────────────────────────────
    this.npcPromptLabel = this.add.text(0, 0, '', TEXT_STYLES.interactPrompt)
      .setOrigin(0.5).setDepth(100).setVisible(false);

    // ── Zone Label ──────────────────────────────────────
    const worldName = getProp(mapData, 'worldName') ?? 'Starter Village';
    this.add.text(8, 8, worldName, TEXT_STYLES.zoneName)
      .setScrollFactor(0).setDepth(100);

    // ── Decide: intro sequence or normal play ───────────
    if (isFirstVisit) {
      this.startCinematicArrival(username);
    } else if (isFirstLogin) {
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

    // ── Phase A: Initialize SoundManager (synthesized SFX) ──
    SoundManager.init();

    // ── Phase A.4: Ambient sound loop (birds, campfire, water) ──
    this.ambientSoundTimer = this.time.addEvent({
      delay: 8000 + Math.random() * 6000,
      loop: true,
      callback: () => {
        if (!this.player) return;
        // Pick ambient sound based on player position
        const px = this.player.x;
        const py = this.player.y;
        // Near campfire zone (plaza center ~500, 500)
        if (Math.abs(px - 500) < 80 && Math.abs(py - 500) < 80) {
          SoundManager.play('ambient_campfire');
        }
        // Near forest edges (border zones)
        else if (py < 80 || py > 950 || px < 80 || px > 950) {
          SoundManager.play('ambient_water');
        }
        // Default: bird chirps
        else {
          SoundManager.play('ambient_bird');
        }
      },
    });

    // ── Phase B.1: Welcome Chest (first login only) ──
    if (isFirstLogin) {
      this.spawnWelcomeChest(spawnPos);
    }

    // ── Phase 1: Tutorial NPCs ──
    this.spawnGatekeeper();
    this.spawnTutorialBrigand();

    this.connectMultiplayer(playerData);

    // ── Dungeon exit handler — resume WorldScene when DungeonScene exits ──
    this.game.events.on('dungeon_exit', () => {
      this.scene.resume('WorldScene');
      this.cameras.main.fadeIn(400, 0, 0, 0);
      this.inputEnabled = true;
      if (this.musicManager) this.musicManager.playZoneMusic('village');
    });

    // ── Interior exit handler — resume WorldScene when any interior scene exits ──
    this.game.events.on('interior_exit', (data: { returnX: number; returnY: number }) => {
      this.scene.resume('WorldScene');
      this.cameras.main.fadeIn(400, 0, 0, 0);
      if (this.player && data.returnX != null) {
        this.player.setPosition(data.returnX, data.returnY);
        if (this.playerShadow) this.playerShadow.setPosition(data.returnX, data.returnY + 18);
        if (this.playerGlow) this.playerGlow.setPosition(data.returnX, data.returnY + 18);
        this.nameLabel.setPosition(data.returnX, data.returnY - (this.useCuteFantasy ? 36 : 12));
      }
      this.inputEnabled = true;
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
  //  TILE LAYERS — render all tilelayers from the new 64×64 map
  // ═══════════════════════════════════════════════════════════
  // Layer depth mapping: Ground=0, Paths=1, Buildings=2, Forest=2
  private static readonly LAYER_DEPTHS: Record<string, number> = {
    Ground: 0, Paths: 1, Buildings: 2, Forest: 2,
  };

  private renderAllTileLayers(map: TmjMap) {
    const ts = map.tilewidth;
    const townKey = TILESHEET_TOWN.key;
    const cols = map.width;

    // Render each visible tilelayer (skip Collision — handled separately)
    for (const layer of map.layers) {
      if (layer.type !== 'tilelayer') continue;
      if (layer.name === 'Collision') continue;
      const tileLayer = layer as TmjTileLayer;
      const depth = WorldScene.LAYER_DEPTHS[layer.name] ?? 0;

      for (let i = 0; i < tileLayer.data.length; i++) {
        const gid = tileLayer.data[i];
        if (gid === 0) continue;

        const c = i % cols;
        const r = Math.floor(i / cols);
        const px = c * ts + ts / 2;
        const py = r * ts + ts / 2;
        const localId = gid - FIRSTGID_TOWN;

        this.add.image(px, py, townKey, localId).setDepth(depth);
      }

      // Store Ground data for footstep detection
      if (layer.name === 'Ground') {
        this.groundData = tileLayer.data;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  COLLISION LAYER — tile-based collision from Collision tilelayer
  // ═══════════════════════════════════════════════════════════
  // In the new 64×64 map, Collision is a tilelayer where GID > 0 = solid
  private renderCollisionLayer(map: TmjMap) {
    const layer = map.layers.find(l => l.name === 'Collision' && l.type === 'tilelayer') as TmjTileLayer | undefined;
    if (!layer) return;

    const ts = map.tilewidth;
    const cols = map.width;

    for (let i = 0; i < layer.data.length; i++) {
      const gid = layer.data[i];
      if (gid === 0) continue; // passable

      const c = i % cols;
      const r = Math.floor(i / cols);
      const cx = c * ts + ts / 2;
      const cy = r * ts + ts / 2;

      const wall = this.physics.add.staticImage(cx, cy, '__DEFAULT');
      wall.setVisible(false).setDepth(0);
      const b = wall.body as Phaser.Physics.Arcade.Body;
      b.setSize(ts, ts);
      b.setOffset(-ts / 2, -ts / 2);
      this.walls.add(wall);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  SPAWN POINTS — read from Spawns layer (new 64×64 map)
  // ═══════════════════════════════════════════════════════════
  private parseSpawnPoints(map: TmjMap) {
    // Try new "Spawns" layer first, fall back to old "SpawnPoints"
    const layer = (map.layers.find(l => l.name === 'Spawns' && l.type === 'objectgroup')
      ?? map.layers.find(l => l.name === 'SpawnPoints' && l.type === 'objectgroup')) as TmjObjectLayer | undefined;
    if (!layer) return;

    for (const obj of layer.objects) {
      // New format: type="player_spawn", name="PlayerSpawn"
      if (obj.type === 'player_spawn' || obj.name === 'PlayerSpawn') {
        this.spawnDefault = { x: obj.x + 8, y: obj.y + 8 };
        this.spawnNewGame = { x: obj.x + 8, y: obj.y + 8 };
      }
      // Old format fallback
      if (obj.name === 'player_default') {
        this.spawnDefault = { x: obj.x + 8, y: obj.y + 8 };
      } else if (obj.name === 'player_new_game') {
        this.spawnNewGame = { x: obj.x + 8, y: obj.y + 8 };
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  NPCs — spawn from Spawns or NPCs object layer
  // ═══════════════════════════════════════════════════════════

  // Map spawn names from new 64×64 map → NPC config
  private static readonly NPC_SPAWN_CONFIG: Record<string, { sprite: string; npcType: string; dialogue: string; wandering?: boolean }> = {
    Tavernkeeper:  { sprite: 'villager', npcType: 'tavern',       dialogue: 'Welcome to the tavern, traveler!' },
    GoldbagMarket: { sprite: 'merchant', npcType: 'marketplace',  dialogue: 'Looking to buy or sell?' },
    ChurchElder:   { sprite: 'elder',    npcType: 'quest_giver',  dialogue: 'Ah, young one. I have tasks for the worthy.' },
    Blacksmith:    { sprite: 'guard',    npcType: 'inventory',    dialogue: 'Need something forged?' },
    ArenaKeeper:   { sprite: 'warrior',  npcType: 'arena',        dialogue: 'Ready to fight, challenger?' },
    Villager1:     { sprite: 'villager', npcType: 'ambient',      dialogue: 'Beautiful day in the village!', wandering: true },
    Villager2:     { sprite: 'villager', npcType: 'ambient',      dialogue: 'Have you visited the arena yet?', wandering: true },
    Villager3:     { sprite: 'villager', npcType: 'ambient',      dialogue: 'The elder has quests for brave souls.', wandering: true },
  };

  private spawnNpcsFromMap(map: TmjMap) {
    // Try old NPCs layer first, then fall back to reading npc_spawn objects from Spawns layer
    const layer = map.layers.find(l => l.name === 'NPCs' && l.type === 'objectgroup') as TmjObjectLayer | undefined;
    const spawnsLayer = map.layers.find(l => l.name === 'Spawns' && l.type === 'objectgroup') as TmjObjectLayer | undefined;

    // Build combined NPC list from either source
    const npcObjects: TmjObject[] = [];
    if (layer) {
      npcObjects.push(...layer.objects);
    }
    if (spawnsLayer) {
      // Add npc_spawn objects from the Spawns layer (new map format)
      for (const obj of spawnsLayer.objects) {
        if (obj.type === 'npc_spawn') npcObjects.push(obj);
      }
    }
    if (npcObjects.length === 0) return;

    const dungeonKey = TILESHEET_DUNGEON.key;

    for (const obj of npcObjects) {
      // Resolve NPC config: prefer custom properties (old format), fall back to spawn name mapping (new format)
      const spawnCfg = WorldScene.NPC_SPAWN_CONFIG[obj.name];
      const spriteName = getProp(obj, 'sprite') ?? spawnCfg?.sprite ?? 'villager';
      const npcType = getProp(obj, 'npcType') ?? spawnCfg?.npcType ?? 'ambient';
      const dialogue = getProp(obj, 'dialogue') ?? spawnCfg?.dialogue ?? '';
      const tierRequired = getProp(obj, 'tierRequired') ?? '';
      const wandering = getProp(obj, 'wandering') ?? spawnCfg?.wandering ?? false;

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
    // Building placement for new 64×64 map (1024×1024px)
    // Buildings anchored bottom-center, rendered at 2x
    const buildings: { key: string; cx: number; by: number; depth?: number }[] = [
      // Inn/Tavern at tile (40,28) → pixel center ~(648, 480)
      { key: 'cf_inn', cx: 648, by: 480 },
      // Blacksmith at tile (10,48) → pixel center ~(168, 800)
      { key: 'cf_blacksmith', cx: 168, by: 800 },
      // Market at tile (6,28) → pixel center ~(104, 480)
      { key: 'cf_market', cx: 104, by: 480 },
      // Church/Elder at tile (10,6) → pixel center ~(168, 128)
      { key: 'cf_church', cx: 168, by: 128 },
    ];

    for (const b of buildings) {
      if (!this.textures.exists(b.key)) continue;
      this.add.image(b.cx, b.by, b.key)
        .setOrigin(0.5, 1) // anchor bottom-center
        .setScale(2)
        .setDepth(b.depth ?? 3); // behind NPCs & player
    }

    // Windmill at tile (47,6) → pixel ~(760, 128)
    if (this.textures.exists('cf_windmill')) {
      this.add.image(760, 128, 'cf_windmill')
        .setOrigin(0.5, 1).setScale(2).setDepth(3);

      // Animated sail overlay on top of windmill
      if (this.textures.exists('cf_windmill_sail')) {
        const sail = this.add.sprite(760, 60, 'cf_windmill_sail')
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

    // Scattered flowers near paths and buildings (new 64×64 map — plaza area)
    const flowerSpots = [
      { x: 440, y: 480 }, { x: 560, y: 480 }, { x: 500, y: 540 },
      { x: 620, y: 440 }, { x: 380, y: 440 }, { x: 500, y: 420 },
    ];
    flowerSpots.forEach((pos, i) => {
      const fi = (i % 3) + 1;
      placeAnim(`cf_flower_${fi}`, `cf_flower_${fi}_anim`, pos.x, pos.y);
    });

    // Potted flowers near inn and market entrances (new map positions)
    const pottedSpots = [
      { x: 630, y: 470 }, { x: 660, y: 470 }, // near inn
      { x: 120, y: 470 }, // near market
    ];
    pottedSpots.forEach((pos, i) => {
      const fi = (i % 2) + 1;
      placeAnim(`cf_flower_pot_${fi}`, `cf_flower_pot_${fi}_anim`, pos.x, pos.y);
    });

    // Campfire near village plaza center
    placeAnim('cf_campfire', 'cf_campfire_anim', 530, 530, 2, 5);

    // Torches along paths (new map — along N-S and E-W paths)
    const torchSpots = [
      { x: 480, y: 400 }, { x: 540, y: 400 },
      { x: 400, y: 500 }, { x: 620, y: 500 },
    ];
    torchSpots.forEach(pos => {
      placeAnim('cf_torch', 'cf_torch_anim', pos.x, pos.y, 2, 5);
    });

    // Small torches near buildings (new map positions)
    const smallTorchSpots = [
      { x: 150, y: 790 }, { x: 190, y: 790 }, // blacksmith
      { x: 630, y: 450 }, { x: 670, y: 450 }, // inn area
    ];
    smallTorchSpots.forEach(pos => {
      placeAnim('cf_torch_small', 'cf_torch_small_anim', pos.x, pos.y, 2, 5);
    });

    // Fountain at plaza center — tile (31,31) = pixel (496,496)
    placeAnim('cf_fountain', 'cf_fountain_anim', 496, 496, 2, 5);
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
    // Camp center: near arena at tile (46,47) → pixel ~(780, 780)
    const cx = 780, cy = 780;
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
  //  ANIMALS — data-driven from Spawns layer (animal_spawn type)
  // ═══════════════════════════════════════════════════════════
  private spawnAnimalsFromMap(map: TmjMap) {
    const spawnsLayer = map.layers.find(l => l.name === 'Spawns' && l.type === 'objectgroup') as TmjObjectLayer | undefined;
    if (!spawnsLayer) {
      // Fallback to old hardcoded animals
      this.spawnVillageAnimals();
      return;
    }

    const animalSpawns = spawnsLayer.objects.filter(o => o.type === 'animal_spawn');
    if (animalSpawns.length === 0) {
      this.spawnVillageAnimals();
      return;
    }

    let duckIdx = 0;
    let horseIdx = 0;

    for (const spawn of animalSpawns) {
      const px = spawn.x + 8;
      const py = spawn.y + 8;
      const name = spawn.name.toLowerCase();

      if (name.startsWith('duck')) {
        duckIdx++;
        const key = `cf_duck_${((duckIdx - 1) % 4) + 1}`;
        if (!this.textures.exists(key)) continue;
        const duck = this.add.sprite(px, py, key).setScale(1.5).setDepth(6);
        if (this.anims.exists(`${key}_idle`)) duck.play(`${key}_idle`);
        this.duckWander(duck, px, py);
      } else if (name.startsWith('horse')) {
        horseIdx++;
        const key = `cf_horse_${((horseIdx - 1) % 2) + 1}`;
        if (!this.textures.exists(key)) continue;
        const horse = this.add.sprite(px, py, key).setScale(1.5).setDepth(6);
        if (this.anims.exists(`${key}_idle`)) horse.play(`${key}_idle`);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  TREES — data-driven from Trees object layer
  // ═══════════════════════════════════════════════════════════

  // Map TMX tree names → existing tree texture keys
  private static readonly TREE_NAME_MAP: Record<string, string> = {
    'Big_Oak':       'tree_big_oak',
    'Medium_Oak':    'tree_med_oak',
    'Small_Oak':     'tree_small_oak',
    'Big_Birch':     'tree_big_birch',
    'Medium_Birch':  'tree_med_birch',
    'Small_Birch':   'tree_small_birch',
    'Big_Spruce':    'tree_big_spruce',
    'Medium_Spruce': 'tree_med_spruce',
    'Small_Spruce':  'tree_small_spruce',
    'Small_Fruit':   'tree_small_fruit',
    'Medium_Fruit':  'tree_med_fruit',
    'Big_Fruit':     'tree_big_fruit',
  };

  private placeTreesFromMap(map: TmjMap) {
    const treesLayer = map.layers.find(l => l.name === 'Trees' && l.type === 'objectgroup') as TmjObjectLayer | undefined;
    if (!treesLayer) {
      // Fallback to old hardcoded tree placement
      this.placeTrees();
      return;
    }

    const SCALE = 2;

    for (const treeObj of treesLayer.objects) {
      const textureKey = WorldScene.TREE_NAME_MAP[treeObj.name];
      if (!textureKey) continue;
      if (!this.textures.exists(textureKey)) continue;

      // Trees are anchored bottom-center, depth-sorted by Y
      const px = treeObj.x + treeObj.width / 2;
      const py = treeObj.y + treeObj.height; // bottom of the object rect
      const s = this.add.sprite(px, py, textureKey);
      s.setScale(SCALE);
      s.setOrigin(0.5, 1); // bottom-center anchor
      s.setDepth(py);       // Y-sort depth
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
  //  PHASE 1 — CINEMATIC ARRIVAL (first visit only)
  // ═══════════════════════════════════════════════════════════
  private async startCinematicArrival(_username: string) {
    this.introActive = true;
    this.inputEnabled = false;

    const cam = this.cameras.main;
    const cameraZoom = cam.zoom; // base zoom from map property (2.5)
    const ts = TILE_SIZE;

    // 1. Hide player initially, black screen
    this.player.setAlpha(0);
    if (this.playerShadow) this.playerShadow.setAlpha(0);
    if (this.playerGlow) this.playerGlow.setAlpha(0);
    this.nameLabel.setAlpha(0);

    // Black overlay for cinematic text
    const overlay = this.add.rectangle(cam.width / 2, cam.height / 2, cam.width, cam.height, 0x000000, 1)
      .setScrollFactor(0).setDepth(900);

    // 2. Show cinematic text lines one at a time
    const lineTexts: Phaser.GameObjects.Text[] = [];
    const lineY = cam.height / 2 - 30;

    for (let i = 0; i < INTRO.cinematicLines.length; i++) {
      const txt = this.add.text(cam.width / 2, lineY + i * 22, INTRO.cinematicLines[i], {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#FFFFFF',
        align: 'center',
        resolution: 4,
        wordWrap: { width: cam.width - 32 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(901).setAlpha(0);
      lineTexts.push(txt);
    }

    // Fade in each line sequentially
    for (let i = 0; i < lineTexts.length; i++) {
      await this.wait(i === 0 ? INTRO.cinematicFadeMs : INTRO.cinematicLinePause);
      this.tweens.add({ targets: lineTexts[i], alpha: 1, duration: INTRO.cinematicFadeMs, ease: 'Power2' });
    }

    // Hold final line
    await this.wait(2000);

    // 3. Fade out all text
    this.tweens.add({ targets: lineTexts, alpha: 0, duration: INTRO.cinematicFadeMs, ease: 'Power2' });
    await this.wait(INTRO.cinematicFadeMs);

    // 4. Fade out black overlay — reveal the world
    // Set camera to tight zoom on player at north gate
    cam.setZoom(INTRO.zoomStart * cameraZoom);

    this.tweens.add({ targets: overlay, alpha: 0, duration: INTRO.cinematicFadeMs * 2, ease: 'Power2' });
    await this.wait(INTRO.cinematicFadeMs);

    // Show player sprite facing south
    this.player.setAlpha(1);
    if (this.playerShadow) this.playerShadow.setAlpha(1);
    if (this.playerGlow) this.playerGlow.setAlpha(0.35);
    this.nameLabel.setAlpha(1);
    if (this.useCuteFantasy) {
      this.player.play('cf_player_idle_down', true);
    }

    await this.wait(500);

    // 5. Camera slowly pans back to normal zoom
    this.tweens.add({
      targets: cam,
      zoom: INTRO.zoomEnd * cameraZoom,
      duration: INTRO.zoomDuration,
      ease: 'Sine.easeInOut',
    });
    await this.wait(INTRO.zoomDuration);

    // 6. Scripted walk: player walks 3 tiles south
    const walkDist = INTRO.scriptedWalkTiles * ts;
    const walkDuration = (walkDist / INTRO.scriptedWalkSpeed) * 1000;
    const targetY = this.player.y + walkDist;

    // Play walk animation
    if (this.useCuteFantasy) {
      this.player.play('cf_player_walk_down', true);
    }

    this.tweens.add({
      targets: this.player,
      y: targetY,
      duration: walkDuration,
      ease: 'Linear',
      onUpdate: () => {
        // Keep shadow, glow, label synced
        if (this.playerShadow) this.playerShadow.setPosition(this.player.x, this.player.y + 18);
        if (this.playerGlow) this.playerGlow.setPosition(this.player.x, this.player.y + 18);
        this.nameLabel.setPosition(this.player.x, this.player.y - (this.useCuteFantasy ? 36 : 12));
      },
    });
    await this.wait(walkDuration);

    // 7. Player stops, idle animation
    if (this.useCuteFantasy) {
      this.player.play('cf_player_idle_down', true);
    }
    this.lastDirection = 'down';

    // 8. Set localStorage flag and enable input
    if (typeof window !== 'undefined') {
      localStorage.setItem('midforge_first_visit', 'true');
    }

    // Clean up overlay and text
    overlay.destroy();
    lineTexts.forEach(t => t.destroy());

    this.introActive = false;
    this.inputEnabled = true;

    // Emit world_ready
    this.game.events.emit('world_ready');
  }

  // ═══════════════════════════════════════════════════════════
  //  PHASE 1 — GATEKEEPER NPC
  // ═══════════════════════════════════════════════════════════
  private spawnGatekeeper() {
    // Only spawn if tutorial not yet done
    if (typeof window !== 'undefined' && localStorage.getItem('midforge_tutorial_done')) return;

    const pos = WorldScene.GATEKEEPER_POS;
    const cfKey = 'cf_npc_Farmer_Bob';
    const useCF = this.textures.exists(cfKey);

    if (useCF) {
      this.gatekeeperSprite = this.add.sprite(pos.x, pos.y, cfKey).setScale(2).setDepth(8);
      const idleKey = `${cfKey}_idle_down`;
      if (this.anims.exists(idleKey)) this.gatekeeperSprite.play(idleKey);
      this.gatekeeperShadow = this.add.ellipse(pos.x, pos.y + 12, 20, 5, 0x000000, 0.35).setDepth(7);
    } else {
      // Fallback: Kenney sprite
      this.gatekeeperSprite = this.add.sprite(pos.x, pos.y, TILESHEET_DUNGEON.key, NPC_SPRITE_NAMES.villager).setDepth(8) as any;
    }

    this.gatekeeperLabel = this.add.text(pos.x, pos.y - (useCF ? 24 : 14), 'GATEKEEPER', {
      fontFamily: '"Press Start 2P", monospace', fontSize: '5px',
      color: '#FFB800', stroke: '#000000', strokeThickness: 3, resolution: 4,
    }).setOrigin(0.5).setDepth(PLAYER_LABEL_DEPTH);
  }

  private async triggerGatekeeperDialogue() {
    if (this.gatekeeperTriggered || !this.gatekeeperSprite || !this.player) return;
    this.gatekeeperTriggered = true;
    this.inputEnabled = false;
    this.introActive = true;

    const gk = this.gatekeeperSprite;
    const cfKey = 'cf_npc_Farmer_Bob';
    const useCF = this.textures.exists(cfKey);

    // Gatekeeper walks toward player
    const targetX = this.player.x;
    const targetY = this.player.y - (useCF ? 40 : 20); // stop 1 tile north
    const dist = Phaser.Math.Distance.Between(gk.x, gk.y, targetX, targetY);
    const walkDuration = (dist / 40) * 1000;

    if (useCF) {
      const walkKey = `${cfKey}_walk_down`;
      if (this.anims.exists(walkKey)) gk.play(walkKey);
    }

    this.tweens.add({
      targets: gk,
      x: targetX, y: targetY,
      duration: walkDuration, ease: 'Linear',
      onUpdate: () => {
        if (this.gatekeeperLabel) this.gatekeeperLabel.setPosition(gk.x, gk.y - (useCF ? 24 : 14));
        if (this.gatekeeperShadow) this.gatekeeperShadow.setPosition(gk.x, gk.y + 12);
      },
    });
    await this.wait(walkDuration);

    // Gatekeeper stops, faces player (idle)
    if (useCF) {
      const idleKey = `${cfKey}_idle_down`;
      if (this.anims.exists(idleKey)) gk.play(idleKey);
    }

    // Show Phase 1 styled dialogue box
    const dialogueLines = [
      { speaker: 'GATEKEEPER', text: 'Hold. New face in Midforge.' },
      { speaker: 'GATEKEEPER', text: 'The streets aren\'t safe tonight. A Brigand was spotted near the market.' },
      { speaker: 'GATEKEEPER', text: 'You\'ll need this.' },
      { speaker: 'SYSTEM', text: '\u2694 Starter Sword equipped. (+5 ATK)' },
      { speaker: 'GATEKEEPER', text: 'The Arena is south-east. Prove yourself there.' },
      { speaker: 'GATEKEEPER', text: 'Everyone starts somewhere.' },
    ];

    await this.showStyledDialogue(dialogueLines, gk);

    // Award starter sword (emit to React/inventory)
    this.game.events.emit('equip_starter_sword');

    // Gatekeeper walks back to post
    const returnX = WorldScene.GATEKEEPER_POS.x;
    const returnY = WorldScene.GATEKEEPER_POS.y;
    const returnDist = Phaser.Math.Distance.Between(gk.x, gk.y, returnX, returnY);
    const returnDuration = (returnDist / 40) * 1000;

    if (useCF) {
      const walkUpKey = `${cfKey}_walk_up`;
      if (this.anims.exists(walkUpKey)) gk.play(walkUpKey);
    }

    this.tweens.add({
      targets: gk, x: returnX, y: returnY,
      duration: returnDuration, ease: 'Linear',
      onUpdate: () => {
        if (this.gatekeeperLabel) this.gatekeeperLabel.setPosition(gk.x, gk.y - (useCF ? 24 : 14));
        if (this.gatekeeperShadow) this.gatekeeperShadow.setPosition(gk.x, gk.y + 12);
      },
    });
    await this.wait(returnDuration);

    if (useCF) {
      const idleKey = `${cfKey}_idle_down`;
      if (this.anims.exists(idleKey)) gk.play(idleKey);
    }

    // Set tutorial done flag
    if (typeof window !== 'undefined') {
      localStorage.setItem('midforge_tutorial_done', 'true');
    }

    this.introActive = false;
    this.inputEnabled = true;
  }

  // ═══════════════════════════════════════════════════════════
  //  PHASE 1 — STYLED DIALOGUE BOX
  // ═══════════════════════════════════════════════════════════
  private showStyledDialogue(
    lines: { speaker: string; text: string }[],
    _npcSprite: Phaser.GameObjects.Sprite | null,
  ): Promise<void> {
    return new Promise(resolve => {
      const cam = this.cameras.main;
      const boxH = 80;
      const boxW = cam.width - 16;
      const boxX = 8;
      const boxY = cam.height - boxH - 8;

      // Background
      const bg = this.add.rectangle(boxX + boxW / 2, boxY + boxH / 2, boxW, boxH, 0x0D0D1A, 0.9)
        .setScrollFactor(0).setDepth(600);
      // Gold border
      const borderTop = this.add.rectangle(boxX + boxW / 2, boxY, boxW, 2, 0xFFB800, 1)
        .setScrollFactor(0).setDepth(601);
      const borderBot = this.add.rectangle(boxX + boxW / 2, boxY + boxH, boxW, 2, 0xFFB800, 1)
        .setScrollFactor(0).setDepth(601);
      const borderLeft = this.add.rectangle(boxX, boxY + boxH / 2, 2, boxH, 0xFFB800, 1)
        .setScrollFactor(0).setDepth(601);
      const borderRight = this.add.rectangle(boxX + boxW, boxY + boxH / 2, 2, boxH, 0xFFB800, 1)
        .setScrollFactor(0).setDepth(601);

      // Speaker name
      const speakerText = this.add.text(boxX + 12, boxY + 8, '', {
        fontFamily: '"Press Start 2P", monospace', fontSize: '10px',
        color: '#FFB800', resolution: 4,
      }).setScrollFactor(0).setDepth(602);

      // Dialogue text
      const dialogText = this.add.text(boxX + 12, boxY + 26, '', {
        fontFamily: '"Press Start 2P", monospace', fontSize: '8px',
        color: '#FFFFFF', resolution: 4,
        wordWrap: { width: boxW - 24 },
      }).setScrollFactor(0).setDepth(602);

      // Advance hint
      const advanceHint = this.add.text(boxX + boxW - 12, boxY + boxH - 10, '[ TAP TO CONTINUE ]', {
        fontFamily: '"Press Start 2P", monospace', fontSize: '5px',
        color: '#FFB800', resolution: 4,
      }).setOrigin(1, 1).setScrollFactor(0).setDepth(602).setAlpha(0);

      const allElements = [bg, borderTop, borderBot, borderLeft, borderRight, speakerText, dialogText, advanceHint];

      let lineIndex = 0;
      const showLine = () => {
        if (lineIndex >= lines.length) {
          allElements.forEach(el => el.destroy());
          resolve();
          return;
        }

        const line = lines[lineIndex];
        speakerText.setText(line.speaker);
        speakerText.setColor(line.speaker === 'SYSTEM' ? '#4A90D9' : '#FFB800');

        // Typewriter effect
        let charIndex = 0;
        dialogText.setText('');
        advanceHint.setAlpha(0);

        const typeTimer = this.time.addEvent({
          delay: INTRO.typewriterSpeed,
          repeat: line.text.length - 1,
          callback: () => {
            charIndex++;
            dialogText.setText(line.text.substring(0, charIndex));
            if (charIndex >= line.text.length) {
              advanceHint.setAlpha(0.6);
            }
          },
        });

        const advanceListener = () => {
          if (charIndex < line.text.length) {
            typeTimer.remove();
            dialogText.setText(line.text);
            charIndex = line.text.length;
            advanceHint.setAlpha(0.6);
            return;
          }
          this.input.keyboard!.removeKey('SPACE');
          this.input.off('pointerdown', advanceListener);
          lineIndex++;
          showLine();
        };
        const spaceKey = this.input.keyboard!.addKey('SPACE');
        spaceKey.on('down', advanceListener);
        this.input.on('pointerdown', advanceListener);
      };

      showLine();
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  PHASE 1 — SCRIPTED BRIGAND ENCOUNTER (Step 3)
  // ═══════════════════════════════════════════════════════════
  private static readonly BRIGAND_TUTORIAL_STATS = {
    name: 'Brigand',
    hp: 30, maxHp: 30,
    atk: 3, def: 1,
    xpReward: 25, goldReward: 15,
  };

  private spawnTutorialBrigand() {
    // Only spawn if first fight not yet done
    if (typeof window !== 'undefined' && localStorage.getItem('midforge_first_fight_done')) return;

    const pos = WorldScene.BRIGAND_POS;
    const cfKey = 'cf_npc_Farmer_Buba'; // Use Farmer_Buba as Brigand stand-in (or Goblin if loaded)
    const goblinKey = this.textures.exists('cf_brigand') ? 'cf_brigand' : cfKey;
    const useCF = this.textures.exists(goblinKey);

    if (useCF) {
      this.tutorialBrigandSprite = this.add.sprite(pos.x, pos.y, goblinKey).setScale(2).setDepth(8);
      const idleKey = `${goblinKey}_idle_down`;
      if (this.anims.exists(idleKey)) this.tutorialBrigandSprite.play(idleKey);
    } else {
      this.tutorialBrigandSprite = this.add.sprite(pos.x, pos.y, TILESHEET_DUNGEON.key, NPC_SPRITE_NAMES.villager).setDepth(8) as any;
    }

    // Red tint to distinguish as enemy
    this.tutorialBrigandSprite!.setTint(0xff6666);

    // Name label
    this.add.text(pos.x, pos.y - (useCF ? 24 : 14), 'BRIGAND', {
      fontFamily: '"Press Start 2P", monospace', fontSize: '5px',
      color: '#FF4444', stroke: '#000000', strokeThickness: 3, resolution: 4,
    }).setOrigin(0.5).setDepth(PLAYER_LABEL_DEPTH);
  }

  private async triggerBrigandEncounter() {
    if (this.tutorialBrigandTriggered || !this.tutorialBrigandSprite || !this.player) return;
    this.tutorialBrigandTriggered = true;
    this.inputEnabled = false;

    const brigand = this.tutorialBrigandSprite;

    // Exclamation mark "!" above Brigand
    this.tutorialBrigandExcl = this.add.text(brigand.x, brigand.y - 30, '!', {
      fontFamily: '"Press Start 2P", monospace', fontSize: '16px',
      color: '#FF4444', stroke: '#000000', strokeThickness: 4, resolution: 4,
    }).setOrigin(0.5).setDepth(200);

    this.tweens.add({
      targets: this.tutorialBrigandExcl,
      y: brigand.y - 45, alpha: 0,
      duration: 1000, ease: 'Power2',
    });
    await this.wait(600);

    // Brigand walks toward player
    const targetX = this.player.x;
    const targetY = this.player.y + 20; // stop just south of player
    const dist = Phaser.Math.Distance.Between(brigand.x, brigand.y, targetX, targetY);
    const walkDuration = (dist / 50) * 1000;

    this.tweens.add({
      targets: brigand,
      x: targetX, y: targetY,
      duration: walkDuration, ease: 'Linear',
    });
    await this.wait(walkDuration);

    // Trigger battle via game event
    const stats = WorldScene.BRIGAND_TUTORIAL_STATS;
    this.game.events.emit('start_tutorial_battle', {
      enemy: { ...stats },
      onWin: () => {
        // XP float
        this.showXPFloat(this.player.x, this.player.y, stats.xpReward);
        // Gold float
        this.showGoldFloat(this.player.x, this.player.y, stats.goldReward);
        // Despawn brigand
        brigand.destroy();
        if (this.tutorialBrigandExcl) this.tutorialBrigandExcl.destroy();
        // Set flag
        if (typeof window !== 'undefined') {
          localStorage.setItem('midforge_first_fight_done', 'true');
        }
        this.inputEnabled = true;
      },
      onLose: () => {
        // Respawn at plaza center with 50% HP
        this.player.setPosition(512, 512);
        if (this.playerShadow) this.playerShadow.setPosition(512, 530);
        if (this.playerGlow) this.playerGlow.setPosition(512, 530);
        this.nameLabel.setPosition(512, this.useCuteFantasy ? 476 : 500);
        brigand.destroy();
        if (this.tutorialBrigandExcl) this.tutorialBrigandExcl.destroy();
        this.inputEnabled = true;
      },
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  PHASE 1 — XP FLOAT + GOLD FLOAT (Step 4)
  // ═══════════════════════════════════════════════════════════
  private showXPFloat(x: number, y: number, amount: number) {
    const text = this.add.text(x, y, `+${amount} XP`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px',
      color: '#FFB800',
      stroke: '#000000',
      strokeThickness: 3,
      resolution: 4,
    }).setDepth(100).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: y - 40,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  private showGoldFloat(x: number, y: number, amount: number) {
    const text = this.add.text(x + 20, y, `+${amount}G`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: '#F5D442',
      stroke: '#000000',
      strokeThickness: 3,
      resolution: 4,
    }).setDepth(100).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: y - 35,
      alpha: 0,
      duration: 1500,
      delay: 200,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  PHASE 1 — LEVEL UP VISUAL (Step 4)
  // ═══════════════════════════════════════════════════════════
  public showLevelUp(newLevel: number) {
    const cam = this.cameras.main;

    // 1. White camera flash
    cam.flash(200, 255, 255, 255);

    // 2. "LEVEL UP!" text
    const lvlText = this.add.text(cam.width / 2, cam.height / 2 - 20, 'LEVEL UP!', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '24px',
      color: '#FFB800',
      stroke: '#000000',
      strokeThickness: 5,
      resolution: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(300);

    const lvlNum = this.add.text(cam.width / 2, cam.height / 2 + 12, `Level ${newLevel}`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '14px',
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 3,
      resolution: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(300);

    // 3. Player idle at 2x speed for 1s (celebration)
    if (this.useCuteFantasy && this.player) {
      this.player.anims.timeScale = 2;
      this.time.delayedCall(1000, () => {
        if (this.player) this.player.anims.timeScale = 1;
      });
    }

    // 4. Fade out after 2s
    this.time.delayedCall(2000, () => {
      this.tweens.add({
        targets: [lvlText, lvlNum],
        alpha: 0, duration: 500,
        onComplete: () => { lvlText.destroy(); lvlNum.destroy(); },
      });
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  PHASE 1 — TUTORIAL PROXIMITY CHECKS (called from update)
  // ═══════════════════════════════════════════════════════════
  private checkTutorialTriggers() {
    if (!this.player || this.introActive) return;

    // Gatekeeper proximity check
    if (!this.gatekeeperTriggered && this.gatekeeperSprite) {
      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        this.gatekeeperSprite.x, this.gatekeeperSprite.y
      );
      if (dist < WorldScene.GATEKEEPER_TRIGGER_DIST) {
        this.triggerGatekeeperDialogue();
      }
    }

    // Brigand proximity check (only after tutorial done)
    if (!this.tutorialBrigandTriggered && this.tutorialBrigandSprite) {
      const tutDone = typeof window !== 'undefined' && localStorage.getItem('midforge_tutorial_done');
      if (tutDone) {
        const dist = Phaser.Math.Distance.Between(
          this.player.x, this.player.y,
          this.tutorialBrigandSprite.x, this.tutorialBrigandSprite.y
        );
        if (dist < WorldScene.BRIGAND_TRIGGER_DIST) {
          this.triggerBrigandEncounter();
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  CHARACTER VISUAL SYSTEM — EQUIP + STAT FLASH
  // ═══════════════════════════════════════════════════════════

  public equipItem(itemId: string) {
    const item = GEAR_CATALOG[itemId];
    if (!item) return;

    // Level check
    if (item.levelRequired && this.characterData.level < item.levelRequired) {
      this.showStatFlash(`Requires Lv.${item.levelRequired}`, '#FF4444');
      return;
    }

    const oldAtk = this.characterData.atk;
    const oldDef = this.characterData.def;

    this.characterData = equipGear(this.characterData, item);
    if (this.playerCharacter) {
      this.playerCharacter.setCharacterData(this.characterData);
    }

    // Stat flash
    const atkDelta = this.characterData.atk - oldAtk;
    const defDelta = this.characterData.def - oldDef;
    if (atkDelta > 0) this.showStatFlash(`+${atkDelta} ATK`, '#00FF88');
    if (atkDelta < 0) this.showStatFlash(`${atkDelta} ATK`, '#FF4444');
    if (defDelta > 0) this.showStatFlash(`+${defDelta} DEF`, '#00FF88');
    if (defDelta < 0) this.showStatFlash(`${defDelta} DEF`, '#FF4444');

    SoundManager.play('interact');

    // Emit to React layer for API persistence
    this.game.events.emit('gear_equipped', {
      itemId: item.id,
      slot: item.type,
      characterData: this.characterData,
    });
  }

  public unequipSlot(slot: 'helmet' | 'chest' | 'weapon' | 'shield' | 'boots') {
    const oldAtk = this.characterData.atk;
    const oldDef = this.characterData.def;

    this.characterData = unequipGear(this.characterData, slot);
    if (this.playerCharacter) {
      this.playerCharacter.setCharacterData(this.characterData);
    }

    const atkDelta = this.characterData.atk - oldAtk;
    const defDelta = this.characterData.def - oldDef;
    if (atkDelta !== 0) this.showStatFlash(`${atkDelta > 0 ? '+' : ''}${atkDelta} ATK`, atkDelta > 0 ? '#00FF88' : '#FF4444');
    if (defDelta !== 0) this.showStatFlash(`${defDelta > 0 ? '+' : ''}${defDelta} DEF`, defDelta > 0 ? '#00FF88' : '#FF4444');

    this.game.events.emit('gear_unequipped', {
      slot,
      characterData: this.characterData,
    });
  }

  private showStatFlash(text: string, color: string) {
    if (!this.player) return;
    const px = this.player.x;
    const py = this.player.y - (this.useCuteFantasy ? 50 : 24);
    const flash = this.add.text(px, py, text, {
      fontFamily: '"Press Start 2P"', fontSize: '8px',
      color, stroke: '#000000', strokeThickness: 3, resolution: 4,
    }).setOrigin(0.5).setDepth(200);

    this.tweens.add({
      targets: flash,
      y: py - 30,
      alpha: 0,
      duration: 1200,
      ease: 'Power2',
      onComplete: () => flash.destroy(),
    });
  }

  public getCharacterData(): CharacterData {
    return this.characterData;
  }

  // ═══════════════════════════════════════════════════════════
  //  STEP 7 — OTHER PLAYERS ON MAP (polling)
  // ═══════════════════════════════════════════════════════════
  private static readonly OTHER_TIER_COLORS: Record<string, number> = {
    villager: 0xAAAAAA, apprentice: 0x4A90D9, merchant: 0x7B68EE,
    warrior: 0xFFB800, legend: 0xFF4500,
  };
  private static readonly OTHER_TIER_COLOR_STR: Record<string, string> = {
    villager: '#AAAAAA', apprentice: '#4A90D9', merchant: '#7B68EE',
    warrior: '#FFB800', legend: '#FF4500',
  };

  private savePlayerPosition() {
    if (!this.player) return;
    const now = this.time.now;
    if (now - this.lastPositionSaveTime < WorldScene.POSITION_SAVE_MS) return;
    this.lastPositionSaveTime = now;

    const x = Math.round(this.player.x);
    const y = Math.round(this.player.y);

    fetch('/api/player/nearby', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x, y }),
    }).then(res => res.json()).then(data => {
      if (data.players) this.renderNearbyPlayers(data.players);
    }).catch(() => { /* silent */ });
  }

  private pollNearbyPlayers() {
    const now = this.time.now;
    if (now - this.lastNearbyPollTime < WorldScene.NEARBY_POLL_MS) return;
    this.lastNearbyPollTime = now;

    fetch('/api/player/nearby').then(res => res.json()).then(data => {
      if (data.players) this.renderNearbyPlayers(data.players);
    }).catch(() => { /* silent */ });
  }

  private renderNearbyPlayers(players: { id: string; username: string; tier: string; level: number; positionX: number; positionY: number; equippedGear?: any }[]) {
    const currentIds = new Set(players.map(p => p.id));

    // Remove PlayerCharacter instances for players no longer nearby
    for (const [id, obj] of this.nearbySprites) {
      if (!currentIds.has(id)) {
        obj.pc.destroy();
        obj.clickZone.destroy();
        this.nearbySprites.delete(id);
      }
    }

    for (const p of players) {
      const px = p.positionX ?? 512;
      const py = p.positionY ?? 512;
      const tier = (p.tier ?? 'villager').toUpperCase() as VisualTier;

      const existing = this.nearbySprites.get(p.id);
      if (existing) {
        // Tween container to new position
        this.tweens.add({
          targets: existing.pc.container,
          x: px, y: py, duration: 500, ease: 'Linear',
          onUpdate: () => existing.pc.update(),
        });
        this.tweens.add({ targets: existing.clickZone, x: px, y: py, duration: 500, ease: 'Linear' });
      } else {
        // Build CharacterData for other player
        const otherData: CharacterData = {
          ...DEFAULT_CHARACTER_DATA,
          userId: p.id,
          username: p.username,
          level: p.level ?? 1,
          tier: tier in TIER_CONFIG ? tier : 'VILLAGER',
          equippedGear: p.equippedGear ?? DEFAULT_CHARACTER_DATA.equippedGear,
        };

        // Create PlayerCharacter with isOtherPlayer=true (2x scale, 0.7 alpha, no input)
        const pc = new PlayerCharacter(this, px, py, otherData, {
          isOtherPlayer: true,
          useCuteFantasy: this.useCuteFantasy,
        });

        // Click zone for interaction
        const clickZone = this.add.zone(px, py, 32, 32).setInteractive({ useHandCursor: true });
        clickZone.setDepth(pc.container.depth + 1);
        clickZone.on('pointerdown', () => {
          this.showOtherPlayerPopup(p);
        });

        this.nearbySprites.set(p.id, { pc, clickZone });
      }
    }
  }

  private showOtherPlayerPopup(player: { id: string; username: string; tier: string; level: number }) {
    // Clear any existing popup
    this.closeOtherPlayerPopup();

    const cam = this.cameras.main;
    const popW = 180;
    const popH = 80;
    const popX = cam.width / 2 - popW / 2;
    const popY = cam.height / 2 - popH / 2;
    const R = 4;
    const tier = player.tier ?? 'villager';
    const tierColorStr = WorldScene.OTHER_TIER_COLOR_STR[tier] ?? '#AAAAAA';

    // Background
    const bg = this.add.rectangle(popX + popW / 2, popY + popH / 2, popW, popH, 0x0D0D1A, 0.95)
      .setScrollFactor(0).setDepth(800);
    // Border
    const border = this.add.graphics().setScrollFactor(0).setDepth(801);
    border.lineStyle(2, WorldScene.OTHER_TIER_COLORS[tier] ?? 0xAAAAAA, 1);
    border.strokeRect(popX, popY, popW, popH);

    // Username
    const name = this.add.text(popX + 10, popY + 8, player.username, {
      fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#FFFFFF', resolution: R,
    }).setScrollFactor(0).setDepth(802);

    // Tier + Level
    const tierLabel = this.add.text(popX + 10, popY + 24, `\u2694 ${tier.charAt(0).toUpperCase() + tier.slice(1)} Tier  Lv.${player.level ?? 1}`, {
      fontFamily: '"Press Start 2P"', fontSize: '5px', color: tierColorStr, resolution: R,
    }).setScrollFactor(0).setDepth(802);

    // Challenge button
    const btnX = popX + popW / 2;
    const btnY = popY + popH - 18;
    const btnBg = this.add.rectangle(btnX, btnY, 90, 18, 0x8B0000, 1)
      .setScrollFactor(0).setDepth(803).setInteractive({ useHandCursor: true });
    const btnTxt = this.add.text(btnX, btnY, 'CHALLENGE', {
      fontFamily: '"Press Start 2P"', fontSize: '6px', color: '#FFFFFF', resolution: R,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(804);

    // Close button
    const closeX = popX + popW - 10;
    const closeY = popY + 8;
    const closeBtn = this.add.text(closeX, closeY, 'X', {
      fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#FF4444', resolution: R,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(804).setInteractive({ useHandCursor: true });

    this.nearbyPopup = [bg, border, name, tierLabel, btnBg, btnTxt, closeBtn];

    btnBg.on('pointerdown', () => {
      this.closeOtherPlayerPopup();
      this.game.events.emit('show_player_card', {
        username: player.username,
        tier: player.tier,
        mrr: 0,
        followers: 0,
        level: player.level,
      });
    });

    closeBtn.on('pointerdown', () => {
      this.closeOtherPlayerPopup();
    });

    // Auto-close after 10s
    this.time.delayedCall(10000, () => this.closeOtherPlayerPopup());
  }

  private closeOtherPlayerPopup() {
    for (const el of this.nearbyPopup) {
      el.destroy();
    }
    this.nearbyPopup = [];
  }

  // ═══════════════════════════════════════════════════════════
  //  PHASE 1 — BUILDING DOOR DETECTION (Step 5)
  // ═══════════════════════════════════════════════════════════
  private checkBuildingDoors() {
    if (!this.player || this.introActive) return;

    const now = this.time.now;
    if (now - this.lastDoorTime < 2000) return; // 2s cooldown

    const px = this.player.x;
    const py = this.player.y;

    for (const door of WorldScene.BUILDING_DOORS) {
      const dx = Math.abs(px - door.x);
      const dy = Math.abs(py - door.y);
      if (dx < door.w && dy < door.h) {
        this.lastDoorTime = now;
        this.enterBuilding(door.scene, door.x, door.y);
        return;
      }
    }
  }

  private enterBuilding(sceneKey: string, doorX: number, doorY: number) {
    this.inputEnabled = false;
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.pause('WorldScene');
      this.scene.launch(sceneKey, { returnX: doorX, returnY: doorY + 16 });
      if (this.musicManager) this.musicManager.playZoneMusic('tavern');
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  INTRO SEQUENCE (Phase A — legacy)
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
  //  AUDIO (Phase A — synthesized SFX via SoundManager)
  // ═══════════════════════════════════════════════════════════
  private playFootstep() {
    const tileX = Math.floor(this.player.x / TILE_SIZE);
    const tileY = Math.floor(this.player.y / TILE_SIZE);
    const idx = tileY * this.mapCols + tileX;
    const gid = this.groundData[idx] ?? 1;
    const isGrass = gid >= 1 && gid <= 4;
    SoundManager.play(isGrass ? 'footstep_grass' : 'footstep_stone');
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
    SoundManager.play('interact');
  }

  // ═══════════════════════════════════════════════════════════
  //  UPDATE LOOP
  // ═══════════════════════════════════════════════════════════
  update(_time: number, delta: number) {
    // Phase 1: Check tutorial triggers even when input is enabled
    this.checkTutorialTriggers();
    // Step 5: Check building door proximity
    this.checkBuildingDoors();
    // Step 7: Save position + poll nearby players
    this.savePlayerPosition();
    this.pollNearbyPlayers();

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

    // Sync PlayerCharacter visual layers to physics sprite position
    if (this.playerCharacter) {
      this.playerCharacter.setPosition(this.player.x, this.player.y);
      this.playerCharacter.update();
    }

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
    this.checkWelcomeChest();
    this.checkDailyChest();

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

      if (this.interactPressed) {
        this.interactPressed = false;
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

    // Play coin chime
    SoundManager.play('coin');

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
  //  PHASE B — WELCOME CHEST + QUEST BEACON
  // ═══════════════════════════════════════════════════════════
  private spawnWelcomeChest(spawnPos: { x: number; y: number }) {
    const cx = spawnPos.x + 48;
    const cy = spawnPos.y + 32;

    // Gold chest rectangle (pixel art style)
    const sprite = this.add.rectangle(cx, cy, 16, 14, 0xDAA520, 1)
      .setStrokeStyle(2, 0xB8860B).setDepth(5);

    // Gold glow underneath
    const glow = this.add.circle(cx, cy + 2, 18, 0xFFD700, 0.2).setDepth(4);
    this.tweens.add({
      targets: glow,
      scaleX: 1.5, scaleY: 1.5, alpha: 0.08,
      duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Floating label
    const label = this.add.text(cx, cy - 18, '[E] OPEN', {
      fontFamily: '"Press Start 2P"', fontSize: '6px',
      color: '#FFD700', stroke: '#000000', strokeThickness: 2, resolution: 4,
    }).setOrigin(0.5).setDepth(100);
    this.tweens.add({
      targets: label, y: cy - 22,
      duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    this.welcomeChest = { sprite, glow, label, x: cx, y: cy, opened: false };
  }

  private checkWelcomeChest() {
    if (!this.welcomeChest || this.welcomeChest.opened || !this.player) return;
    const dx = this.player.x - this.welcomeChest.x;
    const dy = this.player.y - this.welcomeChest.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.WELCOME_CHEST_PICKUP_DIST) {
      this.welcomeChest.label.setVisible(true);
      if (this.interactPressed) {
        this.interactPressed = false;
        this.openWelcomeChest();
      }
    } else {
      this.welcomeChest.label.setVisible(dist < 60);
    }
  }

  private openWelcomeChest() {
    if (!this.welcomeChest || this.welcomeChest.opened) return;
    this.welcomeChest.opened = true;

    SoundManager.play('chest_open');

    const { sprite, glow, label, x, y } = this.welcomeChest;

    // Burst animation
    this.tweens.killTweensOf(glow);
    this.tweens.killTweensOf(label);
    this.tweens.add({
      targets: sprite, scaleX: 1.5, scaleY: 0.3, alpha: 0,
      duration: 400, ease: 'Power2',
      onComplete: () => sprite.destroy(),
    });
    this.tweens.add({
      targets: glow, scaleX: 4, scaleY: 4, alpha: 0,
      duration: 500, ease: 'Power2',
      onComplete: () => glow.destroy(),
    });
    label.destroy();

    // Particle burst — 8 gold squares
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const p = this.add.rectangle(x, y, 4, 4, 0xFFD700, 1).setDepth(200);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * 40,
        y: y + Math.sin(angle) * 40 - 20,
        alpha: 0, scaleX: 0.2, scaleY: 0.2,
        duration: 600, ease: 'Power2',
        onComplete: () => p.destroy(),
      });
    }

    // Flash gold
    this.flashScreen(0xFFD700, 300);

    // Floating reward text
    const txt = this.add.text(x, y - 16, '+50 GOLD  ⚔ Starter Sword', {
      fontFamily: '"Press Start 2P"', fontSize: '7px',
      color: '#FFD700', stroke: '#000', strokeThickness: 3, resolution: 4,
    }).setOrigin(0.5).setDepth(200);
    this.tweens.add({
      targets: txt, y: txt.y - 50, alpha: 0,
      duration: 3000, ease: 'Power2',
      onComplete: () => txt.destroy(),
    });

    // Award gold + item via API
    fetch('/api/player/welcome-chest', { method: 'POST' }).catch(() => {});

    // Set quest beacon to arena NPC after 1.5s
    this.time.delayedCall(1500, () => {
      this.setQuestBeacon('Valkyra');
      this.game.events.emit('zone_enter_banner', 'QUEST: Visit the Arena');
      SoundManager.play('quest_accept');
    });
  }

  private setQuestBeacon(npcName: string) {
    // Find NPC sprite by name
    let targetSprite: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite | null = null;
    this.npcSprites.forEach((sprite, id) => {
      if (sprite.getData('name') === npcName) {
        targetSprite = sprite;
        this.questBeaconTarget = id;
      }
    });

    if (!targetSprite) return;

    // Create floating arrow above NPC
    if (this.questBeacon) this.questBeacon.destroy();
    this.questBeacon = this.add.text(
      (targetSprite as any).x, (targetSprite as any).y - 50, '▼', {
      fontFamily: '"Press Start 2P"', fontSize: '12px',
      color: '#FFD700', stroke: '#000', strokeThickness: 3, resolution: 4,
    }).setOrigin(0.5).setDepth(200);

    this.tweens.add({
      targets: this.questBeacon,
      y: (targetSprite as any).y - 58,
      duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  private clearQuestBeacon() {
    if (this.questBeacon) {
      this.tweens.killTweensOf(this.questBeacon);
      this.questBeacon.destroy();
      this.questBeacon = null;
    }
    this.questBeaconTarget = null;
  }

  // ═══════════════════════════════════════════════════════════
  //  PHASE E — DAILY CHEST (physical in-world ceremony)
  // ═══════════════════════════════════════════════════════════
  private dailyChest: {
    sprite: Phaser.GameObjects.Rectangle;
    glow: Phaser.GameObjects.Arc;
    shimmer: Phaser.GameObjects.Arc;
    label: Phaser.GameObjects.Text;
    x: number; y: number;
    claimed: boolean;
  } | null = null;

  public spawnDailyChest(canClaim: boolean, streakDay: number) {
    // Village fountain area (center of plaza)
    const cx = 640;
    const cy = 560;

    if (this.dailyChest) {
      this.dailyChest.sprite.destroy();
      this.dailyChest.glow.destroy();
      this.dailyChest.shimmer.destroy();
      this.dailyChest.label.destroy();
      this.dailyChest = null;
    }

    if (!canClaim) return; // Already claimed today

    const sprite = this.add.rectangle(cx, cy, 18, 15, 0x8B4513, 1)
      .setStrokeStyle(2, 0xFFD700).setDepth(5);

    const glow = this.add.circle(cx, cy + 2, 20, 0xF39C12, 0.2).setDepth(4);
    this.tweens.add({
      targets: glow,
      scaleX: 1.6, scaleY: 1.6, alpha: 0.06,
      duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    const shimmer = this.add.circle(cx, cy - 4, 3, 0xFFD700, 0.8).setDepth(6);
    this.tweens.add({
      targets: shimmer,
      y: cy - 14, alpha: 0, scaleX: 0.3, scaleY: 0.3,
      duration: 1500, yoyo: false, repeat: -1, ease: 'Power1',
    });

    const label = this.add.text(cx, cy - 22, `[E] DAY ${streakDay} CHEST`, {
      fontFamily: '"Press Start 2P"', fontSize: '5px',
      color: '#F39C12', stroke: '#000', strokeThickness: 2, resolution: 4,
    }).setOrigin(0.5).setDepth(100);
    this.tweens.add({
      targets: label, y: cy - 26,
      duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    this.dailyChest = { sprite, glow, shimmer, label, x: cx, y: cy, claimed: false };
  }

  private checkDailyChest() {
    if (!this.dailyChest || this.dailyChest.claimed || !this.player) return;
    const dx = this.player.x - this.dailyChest.x;
    const dy = this.player.y - this.dailyChest.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 30 && this.interactPressed) {
      this.interactPressed = false;
      this.openDailyChest();
    }
  }

  private async openDailyChest() {
    if (!this.dailyChest || this.dailyChest.claimed) return;
    this.dailyChest.claimed = true;

    SoundManager.play('chest_open');

    const { sprite, glow, shimmer, label, x, y } = this.dailyChest;

    // Burst
    this.tweens.killTweensOf(glow);
    this.tweens.killTweensOf(shimmer);
    this.tweens.killTweensOf(label);
    this.tweens.add({ targets: sprite, scaleX: 1.5, scaleY: 0.3, alpha: 0, duration: 400 });
    this.tweens.add({ targets: [glow, shimmer], alpha: 0, duration: 300 });
    label.destroy();

    // Particles
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const p = this.add.rectangle(x, y, 3, 3, 0xF39C12, 1).setDepth(200);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * 50,
        y: y + Math.sin(angle) * 50 - 25,
        alpha: 0, duration: 700, ease: 'Power2',
        onComplete: () => p.destroy(),
      });
    }

    this.flashScreen(0xF39C12, 300);

    // Claim via API
    try {
      const res = await fetch('/api/player/daily-login', { method: 'POST' });
      const data = await res.json();
      const reward = data.reward ?? { gold: 50, xp: 25 };
      const streak = data.streak ?? 1;

      SoundManager.play('coin');

      const txt = this.add.text(x, y - 16,
        `DAY ${streak}! +${reward.gold}G +${reward.xp}XP`, {
        fontFamily: '"Press Start 2P"', fontSize: '7px',
        color: '#F39C12', stroke: '#000', strokeThickness: 3, resolution: 4,
      }).setOrigin(0.5).setDepth(200);
      this.tweens.add({
        targets: txt, y: txt.y - 50, alpha: 0,
        duration: 3000, ease: 'Power2',
        onComplete: () => txt.destroy(),
      });
    } catch {
      // Silent fail
    }
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
    this.ambientSoundTimer?.remove();
    this.clearQuestBeacon();
    if (this.welcomeChest) {
      this.welcomeChest.sprite?.destroy();
      this.welcomeChest.glow?.destroy();
      this.welcomeChest.label?.destroy();
    }
    if (this.dailyChest) {
      this.dailyChest.sprite?.destroy();
      this.dailyChest.glow?.destroy();
      this.dailyChest.shimmer?.destroy();
      this.dailyChest.label?.destroy();
    }
  }
}
