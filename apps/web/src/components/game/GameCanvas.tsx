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

interface ToastData {
  message: string;
  key: number;
}

export function GameCanvas({ playerData }: { playerData: PlayerData }) {
  const gameRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cardPlayer, setCardPlayer] = useState<CardData | null>(null);
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

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

      const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      // Dynamic import of rex plugin only on mobile
      let rexPlugin: any = null;
      if (mobile) {
        try {
          const mod = await import('phaser3-rex-plugins/plugins/virtualjoystick-plugin.js');
          rexPlugin = mod.default || mod;
        } catch (e) {
          console.warn('Failed to load rex joystick plugin:', e);
        }
      }

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        width: mobile ? window.innerWidth : 960,
        height: mobile ? window.innerHeight : 640,
        parent: containerRef.current!,
        pixelArt: true,
        antialias: false,
        backgroundColor: '#1a0a2e',
        physics: {
          default: 'arcade',
          arcade: { gravity: { x: 0, y: 0 }, debug: false },
        },
        scene: [PreloadScene, WorldScene, UIScene],
        plugins: rexPlugin ? {
          global: [{ key: 'rexVirtualJoystick', plugin: rexPlugin, start: true }],
        } : undefined,
        scale: {
          mode: mobile ? Phaser.Scale.RESIZE : Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        input: {
          activePointers: mobile ? 2 : 1,
        },
        render: {
          pixelArt: true,
          antialias: false,
          powerPreference: 'high-performance',
        },
        fps: {
          target: mobile ? 30 : 60,
          forceSetTimeOut: mobile,
        },
      });

      game.registry.set('playerData', playerData);
      game.registry.set('isMobile', mobile);

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
      game.events.on('map_transition', (data: { targetMap: string }) => {
        setToast({ message: `${data.targetMap.replace('_', ' ')} — coming soon`, key: Date.now() });
        setTimeout(() => setToast(null), 2500);
      });

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
    <div className={`relative ${isMobile ? 'w-screen h-screen' : 'w-full max-w-[960px]'}`}>
      <div
        ref={containerRef}
        className={`overflow-hidden ${isMobile ? 'w-full h-full' : 'w-full aspect-[3/2] rounded-lg border-2 border-forge-amber/40'}`}
        style={{ imageRendering: 'pixelated', touchAction: 'none' }}
      />
      {cardPlayer && (
        <PlayerCard player={cardPlayer} onClose={() => setCardPlayer(null)} />
      )}
      {activePanel === 'quests' && <QuestPanel onClose={closePanel} />}
      {activePanel === 'inventory' && <InventoryPanel onClose={closePanel} />}
      {activePanel === 'arena' && <ArenaPanel onClose={closePanel} />}
      {activePanel === 'marketplace' && <MarketplacePanel onClose={closePanel} />}
      {toast && (
        <div
          key={toast.key}
          className="absolute top-4 left-1/2 -translate-x-1/2 bg-forge-dark/90 border border-forge-amber/40 px-4 py-2 rounded font-pixel text-[8px] text-forge-amber animate-pulse z-50"
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
