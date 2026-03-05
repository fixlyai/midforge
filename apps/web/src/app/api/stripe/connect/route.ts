import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@midforge/db/client';
import { players } from '@midforge/db/schema';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';
import { calculateTier } from '@midforge/shared/types';

// Lazy-init: Stripe client must NOT be created at module scope
// because env vars aren't available during Next.js build (page data collection)
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-04-10' as any,
    });
  }
  return _stripe;
}

// GET — initiate Stripe Connect OAuth (redirect URL)
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const player = (session as any).player;
  if (!player) return NextResponse.json({ error: 'No player' }, { status: 404 });

  // If already connected, return status
  if (player.stripeAccountId) {
    return NextResponse.json({ connected: true, stripeAccountId: player.stripeAccountId });
  }

  // Create Stripe Connect account link (Standard Connect)
  try {
    // Create a connected account if none exists
    const account = await getStripe().accounts.create({
      type: 'standard',
      metadata: { midforge_player_id: player.id },
    });

    // Save account ID immediately
    await db.update(players).set({
      stripeAccountId: account.id,
    }).where(eq(players.id, player.id));

    // Generate onboarding link
    const baseUrl = process.env.NEXTAUTH_URL || 'https://midforgegame.com';
    const accountLink = await getStripe().accountLinks.create({
      account: account.id,
      refresh_url: `${baseUrl}/world?stripe=refresh`,
      return_url: `${baseUrl}/world?stripe=connected`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — sync MRR from Stripe (called after connect or periodically)
export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const player = (session as any).player;
  if (!player) return NextResponse.json({ error: 'No player' }, { status: 404 });

  if (!player.stripeAccountId) {
    return NextResponse.json({ error: 'Stripe not connected' }, { status: 400 });
  }

  try {
    // Fetch MRR from Stripe — sum of active subscription amounts
    const subscriptions = await getStripe().subscriptions.list(
      { status: 'active', limit: 100 },
      { stripeAccount: player.stripeAccountId },
    );

    let mrrCents = 0;
    for (const sub of subscriptions.data) {
      for (const item of sub.items.data) {
        const amount = item.price?.unit_amount ?? 0;
        const interval = item.price?.recurring?.interval;
        // Normalize to monthly
        if (interval === 'year') {
          mrrCents += Math.round(amount / 12);
        } else if (interval === 'month') {
          mrrCents += amount;
        } else if (interval === 'week') {
          mrrCents += Math.round(amount * 4.33);
        }
      }
    }

    // Update player MRR and recalculate tier
    const tier = calculateTier(mrrCents, player.xFollowers ?? 0);
    await db.update(players).set({
      mrr: mrrCents,
      mrrVerifiedAt: new Date(),
      tier,
    }).where(eq(players.id, player.id));

    return NextResponse.json({
      mrr: mrrCents,
      mrrDollars: (mrrCents / 100).toFixed(2),
      tier,
      synced: true,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
