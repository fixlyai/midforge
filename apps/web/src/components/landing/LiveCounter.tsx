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
    <div style={{ background: 'var(--bg-mid)', border: 'var(--pixel-border)', padding: '10px 24px', textAlign: 'center', display: 'inline-block' }}>
      <span style={{ fontFamily: 'var(--pixel-font)', fontSize: '10px', color: 'var(--green-victory)', animation: 'pulse-glow 2s ease-in-out infinite' }}>
        ●
      </span>
      <span style={{ fontFamily: 'var(--body-font)', fontSize: '15px', color: 'var(--text-dim)', marginLeft: 8 }}>
        {online > 0
          ? `${online} builder${online !== 1 ? 's' : ''} forging their empire right now`
          : 'Be the first to enter'}
      </span>
    </div>
  );
}
