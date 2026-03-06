/**
 * Phase D — Loot Table & Achievement Definitions
 *
 * Items dropped by ghost fights, brigands, chests.
 * Achievements tracked globally per player.
 */

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface LootItem {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'ring' | 'amulet' | 'cosmetic' | 'consumable';
  rarity: ItemRarity;
  statBonus: { attack?: number; defense?: number; hp?: number; xpMult?: number };
  flavorText: string;
  icon: string; // emoji
}

export const RARITY_COLORS: Record<ItemRarity, string> = {
  common: '#9E9E9E',
  uncommon: '#4CAF50',
  rare: '#2196F3',
  epic: '#9C27B0',
  legendary: '#FF9800',
};

export const RARITY_WEIGHTS: Record<ItemRarity, number> = {
  common: 50,
  uncommon: 30,
  rare: 14,
  epic: 5,
  legendary: 1,
};

export const LOOT_TABLE: LootItem[] = [
  // Common weapons
  { id: 'rusty_sword', name: 'Rusty Sword', type: 'weapon', rarity: 'common', statBonus: { attack: 2 }, flavorText: 'Better than nothing.', icon: '⚔' },
  { id: 'wooden_club', name: 'Wooden Club', type: 'weapon', rarity: 'common', statBonus: { attack: 1 }, flavorText: 'A sturdy branch, repurposed.', icon: '🪵' },
  { id: 'iron_dagger', name: 'Iron Dagger', type: 'weapon', rarity: 'common', statBonus: { attack: 3 }, flavorText: 'Quick and sharp.', icon: '🗡' },

  // Common armor
  { id: 'cloth_tunic', name: 'Cloth Tunic', type: 'armor', rarity: 'common', statBonus: { defense: 1 }, flavorText: 'At least it covers you.', icon: '👕' },
  { id: 'leather_boots', name: 'Leather Boots', type: 'armor', rarity: 'common', statBonus: { defense: 1, hp: 5 }, flavorText: 'Comfortable for walking.', icon: '👢' },

  // Uncommon weapons
  { id: 'steel_blade', name: 'Steel Blade', type: 'weapon', rarity: 'uncommon', statBonus: { attack: 5 }, flavorText: 'Forged in the village smithy.', icon: '⚔' },
  { id: 'hunters_bow', name: "Hunter's Bow", type: 'weapon', rarity: 'uncommon', statBonus: { attack: 4 }, flavorText: 'Silent and deadly.', icon: '🏹' },

  // Uncommon armor
  { id: 'chainmail', name: 'Chainmail Vest', type: 'armor', rarity: 'uncommon', statBonus: { defense: 3 }, flavorText: 'Links of steel.', icon: '🛡' },
  { id: 'iron_helm', name: 'Iron Helm', type: 'armor', rarity: 'uncommon', statBonus: { defense: 2, hp: 10 }, flavorText: 'Protects the important bits.', icon: '⛑' },

  // Uncommon rings
  { id: 'copper_ring', name: 'Copper Ring', type: 'ring', rarity: 'uncommon', statBonus: { hp: 15 }, flavorText: 'A humble band, warm to the touch.', icon: '💍' },

  // Rare weapons
  { id: 'flame_sword', name: 'Flame Sword', type: 'weapon', rarity: 'rare', statBonus: { attack: 8 }, flavorText: 'Burns with inner fire.', icon: '🔥' },
  { id: 'frost_axe', name: 'Frost Axe', type: 'weapon', rarity: 'rare', statBonus: { attack: 7 }, flavorText: 'Chills the bones.', icon: '❄' },

  // Rare armor
  { id: 'dragon_scale', name: 'Dragon Scale Mail', type: 'armor', rarity: 'rare', statBonus: { defense: 6, hp: 20 }, flavorText: 'Scales shed from an ancient wyrm.', icon: '🐉' },

  // Rare rings
  { id: 'ruby_ring', name: 'Ruby Ring', type: 'ring', rarity: 'rare', statBonus: { attack: 3, hp: 10 }, flavorText: 'Glows faintly in darkness.', icon: '💍' },

  // Rare amulets
  { id: 'xp_amulet', name: 'Amulet of Learning', type: 'amulet', rarity: 'rare', statBonus: { xpMult: 0.1 }, flavorText: '+10% XP from all sources.', icon: '📿' },

  // Epic weapons
  { id: 'void_blade', name: 'Void Blade', type: 'weapon', rarity: 'epic', statBonus: { attack: 12 }, flavorText: 'Cuts through reality itself.', icon: '⚔' },
  { id: 'thunder_hammer', name: 'Thunder Hammer', type: 'weapon', rarity: 'epic', statBonus: { attack: 10, hp: 15 }, flavorText: 'Echoes with each strike.', icon: '🔨' },

  // Epic armor
  { id: 'shadow_cloak', name: 'Shadow Cloak', type: 'armor', rarity: 'epic', statBonus: { defense: 8, hp: 30 }, flavorText: 'Woven from darkness.', icon: '🧥' },

  // Epic amulet
  { id: 'gold_amulet', name: 'Amulet of Fortune', type: 'amulet', rarity: 'epic', statBonus: { xpMult: 0.2 }, flavorText: '+20% XP. Lucky you.', icon: '📿' },

  // Legendary
  { id: 'excalibur', name: 'Excalibur', type: 'weapon', rarity: 'legendary', statBonus: { attack: 20 }, flavorText: 'The blade of legends.', icon: '⚔' },
  { id: 'crown_kings', name: 'Crown of Kings', type: 'armor', rarity: 'legendary', statBonus: { defense: 12, hp: 50, xpMult: 0.15 }, flavorText: 'Heavy is the head...', icon: '👑' },

  // Cosmetics (common–rare)
  { id: 'red_cape', name: 'Red Cape', type: 'cosmetic', rarity: 'uncommon', statBonus: {}, flavorText: 'Flows dramatically in the wind.', icon: '🟥' },
  { id: 'gold_crown', name: 'Golden Crown', type: 'cosmetic', rarity: 'rare', statBonus: {}, flavorText: 'For the fashionable ruler.', icon: '👑' },
  { id: 'dark_wings', name: 'Shadow Wings', type: 'cosmetic', rarity: 'epic', statBonus: {}, flavorText: 'Purely decorative. Probably.', icon: '🦇' },

  // Consumables
  { id: 'health_potion', name: 'Health Potion', type: 'consumable', rarity: 'common', statBonus: { hp: 30 }, flavorText: 'Tastes like cherries.', icon: '🧪' },
  { id: 'xp_scroll', name: 'XP Scroll', type: 'consumable', rarity: 'uncommon', statBonus: {}, flavorText: 'Grants 100 XP instantly.', icon: '📜' },
];

