'use client';

import { useState } from 'react';

interface PlayerCardData {
  id?: string;
  username: string;
  tier: string;
  mrr: number;
  followers: number;
  level: number;
}

interface FightResult {
  winner: string;
  winnerId: string;
  xpTransferred: number;
  fightLog: any[];
  shareCard: { title: string; subtitle: string; cta: string };
}

const TIER_COLORS: Record<string, string> = {
  villager: '#8B7355', apprentice: '#4A90D9',
  merchant: '#7B68EE', warrior: '#E74C3C', legend: '#F39C12',
};

const TIER_LABELS: Record<string, string> = {
  villager: 'Villager', apprentice: 'Apprentice',
  merchant: 'Merchant', warrior: 'Warrior', legend: 'Legend',
};

export function PlayerCard({
  player,
  onClose,
}: {
  player: PlayerCardData;
  onClose: () => void;
}) {
  const color = TIER_COLORS[player.tier] || '#ffffff';
  const label = TIER_LABELS[player.tier] || 'Unknown';
  const [fighting, setFighting] = useState(false);
  const [result, setResult] = useState<FightResult | null>(null);

  const challenge = async () => {
    if (!player.id) return;
    setFighting(true);
    try {
      const res = await fetch('/api/arena', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defenderId: player.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data.fight);
      }
    } catch {
      // ignore
    }
    setFighting(false);
  };

  const shareToX = () => {
    if (!result?.shareCard) return;
    const text = `${result.shareCard.title}\n${result.shareCard.subtitle}\n\nPlay at midforgegame.com`;
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="forge-panel w-72 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Character preview */}
        <div
          className="w-12 h-16 mx-auto mb-3"
          style={{ backgroundColor: color }}
        />

        <p className="font-pixel text-sm mb-1" style={{ color }}>
          @{player.username}
        </p>
        <p className="font-pixel text-[8px] text-forge-wheat/50 mb-4">
          {label} · Level {player.level}
        </p>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="forge-panel py-2">
            <p className="font-pixel text-[7px] text-forge-wheat/50">MRR</p>
            <p className="font-pixel text-[10px] text-forge-green">
              ${(player.mrr / 100).toLocaleString()}
            </p>
          </div>
          <div className="forge-panel py-2">
            <p className="font-pixel text-[7px] text-forge-wheat/50">FOLLOWERS</p>
            <p className="font-pixel text-[10px] text-forge-blue">
              {player.followers >= 1000
                ? (player.followers / 1000).toFixed(1) + 'K'
                : player.followers}
            </p>
          </div>
        </div>

        {/* Fight result */}
        {result && (
          <div className={`forge-panel p-2 mb-3 ${result.winner === 'challenger' ? 'bg-forge-green/10' : 'bg-forge-red/10'}`}>
            <p className={`font-pixel text-[9px] ${result.winner === 'challenger' ? 'text-forge-green' : 'text-forge-red'}`}>
              {result.winner === 'challenger' ? '🏆 YOU WIN' : '💀 YOU LOST'}
            </p>
            <p className="font-pixel text-[7px] text-forge-amber mt-1">
              {result.winner === 'challenger' ? '+' : '-'}{result.xpTransferred} XP
            </p>
            <button onClick={shareToX} className="forge-btn text-[6px] mt-2 bg-[#1DA1F2]/20">
              SHARE TO X
            </button>
          </div>
        )}

        <div className="flex gap-2">
          {player.id && !result && (
            <button
              onClick={challenge}
              disabled={fighting}
              className="forge-btn text-[8px] flex-1 bg-forge-red/20"
            >
              {fighting ? 'FIGHTING...' : '⚔️ CHALLENGE'}
            </button>
          )}
          <button onClick={onClose} className="forge-btn text-[8px] flex-1">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
