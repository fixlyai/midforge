import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@midforge/db/client';
import { players } from '@midforge/db/schema';
import { eq } from 'drizzle-orm';

// Phase E.3 — Idle income calculation
// Gold generated while offline based on tier
const TIER_HOURLY_GOLD: Record<string, number> = {
  villager: 2,
  apprentice: 5,
  merchant: 12,
  warrior: 25,
  legend: 50,
};

const MAX_OFFLINE_HOURS = 24;

// GET — calculate idle income since last seen
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const player = (session as any).player;
  if (!player) return NextResponse.json({ error: 'No player' }, { status: 404 });

  const lastSeen = player.lastSeenAt ? new Date(player.lastSeenAt).getTime() : Date.now();
  const now = Date.now();
  const hoursAway = Math.min(MAX_OFFLINE_HOURS, (now - lastSeen) / (1000 * 60 * 60));

  if (hoursAway < 0.1) {
    return NextResponse.json({ idleGold: 0, hoursAway: 0 });
  }

  const hourlyRate = TIER_HOURLY_GOLD[player.tier ?? 'villager'] ?? 2;
  const idleGold = Math.floor(hoursAway * hourlyRate);

  return NextResponse.json({
    idleGold,
    hoursAway: Math.round(hoursAway * 10) / 10,
    tier: player.tier,
    hourlyRate,
  });
}

// POST — claim idle income
export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const player = (session as any).player;
  if (!player) return NextResponse.json({ error: 'No player' }, { status: 404 });

  const lastSeen = player.lastSeenAt ? new Date(player.lastSeenAt).getTime() : Date.now();
  const now = Date.now();
  const hoursAway = Math.min(MAX_OFFLINE_HOURS, (now - lastSeen) / (1000 * 60 * 60));

  if (hoursAway < 0.1) {
    return NextResponse.json({ claimed: false, idleGold: 0 });
  }

  const hourlyRate = TIER_HOURLY_GOLD[player.tier ?? 'villager'] ?? 2;
  const idleGold = Math.floor(hoursAway * hourlyRate);

  if (idleGold > 0) {
    await db.update(players).set({
      gold: (player.gold ?? 0) + idleGold,
      lastSeenAt: new Date(),
    }).where(eq(players.id, player.id));
  }

  return NextResponse.json({
    claimed: true,
    idleGold,
    hoursAway: Math.round(hoursAway * 10) / 10,
  });
}
