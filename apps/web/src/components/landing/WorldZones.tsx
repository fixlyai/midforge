'use client';

import { useEffect, useState } from 'react';

const ZONES = [
  { name: 'Village Square', threshold: 0, available: true },
  { name: 'The Arena', threshold: 0, available: true },
  { name: 'Goldbag Marketplace', threshold: 0, available: true },
  { name: 'The Mines', threshold: 100, available: false },
  { name: 'The Harbor', threshold: 500, available: false },
  { name: 'The Academy', threshold: 1000, available: false },
  { name: 'The Castle', threshold: 5000, available: false, legendOnly: true },
];

export function WorldZones() {
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    fetch('/api/stats/user-count')
      .then((r) => r.json())
      .then((d) => setUserCount(d.count ?? 0))
      .catch(() => {});
  }, []);

  return (
    <div className="relative z-10 w-full max-w-[900px] mx-auto px-4 sm:px-6">
      <h2 style={{ fontFamily: 'var(--pixel-font)', fontSize: '12px', color: 'var(--gold-primary)', textAlign: 'center', letterSpacing: '0.15em', marginBottom: 8 }}>
        A WORLD THAT GROWS WITH YOU
      </h2>
      <p style={{ fontFamily: 'var(--body-font)', fontSize: '16px', color: 'var(--text-dim)', textAlign: 'center', marginBottom: 32 }}>
        Every new verified creator unlocks more of the world.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left — zone list */}
        <div className="space-y-2">
          {ZONES.map((zone, i) => {
            const unlocked = zone.available || userCount >= zone.threshold;
            const progress = zone.available ? 1 : Math.min(1, userCount / zone.threshold);
            const barFilled = Math.round(progress * 8);

            return (
              <div
                key={zone.name}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'var(--bg-mid)', border: unlocked ? '2px solid var(--green-victory)' : 'var(--pixel-border)',
                  padding: '10px 14px', opacity: unlocked ? 1 : 0.7,
                  transition: 'opacity 0.2s',
                }}
              >
                <div className="flex items-center gap-2">
                  <span style={{ fontFamily: 'var(--pixel-font)', fontSize: '8px', color: unlocked ? 'var(--text-primary)' : 'var(--text-dim)' }}>
                    {unlocked ? '●' : '🔒'}
                  </span>
                  <span style={{ fontFamily: 'var(--pixel-font)', fontSize: '8px', color: unlocked ? 'var(--text-primary)' : 'var(--text-dim)' }}>
                    {zone.name}
                  </span>
                </div>
                {zone.available ? (
                  <span style={{ fontFamily: 'var(--pixel-font)', fontSize: '7px', color: 'var(--green-victory)' }}>available</span>
                ) : (zone as any).legendOnly ? (
                  <span style={{ fontFamily: 'var(--pixel-font)', fontSize: '7px', color: 'var(--gold-primary)' }}>Legend only</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span style={{ fontFamily: 'var(--pixel-font)', fontSize: '6px', color: 'var(--text-dim)', opacity: 0.5 }}>
                      {'█'.repeat(barFilled)}{'░'.repeat(8 - barFilled)}
                    </span>
                    <span style={{ fontFamily: 'var(--pixel-font)', fontSize: '6px', color: 'var(--text-dim)' }}>
                      {userCount.toLocaleString()}/{zone.threshold.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right — flavor text card */}
        <div className="flex items-center">
          <div style={{ background: 'var(--bg-mid)', border: 'var(--pixel-border)', padding: 24 }}>
            <p style={{ fontFamily: 'var(--body-font)', fontSize: '16px', color: 'var(--text-primary)', lineHeight: '1.7' }}>
              Midforge grows with its builders.
            </p>
            <p style={{ fontFamily: 'var(--body-font)', fontSize: '16px', color: 'var(--text-primary)', lineHeight: '1.7', marginTop: 16 }}>
              Every new verified creator unlocks more of the world. The more the
              community builds IRL, the more Midforge expands.
            </p>
            <p style={{ fontFamily: 'var(--body-font)', fontSize: '16px', color: 'var(--gold-primary)', lineHeight: '1.7', marginTop: 16 }}>
              You&apos;re not just playing a game.
              <br />
              You&apos;re building a world.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
