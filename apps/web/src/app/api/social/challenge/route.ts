import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@midforge/db/client';
import { players, gameEvents } from '@midforge/db/schema';
import { eq } from 'drizzle-orm';
import { ITEMS, type ItemKey } from '@midforge/shared/types';
import { calculateFight } from '@midforge/shared/combat';
import type { PlayerStats } from '@midforge/shared/types';
import { awardXP } from '@/lib/xp';

// Phase F.2 — Async challenge system
// Attacker fights defender's "ghost" stats. Result shared to both.

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

// POST — send async challenge
export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const player = (session as any).player;
  if (!player) return NextResponse.json({ error: 'No player' }, { status: 404 });

  const body = await req.json();
  const { targetId } = body;

  if (!targetId) return NextResponse.json({ error: 'Missing targetId' }, { status: 400 });
  if (targetId === player.id) return NextResponse.json({ error: 'Cannot challenge yourself' }, { status: 400 });

  // Fetch target player
  const targets = await db.select().from(players).where(eq(players.id, targetId)).limit(1);
  if (targets.length === 0) return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  const target = targets[0] as any;

  // Run combat
  const attackerStats = buildStats(player);
  const defenderStats = buildStats(target);
  const result = calculateFight(attackerStats, defenderStats);

  const attackerWon = result.winner === 'challenger';
  const xpReward = attackerWon ? 150 : 50;
  const goldReward = attackerWon ? 50 : 0;

  // Award XP to attacker
  await awardXP(player.id, xpReward, 'async_challenge');

  // Award consolation XP to defender
  await awardXP(target.id, attackerWon ? 25 : 75, 'async_challenge_defense');

  // Award gold
  if (goldReward > 0) {
    await db.update(players).set({
      gold: (player.gold ?? 0) + goldReward,
    }).where(eq(players.id, player.id));
  }

  // Log events for both players
  await db.insert(gameEvents).values([
    {
      playerId: player.id,
      eventType: 'challenge_sent',
      username: player.xUsername,
      metadata: {
        targetUsername: target.xUsername,
        won: attackerWon,
        xpReward,
      },
    },
    {
      playerId: target.id,
      eventType: 'challenge_received',
      username: target.xUsername,
      metadata: {
        fromUsername: player.xUsername,
        won: !attackerWon,
        xpReward: attackerWon ? 25 : 75,
      },
    },
  ]);

  return NextResponse.json({
    result: {
      winner: attackerWon ? player.xUsername : target.xUsername,
      attackerWon,
      xpReward,
      goldReward,
      fightLog: result.fightLog,
      defender: {
        username: target.xUsername,
        tier: target.tier,
        level: target.level,
      },
      shareText: attackerWon
        ? `⚔️ I challenged @${target.xUsername} in Midforge and won! +${xpReward}XP\n\nmidforgegame.com`
        : `⚔️ @${target.xUsername} defended against my challenge in Midforge!\n\nmidforgegame.com`,
    },
  });
}
