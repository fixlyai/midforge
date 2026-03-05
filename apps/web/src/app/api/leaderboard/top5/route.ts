import { NextResponse } from 'next/server';
import { db } from '@midforge/db/client';
import { players } from '@midforge/db/schema';
import { desc } from 'drizzle-orm';

// GET /api/leaderboard/top5
// Returns top 5 players by XP with username, tier, mrr, followers, xp
export async function GET() {
  try {
    const top = await db
      .select({
        xUsername: players.xUsername,
        tier: players.tier,
        mrr: players.mrr,
        xFollowers: players.xFollowers,
        xp: players.xp,
        xProfileImageUrl: players.xProfileImageUrl,
      })
      .from(players)
      .orderBy(desc(players.xp))
      .limit(5);

    return NextResponse.json({ players: top });
  } catch {
    return NextResponse.json({ players: [] });
  }
}
