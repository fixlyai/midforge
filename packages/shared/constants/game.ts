// ─────────────────────────────────────────────────────────────
//  MIDFORGE — Central Game Constants
//  Every tile reference, NPC position, zone boundary, and
//  character mapping lives here. No magic numbers in scenes.
// ─────────────────────────────────────────────────────────────

// ── Map File ────────────────────────────────────────────────
export const MAP_FILE = '/maps/starter_village_v2.tmj';

// ── Tile Dimensions (defaults — overridden by map properties) ─
export const TILE_SIZE = 16;
export const MAP_COLS = 80;
export const MAP_ROWS = 70;
export const MAP_WIDTH = MAP_COLS * TILE_SIZE;
export const MAP_HEIGHT = MAP_ROWS * TILE_SIZE;

// ── Camera ───────────────────────────────────────────────────
export const CAMERA_ZOOM = 3;
export const CAMERA_LERP = 0.1;

// ── Player ───────────────────────────────────────────────────
export const PLAYER_SPEED = 80;
export const PLAYER_HITBOX = { width: 10, height: 10, offsetX: 3, offsetY: 6 };
export const PLAYER_DEPTH = 10;
export const PLAYER_LABEL_DEPTH = 11;
export const NPC_INTERACT_DISTANCE = 80;
export const FOOTSTEP_TILE_INTERVAL = 4;

// ── Tilesheets ───────────────────────────────────────────────
// Kenney Tiny Town — 16×16 tiles, 12 cols, 11 rows, 1px spacing
export const TILESHEET_TOWN = {
  key: 'tiles_town',
  path: '/tilesets/tiny-town/Tilemap/tilemap_packed.png',
  frameWidth: 16,
  frameHeight: 16,
  spacing: 0,
  margin: 0,
  columns: 12,
  rows: 11,
} as const;

// Kenney Tiny Battle — 16×16 tiles, 18 cols, 11 rows, 1px spacing
export const TILESHEET_BATTLE = {
  key: 'tiles_battle',
  path: '/tilesets/tiny-battle/Tilemap/tilemap_packed.png',
  frameWidth: 16,
  frameHeight: 16,
  spacing: 0,
  margin: 0,
  columns: 18,
  rows: 11,
} as const;

// Kenney Tiny Dungeon — 16×16 tiles, 12 cols, 11 rows, 1px spacing
export const TILESHEET_DUNGEON = {
  key: 'tiles_dungeon',
  path: '/tilesets/tiny-dungeon/Tilemap/tilemap_packed.png',
  frameWidth: 16,
  frameHeight: 16,
  spacing: 0,
  margin: 0,
  columns: 12,
  rows: 11,
} as const;

// ── Audio ────────────────────────────────────────────────────
export const AUDIO = {
  footstepGrass: [
    '/audio/rpg/Audio/footstep00.ogg',
    '/audio/rpg/Audio/footstep01.ogg',
    '/audio/rpg/Audio/footstep02.ogg',
  ],
  footstepStone: [
    '/audio/rpg/Audio/footstep03.ogg',
    '/audio/rpg/Audio/footstep04.ogg',
    '/audio/rpg/Audio/footstep05.ogg',
  ],
  interact: '/audio/rpg/Audio/doorOpen_1.ogg',
  doorOpen: '/audio/rpg/Audio/doorOpen_2.ogg',
  doorClose: '/audio/rpg/Audio/doorClose_1.ogg',
  coins: '/audio/rpg/Audio/handleCoins.ogg',
  knifeSlice: '/audio/rpg/Audio/knifeSlice.ogg',
  metalClick: '/audio/rpg/Audio/metalClick.ogg',
  chop: '/audio/rpg/Audio/chop.ogg',
  bookOpen: '/audio/rpg/Audio/bookOpen.ogg',
} as const;

