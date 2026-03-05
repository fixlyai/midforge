'use client';

import { useEffect, useState } from 'react';

const FIGHT_DURATION = 8000; // 8 second loop
const ATTACK_INTERVAL = 1200;

interface FighterState {
  hp: number;
  maxHp: number;
  attacking: boolean;
  hit: boolean;
}

export function ArenaPreview() {
  const [phase, setPhase] = useState<'intro' | 'fight' | 'result'>('intro');
  const [tick, setTick] = useState(0);
  const [left, setLeft] = useState<FighterState>({ hp: 100, maxHp: 100, attacking: false, hit: false });
  const [right, setRight] = useState<FighterState>({ hp: 100, maxHp: 100, attacking: false, hit: false });
  const [winner, setWinner] = useState<'left' | 'right' | null>(null);
  const [showXp, setShowXp] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let timeout: ReturnType<typeof setTimeout>;

    function startLoop() {
      setPhase('intro');
      setLeft({ hp: 100, maxHp: 100, attacking: false, hit: false });
      setRight({ hp: 100, maxHp: 100, attacking: false, hit: false });
      setWinner(null);
      setShowXp(false);
      setTick(0);

      // After 1.5s intro, start fighting
      timeout = setTimeout(() => {
        setPhase('fight');
        let t = 0;
        let lHp = 100;
        let rHp = 100;

        interval = setInterval(() => {
          t++;
          const isLeftTurn = t % 2 === 1;
          const dmg = 12 + Math.floor(Math.random() * 10);

          if (isLeftTurn) {
            rHp = Math.max(0, rHp - dmg);
            setLeft((p) => ({ ...p, attacking: true, hit: false }));
            setRight((p) => ({ ...p, attacking: false, hit: true, hp: rHp }));
          } else {
            lHp = Math.max(0, lHp - dmg);
            setRight((p) => ({ ...p, attacking: true, hit: false }));
            setLeft((p) => ({ ...p, attacking: false, hit: true, hp: lHp }));
          }

          // Reset attack state after 300ms
          setTimeout(() => {
            setLeft((p) => ({ ...p, attacking: false, hit: false }));
            setRight((p) => ({ ...p, attacking: false, hit: false }));
          }, 300);

          setTick(t);

          // Check for KO
          if (lHp <= 0 || rHp <= 0) {
            clearInterval(interval);
            const w = lHp > 0 ? 'left' : 'right';
            setWinner(w);
            setPhase('result');
            setShowXp(true);

            // Restart loop after 2.5s
            timeout = setTimeout(startLoop, 2500);
          }
        }, ATTACK_INTERVAL);
      }, 1500);
    }

    startLoop();

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div
      className="forge-panel border-2 border-forge-amber/50 overflow-hidden mx-auto"
      style={{
        maxWidth: 700,
        boxShadow: '0 0 30px rgba(243,156,18,0.08)',
      }}
    >
      <p className="font-pixel text-[7px] sm:text-[8px] text-forge-amber/60 text-center mb-4 tracking-widest flex items-center justify-center gap-2">
        <span className="text-forge-red animate-pulse">●</span>
        ARENA PREVIEW — LIVE FIGHTS EVERY DAY
      </p>

      {/* Arena stage */}
      <div
        className="relative rounded border border-forge-dark mx-auto overflow-hidden"
        style={{ height: 'clamp(200px, 40vw, 280px)', maxWidth: 660, background: '#0a0818', imageRendering: 'pixelated' as const }}
      >
        {/* Grid floor */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'linear-gradient(rgba(243,156,18,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(243,156,18,0.4) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* VS text — always visible during fight */}
        {(phase === 'intro' || phase === 'fight') && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <span
              className="font-pixel text-2xl sm:text-3xl text-forge-amber/30"
              style={{
                transform: 'rotate(-3deg)',
                textShadow: '0 0 20px rgba(243,156,18,0.3)',
              }}
            >
              VS
            </span>
          </div>
        )}

        {/* Left fighter (Warrior — red) */}
        <div
          className="absolute z-10 transition-transform duration-200"
          style={{
            left: phase === 'intro' ? '12%' : '25%',
            bottom: 50,
            transition: 'left 0.8s ease-out',
            animation: left.attacking ? 'slash-left 0.3s ease-out' : left.hit ? 'hit-flash 0.2s' : 'none',
          }}
        >
          {/* Name + tier badge */}
          <div className="text-center mb-2" style={{ width: 120, marginLeft: -35 }}>
            <p className="font-pixel text-[7px] sm:text-[8px] text-forge-red truncate">@indie_builder</p>
            <span
              className="inline-block font-pixel text-[5px] sm:text-[6px] px-2 py-0.5 rounded mt-0.5"
              style={{ backgroundColor: 'rgba(231,76,60,0.2)', color: '#E74C3C', border: '1px solid rgba(231,76,60,0.3)' }}
            >
              ⚔️ WARRIOR
            </span>
          </div>
          {/* HP bar — RPG style */}
          <div className="mx-auto mb-2" style={{ width: 60 }}>
            <div className="h-2 bg-forge-dark/90 border border-forge-amber/30 rounded-sm overflow-hidden" style={{ width: 60 }}>
              <div
                className={`h-full transition-all duration-300 relative ${left.attacking ? 'hp-bar-active' : ''}`}
                style={{
                  width: `${left.hp}%`,
                  backgroundColor: left.hp > 50 ? '#E74C3C' : left.hp > 25 ? '#F39C12' : '#E74C3C',
                }}
              />
            </div>
            <p className="font-pixel text-[5px] text-forge-wheat/30 text-center mt-0.5">{left.hp}/100</p>
          </div>
          {/* Body */}
          <div className="flex flex-col items-center">
            <div className="w-4 h-4 sm:w-5 sm:h-5 bg-[#E74C3C] opacity-80" />
            <div className="w-5 h-8 sm:w-6 sm:h-10 bg-[#E74C3C]" />
            <div className="flex gap-px">
              <div className="w-2 h-4 sm:w-2.5 sm:h-5 bg-[#E74C3C] opacity-70" />
              <div className="w-2 h-4 sm:w-2.5 sm:h-5 bg-[#E74C3C] opacity-70" />
            </div>
          </div>
          {/* Sword */}
          <div
            className="absolute w-1 h-6 sm:h-7 bg-forge-wheat/80"
            style={{ right: -8, top: 48, transform: 'rotate(-30deg)' }}
          />
        </div>

        {/* Right fighter (Merchant — purple) */}
        <div
          className="absolute z-10 transition-transform duration-200"
          style={{
            right: phase === 'intro' ? '12%' : '25%',
            bottom: 50,
            transition: 'right 0.8s ease-out',
            animation: right.attacking ? 'slash-right 0.3s ease-out' : right.hit ? 'hit-flash 0.2s' : 'none',
          }}
        >
          {/* Name + tier badge */}
          <div className="text-center mb-2" style={{ width: 120, marginLeft: -35 }}>
            <p className="font-pixel text-[7px] sm:text-[8px] text-forge-purple truncate">@solofounder</p>
            <span
              className="inline-block font-pixel text-[5px] sm:text-[6px] px-2 py-0.5 rounded mt-0.5"
              style={{ backgroundColor: 'rgba(123,104,238,0.2)', color: '#7B68EE', border: '1px solid rgba(123,104,238,0.3)' }}
            >
              💰 MERCHANT
            </span>
          </div>
          {/* HP bar — RPG style */}
          <div className="mx-auto mb-2" style={{ width: 60 }}>
            <div className="h-2 bg-forge-dark/90 border border-forge-amber/30 rounded-sm overflow-hidden" style={{ width: 60 }}>
              <div
                className={`h-full transition-all duration-300 relative ${right.attacking ? 'hp-bar-active' : ''}`}
                style={{
                  width: `${right.hp}%`,
                  backgroundColor: right.hp > 50 ? '#E74C3C' : right.hp > 25 ? '#F39C12' : '#E74C3C',
                }}
              />
            </div>
            <p className="font-pixel text-[5px] text-forge-wheat/30 text-center mt-0.5">{right.hp}/100</p>
          </div>
          {/* Body */}
          <div className="flex flex-col items-center">
            <div className="w-4 h-4 sm:w-5 sm:h-5 bg-[#7B68EE] opacity-80" />
            <div className="w-5 h-8 sm:w-6 sm:h-10 bg-[#7B68EE]" />
            <div className="flex gap-px">
              <div className="w-2 h-4 sm:w-2.5 sm:h-5 bg-[#7B68EE] opacity-70" />
              <div className="w-2 h-4 sm:w-2.5 sm:h-5 bg-[#7B68EE] opacity-70" />
            </div>
          </div>
          {/* Sword */}
          <div
            className="absolute w-1 h-6 sm:h-7 bg-forge-wheat/80"
            style={{ left: -8, top: 48, transform: 'rotate(30deg)' }}
          />
        </div>

        {/* XP float text on winner */}
        {showXp && winner && (
          <div
            className="absolute z-30 font-pixel text-[10px] sm:text-xs text-forge-amber"
            style={{
              [winner === 'left' ? 'left' : 'right']: '25%',
              bottom: 160,
              animation: 'xp-float 1.5s ease-out forwards',
              textShadow: '0 0 10px rgba(243,156,18,0.5)',
            }}
          >
            +450 XP
          </div>
        )}

        {/* Winner flash */}
        {winner && (
          <div className="absolute inset-0 z-20 flex items-end justify-center pb-3">
            <span className="font-pixel text-[9px] sm:text-sm text-forge-amber animate-pulse">
              {winner === 'left' ? '@indie_builder' : '@solofounder'} WINS!
            </span>
          </div>
        )}

        {/* Floor line */}
        <div className="absolute bottom-10 left-0 right-0 h-px bg-forge-amber/20" />
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-forge-dark/60" />
      </div>
    </div>
  );
}
