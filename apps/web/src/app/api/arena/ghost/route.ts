import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@midforge/db/client';
import { players, arenaFights, gameEvents } from '@midforge/db/schema';
import { eq } from 'drizzle-orm';
import { ITEMS, type ItemKey, calculateLevel } from '@midforge/shared/types';
import { calculateFight } from '@midforge/shared/combat';
import type { PlayerStats } from '@midforge/shared/types';
import { generateGhostOpponent, ghostToPlayerStats } from '@/game/arena/GhostOpponent';
import { awardXP } from '@/lib/xp';

function buildPlayerStats(p: any): PlayerStats {
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

// POST — fight a ghost opponent
export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const player = (session as any).player;
  if (!player) return NextResponse.json({ error: 'No player' }, { status: 404 });

  // Generate ghost based on player stats
  const fightsWon = player.arenaStreak ?? 0;
  const ghost = generateGhostOpponent(player.xp ?? 0, player.tier ?? 'villager', fightsWon);

  // Build stats for combat
  const challengerStats = buildPlayerStats(player);
  const ghostStats = ghostToPlayerStats(ghost, ITEMS as any);

  // Run combat simulation
  const result = calculateFight(challengerStats, ghostStats);

  const playerWon = result.winner === 'challenger';
  const xpReward = playerWon ? 100 : 30; // Ghost wins always give some XP
  const goldReward = playerWon ? 30 + Math.floor(Math.random() * 50) : 0;

  // Award XP
  const { newXP, evolved } = await awardXP(player.id, xpReward, 'arena_ghost');

  // Award gold
  if (goldReward > 0) {
    await db.update(players).set({
      gold: (player.gold ?? 0) + goldReward,
    }).where(eq(players.id, player.id));
  }

  // Update arena streak
  if (playerWon) {
    const today = new Date().toISOString().split('T')[0];
    await db.update(players).set({
      arenaStreak: (player.arenaStreak ?? 0) + 1,
      lastArenaDate: today,
    }).where(eq(players.id, player.id));
  }

  // Log game event
  if (playerWon) {
    await db.insert(gameEvents).values({
      playerId: player.id,
      eventType: 'arena_win',
      username: player.xUsername,
      metadata: {
        opponent: ghost.username,
        isGhost: true,
        streak: (player.arenaStreak ?? 0) + 1,
      },
    });
  }

  return NextResponse.json({
    fight: {
      winner: result.winner,
      playerWon,
      xpReward,
      goldReward,
      evolved,
      newXP,
      fightLog: result.fightLog,
      ghost: {
        username: ghost.username,
        tier: ghost.tier,
        level: ghost.level,
        isGhost: true,
        difficulty: ghost.difficulty,
      },
      shareCard: {
        title: playerWon
          ? `⚔️ @${player.xUsername} defeated ${ghost.username} in The Arena`
          : `⚔️ ${ghost.username} defeated @${player.xUsername} in The Arena`,
        subtitle: `+${xpReward} XP ${goldReward > 0 ? `· +${goldReward}G` : '· Keep training'}`,
        winnerStats: `Ghost Fighter · Difficulty ${Math.round(ghost.difficulty * 100)}%`,
        cta: 'Play at midforgegame.com →',
      },
    },
  });
}
