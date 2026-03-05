// ═══════════════════════════════════════════════════════════
//  QUEST MANAGER — client-side quest state + objective tracking
//  Runs inside Phaser, communicates with API for persistence
// ═══════════════════════════════════════════════════════════
// @ts-ignore — Phaser exports default from ESM build
import Phaser from 'phaser';
import {
  NPC_QUEST_CHAINS,
  getCurrentQuestForNPC,
  getQuestById,
  getDailyQuests,
  DAILY_REWARDS,
  type QuestStep,
  type DailyQuest,
} from '@/game/data/npcQuests';

export interface QuestProgress {
  questId: string;
  status: 'active' | 'completed';
  progress: number;
  target: number;
}

export interface DailyQuestProgress {
  questId: string;
  progress: number;
  target: number;
  completed: boolean;
}

export class QuestManager {
  private scene: Phaser.Scene;
  private game: Phaser.Game;
  private playerTier: string;
  private playerId: string;

  // Quest state
  private completedQuests = new Set<string>();
  private activeQuests = new Map<string, QuestProgress>();
  private zonesVisited = new Set<string>();
  private npcstalkedTo = new Set<string>();
  private arenaWins = 0;
  private tilesWalked = 0;
  private goldEarned = 0;

  // Daily
  private dailyQuests: DailyQuest[] = [];
  private dailyProgress = new Map<string, DailyQuestProgress>();
  private loginStreak = 0;
  private lastLoginDate = '';

  // Callbacks
  private onQuestComplete?: (questId: string, reward: { xp: number; gold: number }) => void;
  private onQuestAccepted?: (questId: string) => void;

  constructor(
    scene: Phaser.Scene,
    playerTier: string,
    playerId: string,
  ) {
    this.scene = scene;
    this.game = scene.game;
    this.playerTier = playerTier;
    this.playerId = playerId;
    this.dailyQuests = getDailyQuests();
  }

  // ── Initialization from server data ──
  async loadFromServer() {
    try {
      const res = await fetch('/api/quests/npc');
      if (!res.ok) return;
      const data = await res.json();

      // Load completed quests
      if (data.completed) {
        for (const id of data.completed) {
          this.completedQuests.add(id);
        }
      }

      // Load active quests
      if (data.active) {
        for (const q of data.active) {
          this.activeQuests.set(q.questId, {
            questId: q.questId,
            status: 'active',
            progress: q.progress ?? 0,
            target: q.target ?? 1,
          });
        }
      }

      // Load daily state
      if (data.loginStreak !== undefined) {
        this.loginStreak = data.loginStreak;
      }
      if (data.lastLoginDate) {
        this.lastLoginDate = data.lastLoginDate;
      }
      if (data.dailyProgress) {
        for (const dp of data.dailyProgress) {
          this.dailyProgress.set(dp.questId, dp);
        }
      }
    } catch (_e) {
      // Offline — work with defaults
    }
  }

  // ── Event handlers called from WorldScene ──

  onZoneEntered(zoneName: string) {
    if (this.zonesVisited.has(zoneName)) return;
    this.zonesVisited.add(zoneName);
    this.checkObjectives('reach_zone', zoneName);
    this.incrementDailyProgress('visit_zones');
  }

  onNPCTalked(npcName: string) {
    this.npcstalkedTo.add(npcName);
    this.checkObjectives('talk_to_npc', npcName);
    this.incrementDailyProgress('talk_npcs');
  }

  onArenaWin() {
    this.arenaWins++;
    this.checkObjectives('win_arena_fights');
    this.incrementDailyProgress('arena_wins');
  }

  onTilesWalked(count: number) {
    this.tilesWalked += count;
    this.incrementDailyProgress('walk_tiles', count);
  }

  onGoldEarned(amount: number) {
    this.goldEarned += amount;
    this.checkObjectives('earn_gold');
  }

  onDailyLogin(streak: number) {
    this.loginStreak = streak;
    this.checkObjectives('daily_login_streak');
    this.incrementDailyProgress('login_streak');
  }

  // ── Get NPC dialogue based on quest state ──

  getNPCDialogue(npcKey: string): { dialogue: string; questId: string | null; hasQuest: boolean } {
    const quest = getCurrentQuestForNPC(npcKey, this.completedQuests, this.playerTier);
    if (!quest) {
      // All quests done — return a generic "complete" message
      const chain = NPC_QUEST_CHAINS[npcKey];
      if (chain && chain.quests.length > 0) {
        const lastQuest = chain.quests[chain.quests.length - 1];
        if (this.completedQuests.has(lastQuest.id)) {
          return { dialogue: lastQuest.completionDialogue, questId: null, hasQuest: false };
        }
      }
      return { dialogue: '', questId: null, hasQuest: false };
    }

    // If this quest is already active, check if complete
    const active = this.activeQuests.get(quest.id);
    if (active && active.progress >= active.target) {
      return {
        dialogue: quest.completionDialogue,
        questId: quest.id,
        hasQuest: false, // about to be completed
      };
    }

    // If active but not complete, show progress hint
    if (active) {
      return {
        dialogue: `${quest.dialogue}\n\n[${active.progress}/${active.target}]`,
        questId: quest.id,
        hasQuest: true,
      };
    }

    // New quest — accept it
    return {
      dialogue: quest.dialogue,
      questId: quest.id,
      hasQuest: true,
    };
  }

