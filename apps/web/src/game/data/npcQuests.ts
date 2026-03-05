// ═══════════════════════════════════════════════════════════
//  NPC QUEST CHAINS — Stardew Valley / Zelda model
//  Every NPC has a chain. Completing one unlocks the next.
// ═══════════════════════════════════════════════════════════

export interface QuestObjective {
  type:
    | 'reach_zone'
    | 'talk_to_npc'
    | 'win_arena_fights'
    | 'daily_login_streak'
    | 'daily_arena_streak'
    | 'send_invite'
    | 'earn_gold'
    | 'find_wanderer_locations'
    | 'enter_castle';
  /** zone names, npc names, or null */
  zones?: string[];
  npcName?: string;
  count?: number;
  amount?: number;
  days?: number;
}

export interface QuestReward {
  xp: number;
  gold?: number;
  item?: string;
  unlocks?: string; // next quest id in chain
}

export interface QuestStep {
  id: string;
  trigger: string; // 'first_talk' | 'quest_X_complete' | 'player_tier_X'
  dialogue: string;
  objective: QuestObjective | null;
  reward?: QuestReward;
  completionDialogue: string;
}

export interface QuestChain {
  npcName: string;
  portrait: string;
  quests: QuestStep[];
}

export const NPC_QUEST_CHAINS: Record<string, QuestChain> = {

  ForgeMaster: {
    npcName: 'ForgeMaster',
    portrait: 'forgemaster',
    quests: [
      {
        id: 'forge_1',
        trigger: 'first_talk',
        dialogue: "You look lost, newcomer. The Arena is north. The Castle is farther. Start by walking the full perimeter of this village — learn the land.",
        objective: { type: 'reach_zone', zones: ['arena_entrance', 'marketplace_door', 'elder_door'] },
        reward: { xp: 100, gold: 25, unlocks: 'forge_2' },
        completionDialogue: "You move fast. Good. The weak ones never come back.",
      },
      {
        id: 'forge_2',
        trigger: 'quest_forge_1_complete',
        dialogue: "The Arena master owes me a debt. Tell him IronHide sent you. He'll give you your first fight.",
        objective: { type: 'talk_to_npc', npcName: 'ArenaKeeper' },
        reward: { xp: 150, unlocks: 'forge_3' },
        completionDialogue: "Good. Now you have a name in this world.",
      },
      {
        id: 'forge_3',
        trigger: 'quest_forge_2_complete',
        dialogue: "Win your first Arena fight — even against a ghost opponent — and come back. I'll upgrade your starting gear.",
        objective: { type: 'win_arena_fights', count: 1 },
        reward: { xp: 300, gold: 50, item: 'leather_vest', unlocks: 'forge_4' },
        completionDialogue: "Take this vest. It won't save you from a Legend. But it'll slow the bleeding.",
      },
    ],
  },

  ArenaKeeper: {
    npcName: 'ArenaKeeper',
    portrait: 'arenakeeper',
    quests: [
      {
        id: 'arena_1',
        trigger: 'first_talk',
        dialogue: "IronHide sent you? Then you fight. No experience needed — I'll match you against a ghost. Win, and you're registered.",
        objective: { type: 'win_arena_fights', count: 1 },
        reward: { xp: 200, gold: 30, unlocks: 'arena_2' },
        completionDialogue: "Not bad. You've got the instinct. Come back when you want a real fight.",
      },
      {
        id: 'arena_2',
        trigger: 'player_tier_apprentice',
        dialogue: "You've grown. Time for the daily challenge — fight every day this week. Consistency beats talent.",
        objective: { type: 'daily_arena_streak', days: 3 },
        reward: { xp: 500, gold: 100, unlocks: 'arena_3' },
        completionDialogue: "Three days straight. You're building something.",
      },
    ],
  },

  CastleGuard: {
    npcName: 'CastleGuard',
    portrait: 'castleguard',
    quests: [
      {
        id: 'castle_1',
        trigger: 'first_talk',
        dialogue: "The Castle is sealed. Only Legend Tier may enter. I've seen a thousand Villagers stand here and stare. Most never make it.",
        objective: null,
        completionDialogue: "Still here? Good. That's the first quality a Legend needs.",
      },
      {
        id: 'castle_2',
        trigger: 'player_tier_warrior',
        dialogue: "Warrior Tier. I remember when you were nothing. The gate still won't open — but I'm watching now.",
        objective: null,
        completionDialogue: "One more tier. Don't waste it.",
      },
      {
        id: 'castle_3',
        trigger: 'player_tier_legend',
        dialogue: "...Legend. I've guarded this gate for years waiting for someone like you. Enter.",
        objective: { type: 'enter_castle' },
        reward: { xp: 5000, gold: 1000, unlocks: 'castle_interior' },
        completionDialogue: "Welcome home.",
      },
    ],
  },

  TheElder: {
    npcName: 'TheElder',
    portrait: 'elder',
    quests: [
      {
        id: 'elder_1',
        trigger: 'first_talk',
        dialogue: "I've watched this world for decades. Let me tell you something: the ones who win aren't the strongest — they're the ones who show up every day.",
        objective: { type: 'daily_login_streak', days: 3 },
        reward: { xp: 250, gold: 50, unlocks: 'elder_2' },
        completionDialogue: "Three days. You're not a tourist.",
      },
      {
        id: 'elder_2',
        trigger: 'quest_elder_1_complete',
        dialogue: "Now invite someone. A world with one person in it is just a room.",
        objective: { type: 'send_invite', count: 1 },
        reward: { xp: 300, gold: 75, unlocks: 'elder_3' },
        completionDialogue: "Someone's coming because of you. That matters.",
      },
    ],
  },

  GoldbagMerchant: {
    npcName: 'GoldbagMerchant',
    portrait: 'merchant',
    quests: [
      {
        id: 'merchant_1',
        trigger: 'first_talk',
        dialogue: "Everything in this world has a price. The question is whether you can afford to pay it.",
        objective: { type: 'earn_gold', amount: 100 },
        reward: { xp: 150, item: 'coin_pouch', unlocks: 'merchant_2' },
        completionDialogue: "A hundred gold. Not much, but it's a start. Come back when you have more.",
      },
    ],
  },

  TheWanderer: {
    npcName: 'TheWanderer',
    portrait: 'wanderer',
    quests: [
      {
        id: 'wanderer_1',
        trigger: 'first_talk',
        dialogue: "I've been everywhere in this world. The Arena, the Castle, the underground markets. Want to know a secret?",
        objective: { type: 'find_wanderer_locations', count: 3 },
        reward: { xp: 400, gold: 80, unlocks: 'wanderer_2' },
        completionDialogue: "You tracked me down three times. You're persistent. Here — take this.",
      },
    ],
  },
};