// ── Town Tile Indices (Tiny Town tilemap_packed.png) ─────────
// Row 0 (y=0): grass variants, trees
// Row 1-2: more trees, nature
// Row 3-5: paths, cobblestone, buildings walls
// Row 6-7: buildings, roofs, doors, windows
// Row 8-9: castle/stone walls, arches
// Row 10: fences, tools, items
export const TOWN_TILES = {
  // Ground (row 0)
  grassLight: 0,           // bright green grass
  grassDark: 1,            // slightly darker grass
  grassFlowers: 2,         // grass with small detail
  dirtLight: 24,           // dirt/sand
  dirtDark: 25,            // darker dirt

  // Paths — cobblestone (rows 4-5)
  pathH: 48,               // cobblestone path tile
  pathV: 49,               // cobblestone path variant
  pathCenter: 50,          // cobblestone center/crossroad
  pathTL: 36,              // path corner top-left
  pathTR: 37,              // path corner top-right
  pathBL: 48,              // path corner bottom-left
  pathBR: 49,              // path corner bottom-right

  // Trees (row 0 tops, row 1 bottoms)
  treePineTop: 3,          // pine tree top (orange/autumn)
  treePineBottom: 15,      // pine tree trunk
  treeRoundTop: 4,         // round green tree top
  treeRoundBottom: 16,     // round tree trunk
  treeAutumnTop: 5,        // autumn tree top
  treeAutumnBottom: 17,    // autumn tree trunk
  bush: 6,                 // bush/shrub
  stump: 18,               // tree stump
  mushroom: 7,             // small mushroom

  // Buildings — wooden house (rows 6-7)
  woodWallTL: 72,          // wood wall tile
  woodWallTR: 73,          // wood wall variant
  woodWallBL: 84,          // wood wall bottom
  woodWallBR: 85,          // wood wall bottom variant
  woodDoor: 86,            // wooden door
  woodWindow: 74,          // window
  roofRedTL: 51,           // red roof top-left
  roofRedTR: 52,           // red roof top-right
  roofRedBL: 63,           // red roof bottom-left
  roofRedBR: 64,           // red roof bottom-right
  roofBlueTL: 53,          // blue roof top-left
  roofBlueTR: 54,          // blue roof top-right
  roofBlueBL: 65,          // blue roof bottom-left
  roofBlueBR: 66,          // blue roof bottom-right

  // Castle/stone (rows 8-10)
  stoneWallTop: 96,        // castle stone wall top
  stoneWallMid: 108,       // castle stone wall middle
  stoneWallBot: 120,       // castle stone wall bottom
  castleGateL: 104,        // gate left pillar
  castleGateR: 105,        // gate right pillar
  castleArch: 106,         // gate arch
  towerTop: 97,            // tower top
  towerMid: 109,           // tower middle
  towerBot: 121,           // tower bottom

  // Decoration (row 7 items)
  fenceH: 122,             // horizontal fence
  fenceV: 123,             // vertical fence
  fencePost: 110,          // fence post
  well: 90,                // well
  signPost: 91,            // sign post
  barrel: 92,              // barrel
  crate: 93,               // crate
  torch: 94,               // wall torch

} as const;

// ── Battle Tile Indices (Tiny Battle tilemap_packed.png) ─────
// Water tiles from Tiny Battle (18 columns per row)
export const BATTLE_TILES = {
  waterFull: 19,           // blue water tile
  waterEdgeTL: 18,         // water edge top-left
  waterEdgeTR: 20,         // water edge top-right
  waterEdgeBL: 36,         // water edge bottom-left
  waterEdgeBR: 38,         // water edge bottom-right
  waterEdgeT: 1,           // water edge top
  waterEdgeB: 37,          // water edge bottom
} as const;

// ── Animated Tile Definitions ─────────────────────────────────
// Kenney tiles are static — we simulate animation by cycling frames
export const ANIMATED_TILES = {
  campfire: {
    sheet: 'tiles_dungeon',
    frames: [68, 69, 73],            // torch, flame, brazier
    frameRate: 4,                     // frames per second
    glowColor: 0xF39C12,
    glowRadius: 32,
    glowAlpha: 0.15,
  },
  water: {
    sheet: 'tiles_battle',
    frames: [36, 37, 38, 19],        // wave variants + full water
    frameRate: 2,                     // slower ripple
    staggerMs: 200,                   // stagger between adjacent tiles
  },
} as const;

// ── Wandering NPC Config ──────────────────────────────────────
export const WANDERING_NPC = {
  speed: 20,                           // pixels per second
  pauseMin: 2000,                      // ms minimum idle pause
  pauseMax: 5000,                      // ms maximum idle pause
  walkMin: 1000,                       // ms minimum walk duration
  walkMax: 3000,                       // ms maximum walk duration
  maxRadius: 48,                       // max wander radius from spawn (px)
} as const;

