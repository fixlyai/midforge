export const TIERS = {
  villager: {
    label: 'Villager',
    emoji: '🧑‍🌾',
    mrrMin: 0,
    followersMin: 0,
    sprite: 'villager',
    color: '#8B7355',
    zones: ['starter_village'],
  },
  apprentice: {
    label: 'Apprentice',
    emoji: '⚒️',
    mrrMin: 100000,       // $1K MRR in cents
    followersMin: 1000,
    sprite: 'apprentice',
    color: '#4A90D9',
    zones: ['starter_village', 'merchant_lands'],
  },
  merchant: {
    label: 'Merchant',
    emoji: '💰',
    mrrMin: 500000,       // $5K MRR
    followersMin: 10000,
    sprite: 'merchant',
    color: '#7B68EE',
    zones: ['starter_village', 'merchant_lands', 'arena'],
  },
  warrior: {
    label: 'Warrior',
    emoji: '⚔️',
    mrrMin: 1000000,      // $10K MRR
    followersMin: 50000,
    sprite: 'warrior',
    color: '#E74C3C',
    zones: ['starter_village', 'merchant_lands', 'arena', 'shadow_dungeon'],
  },
  legend: {
    label: 'Legend',
    emoji: '👑',
    mrrMin: 5000000,      // $50K MRR
    followersMin: 500000,
    sprite: 'legend',
    color: '#F39C12',
    zones: ['all'],
  },
} as const;

export type TierKey = keyof typeof TIERS;

export const ITEMS = {
  // Weapons — unlocked by MRR
  wooden_sword:    { name: 'Wooden Sword',    type: 'weapon', power: 5,   defense: 0,   unlockMrr: 0,       unlockFollowers: 0 },
  iron_sword:      { name: 'Iron Sword',      type: 'weapon', power: 15,  defense: 0,   unlockMrr: 100000,  unlockFollowers: 0 },
  steel_blade:     { name: 'Steel Blade',     type: 'weapon', power: 30,  defense: 0,   unlockMrr: 500000,  unlockFollowers: 0 },
  forge_axe:       { name: 'Forge Axe',       type: 'weapon', power: 50,  defense: 0,   unlockMrr: 1000000, unlockFollowers: 0 },
  legendary_blade: { name: 'Legendary Blade', type: 'weapon', power: 100, defense: 0,   unlockMrr: 5000000, unlockFollowers: 0 },
  // Armor — unlocked by followers
  cloth_tunic:     { name: 'Cloth Tunic',     type: 'armor',  power: 0,   defense: 5,   unlockMrr: 0, unlockFollowers: 0 },
  leather_armor:   { name: 'Leather Armor',   type: 'armor',  power: 0,   defense: 15,  unlockMrr: 0, unlockFollowers: 1000 },
  chainmail:       { name: 'Chainmail',       type: 'armor',  power: 0,   defense: 30,  unlockMrr: 0, unlockFollowers: 10000 },
  plate_armor:     { name: 'Plate Armor',     type: 'armor',  power: 0,   defense: 50,  unlockMrr: 0, unlockFollowers: 100000 },
  legend_plate:    { name: 'Legend Plate',     type: 'armor',  power: 0,   defense: 100, unlockMrr: 0, unlockFollowers: 500000 },
} as const;

export type ItemKey = keyof typeof ITEMS;

export interface PlayerData {
  id: string;
  xUserId: string;
  xUsername: string;
  xDisplayName: string | null;
  xProfileImageUrl: string | null;
  xFollowers: number;
  mrr: number;
  xp: number;
  level: number;
  tier: TierKey;
  equippedWeapon: ItemKey;
  equippedArmor: ItemKey;
  equippedHelmet: string | null;
  positionX: number;
  positionY: number;
  currentZone: string;
  gold: number;
  seasonTitle: string | null;
}

export interface PlayerStats {
  xUsername: string;
  weaponPower: number;
  armorDefense: number;
  mrr: number;
  followers: number;
  xp: number;
  level: number;
  rank?: number;
}

export function calculateTier(mrr: number, followers: number): TierKey {
  const tiers: TierKey[] = ['legend', 'warrior', 'merchant', 'apprentice', 'villager'];
  for (const tier of tiers) {
    const t = TIERS[tier];
    if (mrr >= t.mrrMin && followers >= t.followersMin) {
      return tier;
    }
  }
  return 'villager';
}

export function calculateLevel(xp: number): number {
  // Simple level curve: level = floor(sqrt(xp / 100)) + 1
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

export function getBestWeapon(mrr: number): ItemKey {
  const weapons: ItemKey[] = ['legendary_blade', 'forge_axe', 'steel_blade', 'iron_sword', 'wooden_sword'];
  for (const w of weapons) {
    if (mrr >= ITEMS[w].unlockMrr) return w;
  }
  return 'wooden_sword';
}

export function getBestArmor(followers: number): ItemKey {
  const armors: ItemKey[] = ['legend_plate', 'plate_armor', 'chainmail', 'leather_armor', 'cloth_tunic'];
  for (const a of armors) {
    if (followers >= ITEMS[a].unlockFollowers) return a;
  }
  return 'cloth_tunic';
}
