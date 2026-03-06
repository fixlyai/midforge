'use client';

import { useEffect, useState } from 'react';

const TIER_META: Record<string, { color: string }> = {
  villager:   { color: '#888888' },
  apprentice: { color: '#3498DB' },
  merchant:   { color: '#8E44AD' },
  warrior:    { color: '#E74C3C' },
  legend:     { color: '#FFB800' },
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

const pf = (s: React.CSSProperties): React.CSSProperties => ({ fontFamily: 'var(--pixel-font)', ...s });
const bf = (s: React.CSSProperties): React.CSSProperties => ({ fontFamily: 'var(--body-font)', ...s });

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

  const rows: (LeaderboardPlayer | null)[] = [...players];
  while (rows.length < 5) rows.push(null);

  return (
    <div className="w-full">
      <p style={pf({ fontSize: '9px', color: 'var(--text-dim)', textAlign: 'center', marginBottom: 24 })}>
        SEASON 0 — {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Season ended'}
      </p>

      <div style={{ background: 'var(--bg-mid)', border: 'var(--pixel-border)', overflow: 'hidden' }}>
        {/* Header */}
        <div
          className="grid grid-cols-[30px_1fr_70px_60px_50px] sm:grid-cols-[40px_1fr_90px_80px_70px] gap-1 sm:gap-2 px-2 sm:px-3 py-2"
          style={{ borderBottom: '1px solid var(--gold-dim)', ...pf({ fontSize: '7px', color: 'var(--gold-primary)' }) }}
        >
          <span>#</span>
          <span>PLAYER</span>
          <span className="text-right">MRR</span>
          <span className="text-right">FOLLOW</span>
          <span className="text-right">XP</span>
        </div>

        {loading ? (
          <div className="px-3 py-4">
            <p style={pf({ fontSize: '8px', color: 'var(--text-dim)', textAlign: 'center' })}>
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
                className="grid grid-cols-[30px_1fr_70px_60px_50px] sm:grid-cols-[40px_1fr_90px_80px_70px] gap-1 sm:gap-2 items-center px-2 sm:px-3 py-2 sm:py-3"
                style={{
                  borderBottom: '1px solid rgba(30,24,48,0.8)',
                  background: isFirst ? 'rgba(255,184,0,0.08)' : 'transparent',
                }}
              >
                <span style={pf({ fontSize: '10px', color: rank <= 3 ? 'var(--gold-primary)' : 'var(--text-dim)' })}>
                  {isFirst ? '👑' : rank}
                </span>

                {p ? (
                  <>
                    <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                      <div className="min-w-0">
                        <span style={pf({ fontSize: '8px', color: isFirst ? 'var(--gold-primary)' : tier.color, display: 'block' })} className="truncate">
                          @{p.xUsername}
                        </span>
                      </div>
                    </div>
                    <span style={bf({ fontSize: '13px', color: 'var(--green-victory)', textAlign: 'right' })} className="truncate">
                      {formatMrr(p.mrr ?? 0)}
                    </span>
                    <span style={bf({ fontSize: '13px', color: 'var(--blue-action)', textAlign: 'right' })} className="truncate">
                      {formatFollowers(p.xFollowers ?? 0)}
                    </span>
                    <span style={bf({ fontSize: '13px', color: 'var(--text-dim)', textAlign: 'right' })}>
                      {(p.xp ?? 0).toLocaleString()}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                      <div className="min-w-0">
                        <span style={pf({ fontSize: '8px', color: 'var(--text-dim)', opacity: 0.3, display: 'block' })}>
                          ???
                        </span>
                        <span style={pf({ fontSize: '6px', color: 'var(--text-dim)', opacity: 0.2 })}>
                          Unclaimed
                        </span>
                      </div>
                    </div>
                    <span style={bf({ fontSize: '13px', color: 'var(--text-dim)', opacity: 0.2, textAlign: 'right' })}>—</span>
                    <span style={bf({ fontSize: '13px', color: 'var(--text-dim)', opacity: 0.2, textAlign: 'right' })}>—</span>
                    <span style={bf({ fontSize: '13px', color: 'var(--text-dim)', opacity: 0.2, textAlign: 'right' })}>—</span>
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
