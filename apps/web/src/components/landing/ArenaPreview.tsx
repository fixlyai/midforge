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
    <div className="forge-panel border-forge-amber/60 overflow-hidden">
      <p className="font-pixel text-[7px] sm:text-[8px] text-forge-amber/60 text-center mb-4 tracking-widest">
        ARENA PREVIEW — LIVE FIGHTS EVERY DAY
      </p>

      {/* Arena stage */}
      <div
        className="relative bg-forge-bg/80 rounded border border-forge-dark mx-auto overflow-hidden"
        style={{ height: 200, maxWidth: 480, imageRendering: 'pixelated' as const }}
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

        {/* VS text */}
        {phase === 'intro' && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <span className="font-pixel text-lg sm:text-2xl text-forge-amber animate-pulse">VS</span>
          </div>
        )}

        {/* Left fighter (Warrior — red) */}
        <div
          className="absolute z-10 transition-transform duration-200"
          style={{
            left: phase === 'intro' ? '15%' : '30%',
            bottom: 40,
            transition: 'left 0.8s ease-out',
            animation: left.attacking ? 'slash-left 0.3s ease-out' : left.hit ? 'hit-flash 0.2s' : 'none',
          }}
        >
          {/* Name tag */}
          <div className="text-center mb-1" style={{ width: 100, marginLeft: -30 }}>
            <p className="font-pixel text-[6px] sm:text-[7px] text-forge-red truncate">@indie_builder</p>
            <p className="font-pixel text-[5px] sm:text-[6px] text-forge-wheat/40">$12K MRR</p>
          </div>
          {/* HP bar */}
          <div className="mx-auto mb-1" style={{ width: 40 }}>
            <div className="h-1 bg-forge-dark/80 border border-forge-wheat/20" style={{ width: 40 }}>
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${left.hp}%`,
                  backgroundColor: left.hp > 50 ? '#27AE60' : left.hp > 25 ? '#F39C12' : '#E74C3C',
                }}
              />
            </div>
          </div>
          {/* Body */}
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-[#E74C3C] opacity-80" /> {/* head */}
            <div className="w-4 h-6 sm:w-5 sm:h-8 bg-[#E74C3C]" /> {/* body */}
            <div className="flex gap-px">
              <div className="w-1.5 h-3 sm:w-2 sm:h-4 bg-[#E74C3C] opacity-70" />
              <div className="w-1.5 h-3 sm:w-2 sm:h-4 bg-[#E74C3C] opacity-70" />
            </div>
          </div>
          {/* Sword */}
          <div
            className="absolute w-1 h-5 sm:h-6 bg-forge-wheat/80"
            style={{ right: -6, top: 28, transform: 'rotate(-30deg)' }}
          />
        </div>

        {/* Right fighter (Merchant — purple) */}
        <div
          className="absolute z-10 transition-transform duration-200"
          style={{
            right: phase === 'intro' ? '15%' : '30%',
            bottom: 40,
            transition: 'right 0.8s ease-out',
            animation: right.attacking ? 'slash-right 0.3s ease-out' : right.hit ? 'hit-flash 0.2s' : 'none',
          }}
        >
          {/* Name tag */}
          <div className="text-center mb-1" style={{ width: 100, marginLeft: -30 }}>
            <p className="font-pixel text-[6px] sm:text-[7px] text-forge-purple truncate">@solofounder</p>
            <p className="font-pixel text-[5px] sm:text-[6px] text-forge-wheat/40">$5K MRR</p>
          </div>
          {/* HP bar */}
          <div className="mx-auto mb-1" style={{ width: 40 }}>
            <div className="h-1 bg-forge-dark/80 border border-forge-wheat/20" style={{ width: 40 }}>
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${right.hp}%`,
                  backgroundColor: right.hp > 50 ? '#27AE60' : right.hp > 25 ? '#F39C12' : '#E74C3C',
                }}
              />
            </div>
          </div>
          {/* Body */}
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-[#7B68EE] opacity-80" />
            <div className="w-4 h-6 sm:w-5 sm:h-8 bg-[#7B68EE]" />
            <div className="flex gap-px">
              <div className="w-1.5 h-3 sm:w-2 sm:h-4 bg-[#7B68EE] opacity-70" />
              <div className="w-1.5 h-3 sm:w-2 sm:h-4 bg-[#7B68EE] opacity-70" />
            </div>
          </div>
          {/* Sword */}
          <div
            className="absolute w-1 h-5 sm:h-6 bg-forge-wheat/80"
            style={{ left: -6, top: 28, transform: 'rotate(30deg)' }}
          />
        </div>

        {/* XP float text on winner */}
        {showXp && winner && (
          <div
            className="absolute z-30 font-pixel text-[8px] sm:text-[10px] text-forge-amber"
            style={{
              [winner === 'left' ? 'left' : 'right']: '30%',
              bottom: 120,
              animation: 'xp-float 1.5s ease-out forwards',
            }}
          >
            ⚔️ +450 XP
          </div>
        )}

        {/* Winner flash */}
        {winner && (
          <div className="absolute inset-0 z-20 flex items-end justify-center pb-2">
            <span className="font-pixel text-[8px] sm:text-xs text-forge-amber animate-pulse">
              {winner === 'left' ? '@indie_builder' : '@solofounder'} WINS!
            </span>
          </div>
        )}

        {/* Floor line */}
        <div className="absolute bottom-8 left-0 right-0 h-px bg-forge-amber/20" />
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-forge-dark/60" />
      </div>
    </div>
  );
}
