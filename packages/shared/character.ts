// ─────────────────────────────────────────────────────────────
//  MIDFORGE — Character Visual System Types + Gear Catalog
//  Single source of truth for player appearance, gear, and tiers.
// ─────────────────────────────────────────────────────────────

// ── Gear Types ────────────────────────────────────────────────

export type GearSlot = 'helmet' | 'chest' | 'weapon' | 'shield' | 'boots';
export type GearTier = 1 | 2 | 3 | 4 | 5;

export interface GearItem {
  id:            string;
  name:          string;
  type:          GearSlot;
  tier:          GearTier;
  spriteKey:     string;      // Phaser texture key (overlay or icon fallback)
  atk?:          number;
  def?:          number;
  price?:        number;      // gold cost (0 = free/given, undefined = earned only)
  levelRequired?: number;
  earnedBy?:     string;      // requirement text for non-purchasable items
  visualTint?:   number;      // color tint for the gear overlay
  speedBonus?:   number;      // movement speed multiplier bonus (e.g. 0.1 = +10%)
}

export interface EquippedGear {
  helmet: GearItem | null;
  chest:  GearItem | null;
  weapon: GearItem | null;
  shield: GearItem | null;
  boots:  GearItem | null;
}

// ── Visual Player Data ────────────────────────────────────────

export type VisualTier = 'VILLAGER' | 'MERCHANT' | 'WARRIOR' | 'CHAMPION' | 'LEGEND';

export interface CharacterData {
  // Identity
  userId:          string;
  username:        string;
  avatarUrl:       string;

  // Game progression
  level:           number;
  xp:              number;
  xpToNextLevel:   number;
  hp:              number;
  maxHp:           number;
  gold:            number;
  atk:             number;
  def:             number;

  // Tier system (Phase 4 populates from real Stripe/X data)
  tier:            VisualTier;
  xFollowers:      number;
  stripeVerified:  boolean;
  monthlyRevenue:  'none' | 'sub1k' | '1k-5k' | '5k-10k' | '10k+';

  // Gear
  equippedGear:    EquippedGear;
  inventory:       GearItem[];

  // Flags
  loginStreak:     number;
  arenaRank:       number | null;
}

// ── Default Character Data ────────────────────────────────────

export const DEFAULT_CHARACTER_DATA: CharacterData = {
  userId:         '',
  username:       'Traveler',
  avatarUrl:      '',
  level:          1,
  xp:             0,
  xpToNextLevel:  100,
  hp:             60,
  maxHp:          60,
  gold:           0,
  atk:            5,
  def:            2,
  tier:           'VILLAGER',
  xFollowers:     0,
  stripeVerified: false,
  monthlyRevenue: 'none',
  equippedGear: {
    helmet: null,
    chest:  null,
    weapon: {
      id:        'starter_sword',
      name:      'Starter Sword',
      type:      'weapon',
      tier:      1,
      spriteKey: 'gear_starter_sword',
      atk:       5,
      price:     0,
    },
    shield: null,
    boots:  null,
  },
  inventory:    [],
  loginStreak:  0,
  arenaRank:    null,
};

// ── Tier Visual Configuration ─────────────────────────────────

export interface ParticleConfig {
  key:        string;
  frequency:  number;
  quantity:   number;
  speed:      { min: number; max: number };
  scale:      { start: number; end: number };
  tint:       number;
  lifespan:   number;
}

export interface TierVisualConfig {
  label:         string;
  outfitTint:    number | null;
  usernameColor: string;
  aura:          string | null;     // 'aura_purple' | 'aura_gold' | 'aura_flame' | null
  badgeKey:      string | null;
  particles:     ParticleConfig | null;
  xpMultiplier:  number;
}

export const TIER_CONFIG: Record<VisualTier, TierVisualConfig> = {
  VILLAGER: {
    label:         'Villager',
    outfitTint:    null,
    usernameColor: '#CCCCCC',
    aura:          null,
    badgeKey:      null,
    particles:     null,
    xpMultiplier:  1.0,
  },
  MERCHANT: {
    label:         'Merchant',
    outfitTint:    0x4A90D9,
    usernameColor: '#4A90D9',
    aura:          null,
    badgeKey:      'badge_merchant',
    particles:     null,
    xpMultiplier:  1.1,
  },
  WARRIOR: {
    label:         'Warrior',
    outfitTint:    0x7B68EE,
    usernameColor: '#9B88FF',
    aura:          'aura_purple',
    badgeKey:      'badge_warrior',
    particles:     null,
    xpMultiplier:  1.25,
  },
  CHAMPION: {
    label:         'Champion',
    outfitTint:    0xFFB800,
    usernameColor: '#FFB800',
    aura:          'aura_gold',
    badgeKey:      'badge_champion',
    particles:     {
      key:        'gold_sparks',
      frequency:  100,
      quantity:   2,
      speed:      { min: 10, max: 30 },
      scale:      { start: 0.5, end: 0 },
      tint:       0xFFB800,
      lifespan:   400,
    },
    xpMultiplier:  1.5,
  },
  LEGEND: {
    label:         'Legend',
    outfitTint:    0xFF4500,
    usernameColor: '#FF4500',
    aura:          'aura_flame',
    badgeKey:      'badge_legend',
    particles:     {
      key:        'flame_particles',
      frequency:  50,
      quantity:   3,
      speed:      { min: 20, max: 50 },
      scale:      { start: 0.8, end: 0 },
      tint:       0xFF4500,
      lifespan:   600,
    },
    xpMultiplier:  2.0,
  },
};

