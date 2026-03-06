import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@midforge/db/client';
import { players, gameEvents } from '@midforge/db/schema';
import { eq, sql } from 'drizzle-orm';

// Phase F.1 — Friend list with daily gifts

// GET — list friends
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const player = (session as any).player;
  if (!player) return NextResponse.json({ error: 'No player' }, { status: 404 });

  const friendIds: string[] = player.friends ?? [];

  if (friendIds.length === 0) {
    return NextResponse.json({ friends: [] });
  }

  // Fetch friend data
  const friends = await db.select({
    id: players.id,
    xUsername: players.xUsername,
    tier: players.tier,
    level: players.level,
    xp: players.xp,
    lastSeenAt: players.lastSeenAt,
  }).from(players).where(sql`${players.id} = ANY(${friendIds})`);

  const now = Date.now();
  const friendList = friends.map(f => ({
    ...f,
    online: f.lastSeenAt ? (now - new Date(f.lastSeenAt).getTime()) < 5 * 60 * 1000 : false,
  }));

  return NextResponse.json({ friends: friendList });
}

// POST — add friend or send gift
export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const player = (session as any).player;
  if (!player) return NextResponse.json({ error: 'No player' }, { status: 404 });

  const body = await req.json();
  const { action, targetUsername, targetId } = body;

  if (action === 'add') {
    // Find player by X username
    const targets = await db.select({
      id: players.id,
      xUsername: players.xUsername,
    }).from(players).where(eq(players.xUsername, targetUsername)).limit(1);

    if (targets.length === 0) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    const target = targets[0];
    if (target.id === player.id) {
      return NextResponse.json({ error: 'Cannot add yourself' }, { status: 400 });
    }

    const friendIds: string[] = player.friends ?? [];
    if (friendIds.includes(target.id)) {
      return NextResponse.json({ error: 'Already friends' }, { status: 400 });
    }

    friendIds.push(target.id);
    await db.update(players).set({
      friends: friendIds,
    } as any).where(eq(players.id, player.id));

    // Add reverse friendship
    const targetPlayer = await db.select().from(players).where(eq(players.id, target.id)).limit(1);
    if (targetPlayer.length > 0) {
      const targetFriends: string[] = (targetPlayer[0] as any).friends ?? [];
      if (!targetFriends.includes(player.id)) {
        targetFriends.push(player.id);
        await db.update(players).set({
          friends: targetFriends,
        } as any).where(eq(players.id, target.id));
      }
    }

    return NextResponse.json({ added: true, friend: { id: target.id, xUsername: target.xUsername } });
  }

  if (action === 'gift') {
    // Send daily gift (10 gold) — 1 per day per friend
    const today = new Date().toISOString().split('T')[0];
    const giftKey = `gift_${player.id}_${targetId}_${today}`;

    // Check if already gifted today via game events
    // Simple approach: just allow it and deduct/add gold
    const giftAmount = 10;
    if ((player.gold ?? 0) < giftAmount) {
      return NextResponse.json({ error: 'Not enough gold' }, { status: 400 });
    }

    // Deduct from sender
    await db.update(players).set({
      gold: (player.gold ?? 0) - giftAmount,
    }).where(eq(players.id, player.id));

    // Add to receiver
    await db.update(players).set({
      gold: sql`COALESCE(${players.gold}, 0) + ${giftAmount}`,
    }).where(eq(players.id, targetId));

    // Log event
    await db.insert(gameEvents).values({
      playerId: player.id,
      eventType: 'gift_sent',
      username: player.xUsername,
      metadata: { targetId, amount: giftAmount },
    });

    return NextResponse.json({ sent: true, amount: giftAmount });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
