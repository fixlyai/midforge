'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { PlayerCard } from '@/components/ui/PlayerCard';
import { QuestPanel, InventoryPanel, ArenaPanel, MarketplacePanel } from '@/components/ui/NpcPanel';
import { MobileControlPanel } from './MobileControlPanel';

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

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    setMobile(
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      navigator.maxTouchPoints > 1
    );
  }, []);
  return mobile;
}

async function claimDailyLogin(game: any) {
  try {
    const res = await fetch('/api/player/daily-login', { method: 'POST' });
    if (!res.ok) return;
    const data = await res.json();

    // Phase E: Spawn physical daily chest in WorldScene
    const worldScene = game.scene.getScene('WorldScene') as any;
    if (worldScene?.spawnDailyChest) {
      const canClaim = !data.alreadyClaimed;
      worldScene.spawnDailyChest(canClaim, data.streak ?? 1);
    }

    // Always emit streak for HUD display
    game.events.emit('login_streak_update', { streak: data.streak ?? 1 });

    if (data.alreadyClaimed || !data.reward) return;
    // First-login welcome bonus
    if (data.firstLogin && data.firstLoginBonus) {
      game.events.emit(
        'zone_enter_banner',
        `WELCOME TO MIDFORGE — +${data.firstLoginBonus} XP Bonus!`
      );
      await new Promise(r => setTimeout(r, 3000));
    }
    // Step 8: Show streak notification overlay
    game.events.emit('login_streak_notification', {
      streak: data.streak,
      xp: data.reward.xp,
      gold: data.reward.gold,
      username: data.username ?? '',
    });
  } catch (_e) {
    // Non-critical
  }
}

// Phase E.3: Check idle income on login
async function checkIdleIncome(game: any) {
  try {
    const res = await fetch('/api/player/idle-income', { method: 'POST' });
    if (!res.ok) return;
    const data = await res.json();
    if (!data.claimed || data.idleGold <= 0) return;

    // Wait for daily login banner to clear
    await new Promise(r => setTimeout(r, 4000));

    game.events.emit(
      'zone_enter_banner',
      `WHILE YOU WERE AWAY — +${data.idleGold}G (${data.hoursAway}h)`
    );
  } catch (_e) {
    // Non-critical
  }
}

