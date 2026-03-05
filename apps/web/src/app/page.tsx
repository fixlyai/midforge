import Link from 'next/link';
import { auth } from '@/lib/auth';
import { ArenaPreview } from '@/components/landing/ArenaPreview';
import { LiveCounter } from '@/components/landing/LiveCounter';
import { WorldZones } from '@/components/landing/WorldZones';
import { Leaderboard } from '@/components/landing/Leaderboard';
import { LandingUserMenu } from '@/components/landing/LandingUserMenu';

export const dynamic = 'force-dynamic';

const tiers = [
  { name: 'Villager', emoji: '🧑‍🌾', color: '#8B7355', mrr: '$0', followers: '0', flavor: 'Every legend starts here.' },
  { name: 'Apprentice', emoji: '⚒️', color: '#4A90D9', mrr: '$1K', followers: '1K', flavor: 'The forge begins to notice you.' },
  { name: 'Merchant', emoji: '💰', color: '#7B68EE', mrr: '$5K', followers: '10K', flavor: 'Gold flows to those who move.' },
  { name: 'Warrior', emoji: '⚔️', color: '#E74C3C', mrr: '$10K', followers: '50K', flavor: 'The Arena fears your name.' },
  { name: 'Legend', emoji: '👑', color: '#F39C12', mrr: '$50K', followers: '500K', flavor: 'The Castle gates open for you alone.' },
];

