import { db } from '@midforge/db/client';
import { players } from '@midforge/db/schema';
import { desc } from 'drizzle-orm';
import { TIERS, type TierKey } from '@midforge/shared/types';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const topPlayers = await db
    .select({
      xUsername: players.xUsername,
      tier: players.tier,
      xFollowers: players.xFollowers,
      mrr: players.mrr,
      xp: players.xp,
      level: players.level,
      gold: players.gold,
    })
    .from(players)
    .orderBy(desc(players.xp))
    .limit(50);

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-pixel text-xl text-forge-amber">LEADERBOARD</h1>
          <Link href="/world" className="forge-btn text-[9px]">
            Back to World
          </Link>
        </div>

        <div className="forge-panel mb-4">
          <div className="grid grid-cols-[40px_1fr_80px_80px_60px] gap-2 font-pixel text-[8px] text-forge-wheat/50 px-3 py-2 border-b border-forge-amber/20">
            <span>#</span>
            <span>PLAYER</span>
            <span className="text-right">MRR</span>
            <span className="text-right">FOLLOWERS</span>
            <span className="text-right">XP</span>
          </div>

          {topPlayers.length === 0 ? (
            <p className="font-pixel text-[10px] text-forge-wheat/40 text-center py-8">
              No players yet. Be the first to enter.
            </p>
          ) : (
            topPlayers.map((p, i) => {
              const tierKey = (p.tier ?? 'villager') as TierKey;
              const tierData = TIERS[tierKey];
              return (
                <Link
                  key={p.xUsername}
                  href={`/profile/${p.xUsername}`}
                  className="grid grid-cols-[40px_1fr_80px_80px_60px] gap-2 items-center px-3 py-3 hover:bg-forge-amber/5 transition-colors border-b border-forge-dark/50 last:border-0"
                >
                  <span
                    className="font-pixel text-xs"
                    style={{
                      color: i < 3 ? '#F39C12' : 'rgba(245,222,179,0.5)',
                    }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-6 h-8 flex-shrink-0"
                      style={{ backgroundColor: tierData.color }}
                    />
                    <div>
                      <span className="font-pixel text-[10px]" style={{ color: tierData.color }}>
                        @{p.xUsername}
                      </span>
                      <span className="font-pixel text-[7px] text-forge-wheat/40 ml-2">
                        {tierData.label}
                      </span>
                    </div>
                  </div>
                  <span className="font-pixel text-[9px] text-forge-green text-right">
                    ${((p.mrr ?? 0) / 100).toLocaleString()}
                  </span>
                  <span className="font-pixel text-[9px] text-forge-blue text-right">
                    {(p.xFollowers ?? 0).toLocaleString()}
                  </span>
                  <span className="font-pixel text-[9px] text-forge-wheat/70 text-right">
                    {(p.xp ?? 0).toLocaleString()}
                  </span>
                </Link>
              );
            })
          )}
        </div>

        <p className="font-pixel text-[7px] text-forge-wheat/20 text-center">
          Season 0 · Rankings update every 60s
        </p>
      </div>
    </main>
  );
}
