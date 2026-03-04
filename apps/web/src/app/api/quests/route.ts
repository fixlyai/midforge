import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@midforge/db/client';
import { quests, players, inventory } from '@midforge/db/schema';
import { eq, and } from 'drizzle-orm';
import { QUEST_DEFINITIONS } from '@midforge/shared/quests';

// GET — list player's quests (active + completed)
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const player = (session as any).player;
  if (!player) return NextResponse.json({ error: 'No player' }, { status: 404 });

  const playerQuests = await db
    .select()
    .from(quests)
    .where(eq(quests.playerId, player.id));

  // Enrich with quest definitions
  const enriched = playerQuests.map((q) => {
    const def = QUEST_DEFINITIONS.find((d) => d.id === q.questId);
    return { ...q, definition: def ?? null };
  });

  // Also return available quests not yet accepted
  const acceptedIds = new Set(playerQuests.map((q) => q.questId));
  const available = QUEST_DEFINITIONS.filter((d) => !acceptedIds.has(d.id));

  return NextResponse.json({ quests: enriched, available });
}

// POST — accept a quest or update progress
export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const player = (session as any).player;
  if (!player) return NextResponse.json({ error: 'No player' }, { status: 404 });

  const body = await req.json();
  const { action, questId, progress } = body;

  if (action === 'accept') {
    const def = QUEST_DEFINITIONS.find((d) => d.id === questId);
    if (!def) return NextResponse.json({ error: 'Unknown quest' }, { status: 400 });

    // Check not already accepted
    const existing = await db
      .select()
      .from(quests)
      .where(and(eq(quests.playerId, player.id), eq(quests.questId, questId)))
      .limit(1);
    if (existing.length > 0) return NextResponse.json({ error: 'Already accepted' }, { status: 400 });

    const [newQuest] = await db.insert(quests).values({
      playerId: player.id,
      questId: def.id,
      target: def.target,
      rewardXp: def.rewardXp,
      rewardItemId: def.rewardItemId ?? null,
      rewardGold: def.rewardGold,
    }).returning();

    return NextResponse.json({ quest: newQuest });
  }

  if (action === 'progress') {
    // Update quest progress
    const [existing] = await db
      .select()
      .from(quests)
      .where(and(eq(quests.playerId, player.id), eq(quests.questId, questId), eq(quests.status, 'active')))
      .limit(1);
    if (!existing) return NextResponse.json({ error: 'Quest not found or not active' }, { status: 404 });

    const newProgress = Math.min(existing.target, (existing.progress ?? 0) + (progress ?? 1));
    const completed = newProgress >= existing.target;

    await db.update(quests).set({
      progress: newProgress,
      ...(completed ? { status: 'completed', completedAt: new Date() } : {}),
    }).where(eq(quests.id, existing.id));

    // If completed, grant rewards
    if (completed) {
      await db.update(players).set({
        xp: (player.xp ?? 0) + (existing.rewardXp ?? 0),
        gold: (player.gold ?? 0) + (existing.rewardGold ?? 0),
      }).where(eq(players.id, player.id));

      // Grant item reward if any
      if (existing.rewardItemId) {
        await db.insert(inventory).values({
          playerId: player.id,
          itemId: existing.rewardItemId,
          itemType: existing.rewardItemId.includes('sword') || existing.rewardItemId.includes('blade') || existing.rewardItemId.includes('axe') ? 'weapon' : 'armor',
          unlockedBy: 'quest',
        });
      }
    }

    return NextResponse.json({ progress: newProgress, completed });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
