'use client';

import dynamic from 'next/dynamic';

const GameCanvas = dynamic(
  () => import('./GameCanvas').then((mod) => mod.GameCanvas),
  { ssr: false, loading: () => (
    <div className="w-full max-w-[960px] aspect-[3/2] rounded-lg overflow-hidden border-2 border-forge-amber/40 bg-forge-dark flex items-center justify-center">
      <p className="font-pixel text-[10px] text-forge-amber animate-pulse">Loading world...</p>
    </div>
  )}
);

interface PlayerData {
  id: string;
  xUsername: string;
  tier: string;
  level: number;
  xp: number;
  gold: number;
  mrr: number;
  xFollowers: number;
  positionX: number;
  positionY: number;
}

export function GameCanvasWrapper({ playerData }: { playerData: PlayerData }) {
  return <GameCanvas playerData={playerData} />;
}
