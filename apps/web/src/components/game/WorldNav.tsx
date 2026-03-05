'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SettingsPanel } from '@/components/ui/SettingsPanel';

interface WorldNavProps {
  username: string;
  stripeConnected?: boolean;
  followers?: number;
  mrr?: number;
  tier?: string;
}

export function WorldNav({ username, stripeConnected, followers, mrr, tier }: WorldNavProps) {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <div className="w-full max-w-[960px] flex items-center justify-between">
        <h1 className="font-pixel text-sm text-forge-amber">MIDFORGE</h1>
        <div className="flex gap-3">
          <Link href="/leaderboard" className="forge-btn text-[8px]">
            Leaderboard
          </Link>
          <Link href={`/profile/${username}`} className="forge-btn text-[8px]">
            Profile
          </Link>
          <button
            onClick={() => setShowSettings(true)}
            className="forge-btn text-[8px]"
          >
            Settings
          </button>
        </div>
      </div>
      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          username={username}
          stripeConnected={stripeConnected}
          followers={followers}
          mrr={mrr}
          tier={tier}
        />
      )}
    </>
  );
}
