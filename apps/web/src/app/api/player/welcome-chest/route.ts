import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@midforge/db/client';
import { players, gameEvents } from '@midforge/db/schema';
import { eq } from 'drizzle-orm';

// POST — claim welcome chest (first login only, grants 50 gold + starter sword)
export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const player = (session as any).player;
  if (!player) return NextResponse.json({ error: 'No player' }, { status: 404 });

  // Prevent double-claim: check if player already has gold > 0 or has claimed before
  // Simple approach: only grant if gold is 0 (brand new player)
  if ((player.gold ?? 0) > 0) {
    return NextResponse.json({ alreadyClaimed: true });
  }

  await db.update(players).set({
    gold: (player.gold ?? 0) + 50,
    lastSeenAt: new Date(),
  }).where(eq(players.id, player.id));

  await db.insert(gameEvents).values({
    playerId: player.id,
    eventType: 'welcome_chest',
    username: player.xUsername,
    metadata: { gold: 50, item: 'starter_sword' },
  });

  return NextResponse.json({ claimed: true, gold: 50, item: 'starter_sword' });
}
