import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@midforge/db/client';
import { marketplace, players } from '@midforge/db/schema';
import { eq, and, desc } from 'drizzle-orm';

// GET — list active marketplace listings
export async function GET() {
  const listings = await db
    .select({
      id: marketplace.id,
      title: marketplace.title,
      description: marketplace.description,
      type: marketplace.type,
      priceUsd: marketplace.priceUsd,
      pricingModel: marketplace.pricingModel,
      salesCount: marketplace.salesCount,
      createdAt: marketplace.createdAt,
      sellerUsername: players.xUsername,
      sellerTier: players.tier,
    })
    .from(marketplace)
    .leftJoin(players, eq(marketplace.sellerId, players.id))
    .where(eq(marketplace.active, true))
    .orderBy(desc(marketplace.salesCount))
    .limit(50);

  return NextResponse.json({ listings });
}

// POST — create a new listing or buy an existing one
export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const player = (session as any).player;
  if (!player) return NextResponse.json({ error: 'No player' }, { status: 404 });

  const body = await req.json();
  const { action } = body;

  if (action === 'create') {
    const { title, description, type, priceUsd, pricingModel } = body;
    if (!title || !type || !priceUsd) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const [listing] = await db.insert(marketplace).values({
      sellerId: player.id,
      title,
      description: description ?? null,
      type,
      priceUsd,
      pricingModel: pricingModel ?? 'one_time',
    }).returning();

    return NextResponse.json({ listing });
  }

  if (action === 'buy') {
    const { listingId } = body;
    if (!listingId) return NextResponse.json({ error: 'Missing listingId' }, { status: 400 });

    const [listing] = await db
      .select()
      .from(marketplace)
      .where(and(eq(marketplace.id, listingId), eq(marketplace.active, true)))
      .limit(1);
    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });

    // Check player has enough gold (1 gold = $0.01 USD equivalent for in-game)
    const goldCost = listing.priceUsd; // 1:1 cents to gold
    if ((player.gold ?? 0) < goldCost) {
      return NextResponse.json({ error: 'Not enough gold' }, { status: 400 });
    }

    // Deduct gold from buyer
    await db.update(players).set({
      gold: (player.gold ?? 0) - goldCost,
    }).where(eq(players.id, player.id));

    // Credit gold to seller
    const [seller] = await db
      .select()
      .from(players)
      .where(eq(players.id, listing.sellerId!))
      .limit(1);
    if (seller) {
      await db.update(players).set({
        gold: (seller.gold ?? 0) + goldCost,
      }).where(eq(players.id, seller.id));
    }

    // Increment sales count
    await db.update(marketplace).set({
      salesCount: (listing.salesCount ?? 0) + 1,
    }).where(eq(marketplace.id, listing.id));

    return NextResponse.json({ success: true, goldSpent: goldCost });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
