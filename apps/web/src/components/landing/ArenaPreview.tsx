'use client';

import { useEffect, useState } from 'react';

const ATTACK_INTERVAL = 1200;

// LPC sprite sheets: 576×256px, 64×64 frames, 9 cols × 4 rows
// Row 0=UP, 1=LEFT, 2=DOWN, 3=RIGHT
const FRAME_SIZE = 64;
const FRAMES_PER_ROW = 9;
const SPRITE_SCALE = 1.8; // 64 × 1.8 = ~115px display size
const DISPLAY_SIZE = FRAME_SIZE * SPRITE_SCALE;

// CSS sprite animation: cycle through 9 frames in a row
// Row 3 (RIGHT) for left fighter facing right, Row 1 (LEFT) for right fighter facing left
const ROW_RIGHT = 3; // walk right
const ROW_LEFT = 1;  // walk left
const ROW_DOWN = 2;  // idle / facing camera

interface FighterState {
  hp: number;
  maxHp: number;
  attacking: boolean;
  hit: boolean;
}

function LpcSprite({
  sheet,
  row,
  animate,
  defeated,
}: {
  sheet: string;
  row: number;
  animate: boolean;
  defeated?: boolean;
}) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!animate) { setFrame(0); return; }
    const id = setInterval(() => setFrame((f) => (f + 1) % FRAMES_PER_ROW), 100);
    return () => clearInterval(id);
  }, [animate]);

  return (
    <div
      style={{
        width: DISPLAY_SIZE,
        height: DISPLAY_SIZE,
        backgroundImage: `url(${sheet})`,
        backgroundSize: `${576 * SPRITE_SCALE}px ${256 * SPRITE_SCALE}px`,
        backgroundPosition: `-${frame * FRAME_SIZE * SPRITE_SCALE}px -${row * FRAME_SIZE * SPRITE_SCALE}px`,
        imageRendering: 'pixelated' as const,
        opacity: defeated ? 0.3 : 1,
        transition: 'opacity 0.5s',
      }}
    />
  );
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

          setTimeout(() => {
            setLeft((p) => ({ ...p, attacking: false, hit: false }));
            setRight((p) => ({ ...p, attacking: false, hit: false }));
          }, 300);

          setTick(t);

          if (lHp <= 0 || rHp <= 0) {
            clearInterval(interval);
            const w = lHp > 0 ? 'left' : 'right';
            setWinner(w);
            setPhase('result');
            setShowXp(true);
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

  const fighting = phase === 'fight' || phase === 'result';

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
        style={{ height: 'clamp(220px, 40vw, 300px)', maxWidth: 660, background: '#0a0818', imageRendering: 'pixelated' as const }}
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

        {/* Left fighter (Warrior — walks RIGHT toward opponent) */}
        <div
          className="absolute z-10"
          style={{
            left: phase === 'intro' ? '8%' : '20%',
            bottom: 50,
            transition: 'left 0.8s ease-out',
            animation: left.attacking ? 'slash-left 0.3s ease-out' : left.hit ? 'hit-flash 0.2s' : 'none',
          }}
        >
          <div className="text-center mb-1" style={{ width: DISPLAY_SIZE }}>
            <p className="font-pixel text-[7px] sm:text-[8px] text-forge-red truncate">@indie_builder</p>
            <span
              className="inline-block font-pixel text-[5px] sm:text-[6px] px-2 py-0.5 rounded mt-0.5"
              style={{ backgroundColor: 'rgba(231,76,60,0.2)', color: '#E74C3C', border: '1px solid rgba(231,76,60,0.3)' }}
            >
              WARRIOR
            </span>
          </div>
          <div className="mx-auto mb-1" style={{ width: 60 }}>
            <div className="h-2 bg-forge-dark/90 border border-forge-amber/30 rounded-sm overflow-hidden" style={{ width: 60 }}>
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${left.hp}%`,
                  backgroundColor: left.hp > 50 ? '#E74C3C' : left.hp > 25 ? '#F39C12' : '#E74C3C',
                }}
              />
            </div>
            <p className="font-pixel text-[5px] text-forge-wheat/30 text-center mt-0.5">{left.hp}/100</p>
          </div>
          <LpcSprite
            sheet="/sprites/characters/warrior_base.png"
            row={fighting ? ROW_RIGHT : ROW_DOWN}
            animate={fighting && !winner}
            defeated={winner === 'right'}
          />
        </div>

        {/* Right fighter (Merchant — walks LEFT toward opponent) */}
        <div
          className="absolute z-10"
          style={{
            right: phase === 'intro' ? '8%' : '20%',
            bottom: 50,
            transition: 'right 0.8s ease-out',
            animation: right.attacking ? 'slash-right 0.3s ease-out' : right.hit ? 'hit-flash 0.2s' : 'none',
          }}
        >
          <div className="text-center mb-1" style={{ width: DISPLAY_SIZE }}>
            <p className="font-pixel text-[7px] sm:text-[8px] text-forge-purple truncate">@solofounder</p>
            <span
              className="inline-block font-pixel text-[5px] sm:text-[6px] px-2 py-0.5 rounded mt-0.5"
              style={{ backgroundColor: 'rgba(123,104,238,0.2)', color: '#7B68EE', border: '1px solid rgba(123,104,238,0.3)' }}
            >
              MERCHANT
            </span>
          </div>
          <div className="mx-auto mb-1" style={{ width: 60 }}>
            <div className="h-2 bg-forge-dark/90 border border-forge-amber/30 rounded-sm overflow-hidden" style={{ width: 60 }}>
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${right.hp}%`,
                  backgroundColor: right.hp > 50 ? '#7B68EE' : right.hp > 25 ? '#F39C12' : '#E74C3C',
                }}
              />
            </div>
            <p className="font-pixel text-[5px] text-forge-wheat/30 text-center mt-0.5">{right.hp}/100</p>
          </div>
          <LpcSprite
            sheet="/sprites/characters/merchant_base.png"
            row={fighting ? ROW_LEFT : ROW_DOWN}
            animate={fighting && !winner}
            defeated={winner === 'left'}
          />
        </div>

        {/* XP float */}
        {showXp && winner && (
          <div
            className="absolute z-30 font-pixel text-[10px] sm:text-xs text-forge-amber"
            style={{
              [winner === 'left' ? 'left' : 'right']: '25%',
              bottom: 180,
              animation: 'xp-float 1.5s ease-out forwards',
              textShadow: '0 0 10px rgba(243,156,18,0.5)',
            }}
          >
            +450 XP
          </div>
        )}

        {/* Winner */}
        {winner && (
          <div className="absolute inset-0 z-20 flex items-end justify-center pb-3">
            <span className="font-pixel text-[9px] sm:text-sm text-forge-amber animate-pulse">
              {winner === 'left' ? '@indie_builder' : '@solofounder'} WINS!
            </span>
          </div>
        )}

        {/* Floor */}
        <div className="absolute bottom-10 left-0 right-0 h-px bg-forge-amber/20" />
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-forge-dark/60" />
      </div>
    </div>
  );
}
