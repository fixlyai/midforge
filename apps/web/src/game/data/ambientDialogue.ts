// ═══════════════════════════════════════════════════════════
//  NPC AMBIENT DIALOGUE — random lines when player walks past
//  Triggers within 120px, max once per 30s per NPC
// ═══════════════════════════════════════════════════════════

export const AMBIENT_DIALOGUE: Record<string, string[]> = {
  ForgeMaster: [
    "Keep moving.",
    "The Arena's north if you're ready.",
    "I've seen a thousand like you. Most give up.",
    "Your tier shows. Work on it.",
  ],
  CastleGuard: [
    "Gate's closed.",
    "Legend Tier only. You're not there yet.",
    "I've been here for years. I can wait.",
  ],
  TheElder: [
    "Another day, another step.",
    "The castle was built by someone who started exactly where you are.",
    "Have you done your daily quest?",
  ],
  GoldbagMerchant: [
    "Buying? Selling? No? Then move along.",
    "Gold doesn't earn itself.",
    "I heard someone hit Warrior Tier yesterday.",
  ],
  ArenaKeeper: [
    "Looking for a fight?",
    "The Arena never sleeps.",
    "Ghost fighters are waiting.",
  ],
};

// Get a random line for an NPC, cycling through without immediate repeats
const lastLineIndex = new Map<string, number>();

export function getAmbientLine(npcName: string): string | null {
  const lines = AMBIENT_DIALOGUE[npcName];
  if (!lines || lines.length === 0) return null;

  const lastIdx = lastLineIndex.get(npcName) ?? -1;
  let nextIdx: number;
  do {
    nextIdx = Math.floor(Math.random() * lines.length);
  } while (nextIdx === lastIdx && lines.length > 1);

  lastLineIndex.set(npcName, nextIdx);
  return lines[nextIdx];
}
