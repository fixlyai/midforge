import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service — Midforge',
  description: 'Terms and conditions for using Midforge.',
};

export default function TermsPage() {
  return (
    <main
      className="min-h-screen flex flex-col items-center px-4 py-12 sm:py-20"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #2a1245 0%, #0d0a1e 60%, #050308 100%)' }}
    >
      <div className="w-full max-w-[720px]">
        <Link
          href="/"
          className="font-pixel text-[8px] text-forge-wheat/40 hover:text-forge-wheat/60 transition-colors mb-8 inline-block"
        >
          ← Back to Midforge
        </Link>

        <h1 className="font-pixel text-xl sm:text-2xl text-forge-amber mb-2" style={{ letterSpacing: '0.04em' }}>
          TERMS OF SERVICE
        </h1>
        <p className="text-forge-wheat/40 text-sm mb-10" style={{ fontFamily: "'Courier New', monospace" }}>
          Last updated: March 5, 2025
        </p>

        <div className="space-y-8 text-forge-wheat/70 text-sm leading-relaxed" style={{ fontFamily: "'Courier New', monospace" }}>
          <section>
            <h2 className="font-pixel text-xs text-forge-amber/80 mb-3">1. ACCEPTANCE</h2>
            <p>
              By accessing or using Midforge (&quot;the Game&quot;), you agree to be bound by these Terms of Service.
              If you do not agree, do not use the Game. We may update these terms at any time; continued use
              constitutes acceptance of changes.
            </p>
          </section>

          <section>
            <h2 className="font-pixel text-xs text-forge-amber/80 mb-3">2. ELIGIBILITY</h2>
            <p>
              You must be at least <strong className="text-forge-wheat">13 years of age</strong> to use Midforge.
              By creating an account, you represent that you are at least 13 years old. If you are under 18,
              you represent that your legal guardian has reviewed and agreed to these terms.
            </p>
          </section>

          <section>
            <h2 className="font-pixel text-xs text-forge-amber/80 mb-3">3. ACCOUNTS</h2>
            <p>
              Your Midforge account is linked to your X (Twitter) account via OAuth. You are responsible for
              maintaining the security of your X account. One X account = one Midforge character. Creating
              multiple accounts to gain unfair advantage is prohibited.
            </p>
          </section>

          <section>
            <h2 className="font-pixel text-xs text-forge-amber/80 mb-3">4. USER CONDUCT</h2>
            <p>You agree not to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 pl-2">
              <li>Use bots, scripts, or automated tools to play the game</li>
              <li>Exploit bugs or glitches for unfair advantage (report them instead)</li>
              <li>Harass, threaten, or abuse other players</li>
              <li>Impersonate other players or Midforge staff</li>
              <li>Manipulate MRR or follower counts with fraudulent data</li>
              <li>Use the marketplace to launder money or conduct illegal transactions</li>
              <li>Attempt to reverse-engineer, decompile, or hack the game</li>
            </ul>
          </section>

          <section>
            <h2 className="font-pixel text-xs text-forge-amber/80 mb-3">5. MARKETPLACE TRANSACTIONS</h2>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>All marketplace prices are listed in USD</li>
              <li>Midforge charges a <strong className="text-forge-wheat">5% platform fee</strong> on all marketplace transactions</li>
              <li>Sellers receive payment via Stripe Connect Express</li>
              <li>All sales of digital goods (courses, blueprints, agents, services) are <strong className="text-forge-wheat">final — no refunds</strong></li>
              <li>Midforge is not responsible for the quality of seller-created content</li>
              <li>Disputes between buyers and sellers should be resolved directly; Midforge may mediate at its discretion</li>
            </ul>
          </section>

          <section>
            <h2 className="font-pixel text-xs text-forge-amber/80 mb-3">6. IN-GAME CURRENCY & ITEMS</h2>
            <p>
              Gold and items earned in-game have <strong className="text-forge-wheat">no real-world monetary value</strong>.
              They cannot be exchanged for real currency. XP, gold, and inventory may be adjusted during balance
              patches or seasonal resets.
            </p>
          </section>

          <section>
            <h2 className="font-pixel text-xs text-forge-amber/80 mb-3">7. SEASONS & RESETS</h2>
            <p>
              Midforge operates on a seasonal model. At the end of each season:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 pl-2">
              <li>Leaderboard rankings are <strong className="text-forge-wheat">reset to zero</strong></li>
              <li>Season titles and achievements are <strong className="text-forge-wheat">permanent</strong> — they remain on your profile forever</li>
              <li>XP, gold, and inventory carry over between seasons</li>
              <li>Tier is recalculated based on current verified MRR and follower count</li>
            </ul>
          </section>

          <section>
            <h2 className="font-pixel text-xs text-forge-amber/80 mb-3">8. ACCOUNT SUSPENSION & TERMINATION</h2>
            <p>
              Midforge reserves the right to suspend or permanently ban any account that violates these terms,
              at our sole discretion. Grounds for ban include but are not limited to: botting, data manipulation,
              harassment, marketplace fraud, and exploiting game-breaking bugs.
              Banned accounts lose access to all in-game assets. No refunds are issued for banned accounts.
            </p>
          </section>

          <section>
            <h2 className="font-pixel text-xs text-forge-amber/80 mb-3">9. UPTIME & AVAILABILITY</h2>
            <p>
              Midforge is provided <strong className="text-forge-wheat">&quot;as is&quot;</strong> without any guarantees of uptime,
              availability, or performance. We may take the game offline for maintenance, updates, or any other
              reason without prior notice. We are not liable for any loss of progress, data, or revenue caused
              by downtime.
            </p>
          </section>

          <section>
            <h2 className="font-pixel text-xs text-forge-amber/80 mb-3">10. INTELLECTUAL PROPERTY</h2>
            <p>
              All game assets, code, designs, and content are the property of Midforge. Kenney game assets
              are used under CC0 license. You retain ownership of any content you create and sell on the
              marketplace, but grant Midforge a non-exclusive license to display it within the game.
            </p>
          </section>

          <section>
            <h2 className="font-pixel text-xs text-forge-amber/80 mb-3">11. LIMITATION OF LIABILITY</h2>
            <p>
              To the maximum extent permitted by law, Midforge and its creators shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages arising from your use of the
              game, including but not limited to loss of profits, data, or goodwill.
            </p>
          </section>

          <section>
            <h2 className="font-pixel text-xs text-forge-amber/80 mb-3">12. CONTACT</h2>
            <p>
              For questions about these terms:{' '}
              <a href="mailto:legal@midforge.gg" className="text-forge-amber hover:underline">legal@midforge.gg</a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-forge-wheat/10">
          <Link
            href="/"
            className="font-pixel text-[8px] text-forge-wheat/40 hover:text-forge-wheat/60 transition-colors"
          >
            ← Back to Midforge
          </Link>
        </div>
      </div>
    </main>
  );
}
