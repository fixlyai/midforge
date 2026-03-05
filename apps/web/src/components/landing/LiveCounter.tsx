'use client';

import { useEffect, useState } from 'react';

export function LiveCounter() {
  const [online, setOnline] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/stats/online')
      .then((r) => r.json())
      .then((d) => setOnline(d.online ?? 0))
      .catch(() => setOnline(0));

    const interval = setInterval(() => {
      fetch('/api/stats/online')
        .then((r) => r.json())
        .then((d) => setOnline(d.online ?? 0))
        .catch(() => {});
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (online === null) return null;

  return (
    <div className="forge-panel px-6 py-3 text-center">
      <span className="font-pixel text-[9px] sm:text-xs text-forge-green animate-pulse">
        ●
      </span>
      <span className="font-pixel text-[8px] sm:text-[10px] text-forge-wheat/60 ml-2">
        {online > 0
          ? `${online} builder${online !== 1 ? 's' : ''} forging their empire right now`
          : 'Be the first to enter'}
      </span>
    </div>
  );
}
