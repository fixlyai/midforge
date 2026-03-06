import Link from 'next/link';
import { auth } from '@/lib/auth';
import { ArenaPreview } from '@/components/landing/ArenaPreview';
import { LiveCounter } from '@/components/landing/LiveCounter';
import { WorldZones } from '@/components/landing/WorldZones';
import { Leaderboard } from '@/components/landing/Leaderboard';
import { LandingUserMenu } from '@/components/landing/LandingUserMenu';
import { StarField } from '@/components/landing/StarField';
import { ScrollReveal } from '@/components/landing/ScrollReveal';
import { SpriteAnim } from '@/components/landing/SpriteAnim';

export const dynamic = 'force-dynamic';

const tiers = [
  { name: 'Villager', color: '#888888', mrr: '$0', followers: '0', flavor: 'Every legend starts here.', sprite: '/assets/characters/Player_Base_animations.png', frameW: 64, frameH: 64, cols: 9 },
  { name: 'Apprentice', color: '#3498DB', mrr: '$1K', followers: '1K', flavor: 'The forge begins to notice you.', sprite: '/assets/characters/enemies/Knights/Archer.png', frameW: 48, frameH: 48, cols: 6 },
  { name: 'Merchant', color: '#8E44AD', mrr: '$5K', followers: '10K', flavor: 'Gold flows to those who move.', sprite: '/assets/characters/enemies/Knights/Swordman.png', frameW: 48, frameH: 48, cols: 6 },
  { name: 'Warrior', color: '#E74C3C', mrr: '$10K', followers: '50K', flavor: 'The Arena fears your name.', sprite: '/assets/characters/enemies/Orcs/Orc_Chief.png', frameW: 64, frameH: 64, cols: 8 },
  { name: 'Legend', color: '#FFB800', mrr: '$50K', followers: '500K', flavor: 'The Castle gates open for you alone.', sprite: '/assets/characters/enemies/Angels/Angel_1.png', frameW: 64, frameH: 64, cols: 8 },
];

