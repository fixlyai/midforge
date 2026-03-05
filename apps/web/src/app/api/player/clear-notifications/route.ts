import { auth } from '@/lib/auth';
import { db } from '@midforge/db/client';
import { players } from '@midforge/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const player = (session as any).player;
  if (!player?.id) return NextResponse.json({ error: 'No player' }, { status: 400 });

  await db
    .update(players)
    .set({ pendingNotifications: [] })
    .where(eq(players.id, player.id));

  return NextResponse.json({ ok: true });
}
