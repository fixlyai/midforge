'use client';

import { useState } from 'react';
import Link from 'next/link';

export function SettingsPanel({
  onClose,
  username,
  stripeConnected,
  followers,
  mrr,
  tier,
}: {
  onClose: () => void;
  username: string;
  stripeConnected?: boolean;
  followers?: number;
  mrr?: number;
  tier?: string;
}) {
  const [loggingOut, setLoggingOut] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [syncingFollowers, setSyncingFollowers] = useState(false);
  const [syncingMrr, setSyncingMrr] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch('/api/auth/signout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ csrfToken: '', callbackUrl: '/' }),
    });
    window.location.href = '/';
  };

  const connectStripe = async () => {
    setConnectingStripe(true);
    try {
      const res = await fetch('/api/stripe/connect');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.connected) {
        setSyncStatus('Stripe already connected!');
      } else {
        setSyncStatus(data.error || 'Failed to connect');
      }
    } catch {
      setSyncStatus('Connection failed');
    }
    setConnectingStripe(false);
  };

  const syncFollowers = async () => {
    setSyncingFollowers(true);
    setSyncStatus('');
    try {
      const res = await fetch('/api/player/sync-followers', { method: 'POST' });
      const data = await res.json();
      if (data.synced) {
        setSyncStatus(`Followers: ${data.followers.toLocaleString()} · Tier: ${data.tier}`);
      } else {
        setSyncStatus(data.error || 'Sync failed');
      }
    } catch {
      setSyncStatus('Sync failed');
    }
    setSyncingFollowers(false);
  };

  const syncMrr = async () => {
    setSyncingMrr(true);
    setSyncStatus('');
    try {
      const res = await fetch('/api/stripe/connect', { method: 'POST' });
      const data = await res.json();
      if (data.synced) {
        setSyncStatus(`MRR: $${data.mrrDollars} · Tier: ${data.tier}`);
      } else {
        setSyncStatus(data.error || 'Sync failed');
      }
    } catch {
      setSyncStatus('Sync failed');
    }
    setSyncingMrr(false);
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
          {tier && (
            <p className="font-pixel text-[7px] text-forge-wheat/50 mt-1">
              Tier: {tier} · {(followers ?? 0).toLocaleString()} followers · ${((mrr ?? 0) / 100).toLocaleString()} MRR
            </p>
          )}
        </div>

        {/* Connected accounts */}
        <div className="mb-4">
          <p className="font-pixel text-[8px] text-forge-amber mb-2">CONNECTED ACCOUNTS</p>

          {/* X / Twitter */}
          <div className="forge-panel p-2 flex justify-between items-center mb-2">
            <div>
              <p className="font-pixel text-[8px] text-forge-wheat">X (Twitter)</p>
              <p className="font-pixel text-[7px] text-forge-green">Connected · {(followers ?? 0).toLocaleString()} followers</p>
            </div>
            <button
              onClick={syncFollowers}
              disabled={syncingFollowers}
              className="forge-btn text-[6px] py-1 px-2"
            >
              {syncingFollowers ? '...' : 'SYNC'}
            </button>
          </div>

          {/* Stripe */}
          <div className="forge-panel p-2 flex justify-between items-center">
            <div>
              <p className="font-pixel text-[8px] text-forge-wheat">Stripe</p>
              <p className={`font-pixel text-[7px] ${stripeConnected ? 'text-forge-green' : 'text-forge-wheat/40'}`}>
                {stripeConnected ? `Connected · $${((mrr ?? 0) / 100).toLocaleString()} MRR` : 'Not connected'}
              </p>
            </div>
            {stripeConnected ? (
              <button
                onClick={syncMrr}
                disabled={syncingMrr}
                className="forge-btn text-[6px] py-1 px-2"
              >
                {syncingMrr ? '...' : 'SYNC'}
              </button>
            ) : (
              <button
                onClick={connectStripe}
                disabled={connectingStripe}
                className="forge-btn text-[6px] py-1 px-2"
              >
                {connectingStripe ? '...' : 'CONNECT'}
              </button>
            )}
          </div>
        </div>

        {/* Sync status message */}
        {syncStatus && (
          <p className="font-pixel text-[7px] text-forge-amber mb-4 text-center">{syncStatus}</p>
        )}

        {/* Credits */}
        <Link
          href="/credits"
          className="block w-full text-center font-pixel text-[8px] text-forge-wheat/50 hover:text-forge-amber py-2 mb-4 transition-colors"
        >
          Credits & Licenses
        </Link>

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
