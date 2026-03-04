import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ArenaPreview } from '@/components/landing/ArenaPreview';

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  const session = await auth();
  if (session) redirect('/world');

  const tiers = [
    { name: 'Villager', emoji: '🧑‍🌾', color: '#8B7355', mrr: '$0', followers: '0' },
    { name: 'Apprentice', emoji: '⚒️', color: '#4A90D9', mrr: '$1K', followers: '1K' },
    { name: 'Merchant', emoji: '💰', color: '#7B68EE', mrr: '$5K', followers: '10K' },
    { name: 'Warrior', emoji: '⚔️', color: '#E74C3C', mrr: '$10K', followers: '50K' },
    { name: 'Legend', emoji: '👑', color: '#F39C12', mrr: '$50K', followers: '500K' },
  ];

  const fakeLeaderboard = [
    { rank: 1, name: '@revenue_king', tier: 'Legend', emoji: '👑', color: '#F39C12', mrr: '$52,400/mo', followers: '612K', xp: '48,200' },
    { rank: 2, name: '@saas_warrior', tier: 'Warrior', emoji: '⚔️', color: '#E74C3C', mrr: '$18,200/mo', followers: '89K', xp: '31,500' },
    { rank: 3, name: '@builder_ann', tier: 'Warrior', emoji: '⚔️', color: '#E74C3C', mrr: '$12,800/mo', followers: '67K', xp: '24,100' },
    { rank: 4, name: '@indie_maker', tier: 'Merchant', emoji: '💰', color: '#7B68EE', mrr: '$7,100/mo', followers: '23K', xp: '15,800' },
    { rank: 5, name: '@solofounder', tier: 'Apprentice', emoji: '⚒️', color: '#4A90D9', mrr: '$2,400/mo', followers: '4.2K', xp: '6,300' },
  ];

  return (
    <main className="min-h-screen flex flex-col items-center relative overflow-hidden">
      {/* Background grid overlay */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            'linear-gradient(rgba(243,156,18,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(243,156,18,0.3) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* ═══════════ HERO ═══════════ */}
      <div className="relative z-10 text-center px-4 sm:px-6 max-w-3xl mx-auto pt-16 sm:pt-24">
        <div className="animate-float mb-8">
          <div className="inline-block forge-panel px-4 sm:px-6 py-3 animate-badge-pulse">
            <span className="text-forge-amber font-pixel text-[9px] sm:text-xs tracking-wider">
              EARLY ACCESS — SEASON 0<span className="animate-blink">▮</span>
            </span>
          </div>
        </div>

        <h1 className="font-pixel text-xl sm:text-3xl md:text-4xl text-forge-amber leading-relaxed mb-6">
          Your revenue is
          <br />
          your power.
        </h1>

        <p className="font-pixel text-[9px] sm:text-xs md:text-sm text-forge-wheat/80 leading-loose mb-10 max-w-xl mx-auto">
          Connect Stripe + X. Watch your character evolve. Fight verified
          creators online. The more you earn IRL, the more powerful you become
          in-game.
        </p>

        <div className="tooltip-wrapper inline-block">
          <span className="tooltip-text font-pixel text-[7px] text-forge-wheat/70 bg-forge-dark/95 border border-forge-amber/30 px-3 py-2 rounded">
            Your character tier is calculated automatically from your verified stats
          </span>
          <Link href="/login" className="forge-btn text-[10px] sm:text-sm animate-pulse-glow inline-block">
            Enter with X →
          </Link>
        </div>

        <p className="font-pixel text-[8px] sm:text-[10px] text-forge-wheat/40 mt-4">
          Free to play · No email required · X login only
        </p>
      </div>

      {/* ═══════════ ARENA PREVIEW ═══════════ */}
      <div className="relative z-10 mt-16 sm:mt-20 w-full max-w-3xl px-4 sm:px-6">
        <ArenaPreview />
      </div>

      {/* ═══════════ LIVE COUNTER ═══════════ */}
      <div className="relative z-10 mt-10 sm:mt-12">
        <div className="forge-panel px-6 py-3 text-center">
          <span className="font-pixel text-[9px] sm:text-xs text-forge-green">
            ●
          </span>
          <span className="font-pixel text-[8px] sm:text-[10px] text-forge-wheat/60 ml-2">
            0 builders forging their empire right now
          </span>
        </div>
      </div>

      {/* ═══════════ TIER PROGRESSION ═══════════ */}
      <div className="relative z-10 mt-16 sm:mt-20 w-full max-w-4xl px-4 sm:px-6">
        <h2 className="font-pixel text-[10px] sm:text-xs text-center text-forge-wheat/60 mb-8 tracking-widest">
          TIER PROGRESSION
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className="forge-panel text-center py-4 transition-all duration-200 hover:border-forge-amber/80 cursor-default"
              style={{ ['--tw-shadow' as string]: '4px 4px 0px rgba(0,0,0,0.5)' }}
            >
              <div className="text-2xl mb-2">{tier.emoji}</div>
              <div
                className="w-10 h-14 mx-auto mb-3 border border-white/10"
                style={{ backgroundColor: tier.color }}
              />
              <p
                className="font-pixel text-[8px] sm:text-[9px] mb-1"
                style={{ color: tier.color }}
              >
                {tier.name}
              </p>
              <p className="font-pixel text-[7px] sm:text-[8px] text-forge-wheat/50">
                {tier.mrr} MRR
              </p>
              <p className="font-pixel text-[7px] sm:text-[8px] text-forge-wheat/50">
                {tier.followers} followers
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════ ARENA & DUNGEON EXPLAINER ═══════════ */}
      <div className="relative z-10 mt-16 sm:mt-20 w-full max-w-4xl px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Arena */}
          <div className="forge-panel">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">⚔️</span>
              <h3 className="font-pixel text-[10px] sm:text-xs text-forge-red">THE ARENA</h3>
            </div>
            <p className="font-pixel text-[7px] sm:text-[8px] text-forge-wheat/70 leading-relaxed mb-4">
              Challenge any player to a 1v1 fight. Your MRR determines your attack power.
              Your followers determine your defense. Winner takes 10% of the loser&apos;s XP.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-pixel text-[7px] text-forge-amber">▸</span>
                <span className="font-pixel text-[7px] text-forge-wheat/50">Real-time PvP combat</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-pixel text-[7px] text-forge-amber">▸</span>
                <span className="font-pixel text-[7px] text-forge-wheat/50">XP stakes every fight</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-pixel text-[7px] text-forge-amber">▸</span>
                <span className="font-pixel text-[7px] text-forge-wheat/50">Results auto-post to X</span>
              </div>
            </div>
          </div>

          {/* Dungeons */}
          <div className="forge-panel">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🏰</span>
              <h3 className="font-pixel text-[10px] sm:text-xs text-forge-purple">CO-OP DUNGEONS</h3>
            </div>
            <p className="font-pixel text-[7px] sm:text-[8px] text-forge-wheat/70 leading-relaxed mb-4">
              Team up with other creators to raid dungeons. Higher tiers unlock harder dungeons
              with better loot. Coordination is key — bring diverse builds.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-pixel text-[7px] text-forge-amber">▸</span>
                <span className="font-pixel text-[7px] text-forge-wheat/50">3-player co-op raids</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-pixel text-[7px] text-forge-amber">▸</span>
                <span className="font-pixel text-[7px] text-forge-wheat/50">Tier-gated dungeons</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-pixel text-[7px] text-forge-amber">▸</span>
                <span className="font-pixel text-[7px] text-forge-wheat/50">Exclusive gear drops</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ LEADERBOARD PREVIEW ═══════════ */}
      <div className="relative z-10 mt-16 sm:mt-20 w-full max-w-3xl px-4 sm:px-6">
        <h2 className="font-pixel text-[10px] sm:text-xs text-center text-forge-wheat/60 mb-6 tracking-widest">
          SEASON 0 — LEADERBOARD
        </h2>
        <div className="forge-panel overflow-hidden">
          <div className="grid grid-cols-[30px_1fr_70px_60px_50px] sm:grid-cols-[40px_1fr_90px_80px_70px] gap-1 sm:gap-2 font-pixel text-[6px] sm:text-[8px] text-forge-wheat/40 px-2 sm:px-3 py-2 border-b border-forge-amber/20">
            <span>#</span>
            <span>PLAYER</span>
            <span className="text-right">MRR</span>
            <span className="text-right">FOLLOW</span>
            <span className="text-right">XP</span>
          </div>
          {fakeLeaderboard.map((p) => (
            <div
              key={p.rank}
              className="grid grid-cols-[30px_1fr_70px_60px_50px] sm:grid-cols-[40px_1fr_90px_80px_70px] gap-1 sm:gap-2 items-center px-2 sm:px-3 py-2 sm:py-3 border-b border-forge-dark/50 last:border-0"
            >
              <span
                className="font-pixel text-[8px] sm:text-xs"
                style={{ color: p.rank <= 3 ? '#F39C12' : 'rgba(245,222,179,0.4)' }}
              >
                {p.rank}
              </span>
              <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                <span className="text-xs sm:text-sm flex-shrink-0">{p.emoji}</span>
                <div className="min-w-0">
                  <span
                    className="font-pixel text-[7px] sm:text-[9px] block truncate"
                    style={{ color: p.color }}
                  >
                    {p.name}
                  </span>
                </div>
              </div>
              <span className="font-pixel text-[7px] sm:text-[9px] text-forge-green text-right truncate">
                {p.mrr}
              </span>
              <span className="font-pixel text-[7px] sm:text-[9px] text-forge-blue text-right truncate">
                {p.followers}
              </span>
              <span className="font-pixel text-[7px] sm:text-[9px] text-forge-wheat/60 text-right">
                {p.xp}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════ BOTTOM CTA ═══════════ */}
      <div className="relative z-10 mt-16 sm:mt-20 text-center px-4">
        <h2 className="font-pixel text-sm sm:text-lg text-forge-amber mb-4">Ready to forge?</h2>
        <div className="tooltip-wrapper inline-block">
          <span className="tooltip-text font-pixel text-[7px] text-forge-wheat/70 bg-forge-dark/95 border border-forge-amber/30 px-3 py-2 rounded">
            Your character tier is calculated automatically from your verified stats
          </span>
          <Link href="/login" className="forge-btn text-[10px] sm:text-sm animate-pulse-glow inline-block">
            Enter with X →
          </Link>
        </div>
      </div>

      {/* ═══════════ FOOTER ═══════════ */}
      <div className="relative z-10 mt-12 sm:mt-16 mb-8">
        <p className="font-pixel text-[7px] sm:text-[8px] text-forge-wheat/30 tracking-widest text-center px-4">
          Built on Neon · Powered by real revenue · Forged in Midgard
        </p>
      </div>
    </main>
  );
}