export default async function LandingPage() {
  const session = await auth();
  const player = session ? (session as any).player : null;
  const username = player?.xUsername ?? null;

  return (
    <main
      className="min-h-screen flex flex-col items-center relative overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at 50% 0%, #2a1245 0%, #0d0a1e 60%, #050308 100%)',
      }}
    >
      {/* Pixel grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 16 0 L 0 0 0 16' fill='none' stroke='%23ffffff' stroke-width='0.3' opacity='0.04'/%3E%3C/svg%3E")`,
        }}
      />

      {/* ═══════════ TOP-RIGHT USER MENU (logged-in) ═══════════ */}
      {username && <LandingUserMenu username={username} />}

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative z-10 text-center px-4 sm:px-6 max-w-[900px] mx-auto pt-16 sm:pt-24">
        <div className="animate-float mb-8">
          <div className="inline-block forge-panel px-4 sm:px-6 py-3 animate-badge-pulse">
            <span className="text-forge-amber font-pixel text-[9px] sm:text-xs tracking-wider">
              EARLY ACCESS — SEASON 0<span className="animate-blink ml-1">|</span>
            </span>
          </div>
        </div>

        <h1
          className="font-pixel text-forge-amber mb-6"
          style={{
            fontSize: 'clamp(28px, 5vw, 52px)',
            letterSpacing: '0.04em',
            lineHeight: '1.9',
            textShadow: '0 0 40px rgba(243,156,18,0.3)',
          }}
        >
          Your revenue is
          <br />
          your power.
        </h1>

        <p className="font-pixel text-[8px] sm:text-[10px] md:text-xs text-forge-wheat/80 leading-loose mb-10 max-w-xl mx-auto">
          Connect Stripe + X. Your verified MRR and followers determine your character tier,
          your gear, and your power in the Arena. The more you build IRL — the stronger you
          become here.
        </p>

        {username ? (
          <Link
            href="/world"
            className="forge-btn text-[10px] sm:text-sm animate-pulse-glow inline-block w-full sm:w-auto"
          >
            Continue as @{username} →
          </Link>
        ) : (
          <div className="tooltip-wrapper inline-block w-full sm:w-auto">
            <span className="tooltip-text font-pixel text-[7px] text-forge-wheat/70 bg-forge-dark/95 border border-forge-amber/30 px-3 py-2 rounded">
              Your character tier is calculated automatically from your verified stats
            </span>
            <Link
              href="/login"
              className="forge-btn text-[10px] sm:text-sm animate-pulse-glow inline-block w-full sm:w-auto"
            >
              Enter with X →
            </Link>
          </div>
        )}

        <p className="font-pixel text-[8px] sm:text-[10px] text-forge-wheat/40 mt-4">
          Free to play · No email required · X login only
        </p>

        {/* Live counter */}
        <div className="mt-8">
          <LiveCounter />
        </div>
      </section>

      {/* ═══════════ ARENA PREVIEW ═══════════ */}
      <section className="relative z-10 mt-20 sm:mt-28 w-full max-w-[900px] px-4 sm:px-6">
        <ArenaPreview />
        <p className="font-pixel text-[7px] sm:text-[8px] text-forge-wheat/30 text-center mt-3">
          Every fight is broadcast live to X · Results posted automatically
        </p>
      </section>

      {/* ═══════════ THE WORLD (new section) ═══════════ */}
      <section className="relative z-10 mt-20 sm:mt-28 w-full">
        <WorldZones />
      </section>

      {/* ═══════════ TIER PROGRESSION ═══════════ */}
      <section className="relative z-10 mt-20 sm:mt-28 w-full max-w-[900px] px-4 sm:px-6">
        <h2 className="font-pixel text-[10px] sm:text-xs text-center text-forge-wheat/60 mb-2 tracking-widest">
          TIER PROGRESSION
        </h2>
        <p className="font-pixel text-[7px] sm:text-[8px] text-center text-forge-wheat/40 mb-8">
          Your tier is determined automatically. Connect Stripe + X to be placed.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {tiers.map((tier) => {
            const isLegend = tier.name === 'Legend';
            return (
              <div
                key={tier.name}
                className={`forge-panel text-center py-4 transition-all duration-200 cursor-default group ${
                  isLegend ? 'animate-legend-shimmer' : ''
                }`}
                style={{
                  background: `linear-gradient(135deg, ${tier.color}10 0%, transparent 60%), rgba(26,10,46,0.9)`,
                }}
              >
                <div className={`text-2xl mb-2 ${isLegend ? 'animate-pulse' : ''}`}>
                  {tier.emoji}
                </div>
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
                <p className="font-pixel text-[7px] sm:text-[8px] text-forge-wheat/50 mb-2">
                  {tier.followers} followers
                </p>
                <p className="font-pixel text-[6px] sm:text-[7px] text-forge-wheat/30 italic">
                  {tier.flavor}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════════ ARENA & DUNGEON EXPLAINER ═══════════ */}
      <section className="relative z-10 mt-20 sm:mt-28 w-full max-w-[900px] px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </section>

      {/* ═══════════ LEADERBOARD ═══════════ */}
      <section className="relative z-10 mt-20 sm:mt-28 w-full max-w-[700px] px-4 sm:px-6">
        <h2 className="font-pixel text-[10px] sm:text-xs text-center text-forge-wheat/60 mb-6 tracking-widest">
          LEADERBOARD
        </h2>
        <Leaderboard />
      </section>

      {/* ═══════════ BOTTOM CTA ═══════════ */}
      <section className="relative z-10 mt-20 sm:mt-28 text-center px-4">
        <h2 className="font-pixel text-sm sm:text-lg text-forge-amber mb-4">Ready to forge?</h2>
        {username ? (
          <Link
            href="/world"
            className="forge-btn text-[10px] sm:text-sm animate-pulse-glow inline-block"
          >
            Continue as @{username} →
          </Link>
        ) : (
          <div className="tooltip-wrapper inline-block">
            <span className="tooltip-text font-pixel text-[7px] text-forge-wheat/70 bg-forge-dark/95 border border-forge-amber/30 px-3 py-2 rounded">
              Your character tier is calculated automatically from your verified stats
            </span>
            <Link
              href="/login"
              className="forge-btn text-[10px] sm:text-sm animate-pulse-glow inline-block"
            >
              Enter with X →
            </Link>
          </div>
        )}
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="relative z-10 mt-16 sm:mt-20 mb-8 w-full max-w-[900px] px-4 text-center">
        <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
          <Link href="/privacy" className="font-pixel text-[7px] text-forge-wheat/30 hover:text-forge-wheat/60 transition-colors">
            Privacy Policy
          </Link>
          <span className="font-pixel text-[7px] text-forge-wheat/20">·</span>
          <Link href="/terms" className="font-pixel text-[7px] text-forge-wheat/30 hover:text-forge-wheat/60 transition-colors">
            Terms
          </Link>
          <span className="font-pixel text-[7px] text-forge-wheat/20">·</span>
          <a
            href="https://x.com/midforgegame"
            target="_blank"
            rel="noopener noreferrer"
            className="font-pixel text-[7px] text-forge-wheat/30 hover:text-forge-wheat/60 transition-colors"
          >
            @midforgegame
          </a>
          <span className="font-pixel text-[7px] text-forge-wheat/20">·</span>
          <a href="#" className="font-pixel text-[7px] text-forge-wheat/30 hover:text-forge-wheat/60 transition-colors">
            Discord
          </a>
        </div>
        <p className="font-pixel text-[7px] sm:text-[8px] text-forge-wheat/30 tracking-widest">
          Built on Neon · Powered by{' '}
          <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="hover:text-forge-wheat/60 transition-colors">
            Vercel
          </a>
          {' '}· Forged in Midgard
        </p>
        <p className="font-pixel text-[6px] text-forge-wheat/15 mt-2">
          © 2025 Midforge · Season 0
        </p>
      </footer>
    </main>
  );
}