// ── Dungeon Tile Indices (Tiny Dungeon tilemap_packed.png) ───
// Row 0-3: dungeon floor/wall tiles
// Row 4-5: furniture, chests, items
// Row 6-7: characters (the ones we need for player sprites)
// Row 8-9: more characters, faces
// Row 10: weapons, items, small sprites
export const DUNGEON_TILES = {
  // Characters — row 7 (indices 84-95)
  // Verified visually against tile_XXXX.png files
  charMage: 84,            // purple mage/wizard (Merchant)
  charPeasant: 85,         // brown peasant (Villager)
  charDwarf: 86,           // armored dwarf (Blacksmith NPC)
  charKnight: 87,          // knight with shield (Arena Master NPC)
  charMonk: 88,            // simple brown character (Marketplace NPC)
  charChest: 89,           // chest (not character)
  charBarrel: 90,          // barrel (not character)
  charCrate: 91,           // crate (not character)

  // Characters — row 8 (indices 96-107)
  charHooded: 96,          // dark hooded figure (Forge Master NPC)
  charDarkKnight: 97,      // dark armored knight
  charPeasant2: 98,        // peasant variant
  charElf: 99,             // purple-haired elf/mage
  charKnightBlue: 100,     // blue armored knight (Apprentice)

  // Characters — row 9 (indices 108-119)
  charSlime: 108,          // green slime/creature
  charKing: 109,           // golden/brown noble (Legend)
  charWarrior: 110,        // red demon/warrior (Warrior)
  charWarrior2: 111,       // red armored character
  charWizard: 112,         // brown character (Quest Giver NPC)

  // Items — row 10 (indices 120-131)
  swordWood: 120,
  swordIron: 121,
  swordGold: 122,
  shieldWood: 123,
  shieldIron: 124,
  shieldGold: 125,
  potionRed: 126,
  potionBlue: 127,
  chest: 128,
  key: 129,

  // Dungeon environment tiles (rows 0-6)
  floorDark: 0,
  floorLight: 1,
  wallTop: 24,
  wallMid: 36,
  wallBot: 48,
  door: 40,
  doorOpen: 41,
  stairs: 42,
} as const;

// ── Tileset firstgid values (must match .tmj tilesets) ──────
export const FIRSTGID_TOWN = 1;
export const FIRSTGID_DUNGEON = 300;

// ── Tier → Character Sprite Mapping ─────────────────────────
export const TIER_SPRITE_MAP: Record<string, number> = {
  villager: DUNGEON_TILES.charPeasant,     // 85 — brown peasant
  apprentice: DUNGEON_TILES.charKnightBlue, // 100 — blue knight
  merchant: DUNGEON_TILES.charMage,         // 84 — purple mage
  warrior: DUNGEON_TILES.charWarrior,       // 110 — red warrior
  legend: DUNGEON_TILES.charKing,           // 109 — golden king
};

// ── NPC sprite name → dungeon tile index (.tmj uses string names) ─
export const NPC_SPRITE_NAMES: Record<string, number> = {
  elder: DUNGEON_TILES.charWizard,         // 112 — quest giver / forge master
  guard: DUNGEON_TILES.charKnight,         // 87  — knight with shield
  warrior: DUNGEON_TILES.charWarrior,      // 110 — red warrior
  merchant: DUNGEON_TILES.charMonk,        // 88  — marketplace NPC
  villager: DUNGEON_TILES.charPeasant,     // 85  — brown peasant
};

// ── NPC type → game event mapping (.tmj npcType → event name) ─
export const NPC_TYPE_EVENT: Record<string, string> = {
  intro: 'npc_intro',
  gate_guard: 'npc_gate_guard',
  quest_giver: 'npc_quests',
  blacksmith: 'npc_inventory',
  marketplace: 'npc_marketplace',
  arena_manager: 'npc_arena',
  tavern: 'npc_tavern',
  ambient: 'npc_ambient',
  future_npc: 'npc_future',
};

export const TIER_COLORS: Record<string, string> = {
  villager: '#8B7355',
  apprentice: '#4A90D9',
  merchant: '#7B68EE',
  warrior: '#E74C3C',
  legend: '#F39C12',
};

export const TIER_COLORS_HEX: Record<string, number> = {
  villager: 0x8B7355,
  apprentice: 0x4A90D9,
  merchant: 0x7B68EE,
  warrior: 0xE74C3C,
  legend: 0xF39C12,
};