  // Accept a quest
  acceptQuest(questId: string) {
    if (this.activeQuests.has(questId) || this.completedQuests.has(questId)) return;

    const quest = getQuestById(questId);
    if (!quest || !quest.objective) return;

    const obj = quest.objective;
    let target = 1;
    if (obj.zones) target = obj.zones.length;
    if (obj.count) target = obj.count;
    if (obj.days) target = obj.days;
    if (obj.amount) target = obj.amount;

    this.activeQuests.set(questId, {
      questId,
      status: 'active',
      progress: 0,
      target,
    });

    this.onQuestAccepted?.(questId);

    // Persist
    this.saveToServer('accept', questId);

    // Immediately check if already met (e.g. zone already visited)
    this.recheckQuest(questId);
  }

  // ── Internal objective checking ──

  private checkObjectives(type: string, value?: string) {
    for (const [questId, progress] of this.activeQuests) {
      if (progress.status === 'completed') continue;

      const quest = getQuestById(questId);
      if (!quest?.objective) continue;
      const obj = quest.objective;

      if (obj.type !== type) continue;

      let shouldIncrement = false;

      switch (type) {
        case 'reach_zone':
          if (obj.zones?.includes(value!)) shouldIncrement = true;
          break;
        case 'talk_to_npc':
          if (obj.npcName === value) shouldIncrement = true;
          break;
        case 'win_arena_fights':
          shouldIncrement = true;
          break;
        case 'daily_login_streak':
          if (this.loginStreak >= (obj.days ?? 1)) {
            progress.progress = obj.days ?? 1;
          }
          break;
        case 'daily_arena_streak':
          shouldIncrement = true;
          break;
        case 'earn_gold':
          if (this.goldEarned >= (obj.amount ?? 0)) {
            progress.progress = obj.amount ?? 0;
          }
          break;
        case 'send_invite':
          shouldIncrement = true;
          break;
        case 'find_wanderer_locations':
          shouldIncrement = true;
          break;
      }

      if (shouldIncrement) {
        progress.progress = Math.min(progress.progress + 1, progress.target);
      }

      if (progress.progress >= progress.target) {
        this.completeQuest(questId);
      }
    }
  }

  private recheckQuest(questId: string) {
    const progress = this.activeQuests.get(questId);
    if (!progress) return;

    const quest = getQuestById(questId);
    if (!quest?.objective) return;
    const obj = quest.objective;

    // Check zones already visited
    if (obj.type === 'reach_zone' && obj.zones) {
      let count = 0;
      for (const z of obj.zones) {
        if (this.zonesVisited.has(z)) count++;
      }
      progress.progress = Math.max(progress.progress, count);
    }

    // Check NPCs already talked to
    if (obj.type === 'talk_to_npc' && obj.npcName) {
      if (this.npcstalkedTo.has(obj.npcName)) {
        progress.progress = 1;
      }
    }

    if (progress.progress >= progress.target) {
      this.completeQuest(questId);
    }
  }

  private completeQuest(questId: string) {
    const progress = this.activeQuests.get(questId);
    if (!progress) return;

    progress.status = 'completed';
    this.completedQuests.add(questId);
    this.activeQuests.delete(questId);

    const quest = getQuestById(questId);
    const reward = quest?.reward ?? { xp: 0, gold: 0 };

    // Emit completion
    this.onQuestComplete?.(questId, { xp: reward.xp, gold: reward.gold ?? 0 });

    // Visual feedback via game events
    this.game.events.emit('quest_complete', {
      questId,
      reward,
      completionDialogue: quest?.completionDialogue,
    });

    // Zone banner
    this.game.events.emit('zone_enter_banner', `QUEST COMPLETE — ${questId}`);

    // Persist
    this.saveToServer('complete', questId);
  }

  // ── Daily quest progress ──

  private incrementDailyProgress(objectiveType: string, amount = 1) {
    for (const dq of this.dailyQuests) {
      if (dq.objectiveType !== objectiveType) continue;

      let dp = this.dailyProgress.get(dq.id);
      if (!dp) {
        dp = { questId: dq.id, progress: 0, target: dq.target, completed: false };
        this.dailyProgress.set(dq.id, dp);
      }
      if (dp.completed) continue;

      dp.progress = Math.min(dp.progress + amount, dp.target);
      if (dp.progress >= dp.target) {
        dp.completed = true;
        this.game.events.emit('daily_quest_complete', {
          questId: dq.id,
          label: dq.label,
          reward: dq.reward,
        });
        this.game.events.emit('zone_enter_banner', `DAILY — ${dq.label}`);
      }
    }
  }

  // ── Server persistence ──

  private async saveToServer(action: string, questId: string) {
    try {
      await fetch('/api/quests/npc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, questId, playerId: this.playerId }),
      });
    } catch (_e) {
      // Non-critical
    }
  }

  // ── Public getters ──

  getActiveQuests(): QuestProgress[] {
    return Array.from(this.activeQuests.values());
  }

  getCompletedQuests(): string[] {
    return Array.from(this.completedQuests);
  }

  getDailyQuests(): { quest: DailyQuest; progress: DailyQuestProgress }[] {
    return this.dailyQuests.map(q => ({
      quest: q,
      progress: this.dailyProgress.get(q.id) ?? {
        questId: q.id,
        progress: 0,
        target: q.target,
        completed: false,
      },
    }));
  }

  getLoginStreak(): number {
    return this.loginStreak;
  }

  getDailyReward(): { xp: number; gold: number; label: string } | null {
    const day = Math.min(this.loginStreak, 7);
    if (day < 1) return null;
    return DAILY_REWARDS[`day${day}`] ?? null;
  }

  isQuestCompleted(questId: string): boolean {
    return this.completedQuests.has(questId);
  }

  // ── Callbacks ──

  setOnQuestComplete(cb: (questId: string, reward: { xp: number; gold: number }) => void) {
    this.onQuestComplete = cb;
  }

  setOnQuestAccepted(cb: (questId: string) => void) {
    this.onQuestAccepted = cb;
  }
}
