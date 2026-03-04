import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function LandingPage() {
  const session = await auth();
  if (session) redirect('/world');

  return (
    <main className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background grid overlay */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            'linear-gradient(rgba(243,156,18,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(243,156,18,0.3) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Hero */}
      <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
        <div className="animate-float mb-8">
          <div className="inline-block forge-panel px-6 py-3">
            <span className="text-forge-amber font-pixel text-xs tracking-wider">
              EARLY ACCESS — SEASON 0
            </span>
          </div>
        </div>

        <h1 className="font-pixel text-3xl md:text-4xl text-forge-amber leading-relaxed mb-6">
          Your revenue is
          <br />
          your power.
        </h1>

        <p className="font-pixel text-xs md:text-sm text-forge-wheat/80 leading-loose mb-10 max-w-xl mx-auto">
          Connect Stripe + X. Watch your character evolve. Fight verified
          creators online. The more you earn IRL, the more powerful you become
          in-game.
        </p>

        <Link href="/login" className="forge-btn text-sm animate-pulse-glow inline-block">
          Enter with X →
        </Link>

        <p className="font-pixel text-[10px] text-forge-wheat/40 mt-4">
          Free to play · No email required · X login only
        </p>
      </div>

      {/* Tier showcase */}
      <div className="relative z-10 mt-20 w-full max-w-4xl px-6">
        <h2 className="font-pixel text-xs text-center text-forge-wheat/60 mb-8 tracking-widest">
          TIER PROGRESSION
        </h2>
        <div className="grid grid-cols-5 gap-3">
          {[
            { name: 'Villager', color: '#8B7355', mrr: '$0', followers: '0' },
            { name: 'Apprentice', color: '#4A90D9', mrr: '$1K', followers: '1K' },
            { name: 'Merchant', color: '#7B68EE', mrr: '$5K', followers: '10K' },
            { name: 'Warrior', color: '#E74C3C', mrr: '$10K', followers: '50K' },
            { name: 'Legend', color: '#F39C12', mrr: '$50K', followers: '500K' },
          ].map((tier) => (
            <div key={tier.name} className="forge-panel text-center py-4">
              <div
                className="w-10 h-14 mx-auto mb-3"
                style={{ backgroundColor: tier.color }}
              />
              <p
                className="font-pixel text-[9px] mb-1"
                style={{ color: tier.color }}
              >
                {tier.name}
              </p>
              <p className="font-pixel text-[8px] text-forge-wheat/50">
                {tier.mrr} MRR
              </p>
              <p className="font-pixel text-[8px] text-forge-wheat/50">
                {tier.followers} followers
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom tagline */}
      <div className="relative z-10 mt-16 mb-8">
        <p className="font-pixel text-[8px] text-forge-wheat/30 tracking-widest">
          Built on Neon · Powered by real revenue · Forged in Midgard
        </p>
      </div>
    </main>
  );
}
