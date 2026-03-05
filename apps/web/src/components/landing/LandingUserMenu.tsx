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
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={() => setOpen(!open)}
        className="forge-panel px-3 py-2 flex items-center gap-2 cursor-pointer hover:border-forge-amber/60 transition-colors"
      >
        <span className="font-pixel text-[8px] text-forge-amber">@{username}</span>
        <span className="font-pixel text-[8px] text-forge-wheat/40">
          {open ? '▴' : '▾'}
        </span>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-44">
          <div className="forge-panel p-0 overflow-hidden">
            <Link
              href="/world"
              className="block px-4 py-3 font-pixel text-[8px] text-forge-amber hover:bg-forge-amber/10 transition-colors border-b border-forge-dark/50"
            >
              Enter Game →
            </Link>
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-3 font-pixel text-[8px] text-forge-red hover:bg-forge-red/10 transition-colors"
            >
              Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
