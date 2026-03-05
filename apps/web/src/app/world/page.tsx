import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { GameCanvasWrapper } from '@/components/game/GameCanvasWrapper';
import { WorldNav } from '@/components/game/WorldNav';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function WorldPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const player = (session as any).player;

  const playerData = player
    ? {
        id: player.id,
        xUsername: player.xUsername,
        tier: player.tier ?? 'villager',
        level: player.level ?? 1,
        xp: player.xp ?? 0,
        gold: player.gold ?? 0,
        mrr: player.mrr ?? 0,
        xFollowers: player.xFollowers ?? 0,
        positionX: player.positionX ?? 100,
        positionY: player.positionY ?? 100,
        pendingNotifications: player.pendingNotifications ?? [],
      }
    : {
        id: 'guest',
        xUsername: 'guest',
        tier: 'villager',
        level: 1,
        xp: 0,
        gold: 50,
        mrr: 0,
        xFollowers: 0,
        positionX: 100,
        positionY: 100,
      };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 gap-4">
      <WorldNav username={playerData.xUsername} />
      <GameCanvasWrapper playerData={playerData} />
    </main>
  );
}