// ── NPC Definitions ─────────────────────────────────────────
export interface NpcDefinition {
  id: string;
  name: string;
  role: string;
  spriteIndex: number;
  tileX: number;
  tileY: number;
  dialogLines: string[];
  interactionEvent: string;
}

export const NPCS: NpcDefinition[] = [
  {
    id: 'forge_master',
    name: 'Forge Master',
    role: 'Guide',
    spriteIndex: DUNGEON_TILES.charHooded,
    tileX: 29,
    tileY: 20,
    dialogLines: [
      'Welcome to Midforge, builder.',
      'Your power here reflects what you build in the real world.',
      'Connect your craft. Begin your legend.',
    ],
    interactionEvent: 'npc_intro',
  },
  {
    id: 'quest_giver',
    name: 'Elder Forge',
    role: 'Quest Giver',
    spriteIndex: DUNGEON_TILES.charWizard,
    tileX: 22,
    tileY: 16,
    dialogLines: [
      'Welcome, creator.',
      'I have tasks for those who seek glory.',
      'Prove your worth with real results.',
    ],
    interactionEvent: 'npc_quests',
  },
  {
    id: 'blacksmith',
    name: 'Ironhide',
    role: 'Blacksmith',
    spriteIndex: DUNGEON_TILES.charDwarf,
    tileX: 15,
    tileY: 12,
    dialogLines: [
      'Need better gear?',
      'Your MRR forges weapons.',
      'Your followers forge armor.',
    ],
    interactionEvent: 'npc_inventory',
  },
  {
    id: 'arena_master',
    name: 'Valkyra',
    role: 'Arena Master',
    spriteIndex: DUNGEON_TILES.charKnight,
    tileX: 45,
    tileY: 20,
    dialogLines: [
      'The Arena awaits, warrior.',
      'Fight for XP and glory.',
      'Only the strong survive.',
    ],
    interactionEvent: 'npc_arena',
  },
  {
    id: 'merchant_npc',
    name: 'Goldbag',
    role: 'Marketplace',
    spriteIndex: DUNGEON_TILES.charMonk,
    tileX: 35,
    tileY: 12,
    dialogLines: [
      'Buy and sell, friend!',
      'Courses, blueprints, agents...',
      'Everything has a price.',
    ],
    interactionEvent: 'npc_marketplace',
  },
];

// ── Zone Boundaries ─────────────────────────────────────────
export const ZONES = {
  spawn: { x: 30, y: 35 },        // player spawn (outside gate)
  gatePosition: { x: 30, y: 32 }, // gate entrance to village
  villageCenter: { x: 30, y: 20 },
  questGiver: { x: 22, y: 16 },
  blacksmith: { x: 15, y: 12 },
  arenaEntrance: { x: 45, y: 20 },
  marketplace: { x: 35, y: 12 },
  castleGate: { x: 30, y: 5 },    // far north — Legend gate
} as const;

// ── Map Tile Types (for programmatic map generation) ────────
export const TERRAIN: Record<string, number> = {
  GRASS: 0,
  PATH: 1,
  STONE_WALL: 2,
  WATER: 3,
  WOOD_WALL: 4,
  DOOR: 5,
  TREE: 6,
  FENCE: 7,
  DECORATION: 8,
};

// ── Intro Sequence ──────────────────────────────────────────
export const INTRO = {
  typewriterSpeed: 40,          // ms per character
  forgeMasterWalkSpeed: 30,     // pixels per second
  gateOpenDuration: 1000,       // ms
  zoomStart: 1.0,
  zoomEnd: 1.4,
  zoomDuration: 3000,           // ms
  glowPathFadeDuration: 5000,   // ms after player reaches NPC
  dialogLines: [
    'Welcome to Midforge, @{username}.',
    'Your power here reflects what you build in the real world.',
    'Connect your craft. Begin your legend.',
  ],
} as const;

