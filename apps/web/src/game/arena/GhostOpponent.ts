// ═══════════════════════════════════════════════════════════
//  GHOST OPPONENT — AI arena fights when no real players online
//  Uses real player data from DB when available, otherwise generates
// ═══════════════════════════════════════════════════════════

export interface GhostOpponent {
  id: string;
  username: string;
  tier: string;
  xp: number;
  level: number;
  mrr: number;
  followers: number;
  equippedWeapon: string;
  equippedArmor: string;
  isGhost: boolean;
  difficulty: number; // 0.0 to 1.0
}

const GHOST_NAMES = [
  'BuilderKai', 'SoloMaxx', 'TheRealGrind', 'FounderMike',
  'GhostBuilder', 'NightForger', 'IronMaxx', 'CodeWarlord',
  'ShipItSam', 'IndieHacker', 'ZeroToOne', 'GrowthLoop',
  'PixelForge', 'DarkCoder', 'BladeRunner', 'CryptoSmith',
];

const TIER_BASE_STATS: Record<string, { mrr: number; followers: number; weapon: string; armor: string }> = {
  villager:   { mrr: 0,       followers: 100,    weapon: 'wooden_sword',    armor: 'cloth_tunic' },
  apprentice: { mrr: 100000,  followers: 1500,   weapon: 'iron_sword',      armor: 'leather_armor' },
  merchant:   { mrr: 500000,  followers: 12000,  weapon: 'steel_blade',     armor: 'chainmail' },
  warrior:    { mrr: 1000000, followers: 60000,  weapon: 'forge_axe',       armor: 'plate_armor' },
  legend:     { mrr: 5000000, followers: 500000, weapon: 'legendary_blade', armor: 'legend_plate' },
};

export function generateGhostOpponent(
  playerXp: number,
  playerTier: string,
  fightsWon: number,
): GhostOpponent {
  // Difficulty scales: first fights are easy, gets harder over time
  const difficulty = Math.min(0.4 + (fightsWon * 0.05), 0.95);

  const name = GHOST_NAMES[Math.floor(Math.random() * GHOST_NAMES.length)];
  const baseStats = TIER_BASE_STATS[playerTier] ?? TIER_BASE_STATS.villager;

  // Ghost XP is scaled by difficulty relative to player
  const ghostXp = Math.floor(playerXp * difficulty);
  const ghostLevel = Math.floor(Math.sqrt(ghostXp / 100)) + 1;

  return {
    id: `ghost_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    username: name,
    tier: playerTier,
    xp: ghostXp,
    level: ghostLevel,
    mrr: Math.floor(baseStats.mrr * (0.5 + difficulty * 0.5)),
    followers: Math.floor(baseStats.followers * (0.5 + difficulty * 0.5)),
    equippedWeapon: baseStats.weapon,
    equippedArmor: baseStats.armor,
    isGhost: true,
    difficulty,
  };
}

// Build PlayerStats-compatible object for combat.ts
export function ghostToPlayerStats(ghost: GhostOpponent, ITEMS: Record<string, { power: number; defense: number }>) {
  const weapon = ITEMS[ghost.equippedWeapon];
  const armor = ITEMS[ghost.equippedArmor];
  return {
    xUsername: ghost.username,
    weaponPower: weapon?.power ?? 5,
    armorDefense: armor?.defense ?? 5,
    mrr: ghost.mrr,
    followers: ghost.followers,
    xp: ghost.xp,
    level: ghost.level,
  };
}
