import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — Midforge',
  description: 'How Midforge collects, uses, and protects your data.',
};

export default function PrivacyPage() {
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
          PRIVACY POLICY
        </h1>
        <p className="text-forge-wheat/40 text-sm mb-10" style={{ fontFamily: "'Courier New', monospace" }}>
          Last updated: March 5, 2025
        </p>

        <div className="space-y-8 text-forge-wheat/70 text-sm leading-relaxed" style={{ fontFamily: "'Courier New', monospace" }}>
          <section>
            <h2 className="font-pixel text-xs text-forge-amber/80 mb-3">1. DATA WE COLLECT</h2>
            <p>When you sign in with X (Twitter) OAuth, we collect:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 pl-2">
              <li><strong className="text-forge-wheat">X username</strong> — your public @handle</li>
              <li><strong className="text-forge-wheat">X display name</strong> — your public display name</li>
              <li><strong className="text-forge-wheat">X profile image URL</strong> — your public avatar</li>
              <li><strong className="text-forge-wheat">X follower count</strong> — your public follower count, used to determine your in-game tier</li>
              <li><strong className="text-forge-wheat">X user ID</strong> — a unique identifier from X, used to link your account</li>
            </ul>
            <p className="mt-3">When you connect Stripe via Stripe Connect Express (coming soon), we collect:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 pl-2">
              <li><strong className="text-forge-wheat">Stripe account ID</strong> — used to verify your MRR</li>
              <li><strong className="text-forge-wheat">Monthly Recurring Revenue (MRR)</strong> — your verified revenue figure, used to determine your in-game tier and gear</li>
            </ul>
            <p className="mt-3">
              We do <strong className="text-forge-wheat">not</strong> collect your email address, password, payment card details,
              or any private X data (DMs, likes, bookmarks). We never post to X on your behalf without explicit permission.
            </p>
          </section>

          <section>
            <h2 className="font-pixel text-xs text-forge-amber/80 mb-3">2. HOW WE USE YOUR DATA</h2>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Authenticate you into the game via X OAuth 2.0</li>
              <li>Calculate your character tier based on verified MRR and follower count</li>
              <li>Display your username and tier on public leaderboards</li>
              <li>Track in-game progress (XP, gold, inventory, quest completion)</li>
              <li>Enable marketplace transactions between players</li>
              <li>Improve the game experience and fix bugs</li>
            </ul>
          </section>

          <section>
            <h2 className="font-pixel text-xs text-forge-amber/80 mb-3">3. DATA STORAGE</h2>
            <p>
              Your data is stored in a PostgreSQL database hosted on <strong className="text-forge-wheat">Neon</strong> (US-East region).
              All connections are encrypted via TLS. Database credentials are stored as environment variables and never exposed client-side.
            </p>
          </section>

          <section>
            <h2 className="font-pixel text-xs text-forge-amber/80 mb-3">4. THIRD-PARTY SERVICES</h2>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><strong className="text-forge-wheat">X (Twitter)</strong> — OAuth authentication and public profile data</li>
              <li><strong className="text-forge-wheat">Stripe Connect</strong> — MRR verification (coming soon). Stripe handles all financial data directly; we only receive your verified MRR figure.</li>
              <li><strong className="text-forge-wheat">Vercel</strong> — application hosting</li>
              <li><strong className="text-forge-wheat">Neon</strong> — database hosting</li>
            </ul>
          </section>

          <section>
            <h2 className="font-pixel text-xs text-forge-amber/80 mb-3">5. DATA SHARING</h2>
            <p>
              We do not sell, rent, or share your personal data with third parties for marketing purposes.
              Your X username and tier are visible to other players on leaderboards and in the game world.
              MRR ranges (e.g. &quot;$10K+&quot;) may be displayed on your public profile card; exact figures are never shown.
            </p>
          </section>

          <section>
            <h2 className="font-pixel text-xs text-forge-amber/80 mb-3">6. DATA DELETION</h2>
            <p>
              You may request deletion of all your data by contacting us at{' '}
              <a href="mailto:privacy@midforge.gg" className="text-forge-amber hover:underline">privacy@midforge.gg</a>.
              Upon request, we will delete your player record, inventory, quest history, and all associated data within 30 days.
              Leaderboard entries and arena fight logs may be anonymized rather than deleted to preserve game history.
            </p>
          </section>

          <section>
            <h2 className="font-pixel text-xs text-forge-amber/80 mb-3">7. COOKIES</h2>
            <p>
              We use a single session cookie for authentication (managed by Auth.js / NextAuth).
              We do not use tracking cookies, advertising cookies, or analytics cookies.
            </p>
          </section>

          <section>
            <h2 className="font-pixel text-xs text-forge-amber/80 mb-3">8. CHILDREN</h2>
            <p>
              Midforge is not intended for children under 13 years of age. We do not knowingly collect data from children under 13.
              If you believe a child under 13 has provided us with data, please contact us for removal.
            </p>
          </section>

          <section>
            <h2 className="font-pixel text-xs text-forge-amber/80 mb-3">9. CONTACT</h2>
            <p>
              For privacy-related questions or data deletion requests:{' '}
              <a href="mailto:privacy@midforge.gg" className="text-forge-amber hover:underline">privacy@midforge.gg</a>
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