/** Roll a random item from the loot table */
export function rollLoot(): LootItem {
  const totalWeight = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let roll = Math.random() * totalWeight;
  let selectedRarity: ItemRarity = 'common';

  for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS) as [ItemRarity, number][]) {
    roll -= weight;
    if (roll <= 0) { selectedRarity = rarity; break; }
  }

  const pool = LOOT_TABLE.filter(i => i.rarity === selectedRarity);
  if (pool.length === 0) return LOOT_TABLE[0]; // fallback
  return pool[Math.floor(Math.random() * pool.length)];
}

// ═══════════════════════════════════════════════════════════
//  ACHIEVEMENTS
// ═══════════════════════════════════════════════════════════

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'combat' | 'exploration' | 'social' | 'collection' | 'progression';
  condition: { type: string; target: number };
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Combat
  { id: 'first_blood', title: 'First Blood', description: 'Win your first arena fight', icon: '⚔', category: 'combat', condition: { type: 'arena_wins', target: 1 } },
  { id: 'arena_veteran', title: 'Arena Veteran', description: 'Win 10 arena fights', icon: '🏆', category: 'combat', condition: { type: 'arena_wins', target: 10 } },
  { id: 'arena_champion', title: 'Arena Champion', description: 'Win 50 arena fights', icon: '👑', category: 'combat', condition: { type: 'arena_wins', target: 50 } },
  { id: 'arena_legend', title: 'Arena Legend', description: 'Win 100 arena fights', icon: '🌟', category: 'combat', condition: { type: 'arena_wins', target: 100 } },
  { id: 'brigand_slayer', title: 'Brigand Slayer', description: 'Defeat 5 brigands', icon: '💀', category: 'combat', condition: { type: 'brigand_kills', target: 5 } },
  { id: 'crit_master', title: 'Critical Master', description: 'Land 20 critical hits', icon: '💥', category: 'combat', condition: { type: 'critical_hits', target: 20 } },

  // Exploration
  { id: 'explorer', title: 'Explorer', description: 'Visit 5 different zones', icon: '🗺', category: 'exploration', condition: { type: 'zones_visited', target: 5 } },
  { id: 'world_traveler', title: 'World Traveler', description: 'Visit all zones', icon: '🌍', category: 'exploration', condition: { type: 'zones_visited', target: 10 } },
  { id: 'walk_1k', title: 'Wanderer', description: 'Walk 1,000 tiles', icon: '👟', category: 'exploration', condition: { type: 'tiles_walked', target: 1000 } },
  { id: 'walk_10k', title: 'Marathon Runner', description: 'Walk 10,000 tiles', icon: '🏃', category: 'exploration', condition: { type: 'tiles_walked', target: 10000 } },
  { id: 'nugget_hunter', title: 'Nugget Hunter', description: 'Collect 20 XP nuggets', icon: '✨', category: 'exploration', condition: { type: 'nuggets_collected', target: 20 } },
  { id: 'star_catcher', title: 'Star Catcher', description: 'Catch a shooting star', icon: '⭐', category: 'exploration', condition: { type: 'stars_caught', target: 1 } },

  // Social
  { id: 'social_butterfly', title: 'Social Butterfly', description: 'Talk to 10 NPCs', icon: '🦋', category: 'social', condition: { type: 'npcs_talked', target: 10 } },
  { id: 'gift_giver', title: 'Gift Giver', description: 'Send 5 gifts to friends', icon: '🎁', category: 'social', condition: { type: 'gifts_sent', target: 5 } },
  { id: 'challenger', title: 'Challenger', description: 'Challenge 3 other players', icon: '🥊', category: 'social', condition: { type: 'challenges_sent', target: 3 } },

  // Collection
  { id: 'collector', title: 'Collector', description: 'Own 10 unique items', icon: '🎒', category: 'collection', condition: { type: 'unique_items', target: 10 } },
  { id: 'hoarder', title: 'Hoarder', description: 'Own 25 unique items', icon: '🏠', category: 'collection', condition: { type: 'unique_items', target: 25 } },
  { id: 'rare_finder', title: 'Rare Finder', description: 'Find a rare item', icon: '💎', category: 'collection', condition: { type: 'rare_items_found', target: 1 } },
  { id: 'epic_finder', title: 'Epic Finder', description: 'Find an epic item', icon: '🔮', category: 'collection', condition: { type: 'epic_items_found', target: 1 } },
  { id: 'legendary_finder', title: 'Legendary!', description: 'Find a legendary item', icon: '🌟', category: 'collection', condition: { type: 'legendary_items_found', target: 1 } },

  // Progression
  { id: 'first_login', title: 'Welcome', description: 'Log in for the first time', icon: '👋', category: 'progression', condition: { type: 'login_days', target: 1 } },
  { id: 'streak_3', title: 'Dedicated', description: 'Login streak of 3 days', icon: '🔥', category: 'progression', condition: { type: 'login_streak', target: 3 } },
  { id: 'streak_7', title: 'Week Warrior', description: 'Login streak of 7 days', icon: '📅', category: 'progression', condition: { type: 'login_streak', target: 7 } },
  { id: 'rich', title: 'Getting Rich', description: 'Accumulate 1,000 gold', icon: '💰', category: 'progression', condition: { type: 'total_gold', target: 1000 } },
  { id: 'wealthy', title: 'Wealthy', description: 'Accumulate 10,000 gold', icon: '🏦', category: 'progression', condition: { type: 'total_gold', target: 10000 } },
  { id: 'quest_master', title: 'Quest Master', description: 'Complete 10 quests', icon: '📜', category: 'progression', condition: { type: 'quests_completed', target: 10 } },
  { id: 'evolved', title: 'Evolved', description: 'Evolve your character form', icon: '🧬', category: 'progression', condition: { type: 'evolutions', target: 1 } },
  { id: 'stripe_connected', title: 'Merchant', description: 'Connect Stripe account', icon: '💳', category: 'progression', condition: { type: 'stripe_connected', target: 1 } },
];