// Flat lookup: quest ID → quest step
export function getQuestById(questId: string): QuestStep | undefined {
  for (const chain of Object.values(NPC_QUEST_CHAINS)) {
    const step = chain.quests.find(q => q.id === questId);
    if (step) return step;
  }
  return undefined;
}

// Get the chain that owns a quest
export function getChainForQuest(questId: string): QuestChain | undefined {
  for (const chain of Object.values(NPC_QUEST_CHAINS)) {
    if (chain.quests.some(q => q.id === questId)) return chain;
  }
  return undefined;
}

// Get the NPC's current quest based on completed quests
export function getCurrentQuestForNPC(
  npcKey: string,
  completedQuestIds: Set<string>,
  playerTier: string,
): QuestStep | undefined {
  const chain = NPC_QUEST_CHAINS[npcKey];
  if (!chain) return undefined;

  for (const quest of chain.quests) {
    if (completedQuestIds.has(quest.id)) continue;

    // Check trigger conditions
    if (quest.trigger === 'first_talk') return quest;
    if (quest.trigger.startsWith('quest_') && quest.trigger.endsWith('_complete')) {
      const prereqId = quest.trigger.replace('quest_', '').replace('_complete', '');
      if (completedQuestIds.has(prereqId)) return quest;
    }
    if (quest.trigger.startsWith('player_tier_')) {
      const reqTier = quest.trigger.replace('player_tier_', '');
      const tierOrder = ['villager', 'apprentice', 'merchant', 'warrior', 'legend'];
      if (tierOrder.indexOf(playerTier) >= tierOrder.indexOf(reqTier)) return quest;
    }

    // If trigger not met, this is the blocking quest — don't look further
    break;
  }
  return undefined;
}

// ── Daily Quest Pool ──
export interface DailyQuest {
  id: string;
  label: string;
  objectiveType: string;
  target: number;
  reward: { xp: number; gold: number };
}

export const DAILY_QUEST_POOL: DailyQuest[] = [
  { id: 'daily_walk',    label: 'Walk 500 tiles',          objectiveType: 'walk_tiles',   target: 500,  reward: { xp: 50,  gold: 20 } },
  { id: 'daily_talk',    label: 'Talk to 3 NPCs',          objectiveType: 'talk_npcs',    target: 3,    reward: { xp: 75,  gold: 25 } },
  { id: 'daily_arena',   label: 'Win 1 Arena fight',       objectiveType: 'arena_wins',   target: 1,    reward: { xp: 100, gold: 40 } },
  { id: 'daily_explore', label: 'Visit 4 different zones',  objectiveType: 'visit_zones',  target: 4,    reward: { xp: 80,  gold: 30 } },
  { id: 'daily_streak',  label: 'Log in 3 days in a row',  objectiveType: 'login_streak', target: 3,    reward: { xp: 150, gold: 60 } },
  { id: 'daily_invite',  label: 'Share your invite link',   objectiveType: 'share_invite', target: 1,    reward: { xp: 50,  gold: 0  } },
];

// Pick 3 daily quests seeded by date (same for all players)
export function getDailyQuests(dateStr?: string): DailyQuest[] {
  const today = dateStr ?? new Date().toISOString().split('T')[0];
  // Simple hash from date string
  let hash = 0;
  for (let i = 0; i < today.length; i++) {
    hash = ((hash << 5) - hash) + today.charCodeAt(i);
    hash |= 0;
  }
  hash = Math.abs(hash);

  const pool = [...DAILY_QUEST_POOL];
  const picked: DailyQuest[] = [];
  for (let i = 0; i < 3 && pool.length > 0; i++) {
    const idx = (hash + i * 7) % pool.length;
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

// ── Daily Login Rewards ──
export const DAILY_REWARDS: Record<string, { xp: number; gold: number; label: string }> = {
  day1: { xp: 25,  gold: 10,  label: 'Day 1' },
  day2: { xp: 35,  gold: 15,  label: 'Day 2' },
  day3: { xp: 50,  gold: 25,  label: 'Day 3' },
  day4: { xp: 50,  gold: 25,  label: 'Day 4' },
  day5: { xp: 75,  gold: 40,  label: 'Day 5' },
  day6: { xp: 75,  gold: 40,  label: 'Day 6' },
  day7: { xp: 150, gold: 100, label: 'Day 7 STREAK BONUS' },
};