// ── Gear Slot Visual Offsets (relative to sprite center at 2x scale) ──

export const GEAR_OFFSETS: Record<GearSlot, { x: number; y: number }> = {
  weapon:  { x: 12,  y: 4   },
  shield:  { x: -12, y: 4   },
  helmet:  { x: 0,   y: -16 },
  chest:   { x: 0,   y: 0   },
  boots:   { x: 0,   y: 14  },
};

// ── Gear Tier Border Colors (for inventory UI) ────────────────

export const GEAR_TIER_COLORS: Record<GearTier, number> = {
  1: 0x888888,   // gray — common
  2: 0x4A90D9,   // blue — uncommon
  3: 0x7B68EE,   // purple — rare
  4: 0xFFB800,   // gold — epic
  5: 0xFF4500,   // red-orange — legendary
};

export const GEAR_TIER_COLOR_STR: Record<GearTier, string> = {
  1: '#888888',
  2: '#4A90D9',
  3: '#7B68EE',
  4: '#FFB800',
  5: '#FF4500',
};

// ── Follower Badge Thresholds ─────────────────────────────────

export function getFollowerBadgeColor(followers: number): number | null {
  if (followers >= 100000) return 0xFFD700;  // gold star — 100k+
  if (followers >= 50000)  return 0xFFB800;  // gold — 50k+
  if (followers >= 10000)  return 0x7B68EE;  // purple — 10k+
  if (followers >= 1000)   return 0x4A90D9;  // blue — 1k+
  return null;
}

// ── Aura Colors ───────────────────────────────────────────────

export const AURA_COLORS: Record<string, number> = {
  aura_purple: 0x7B68EE,
  aura_gold:   0xFFB800,
  aura_flame:  0xFF4500,
};

// ── Full Gear Catalog ─────────────────────────────────────────

