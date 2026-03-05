import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@midforge/db/client';
import { players } from '@midforge/db/schema';
import { eq } from 'drizzle-orm';
import { calculateTier } from '@midforge/shared/types';

// POST — refresh X follower count from Twitter API v2
export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const player = (session as any).player;
  if (!player) return NextResponse.json({ error: 'No player' }, { status: 404 });

  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  if (!bearerToken) {
    return NextResponse.json({ error: 'Twitter API not configured' }, { status: 500 });
  }

  try {
    // Fetch user data from Twitter API v2
    const res = await fetch(
      `https://api.twitter.com/2/users/by/username/${player.xUsername}?user.fields=public_metrics`,
      {
        headers: { Authorization: `Bearer ${bearerToken}` },
        next: { revalidate: 0 },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Twitter API error: ${res.status}`, details: text }, { status: 502 });
    }

    const data = await res.json();
    const followers = data.data?.public_metrics?.followers_count ?? player.xFollowers ?? 0;

    // Update player and recalculate tier
    const tier = calculateTier(player.mrr ?? 0, followers);
    await db.update(players).set({
      xFollowers: followers,
      xFollowersVerifiedAt: new Date(),
      tier,
    }).where(eq(players.id, player.id));

    return NextResponse.json({
      followers,
      tier,
      synced: true,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
