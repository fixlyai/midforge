import { GameCanvasWrapper } from '@/components/game/GameCanvasWrapper';
import Link from 'next/link';

export default function DevPage() {
  const mockPlayer = {
    id: 'dev-player',
    xUsername: 'indie_hacker',
    tier: 'warrior',
    level: 12,
    xp: 14400,
    gold: 2500,
    mrr: 1200000, // $12K MRR
    xFollowers: 52000,
    positionX: 640,
    positionY: 448,
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 gap-4">
      <div className="w-full max-w-[960px] flex items-center justify-between">
        <h1 className="font-pixel text-sm text-forge-amber">MIDFORGE</h1>
        <div className="flex gap-3">
          <span className="font-pixel text-[8px] text-forge-red">DEV MODE</span>
          <Link href="/leaderboard" className="forge-btn text-[8px]">
            Leaderboard
          </Link>
        </div>
      </div>

      <GameCanvasWrapper playerData={mockPlayer} />
    </main>
  );
}
