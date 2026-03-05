import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { awardXP } from '@/lib/xp';

export async function POST(req: Request) {
  const session = await auth();
  const playerId = (session as any)?.player?.id;
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const amount = typeof body.amount === 'number' ? Math.min(body.amount, 200) : 0;
  const source = typeof body.source === 'string' ? body.source : 'unknown';

  if (amount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });

  const result = await awardXP(playerId, amount, source);

  return NextResponse.json({ ok: true, ...result });
}
