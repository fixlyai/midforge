'use client';

import { useState } from 'react';
import Link from 'next/link';

export function LandingUserMenu({ username }: { username: string }) {
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await fetch('/api/auth/signout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ csrfToken: '', callbackUrl: '/' }),
    });
    window.location.href = '/';
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        style={{
          fontFamily: 'var(--pixel-font)', fontSize: '8px', color: 'var(--gold-primary)',
          border: 'var(--pixel-border)', background: 'rgba(10,8,18,0.9)',
          padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        @{username}
        <span style={{ color: 'var(--text-dim)' }}>{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-44" style={{ zIndex: 60 }}>
          <div style={{ background: 'var(--bg-mid)', border: 'var(--pixel-border)', overflow: 'hidden' }}>
            <Link
              href="/world"
              style={{
                display: 'block', padding: '10px 16px', textDecoration: 'none',
                fontFamily: 'var(--pixel-font)', fontSize: '8px', color: 'var(--gold-primary)',
                borderBottom: '1px solid var(--bg-surface)',
              }}
            >
              Enter Game →
            </Link>
            <button
              onClick={handleLogout}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px',
                fontFamily: 'var(--pixel-font)', fontSize: '8px', color: 'var(--red-danger)',
                background: 'transparent', border: 'none', cursor: 'pointer',
              }}
            >
              Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
