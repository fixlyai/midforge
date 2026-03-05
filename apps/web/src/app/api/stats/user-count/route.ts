import { NextResponse } from 'next/server';
import { db } from '@midforge/db/client';
import { players } from '@midforge/db/schema';
import { count } from 'drizzle-orm';

// GET /api/stats/user-count
// Returns total verified player count for expanding world progress bars
export async function GET() {
  try {
    const result = await db.select({ count: count() }).from(players);
    return NextResponse.json({ count: result[0].count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