export const GEAR_CATALOG: Record<string, GearItem> = {
  // ── WEAPONS ──
  starter_sword: {
    id: 'starter_sword', name: 'Starter Sword',
    type: 'weapon', tier: 1, spriteKey: 'gear_starter_sword',
    atk: 5, price: 0,
  },
  iron_sword: {
    id: 'iron_sword', name: 'Iron Sword',
    type: 'weapon', tier: 2, spriteKey: 'gear_iron_sword',
    atk: 10, price: 50, visualTint: 0xAAAAAA,
  },
  steel_sword: {
    id: 'steel_sword', name: 'Steel Sword',
    type: 'weapon', tier: 3, spriteKey: 'gear_steel_sword',
    atk: 20, price: 150, levelRequired: 5, visualTint: 0x6699CC,
  },
  enchanted_blade: {
    id: 'enchanted_blade', name: 'Enchanted Blade',
    type: 'weapon', tier: 4, spriteKey: 'gear_enchanted_blade',
    atk: 35, price: 400, levelRequired: 10, visualTint: 0xAA44FF,
  },
  arena_champion_sword: {
    id: 'arena_champion_sword', name: "Champion's Blade",
    type: 'weapon', tier: 5, spriteKey: 'gear_champion_sword',
    atk: 60, earnedBy: 'Win 10 Arena fights', levelRequired: 15, visualTint: 0xFFB800,
  },

  // ── HELMETS ──
  leather_helmet: {
    id: 'leather_helmet', name: 'Leather Helmet',
    type: 'helmet', tier: 1, spriteKey: 'gear_leather_helmet',
    def: 3, price: 40, visualTint: 0x8B4513,
  },
  iron_helmet: {
    id: 'iron_helmet', name: 'Iron Helmet',
    type: 'helmet', tier: 2, spriteKey: 'gear_iron_helmet',
    def: 7, price: 120, levelRequired: 4, visualTint: 0xAAAAAA,
  },
  warrior_helm: {
    id: 'warrior_helm', name: 'Warrior Helm',
    type: 'helmet', tier: 3, spriteKey: 'gear_warrior_helm',
    def: 15, price: 300, levelRequired: 8, visualTint: 0x7B68EE,
  },

  // ── CHEST ARMOR ──
  leather_chest: {
    id: 'leather_chest', name: 'Leather Armor',
    type: 'chest', tier: 1, spriteKey: 'gear_leather_chest',
    def: 5, price: 60, visualTint: 0x8B4513,
  },
  chainmail_chest: {
    id: 'chainmail_chest', name: 'Chainmail',
    type: 'chest', tier: 2, spriteKey: 'gear_chainmail',
    def: 12, price: 180, levelRequired: 5, visualTint: 0x888888,
  },
  plate_armor: {
    id: 'plate_armor', name: 'Plate Armor',
    type: 'chest', tier: 3, spriteKey: 'gear_plate_armor',
    def: 25, price: 450, levelRequired: 10, visualTint: 0x6699CC,
  },
  champion_armor: {
    id: 'champion_armor', name: "Champion's Armor",
    type: 'chest', tier: 5, spriteKey: 'gear_champion_armor',
    def: 45, earnedBy: 'Reach Arena Rank Top 10', levelRequired: 15, visualTint: 0xFFB800,
  },

  // ── SHIELDS ──
  wooden_shield: {
    id: 'wooden_shield', name: 'Wooden Shield',
    type: 'shield', tier: 1, spriteKey: 'gear_wooden_shield',
    def: 4, price: 35,
  },
  iron_shield: {
    id: 'iron_shield', name: 'Iron Shield',
    type: 'shield', tier: 2, spriteKey: 'gear_iron_shield',
    def: 10, price: 100, levelRequired: 4, visualTint: 0xAAAAAA,
  },

  // ── BOOTS ──
  leather_boots: {
    id: 'leather_boots', name: 'Leather Boots',
    type: 'boots', tier: 1, spriteKey: 'gear_leather_boots',
    def: 2, price: 30, visualTint: 0x8B4513, speedBonus: 0.1,
  },
  swift_boots: {
    id: 'swift_boots', name: 'Swift Boots',
    type: 'boots', tier: 3, spriteKey: 'gear_swift_boots',
    def: 5, price: 200, levelRequired: 6, visualTint: 0x4A90D9, speedBonus: 0.25,
  },
};

// ── Stat Recalculation ────────────────────────────────────────

export function recalculateStats(data: CharacterData): CharacterData {
  const baseAtk  = 3 + data.level * 2;
  const baseDef  = 1 + data.level;
  const baseMaxHp = 50 + data.level * 10;

  const gearAtk = Object.values(data.equippedGear)
    .filter(Boolean)
    .reduce((sum, item) => sum + (item?.atk ?? 0), 0);

  const gearDef = Object.values(data.equippedGear)
    .filter(Boolean)
    .reduce((sum, item) => sum + (item?.def ?? 0), 0);

  return {
    ...data,
    atk:   baseAtk + gearAtk,
    def:   baseDef + gearDef,
    maxHp: baseMaxHp,
    hp:    Math.min(data.hp, baseMaxHp),
  };
}

// ── Equip / Unequip ───────────────────────────────────────────

export function equipGear(data: CharacterData, item: GearItem): CharacterData {
  const currentItem = data.equippedGear[item.type];
  const newInventory = [...data.inventory];

  // Return old equipped item to inventory
  if (currentItem) {
    newInventory.push(currentItem);
  }

  // Remove new item from inventory
  const idx = newInventory.findIndex(i => i.id === item.id);
  if (idx > -1) newInventory.splice(idx, 1);

  const newGear: EquippedGear = {
    ...data.equippedGear,
    [item.type]: item,
  };

  return recalculateStats({
    ...data,
    equippedGear: newGear,
    inventory: newInventory,
  });
}

export function unequipGear(data: CharacterData, slot: GearSlot): CharacterData {
  const item = data.equippedGear[slot];
  if (!item) return data;

  const newInventory = [...data.inventory, item];
  const newGear: EquippedGear = {
    ...data.equippedGear,
    [slot]: null,
  };

  return recalculateStats({
    ...data,
    equippedGear: newGear,
    inventory: newInventory,
  });
}

// ── Gear catalog helpers ──────────────────────────────────────

export function getShopItems(category: GearSlot): GearItem[] {
  return Object.values(GEAR_CATALOG).filter(g => g.type === category && g.price !== undefined);
}

export function getEarnedItems(): GearItem[] {
  return Object.values(GEAR_CATALOG).filter(g => g.earnedBy != null);
}
