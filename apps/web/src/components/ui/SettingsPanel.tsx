'use client';

import { useState } from 'react';

export function SettingsPanel({
  onClose,
  username,
}: {
  onClose: () => void;
  username: string;
}) {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    // Auth.js signOut via form action — we POST to the signOut endpoint
    const res = await fetch('/api/auth/signout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ csrfToken: '', callbackUrl: '/' }),
    });
    // Fallback: redirect manually
    window.location.href = '/';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="forge-panel w-80 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-pixel text-[9px] text-forge-amber">Settings</h2>
          <button
            onClick={onClose}
            className="font-pixel text-[8px] text-forge-wheat/50 hover:text-forge-wheat"
          >
            X
          </button>
        </div>

        {/* Player info */}
        <div className="forge-panel p-3 mb-4">
          <p className="font-pixel text-[8px] text-forge-wheat/50 mb-1">SIGNED IN AS</p>
          <p className="font-pixel text-[9px] text-forge-amber">@{username}</p>
        </div>

        {/* Connected accounts */}
        <div className="mb-4">
          <p className="font-pixel text-[8px] text-forge-amber mb-2">CONNECTED ACCOUNTS</p>
          <div className="forge-panel p-2 flex justify-between items-center mb-2">
            <div>
              <p className="font-pixel text-[8px] text-forge-wheat">X (Twitter)</p>
              <p className="font-pixel text-[7px] text-forge-green">Connected</p>
            </div>
          </div>
          <div className="forge-panel p-2 flex justify-between items-center">
            <div>
              <p className="font-pixel text-[8px] text-forge-wheat">Stripe</p>
              <p className="font-pixel text-[7px] text-forge-wheat/40">Not connected</p>
            </div>
            <button className="forge-btn text-[7px] py-1 px-2 opacity-50 cursor-not-allowed">
              Soon
            </button>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full bg-forge-red text-forge-bg font-pixel text-[9px] px-4 py-3 hover:brightness-110 active:brightness-90 transition-all duration-100 disabled:opacity-50"
          style={{ boxShadow: '3px 3px 0px rgba(0,0,0,0.4)' }}
        >
          {loggingOut ? 'Logging out...' : 'Log Out'}
        </button>
      </div>
    </div>
  );
}
