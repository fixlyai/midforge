import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@midforge/db/client';
import { npcQuests, players, gameEvents } from '@midforge/db/schema';
import { eq, and } from 'drizzle-orm';
import { awardXP } from '@/lib/xp';
import { getQuestById } from '@/game/data/npcQuests';

// GET — load player's NPC quest state
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const player = (session as any).player;
  if (!player) return NextResponse.json({ error: 'No player' }, { status: 404 });

  const allQuests = await db
    .select()
    .from(npcQuests)
    .where(eq(npcQuests.playerId, player.id));

  const completed = allQuests
    .filter(q => q.status === 'completed')
    .map(q => q.questId);

  const active = allQuests
    .filter(q => q.status === 'active')
    .map(q => ({
      questId: q.questId,
      progress: q.progress ?? 0,
      target: q.target ?? 1,
    }));

  return NextResponse.json({
    completed,
    active,
    loginStreak: player.loginStreak ?? 0,
    lastLoginDate: player.lastLoginDate ?? '',
  });
}

// POST — accept or complete a quest
export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const player = (session as any).player;
  if (!player) return NextResponse.json({ error: 'No player' }, { status: 404 });

  const { action, questId } = await req.json();

  if (action === 'accept') {
    // Check not already accepted
    const existing = await db
      .select()
      .from(npcQuests)
      .where(and(eq(npcQuests.playerId, player.id), eq(npcQuests.questId, questId)))
      .limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Already accepted' }, { status: 400 });
    }

    const quest = getQuestById(questId);
    if (!quest) return NextResponse.json({ error: 'Unknown quest' }, { status: 400 });

    const obj = quest.objective;
    let target = 1;
    if (obj?.zones) target = obj.zones.length;
    if (obj?.count) target = obj.count;
    if (obj?.days) target = obj.days;
    if (obj?.amount) target = obj.amount;

    await db.insert(npcQuests).values({
      playerId: player.id,
      questId,
      target,
    });

    return NextResponse.json({ ok: true });
  }

  if (action === 'complete') {
    const [existing] = await db
      .select()
      .from(npcQuests)
      .where(and(
        eq(npcQuests.playerId, player.id),
        eq(npcQuests.questId, questId),
        eq(npcQuests.status, 'active'),
      ))
      .limit(1);
    if (!existing) return NextResponse.json({ error: 'Quest not active' }, { status: 404 });

    // Mark completed
    await db.update(npcQuests).set({
      status: 'completed',
      progress: existing.target,
      completedAt: new Date(),
    }).where(eq(npcQuests.id, existing.id));

    // Award rewards
    const quest = getQuestById(questId);
    const reward = quest?.reward;
    if (reward) {
      if (reward.xp) {
        await awardXP(player.id, reward.xp, `quest_${questId}`);
      }
      if (reward.gold) {
        await db.update(players).set({
          gold: (player.gold ?? 0) + reward.gold,
        }).where(eq(players.id, player.id));
      }
    }

    // Log game event for activity feed
    await db.insert(gameEvents).values({
      playerId: player.id,
      eventType: 'quest_complete',
      username: player.xUsername,
      metadata: { questId, questName: questId.replace(/_/g, ' ') },
    });

    return NextResponse.json({ ok: true, reward });
  }

  if (action === 'progress') {
    // Update quest progress
    const [existing] = await db
      .select()
      .from(npcQuests)
      .where(and(
        eq(npcQuests.playerId, player.id),
        eq(npcQuests.questId, questId),
        eq(npcQuests.status, 'active'),
      ))
      .limit(1);
    if (!existing) return NextResponse.json({ error: 'Quest not active' }, { status: 404 });

    const newProgress = Math.min((existing.target ?? 1), (existing.progress ?? 0) + 1);
    await db.update(npcQuests).set({
      progress: newProgress,
    }).where(eq(npcQuests.id, existing.id));

    return NextResponse.json({ ok: true, progress: newProgress });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
