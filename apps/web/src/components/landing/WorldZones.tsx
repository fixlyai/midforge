'use client';

import { useEffect, useState } from 'react';

const ZONES = [
  { name: 'Village Square', emoji: '✅', threshold: 0, available: true },
  { name: 'The Arena', emoji: '✅', threshold: 0, available: true },
  { name: 'Goldbag Marketplace', emoji: '✅', threshold: 0, available: true },
  { name: 'The Mines', emoji: '🔒', threshold: 100, available: false },
  { name: 'The Harbor', emoji: '🔒', threshold: 500, available: false },
  { name: 'The Academy', emoji: '🔒', threshold: 1000, available: false },
  { name: 'The Castle', emoji: '🏰', threshold: 5000, available: false, legendOnly: true },
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
      <h2 className="font-pixel text-[10px] sm:text-xs text-center text-forge-wheat/60 mb-2 tracking-widest">
        A WORLD THAT GROWS WITH YOU
      </h2>
      <p className="font-pixel text-[7px] sm:text-[8px] text-center text-forge-wheat/40 mb-8">
        Every new verified creator unlocks more of the world
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left — zone list */}
        <div className="space-y-2">
          {ZONES.map((zone) => {
            const unlocked = zone.available || userCount >= zone.threshold;
            const progress = zone.available ? 1 : Math.min(1, userCount / zone.threshold);
            const barFilled = Math.round(progress * 8);

            return (
              <div
                key={zone.name}
                className={`forge-panel p-3 flex items-center justify-between transition-all duration-200 ${
                  unlocked ? 'border-forge-green/40' : 'border-forge-dark/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{zone.emoji}</span>
                  <span
                    className={`font-pixel text-[8px] ${
                      unlocked ? 'text-forge-wheat' : 'text-forge-wheat/40'
                    }`}
                  >
                    {zone.name}
                  </span>
                </div>
                {zone.available ? (
                  <span className="font-pixel text-[7px] text-forge-green">available</span>
                ) : zone.legendOnly ? (
                  <span className="font-pixel text-[7px] text-forge-amber">Legend only</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-pixel text-[6px] text-forge-wheat/30">
                      {'█'.repeat(barFilled)}{'░'.repeat(8 - barFilled)}
                    </span>
                    <span className="font-pixel text-[6px] text-forge-wheat/40">
                      {userCount.toLocaleString()}/{zone.threshold.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right — copy */}
        <div className="flex items-center">
          <div className="forge-panel p-6">
            <p className="font-pixel text-[8px] sm:text-[9px] text-forge-wheat/70 leading-loose">
              Midforge grows with its builders.
            </p>
            <p className="font-pixel text-[8px] sm:text-[9px] text-forge-wheat/70 leading-loose mt-4">
              Every new verified creator unlocks more of the world. The more the
              community builds IRL, the more Midforge expands.
            </p>
            <p className="font-pixel text-[8px] sm:text-[9px] text-forge-amber leading-loose mt-4">
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