export default async function LandingPage() {
  const session = await auth();
  const player = session ? (session as any).player : null;
  const username = player?.xUsername ?? null;

  return (
    <main
      className="min-h-screen flex flex-col items-center relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, var(--bg-deepest) 0%, var(--bg-deep) 50%, var(--bg-deepest) 100%)' }}
    >
      <StarField />

      {/* ═══════════ TOP BAR ═══════════ */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 py-3">
        <div
          className="px-3 py-1.5"
          style={{
            fontFamily: 'var(--pixel-font)', fontSize: '8px', color: 'var(--gold-primary)',
            border: 'var(--pixel-border)', background: 'rgba(10,8,18,0.9)',
            animation: 'badge-pulse 2s ease-in-out infinite',
          }}
        >
          EARLY ACCESS — SEASON 0
        </div>
        {username && <LandingUserMenu username={username} />}
      </div>

      {/* ═══════════ SECTION 1 — THE GATE (Hero) ═══════════ */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-4 sm:px-6 w-full max-w-[900px] mx-auto">
        <h1
          style={{
            fontFamily: 'var(--pixel-font)',
            fontSize: 'clamp(24px, 5vw, 48px)',
            color: 'var(--gold-primary)',
            lineHeight: '1.8',
            textShadow: '0 0 40px rgba(255,184,0,0.3)',
            letterSpacing: '0.04em',
          }}
        >
          Your revenue is
          <br />
          your power.
        </h1>

        <p
          className="max-w-[480px] mx-auto mt-6 mb-10"
          style={{
            fontFamily: 'var(--body-font)', fontSize: '18px', color: 'var(--text-primary)',
            lineHeight: '1.7',
          }}
        >
          Connect Stripe + X. Your verified MRR and followers determine your character tier,
          your gear, and your power in the Arena.
        </p>

        {/* Live battle banner */}
        <div
          className="w-full mx-auto mb-8 relative overflow-hidden"
          style={{
            maxWidth: 600, height: 'clamp(100px, 20vw, 160px)',
            border: 'var(--pixel-border)', background: 'var(--bg-deepest)',
          }}
        >
          <img
            src="/backgrounds/Forest/Forest.png"
            alt=""
            loading="lazy"
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', imageRendering: 'pixelated', opacity: 0.6,
            }}
          />
          <div className="absolute inset-0 flex items-end justify-between px-6 sm:px-12 pb-3">
            <div className="text-center">
              <div style={{ fontFamily: 'var(--pixel-font)', fontSize: '6px', color: 'var(--text-primary)', background: 'rgba(10,8,18,0.8)', padding: '2px 6px', marginBottom: 4 }}>
                @you
              </div>
              <SpriteAnim
                src="/assets/characters/enemies/Knights/Swordman.png"
                frameW={48} frameH={48} cols={6} row={0} fps={6}
                scale={3} style={{ imageRendering: 'pixelated' }}
              />
            </div>
            <div style={{ fontFamily: 'var(--pixel-font)', fontSize: 'clamp(16px,4vw,28px)', color: 'var(--gold-primary)', textShadow: '0 0 20px rgba(255,184,0,0.5)', alignSelf: 'center' }}>
              VS
            </div>
            <div className="text-center">
              <div style={{ fontFamily: 'var(--pixel-font)', fontSize: '6px', color: 'var(--text-primary)', background: 'rgba(10,8,18,0.8)', padding: '2px 6px', marginBottom: 4 }}>
                The Arena
              </div>
              <SpriteAnim
                src="/assets/characters/enemies/Orcs/Orc_Chief.png"
                frameW={64} frameH={64} cols={8} row={0} fps={6}
                scale={3} flipped style={{ imageRendering: 'pixelated' }}
              />
            </div>
          </div>
        </div>

        {username ? (
          <Link
            href="/world"
            className="w-full sm:w-auto"
            style={{
              display: 'inline-block', fontFamily: 'var(--pixel-font)', fontSize: '12px',
              color: 'var(--bg-deepest)', background: 'var(--gold-primary)',
              padding: '14px 32px', border: '3px solid var(--gold-glow)',
              boxShadow: 'var(--glow-gold)', textDecoration: 'none',
              transition: 'transform 0.1s, box-shadow 0.2s',
            }}
          >
            Continue as @{username} →
          </Link>
        ) : (
          <Link
            href="/login"
            className="w-full sm:w-auto"
            style={{
              display: 'inline-block', fontFamily: 'var(--pixel-font)', fontSize: '12px',
              color: 'var(--bg-deepest)', background: 'var(--gold-primary)',
              padding: '14px 32px', border: '3px solid var(--gold-glow)',
              boxShadow: 'var(--glow-gold)', textDecoration: 'none',
              transition: 'transform 0.1s, box-shadow 0.2s',
            }}
          >
            Enter with X →
          </Link>
        )}

        <p style={{ fontFamily: 'var(--body-font)', fontSize: '14px', color: 'var(--text-dim)', marginTop: 12 }}>
          Free to play · No email required · X login only
        </p>

        <div className="mt-6">
          <LiveCounter />
        </div>

        {/* Scroll chevron */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2" style={{ animation: 'float 1.5s ease-in-out infinite' }}>
          <span style={{ fontFamily: 'var(--pixel-font)', fontSize: '10px', color: 'var(--gold-dim)', opacity: 0.5 }}>▼</span>
        </div>
      </section>

      {/* ═══════════ SECTION 2 — THE WORLD (Arena Preview) ═══════════ */}
      <ScrollReveal>
        <section className="relative z-10 mt-8 w-full max-w-[900px] px-4 sm:px-6 mx-auto">
          <ArenaPreview />
          <p style={{ fontFamily: 'var(--body-font)', fontSize: '14px', color: 'var(--text-dim)', textAlign: 'center', marginTop: 12 }}>
            Every fight is broadcast live to X · Results posted automatically
          </p>
        </section>
      </ScrollReveal>

      {/* ═══════════ SECTION 3 — THE FORGE (World Zones) ═══════════ */}
      <ScrollReveal>
        <section className="relative z-10 mt-24 w-full">
          <WorldZones />
        </section>
      </ScrollReveal>

      {/* ═══════════ SECTION 4 — TIER PROGRESSION ═══════════ */}
      <ScrollReveal>
        <section className="relative z-10 mt-24 w-full max-w-[960px] px-4 sm:px-6 mx-auto">
          <h2 style={{ fontFamily: 'var(--pixel-font)', fontSize: '12px', color: 'var(--gold-primary)', textAlign: 'center', letterSpacing: '0.15em', marginBottom: 8 }}>
            TIER PROGRESSION
          </h2>
          <p style={{ fontFamily: 'var(--body-font)', fontSize: '16px', color: 'var(--text-dim)', textAlign: 'center', marginBottom: 32 }}>
            Your tier is determined automatically. Connect Stripe + X to be placed.
          </p>

          <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
            {tiers.map((tier) => {
              const isLegend = tier.name === 'Legend';
              return (
                <div
                  key={tier.name}
                  className="snap-start shrink-0 text-center"
                  style={{
                    width: 'clamp(140px, 30vw, 170px)', padding: '20px 12px',
                    background: 'var(--bg-mid)', border: 'var(--pixel-border)',
                    boxShadow: isLegend ? 'var(--glow-gold)' : 'none',
                  }}
                >
                  <div className="mx-auto mb-3" style={{ width: 48, height: 48 }}>
                    <SpriteAnim
                      src={tier.sprite}
                      frameW={tier.frameW} frameH={tier.frameH}
                      cols={tier.cols} row={0} fps={0}
                      scale={3}
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>
                  <p style={{ fontFamily: 'var(--pixel-font)', fontSize: '9px', color: tier.color, marginBottom: 6 }}>
                    {tier.name}
                  </p>
                  <p style={{ fontFamily: 'var(--body-font)', fontSize: '14px', color: 'var(--text-dim)' }}>
                    {tier.mrr} MRR
                  </p>
                  <p style={{ fontFamily: 'var(--body-font)', fontSize: '14px', color: 'var(--text-dim)', marginBottom: 8 }}>
                    {tier.followers} followers
                  </p>
                  <p style={{ fontFamily: 'var(--body-font)', fontSize: '13px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                    {tier.flavor}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </ScrollReveal>

      {/* ═══════════ SECTION 5 — ARENA + CO-OP ═══════════ */}
      <ScrollReveal>
        <section className="relative z-10 mt-24 w-full max-w-[900px] px-4 sm:px-6 mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div style={{ background: 'var(--bg-mid)', border: 'var(--pixel-border)', padding: 24 }}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">⚔️</span>
                <h3 style={{ fontFamily: 'var(--pixel-font)', fontSize: '11px', color: 'var(--gold-primary)' }}>THE ARENA</h3>
              </div>
              <p style={{ fontFamily: 'var(--body-font)', fontSize: '16px', color: 'var(--text-primary)', lineHeight: '1.6', marginBottom: 16 }}>
                Challenge any player to a 1v1 fight. Your MRR determines your attack power.
                Your followers determine your defense. Winner takes 10% of the loser&apos;s XP.
              </p>
              <div className="space-y-2">
                {['Real-time PvP combat', 'XP stakes every fight', 'Results auto-post to X'].map(t => (
                  <div key={t} className="flex items-center gap-2">
                    <span style={{ fontFamily: 'var(--pixel-font)', fontSize: '8px', color: 'var(--gold-primary)' }}>▸</span>
                    <span style={{ fontFamily: 'var(--body-font)', fontSize: '15px', color: 'var(--text-dim)' }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'var(--bg-mid)', border: 'var(--pixel-border)', padding: 24 }}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">🏰</span>
                <h3 style={{ fontFamily: 'var(--pixel-font)', fontSize: '11px', color: 'var(--gold-primary)' }}>CO-OP DUNGEONS</h3>
              </div>
              <p style={{ fontFamily: 'var(--body-font)', fontSize: '16px', color: 'var(--text-primary)', lineHeight: '1.6', marginBottom: 16 }}>
                Team up with other creators to raid dungeons. Higher tiers unlock harder dungeons
                with better loot. Coordination is key — bring diverse builds.
              </p>
              <div className="space-y-2">
                {['3-player co-op raids', 'Tier-gated dungeons', 'Exclusive gear drops'].map(t => (
                  <div key={t} className="flex items-center gap-2">
                    <span style={{ fontFamily: 'var(--pixel-font)', fontSize: '8px', color: 'var(--gold-primary)' }}>▸</span>
                    <span style={{ fontFamily: 'var(--body-font)', fontSize: '15px', color: 'var(--text-dim)' }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ═══════════ SECTION 6 — LEADERBOARD ═══════════ */}
      <ScrollReveal>
        <section className="relative z-10 mt-24 w-full max-w-[700px] px-4 sm:px-6 mx-auto">
          <h2 style={{ fontFamily: 'var(--pixel-font)', fontSize: '12px', color: 'var(--gold-primary)', textAlign: 'center', letterSpacing: '0.15em', marginBottom: 24 }}>
            LEADERBOARD
          </h2>
          <Leaderboard />
        </section>
      </ScrollReveal>

      {/* ═══════════ SECTION 7 — THE DOOR (Final CTA) ═══════════ */}
      <ScrollReveal>
        <section className="relative z-10 mt-24 mb-16 text-center px-4">
          <h2 style={{
            fontFamily: 'var(--pixel-font)', fontSize: 'clamp(16px, 4vw, 24px)',
            color: 'var(--gold-primary)', marginBottom: 16,
            textShadow: '0 0 30px rgba(255,184,0,0.6)',
          }}>
            Ready to forge?
          </h2>
          {username ? (
            <Link
              href="/world"
              style={{
                display: 'inline-block', fontFamily: 'var(--pixel-font)', fontSize: '12px',
                color: 'var(--bg-deepest)', background: 'var(--gold-primary)',
                padding: '14px 32px', border: '3px solid var(--gold-glow)',
                boxShadow: 'var(--glow-gold)', textDecoration: 'none',
              }}
            >
              Continue as @{username} →
            </Link>
          ) : (
            <Link
              href="/login"
              style={{
                display: 'inline-block', fontFamily: 'var(--pixel-font)', fontSize: '12px',
                color: 'var(--bg-deepest)', background: 'var(--gold-primary)',
                padding: '14px 32px', border: '3px solid var(--gold-glow)',
                boxShadow: 'var(--glow-gold)', textDecoration: 'none',
              }}
            >
              Enter with X →
            </Link>
          )}
        </section>
      </ScrollReveal>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="relative z-10 mb-8 w-full max-w-[900px] px-4 text-center">
        <p style={{ fontFamily: 'var(--body-font)', fontSize: '14px', color: 'var(--text-dim)', marginBottom: 8 }}>
          Free to play · No email required · X login only
        </p>
        <p style={{ fontFamily: 'var(--pixel-font)', fontSize: '8px', color: 'var(--text-dim)', opacity: 0.5, marginBottom: 12 }}>
          midforgegame.com
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
          <Link href="/privacy" style={{ fontFamily: 'var(--pixel-font)', fontSize: '7px', color: 'var(--text-dim)', textDecoration: 'none' }}>
            Privacy Policy
          </Link>
          <span style={{ fontFamily: 'var(--pixel-font)', fontSize: '7px', color: 'var(--text-dim)', opacity: 0.3 }}>·</span>
          <Link href="/terms" style={{ fontFamily: 'var(--pixel-font)', fontSize: '7px', color: 'var(--text-dim)', textDecoration: 'none' }}>
            Terms
          </Link>
          <span style={{ fontFamily: 'var(--pixel-font)', fontSize: '7px', color: 'var(--text-dim)', opacity: 0.3 }}>·</span>
          <a href="https://x.com/midforgegame" target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--pixel-font)', fontSize: '7px', color: 'var(--text-dim)', textDecoration: 'none' }}>
            @midforgegame
          </a>
          <span style={{ fontFamily: 'var(--pixel-font)', fontSize: '7px', color: 'var(--text-dim)', opacity: 0.3 }}>·</span>
          <a href="#" style={{ fontFamily: 'var(--pixel-font)', fontSize: '7px', color: 'var(--text-dim)', textDecoration: 'none' }}>
            Discord
          </a>
          <span style={{ fontFamily: 'var(--pixel-font)', fontSize: '7px', color: 'var(--text-dim)', opacity: 0.3 }}>·</span>
          <Link href="/credits" style={{ fontFamily: 'var(--pixel-font)', fontSize: '7px', color: 'var(--text-dim)', textDecoration: 'none' }}>
            Credits
          </Link>
        </div>
        <p style={{ fontFamily: 'var(--pixel-font)', fontSize: '7px', color: 'var(--text-dim)', opacity: 0.4, letterSpacing: '0.1em' }}>
          Built on Neon · Powered by{' '}
          <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
            Vercel
          </a>
          {' '}· Forged in Midgard
        </p>
        <p style={{ fontFamily: 'var(--pixel-font)', fontSize: '6px', color: 'var(--text-dim)', opacity: 0.2, marginTop: 8 }}>
          © 2025 Midforge · Season 0
        </p>
      </footer>
    </main>
  );
}
