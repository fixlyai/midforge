import { NextResponse } from 'next/server';
import { db } from '@midforge/db/client';
import { gameEvents } from '@midforge/db/schema';
import { desc } from 'drizzle-orm';

// GET — fetch recent game events for activity feed ticker
export async function GET() {
  try {
    const events = await db
      .select({
        eventType: gameEvents.eventType,
        username: gameEvents.username,
        metadata: gameEvents.metadata,
        createdAt: gameEvents.createdAt,
      })
      .from(gameEvents)
      .orderBy(desc(gameEvents.createdAt))
      .limit(20);

    // Format into display strings
    const feed = events.map(e => {
      const meta = (e.metadata ?? {}) as Record<string, any>;
      switch (e.eventType) {
        case 'arena_win':
          return `⚔️ @${e.username} won an Arena fight${meta.isGhost ? ' vs Ghost' : ''}`;
        case 'quest_complete':
          return `📜 @${e.username} completed a quest`;
        case 'evolution':
          return `✨ @${e.username} evolved to a new form`;
        case 'tier_up':
          return `🏆 @${e.username} reached ${meta.tier ?? 'a new'} tier`;
        case 'new_player':
          return `👋 @${e.username} joined Midforge`;
        default:
          return `🔔 @${e.username} did something`;
      }
    });

    return NextResponse.json({ feed });
  } catch (_e) {
    return NextResponse.json({ feed: [] });
  }
}
