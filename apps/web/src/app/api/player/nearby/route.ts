import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@midforge/db/client';
import { players } from '@midforge/db/schema';
import { eq, ne, gt, sql } from 'drizzle-orm';

// POST — save current player position + return nearby players
export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const player = (session as any).player;
  if (!player?.id) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { x, y } = body;

    // Update current player position + lastSeenAt
    if (typeof x === 'number' && typeof y === 'number') {
      await db.update(players).set({
        positionX: x,
        positionY: y,
        lastSeenAt: new Date(),
      }).where(eq(players.id, player.id));
    }

    // Fetch other players active in last 15 minutes (max 10)
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);

    const nearby = await db.select({
      id: players.id,
      username: players.xUsername,
      tier: players.tier,
      level: players.level,
      xp: players.xp,
      positionX: players.positionX,
      positionY: players.positionY,
      characterForm: players.characterForm,
    })
      .from(players)
      .where(
        sql`${players.id} != ${player.id} AND ${players.lastSeenAt} > ${fifteenMinAgo}`
      )
      .limit(10);

    return NextResponse.json({ players: nearby });
  } catch (err) {
    console.error('nearby error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// GET — just fetch nearby players without updating position
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const player = (session as any).player;
  if (!player?.id) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  }

  try {
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);

    const nearby = await db.select({
      id: players.id,
      username: players.xUsername,
      tier: players.tier,
      level: players.level,
      xp: players.xp,
      positionX: players.positionX,
      positionY: players.positionY,
      characterForm: players.characterForm,
    })
      .from(players)
      .where(
        sql`${players.id} != ${player.id} AND ${players.lastSeenAt} > ${fifteenMinAgo}`
      )
      .limit(10);

    return NextResponse.json({ players: nearby });
  } catch (err) {
    console.error('nearby error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
