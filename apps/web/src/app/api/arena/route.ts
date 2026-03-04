import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@midforge/db/client';
import { players, arenaFights } from '@midforge/db/schema';
import { eq } from 'drizzle-orm';
import { ITEMS, type ItemKey, calculateLevel, calculateTier } from '@midforge/shared/types';
import { calculateFight, type FightResult } from '@midforge/shared/combat';
import type { PlayerStats } from '@midforge/shared/types';

function buildStats(p: any): PlayerStats {
  const weapon = ITEMS[(p.equippedWeapon ?? 'wooden_sword') as ItemKey];
  const armor = ITEMS[(p.equippedArmor ?? 'cloth_tunic') as ItemKey];
  return {
    xUsername: p.xUsername,
    weaponPower: weapon.power,
    armorDefense: armor.defense,
    mrr: p.mrr ?? 0,
    followers: p.xFollowers ?? 0,
    xp: p.xp ?? 0,
    level: p.level ?? 1,
  };
}

// POST — start an arena fight
export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const challenger = (session as any).player;
  if (!challenger) return NextResponse.json({ error: 'No player' }, { status: 404 });

  const { defenderId } = await req.json();
  if (!defenderId) return NextResponse.json({ error: 'Missing defenderId' }, { status: 400 });
  if (defenderId === challenger.id) return NextResponse.json({ error: 'Cannot fight yourself' }, { status: 400 });

  // Fetch defender
  const [defender] = await db
    .select()
    .from(players)
    .where(eq(players.id, defenderId))
    .limit(1);
  if (!defender) return NextResponse.json({ error: 'Defender not found' }, { status: 404 });

  // Run combat simulation
  const cStats = buildStats(challenger);
  const dStats = buildStats(defender);
  const result: FightResult = calculateFight(cStats, dStats);

  const winnerId = result.winner === 'challenger' ? challenger.id : defender.id;
  const loserId = result.winner === 'challenger' ? defender.id : challenger.id;

  // Record the fight
  const [fight] = await db.insert(arenaFights).values({
    challengerId: challenger.id,
    defenderId: defender.id,
    winnerId,
    xpTransferred: result.xpTransferred,
    fightLog: result.fightLog,
  }).returning();

  // Transfer XP: winner gains, loser loses
  const [winner] = await db.select().from(players).where(eq(players.id, winnerId)).limit(1);
  const [loser] = await db.select().from(players).where(eq(players.id, loserId)).limit(1);

  if (winner && loser) {
    const newWinnerXp = (winner.xp ?? 0) + result.xpTransferred;
    const newLoserXp = Math.max(0, (loser.xp ?? 0) - result.xpTransferred);
    const winnerGoldReward = 50 + Math.floor(Math.random() * 100);

    await db.update(players).set({
      xp: newWinnerXp,
      level: calculateLevel(newWinnerXp),
      tier: calculateTier(winner.mrr ?? 0, winner.xFollowers ?? 0),
      gold: (winner.gold ?? 0) + winnerGoldReward,
    }).where(eq(players.id, winnerId));

    await db.update(players).set({
      xp: newLoserXp,
      level: calculateLevel(newLoserXp),
    }).where(eq(players.id, loserId));
  }

  return NextResponse.json({
    fight: {
      id: fight.id,
      winner: result.winner,
      winnerId,
      xpTransferred: result.xpTransferred,
      fightLog: result.fightLog,
      shareCard: result.shareCard,
    },
  });
}