export function GameCanvas({ playerData }: { playerData: PlayerData }) {
  const gameRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cardPlayer, setCardPlayer] = useState<CardData | null>(null);
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [brigandData, setBrigandData] = useState<any>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [showPWABanner, setShowPWABanner] = useState(false);
  const isMobile = useIsMobile();

  // FIX 8: PWA banner for iOS Safari (one-time dismissable)
  useEffect(() => {
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isStandalone = (window.navigator as any).standalone === true;
    const dismissed = localStorage.getItem('pwa-banner-dismissed');
    if (isIOS && !isStandalone && !dismissed) {
      setShowPWABanner(true);
    }
  }, []);

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
      const { default: DungeonScene } = await import('@/game/scenes/DungeonScene');
      const { default: TavernScene } = await import('@/game/scenes/TavernScene');
      const { default: BlacksmithScene } = await import('@/game/scenes/BlacksmithScene');
      const { default: ChurchScene } = await import('@/game/scenes/ChurchScene');
      const { default: InventoryScene } = await import('@/game/scenes/InventoryScene');

      if (gameRef.current) return;

      const mobile = (
        /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
        (navigator.maxTouchPoints > 1) ||
        ('ontouchstart' in window)
      );

      // Mobile: game canvas gets top 66% of screen. Desktop: fixed 960×640.
      const gameWidth  = mobile ? window.innerWidth : 960;
      const gameHeight = mobile ? Math.floor(window.innerHeight * 0.66) : 640;

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        width: gameWidth,
        height: gameHeight,
        parent: containerRef.current!,
        pixelArt: true,
        antialias: false,
        backgroundColor: '#1a0a2e',
        physics: {
          default: 'arcade',
          arcade: { gravity: { x: 0, y: 0 }, debug: false },
        },
        scene: [PreloadScene, WorldScene, UIScene, DungeonScene, TavernScene, BlacksmithScene, ChurchScene, InventoryScene],
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
          antialiasGL: false,
          roundPixels: true,
          clearBeforeRender: true,
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
        // Claim daily login reward on world load
        claimDailyLogin(game);
        // Phase E.3: Check idle income
        checkIdleIncome(game);
      });

      // Bridge Phaser events → React state
      game.events.on('show_player_card', handleShowCard);
      game.events.on('npc_quests', () => setActivePanel('quests'));
      game.events.on('npc_inventory', () => setActivePanel('inventory'));
      game.events.on('npc_arena', () => { setBrigandData(null); setActivePanel('arena'); });
      game.events.on('npc_marketplace', () => setActivePanel('marketplace'));
      game.events.on('brigand_encounter', (data: any) => { setBrigandData(data); setActivePanel('arena'); });

      // Phase 1: Tutorial battle — route through arena panel with tutorial enemy data
      game.events.on('start_tutorial_battle', (data: any) => {
        setBrigandData(data); setActivePanel('arena');
      });

      // Phase 1: Starter sword — award via inventory API
      game.events.on('equip_starter_sword', async () => {
        try {
          await fetch('/api/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'equip', item: 'starter_sword', slot: 'weapon', stats: { atk: 5 } }),
          });
        } catch (_e) { /* silent — sword is cosmetic for now */ }
      });

      // Step 5: Blacksmith purchase — deduct gold, update stats
      game.events.on('blacksmith_purchase', async (data: any) => {
        try {
          await fetch('/api/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'equip', item: data.name, slot: data.stat === 'atk' ? 'weapon' : 'armor', stats: { [data.stat]: data.bonus }, cost: data.cost }),
          });
        } catch (_e) { /* silent */ }
      });

      // Step 5: Church heal — restore HP to max
      game.events.on('church_heal', async () => {
        try {
          await fetch('/api/player/stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'heal_full' }),
          });
        } catch (_e) { /* silent */ }
      });

      // Step 5: Award XP + Gold from interior scenes
      game.events.on('award_xp_gold', async (data: { xp: number; gold: number }) => {
        try {
          await fetch('/api/player/stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'award', xp: data.xp, gold: data.gold }),
          });
        } catch (_e) { /* silent */ }
      });

      // map_transition now handled in-game via typewriter dialogue (WorldScene)

      gameRef.current = game;
    }

    initGame();

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  const closePanel = () => { setActivePanel(null); setBrigandData(null); };

  // ── Mobile layout: 66% game + 34% control panel ──
  if (isMobile) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100dvw',
        height: '100dvh',
        background: '#0d0a1e',
        overflow: 'hidden',
        touchAction: 'none',
        position: 'fixed',
        top: 0,
        left: 0,
      }}>
        {/* TOP: Game canvas — 66% of screen */}
        <div
          ref={containerRef}
          style={{
            width: '100%',
            height: '66dvh',
            flexShrink: 0,
            overflow: 'hidden',
            position: 'relative',
            imageRendering: 'pixelated',
          }}
        />

        {/* BOTTOM: Control panel — 34% of screen */}
        <MobileControlPanel />

        {/* Overlays render on top of everything */}
        {cardPlayer && (
          <PlayerCard player={cardPlayer} onClose={() => setCardPlayer(null)} />
        )}
        {activePanel === 'quests' && <QuestPanel onClose={closePanel} />}
        {activePanel === 'inventory' && <InventoryPanel onClose={closePanel} />}
        {activePanel === 'arena' && <ArenaPanel onClose={closePanel} brigandData={brigandData} />}
        {activePanel === 'marketplace' && <MarketplacePanel onClose={closePanel} />}
        {toast && (
          <div
            key={toast.key}
            className="absolute top-4 left-1/2 -translate-x-1/2 bg-forge-dark/90 border border-forge-amber/40 px-4 py-2 rounded font-pixel text-[8px] text-forge-amber animate-pulse z-50"
          >
            {toast.message}
          </div>
        )}
        {showPWABanner && (
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            background: '#0d0a1e',
            borderTop: '2px solid #F39C12',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 9999,
            fontFamily: '"Press Start 2P"',
            fontSize: '7px',
            color: '#F39C12',
          }}>
            <span>Add to Home Screen for best experience</span>
            <button onClick={() => {
              localStorage.setItem('pwa-banner-dismissed', '1');
              setShowPWABanner(false);
            }} style={{ background: 'none', border: 'none', color: '#F39C12',
              cursor: 'pointer', fontSize: '12px', padding: '4px 8px' }}>✕</button>
          </div>
        )}
      </div>
    );
  }

  // ── Desktop layout: unchanged ──
  return (
    <div className="relative w-full max-w-[960px]">
      <div
        ref={containerRef}
        className="overflow-hidden w-full aspect-[3/2] rounded-lg border-2 border-forge-amber/40"
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
