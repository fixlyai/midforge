import { NextResponse } from 'next/server';

// Phase F.3 — OG Share Card generator
// Returns HTML that can be rendered as an OG image via Vercel OG or screenshot
// For now, returns structured data for client-side canvas rendering

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const winner = searchParams.get('winner') ?? 'Player';
  const loser = searchParams.get('loser') ?? 'Ghost';
  const xp = searchParams.get('xp') ?? '0';
  const gold = searchParams.get('gold') ?? '0';
  const loot = searchParams.get('loot') ?? '';
  const type = searchParams.get('type') ?? 'arena'; // arena, challenge, achievement

  const shareText = type === 'achievement'
    ? `🏆 ${winner} unlocked "${loser}" in Midforge!\n\nmidforgegame.com`
    : type === 'challenge'
      ? `⚔️ ${winner} challenged ${loser} in Midforge!\n+${xp} XP${gold !== '0' ? ` · +${gold}G` : ''}${loot ? ` · 🎁 ${loot}` : ''}\n\nmidforgegame.com`
      : `⚔️ ${winner} defeated ${loser} in The Arena!\n+${xp} XP${gold !== '0' ? ` · +${gold}G` : ''}${loot ? ` · 🎁 ${loot}` : ''}\n\nmidforgegame.com`;

  const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`;

  // Return card data + pre-built tweet URL
  return NextResponse.json({
    card: {
      type,
      winner,
      loser,
      xp: parseInt(xp),
      gold: parseInt(gold),
      loot: loot || null,
      shareText,
      tweetUrl,
      ogTitle: type === 'achievement'
        ? `${winner} unlocked "${loser}" | Midforge`
        : `${winner} vs ${loser} | Midforge Arena`,
      ogDescription: type === 'achievement'
        ? `Achievement unlocked in the pixel RPG`
        : `+${xp} XP${gold !== '0' ? ` · +${gold}G` : ''} — Battle in the pixel RPG arena`,
    },
  });
}
