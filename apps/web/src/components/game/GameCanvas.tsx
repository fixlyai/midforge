'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { PlayerCard } from '@/components/ui/PlayerCard';
import { QuestPanel, InventoryPanel, ArenaPanel, MarketplacePanel } from '@/components/ui/NpcPanel';

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

interface CardData {
  username: string;
  tier: string;
  mrr: number;
  followers: number;
  level: number;
}

type ActivePanel = null | 'quests' | 'inventory' | 'arena' | 'marketplace';

export function GameCanvas({ playerData }: { playerData: PlayerData }) {
  const gameRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cardPlayer, setCardPlayer] = useState<CardData | null>(null);
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);

  const handleShowCard = useCallback((data: CardData) => {
    setCardPlayer(data);
  }, []);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    async function initGame() {
      const PhaserModule = await import('phaser');
      const Phaser = PhaserModule.default || PhaserModule;
      const { PreloadScene } = await import('@/game/scenes/PreloadScene');
      const { WorldScene } = await import('@/game/scenes/WorldScene');
      const { UIScene } = await import('@/game/scenes/UIScene');

      if (gameRef.current) return;

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        width: 960,
        height: 640,
        parent: containerRef.current!,
        pixelArt: true,
        antialias: false,
        backgroundColor: '#1a0a2e',
        physics: {
          default: 'arcade',
          arcade: { gravity: { x: 0, y: 0 }, debug: false },
        },
        scene: [PreloadScene, WorldScene, UIScene],
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
      });

      game.registry.set('playerData', playerData);

      game.events.on('world_ready', () => {
        if (game.scene.isActive('UIScene') === false) {
          game.scene.start('UIScene');
        }
      });

      // Bridge Phaser events → React state
      game.events.on('show_player_card', handleShowCard);
      game.events.on('npc_quests', () => setActivePanel('quests'));
      game.events.on('npc_inventory', () => setActivePanel('inventory'));
      game.events.on('npc_arena', () => setActivePanel('arena'));
      game.events.on('npc_marketplace', () => setActivePanel('marketplace'));

      gameRef.current = game;
    }

    initGame();

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  const closePanel = () => setActivePanel(null);

  return (
    <div className="relative w-full max-w-[960px]">
      <div
        ref={containerRef}
        className="w-full aspect-[3/2] rounded-lg overflow-hidden border-2 border-forge-amber/40"
        style={{ imageRendering: 'pixelated' }}
      />
      {cardPlayer && (
        <PlayerCard player={cardPlayer} onClose={() => setCardPlayer(null)} />
      )}
      {activePanel === 'quests' && <QuestPanel onClose={closePanel} />}
      {activePanel === 'inventory' && <InventoryPanel onClose={closePanel} />}
      {activePanel === 'arena' && <ArenaPanel onClose={closePanel} />}
      {activePanel === 'marketplace' && <MarketplacePanel onClose={closePanel} />}
    </div>
  );
}
