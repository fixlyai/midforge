'use client';

import { useEffect, useState } from 'react';

const TIER_META: Record<string, { emoji: string; color: string }> = {
  villager: { emoji: '🧑‍🌾', color: '#8B7355' },
  apprentice: { emoji: '⚒️', color: '#4A90D9' },
  merchant: { emoji: '💰', color: '#7B68EE' },
  warrior: { emoji: '⚔️', color: '#E74C3C' },
  legend: { emoji: '👑', color: '#F39C12' },
};

interface LeaderboardPlayer {
  xUsername: string;
  tier: string;
  mrr: number;
  xFollowers: number;
  xp: number;
  xProfileImageUrl: string | null;
}

function formatMrr(cents: number) {
  if (cents >= 100000) return `$${(cents / 100).toLocaleString()}/mo`;
  if (cents >= 1000) return `$${(cents / 100).toFixed(0)}/mo`;
  return `$${(cents / 100).toFixed(0)}/mo`;
}

function formatFollowers(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
}

// Season 0 end: 90 days from 2025-03-01
const SEASON_END = new Date('2025-06-01T00:00:00Z');

export function Leaderboard() {
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  const daysRemaining = Math.max(
    0,
    Math.ceil((SEASON_END.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  useEffect(() => {
    fetch('/api/leaderboard/top5')
      .then((r) => r.json())
      .then((d) => {
        setPlayers(d.players ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Fill to 5 slots
  const rows: (LeaderboardPlayer | null)[] = [...players];
  while (rows.length < 5) rows.push(null);

  return (
    <div className="w-full">
      <p className="font-pixel text-[8px] sm:text-[9px] text-center text-forge-amber/60 mb-6">
        SEASON 0 — {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Season ended'}
      </p>

      <div className="forge-panel overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[30px_1fr_70px_60px_50px] sm:grid-cols-[40px_1fr_90px_80px_70px] gap-1 sm:gap-2 font-pixel text-[6px] sm:text-[8px] text-forge-wheat/40 px-2 sm:px-3 py-2 border-b border-forge-amber/20">
          <span>#</span>
          <span>PLAYER</span>
          <span className="text-right">MRR</span>
          <span className="text-right">FOLLOW</span>
          <span className="text-right">XP</span>
        </div>

        {loading ? (
          <div className="px-3 py-4">
            <p className="font-pixel text-[8px] text-forge-wheat/40 animate-pulse text-center">
              Loading leaderboard...
            </p>
          </div>
        ) : (
          rows.map((p, i) => {
            const rank = i + 1;
            const tier = p ? TIER_META[p.tier] ?? TIER_META.villager : TIER_META.villager;
            const isFirst = rank === 1 && p !== null;

            return (
              <div
                key={i}
                className={`grid grid-cols-[30px_1fr_70px_60px_50px] sm:grid-cols-[40px_1fr_90px_80px_70px] gap-1 sm:gap-2 items-center px-2 sm:px-3 py-2 sm:py-3 border-b border-forge-dark/50 last:border-0 ${
                  isFirst ? 'bg-forge-amber/5' : ''
                }`}
              >
                <span
                  className="font-pixel text-[8px] sm:text-xs"
                  style={{ color: rank <= 3 ? '#F39C12' : 'rgba(245,222,179,0.4)' }}
                >
                  {isFirst ? '👑' : rank}
                </span>

                {p ? (
                  <>
                    <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                      <span className="text-xs sm:text-sm flex-shrink-0">{tier.emoji}</span>
                      <div className="min-w-0">
                        <span
                          className="font-pixel text-[7px] sm:text-[9px] block truncate"
                          style={{ color: tier.color }}
                        >
                          @{p.xUsername}
                        </span>
                      </div>
                    </div>
                    <span className="font-pixel text-[7px] sm:text-[9px] text-forge-green text-right truncate">
                      {formatMrr(p.mrr ?? 0)}
                    </span>
                    <span className="font-pixel text-[7px] sm:text-[9px] text-forge-blue text-right truncate">
                      {formatFollowers(p.xFollowers ?? 0)}
                    </span>
                    <span className="font-pixel text-[7px] sm:text-[9px] text-forge-wheat/60 text-right">
                      {(p.xp ?? 0).toLocaleString()}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                      <span className="text-xs sm:text-sm flex-shrink-0 opacity-30">?</span>
                      <div className="min-w-0">
                        <span className="font-pixel text-[7px] sm:text-[9px] text-forge-wheat/20 block">
                          ???
                        </span>
                        <span className="font-pixel text-[6px] text-forge-wheat/15">
                          Unclaimed
                        </span>
                      </div>
                    </div>
                    <span className="font-pixel text-[7px] sm:text-[9px] text-forge-wheat/15 text-right">
                      —
                    </span>
                    <span className="font-pixel text-[7px] sm:text-[9px] text-forge-wheat/15 text-right">
                      —
                    </span>
                    <span className="font-pixel text-[7px] sm:text-[9px] text-forge-wheat/15 text-right">
                      —
                    </span>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
