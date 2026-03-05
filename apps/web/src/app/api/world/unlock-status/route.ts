import { NextResponse } from 'next/server';
import { db } from '@midforge/db/client';
import { players } from '@midforge/db/schema';
import { count } from 'drizzle-orm';

const ZONE_THRESHOLDS: Record<number, string> = {
  100: 'future_mines',
  500: 'future_harbor',
  1000: 'future_academy',
  5000: 'future_castle_interior',
};

export async function GET() {
  try {
    const result = await db.select({ count: count() }).from(players);
    const userCount = result[0]?.count ?? 0;

    const unlockedZones = Object.entries(ZONE_THRESHOLDS)
      .filter(([threshold]) => userCount >= Number(threshold))
      .map(([, zoneName]) => zoneName);

    return NextResponse.json({ userCount, unlockedZones });
  } catch (_err) {
    return NextResponse.json({ userCount: 0, unlockedZones: [] });
  }
}
