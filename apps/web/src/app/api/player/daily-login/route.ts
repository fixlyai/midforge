import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@midforge/db/client';
import { players, gameEvents } from '@midforge/db/schema';
import { eq } from 'drizzle-orm';
import { awardXP } from '@/lib/xp';
import { DAILY_REWARDS } from '@/game/data/npcQuests';

// POST — claim daily login reward
export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const player = (session as any).player;
  if (!player) return NextResponse.json({ error: 'No player' }, { status: 404 });

  const today = new Date().toISOString().split('T')[0];
  const lastLogin = player.lastLoginDate ?? '';
  const currentStreak = player.loginStreak ?? 0;

  // Already claimed today
  if (lastLogin === today) {
    return NextResponse.json({
      alreadyClaimed: true,
      streak: currentStreak,
      reward: null,
    });
  }

  // Calculate streak
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const isConsecutive = lastLogin === yesterday;
  const newStreak = isConsecutive ? Math.min(currentStreak + 1, 7) : 1;

  // Get reward for current day in streak
  const dayKey = `day${newStreak}` as keyof typeof DAILY_REWARDS;
  const reward = DAILY_REWARDS[dayKey] ?? { xp: 25, gold: 10, label: 'Day 1' };

  // Award XP
  await awardXP(player.id, reward.xp, 'daily_login');

  // Award gold + update streak
  await db.update(players).set({
    gold: (player.gold ?? 0) + reward.gold,
    loginStreak: newStreak,
    lastLoginDate: today,
    lastSeenAt: new Date(),
  }).where(eq(players.id, player.id));

  // Log game event
  await db.insert(gameEvents).values({
    playerId: player.id,
    eventType: newStreak >= 7 ? 'login_streak_7' : 'daily_login',
    username: player.xUsername,
    metadata: { streak: newStreak, day: dayKey },
  });

  return NextResponse.json({
    alreadyClaimed: false,
    streak: newStreak,
    reward: {
      xp: reward.xp,
      gold: reward.gold,
      label: reward.label,
    },
  });
}
