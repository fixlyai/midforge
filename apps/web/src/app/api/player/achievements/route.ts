import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@midforge/db/client';
import { players, gameEvents } from '@midforge/db/schema';
import { eq } from 'drizzle-orm';
import { ACHIEVEMENTS, type AchievementDef } from '@/game/data/lootTable';

// GET — fetch player's achievement progress
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const player = (session as any).player;
  if (!player) return NextResponse.json({ error: 'No player' }, { status: 404 });

  const unlockedIds: string[] = player.achievements ?? [];

  // Build progress for each achievement based on player stats
  const stats: Record<string, number> = {
    arena_wins: player.arenaStreak ?? 0,
    brigand_kills: 0, // tracked via game events
    critical_hits: 0,
    zones_visited: 0,
    tiles_walked: player.tilesWalked ?? 0,
    nuggets_collected: 0,
    stars_caught: 0,
    npcs_talked: 0,
    gifts_sent: 0,
    challenges_sent: 0,
    unique_items: 0,
    rare_items_found: 0,
    epic_items_found: 0,
    legendary_items_found: 0,
    login_days: player.loginStreak ?? 0,
    login_streak: player.loginStreak ?? 0,
    total_gold: player.gold ?? 0,
    quests_completed: 0,
    evolutions: player.characterForm === 'base' ? 0 : 1,
    stripe_connected: player.stripeAccountId ? 1 : 0,
  };

  const achievements = ACHIEVEMENTS.map((a: AchievementDef) => ({
    ...a,
    unlocked: unlockedIds.includes(a.id),
    progress: Math.min(stats[a.condition.type] ?? 0, a.condition.target),
    target: a.condition.target,
  }));

  return NextResponse.json({
    achievements,
    totalUnlocked: unlockedIds.length,
    totalAvailable: ACHIEVEMENTS.length,
  });
}

// POST — check and unlock new achievements
export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const player = (session as any).player;
  if (!player) return NextResponse.json({ error: 'No player' }, { status: 404 });

  const body = await req.json();
  const { type, value } = body; // e.g. { type: 'arena_wins', value: 5 }

  const unlockedIds: string[] = player.achievements ?? [];
  const newlyUnlocked: AchievementDef[] = [];

  for (const a of ACHIEVEMENTS) {
    if (unlockedIds.includes(a.id)) continue;
    if (a.condition.type === type && (value ?? 0) >= a.condition.target) {
      unlockedIds.push(a.id);
      newlyUnlocked.push(a);
    }
  }

  if (newlyUnlocked.length > 0) {
    await db.update(players).set({
      achievements: unlockedIds,
    } as any).where(eq(players.id, player.id));

    for (const a of newlyUnlocked) {
      await db.insert(gameEvents).values({
        playerId: player.id,
        eventType: 'achievement_unlocked',
        username: player.xUsername,
        metadata: { achievementId: a.id, title: a.title },
      });
    }
  }

  return NextResponse.json({
    newlyUnlocked: newlyUnlocked.map(a => ({ id: a.id, title: a.title, icon: a.icon })),
  });
}
