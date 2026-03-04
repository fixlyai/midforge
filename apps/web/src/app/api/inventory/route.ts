import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@midforge/db/client';
import { inventory, players } from '@midforge/db/schema';
import { eq, and } from 'drizzle-orm';
import { ITEMS, type ItemKey } from '@midforge/shared/types';

// GET — list player's inventory
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const player = (session as any).player;
  if (!player) return NextResponse.json({ error: 'No player' }, { status: 404 });

  const items = await db
    .select()
    .from(inventory)
    .where(eq(inventory.playerId, player.id));

  const enriched = items.map((i) => ({
    ...i,
    details: ITEMS[i.itemId as ItemKey] ?? null,
  }));

  return NextResponse.json({
    inventory: enriched,
    equipped: {
      weapon: player.equippedWeapon,
      armor: player.equippedArmor,
      helmet: player.equippedHelmet,
    },
  });
}

// POST — equip an item from inventory
export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const player = (session as any).player;
  if (!player) return NextResponse.json({ error: 'No player' }, { status: 404 });

  const { action, itemId } = await req.json();

  if (action === 'equip') {
    // Verify player owns item
    const [owned] = await db
      .select()
      .from(inventory)
      .where(and(eq(inventory.playerId, player.id), eq(inventory.itemId, itemId)))
      .limit(1);
    if (!owned) return NextResponse.json({ error: 'Item not in inventory' }, { status: 400 });

    const item = ITEMS[itemId as ItemKey];
    if (!item) return NextResponse.json({ error: 'Unknown item' }, { status: 400 });

    const updateData: Record<string, string> = {};
    if (item.type === 'weapon') updateData.equippedWeapon = itemId;
    else if (item.type === 'armor') updateData.equippedArmor = itemId;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Cannot equip this item type' }, { status: 400 });
    }

    await db.update(players).set(updateData).where(eq(players.id, player.id));

    return NextResponse.json({ equipped: itemId, slot: item.type });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