// ── Text Styles ─────────────────────────────────────────────
export const TEXT_STYLES = {
  npcName: {
    fontSize: '7px',
    fontFamily: '"Press Start 2P", monospace',
    color: '#F39C12',
    stroke: '#000000',
    strokeThickness: 4,
    align: 'center' as const,
    resolution: 4,
    padding: { x: 2, y: 2 },
  },
  playerName: {
    fontSize: '7px',
    fontFamily: '"Press Start 2P", monospace',
    stroke: '#000000',
    strokeThickness: 4,
    resolution: 4,
    padding: { x: 2, y: 2 },
  },
  zoneName: {
    fontSize: '7px',
    fontFamily: '"Press Start 2P", monospace',
    color: '#F39C12',
    stroke: '#000000',
    strokeThickness: 3,
    resolution: 4,
  },
  dialogue: {
    fontSize: '8px',
    fontFamily: '"Press Start 2P", monospace',
    color: '#ffffff',
    stroke: '#000000',
    strokeThickness: 2,
    wordWrap: { width: 280 },
    lineSpacing: 6,
    resolution: 4,
  },
  interactPrompt: {
    fontSize: '7px',
    fontFamily: '"Press Start 2P", monospace',
    color: '#000000',
    backgroundColor: '#F39C12',
    padding: { x: 6, y: 4 },
    resolution: 4,
  },
  floatingText: {
    fontSize: '9px',
    fontFamily: '"Press Start 2P", monospace',
    color: '#F39C12',
    stroke: '#000000',
    strokeThickness: 3,
    resolution: 4,
  },
  hud: {
    fontSize: '7px',
    fontFamily: '"Press Start 2P", monospace',
    color: '#ffffff',
    resolution: 4,
  },
} as const;

// ── 64×64 LPC Character Sprite System ──────────────────────────
// Sprite sheets: 576×256px, 64×64 frames, 9 cols × 4 rows
// Row 0: Walk UP    (frames 0-8)
// Row 1: Walk LEFT  (frames 9-17)
// Row 2: Walk DOWN  (frames 18-26)
// Row 3: Walk RIGHT (frames 27-35)
// Extracted from Universal LPC Spritesheet (CC-BY-SA 3.0)

export const CHARACTER_SPRITE = {
  frameWidth: 64,
  frameHeight: 64,
  framesPerRow: 9,   // LPC standard: 9 frames per walk direction
  frameRate: 10,     // 10fps × 9 frames = 0.9s walk cycle
} as const;

export const CHARACTER_TIERS = ['villager', 'apprentice', 'merchant', 'warrior', 'legend'] as const;
export const CHARACTER_FORMS = ['base', 'upgraded', 'ascended'] as const;

export const CHARACTER_NPC_KEYS = [
  'npc_elder', 'npc_guard', 'npc_merchant', 'npc_villager',
] as const;

// XP thresholds for form upgrades per tier
export const FORM_UNLOCK_XP: Record<string, { upgraded: number; ascended: number }> = {
  villager:   { upgraded: 500,       ascended: 2_000 },
  apprentice: { upgraded: 3_000,     ascended: 8_000 },
  merchant:   { upgraded: 15_000,    ascended: 40_000 },
  warrior:    { upgraded: 60_000,    ascended: 150_000 },
  legend:     { upgraded: 500_000,   ascended: 2_000_000 },
};

// XP sources — how much XP each action awards
export const XP_SOURCES = {
  daily_login:     25,
  arena_win:       { min: 200, max: 500 },
  arena_loss:      50,
  npc_fight_win:   30,
  quest_complete:  { min: 100, max: 1500 },
  invite_accepted: 300,
} as const;

// Resolve which sprite sheet key to use based on tier + XP
export function getCharacterSpriteKey(tier: string, xp: number): string {
  const thresholds = FORM_UNLOCK_XP[tier];
  if (!thresholds) return `${tier}_base`;
  if (xp >= thresholds.ascended) return `${tier}_ascended`;
  if (xp >= thresholds.upgraded) return `${tier}_upgraded`;
  return `${tier}_base`;
}

// Map tier string → sprite key prefix (for legacy fallback to Kenney sprites)
export function tierToSpriteKey(tier: string): string {
  const map: Record<string, string> = {
    villager: 'villager', apprentice: 'apprentice',
    merchant: 'merchant', warrior: 'warrior', legend: 'legend',
  };
  return map[tier] ?? 'villager';
}

// Tier colors for evolution particle bursts
export const TIER_PARTICLE_COLORS: Record<string, number> = {
  villager:   0x8B7355,
  apprentice: 0x4A90D9,
  merchant:   0x7B68EE,
  warrior:    0xE74C3C,
  legend:     0xF39C12,
};
