'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Quest Panel ───
interface QuestDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  target: number;
  rewardXp: number;
  rewardGold: number;
  rewardItemId: string | null;
}

interface PlayerQuest {
  id: string;
  questId: string;
  status: string;
  progress: number | null;
  target: number;
  definition: QuestDef | null;
}

export function QuestPanel({ onClose }: { onClose: () => void }) {
  const [quests, setQuests] = useState<PlayerQuest[]>([]);
  const [available, setAvailable] = useState<QuestDef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/quests')
      .then((r) => r.json())
      .then((data) => {
        setQuests(data.quests ?? []);
        setAvailable(data.available ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const acceptQuest = async (questId: string) => {
    const res = await fetch('/api/quests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'accept', questId }),
    });
    if (res.ok) {
      const data = await res.json();
      setQuests((prev) => [...prev, { ...data.quest, definition: available.find((a) => a.id === questId) ?? null }]);
      setAvailable((prev) => prev.filter((a) => a.id !== questId));
    }
  };

  return (
    <Panel title="Elder Forge — Quests" onClose={onClose}>
      {loading ? (
        <p className="font-pixel text-[8px] text-forge-wheat/50 animate-pulse">Loading quests...</p>
      ) : (
        <>
          {quests.length > 0 && (
            <div className="mb-4">
              <p className="font-pixel text-[8px] text-forge-amber mb-2">ACTIVE QUESTS</p>
              {quests.map((q) => (
                <div key={q.id} className="forge-panel mb-2 p-2">
                  <div className="flex justify-between items-center">
                    <span className="font-pixel text-[8px] text-forge-wheat">
                      {q.definition?.icon} {q.definition?.title ?? q.questId}
                    </span>
                    <span className={`font-pixel text-[7px] ${q.status === 'completed' ? 'text-forge-green' : 'text-forge-amber'}`}>
                      {q.status === 'completed' ? 'DONE' : `${q.progress ?? 0}/${q.target}`}
                    </span>
                  </div>
                  <p className="font-pixel text-[7px] text-forge-wheat/50 mt-1">{q.definition?.description}</p>
                </div>
              ))}
            </div>
          )}
          {available.length > 0 && (
            <div>
              <p className="font-pixel text-[8px] text-forge-amber mb-2">AVAILABLE</p>
              {available.map((a) => (
                <div key={a.id} className="forge-panel mb-2 p-2">
                  <div className="flex justify-between items-center">
                    <span className="font-pixel text-[8px] text-forge-wheat">{a.icon} {a.title}</span>
                    <button onClick={() => acceptQuest(a.id)} className="forge-btn text-[7px] py-1 px-2">Accept</button>
                  </div>
                  <p className="font-pixel text-[7px] text-forge-wheat/50 mt-1">{a.description}</p>
                  <p className="font-pixel text-[7px] text-forge-green mt-1">
                    +{a.rewardXp} XP · +{a.rewardGold}G
                    {a.rewardItemId ? ` · ${a.rewardItemId}` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
          {quests.length === 0 && available.length === 0 && (
            <p className="font-pixel text-[8px] text-forge-wheat/50">No quests available right now.</p>
          )}
        </>
      )}
    </Panel>
  );
}

// ─── Inventory Panel ───
export function InventoryPanel({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [equipped, setEquipped] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/inventory')
      .then((r) => r.json())
      .then((data) => {
        setItems(data.inventory ?? []);
        setEquipped(data.equipped ?? {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const equipItem = async (itemId: string) => {
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'equip', itemId }),
    });
    if (res.ok) {
      const data = await res.json();
      setEquipped((prev: any) => ({ ...prev, [data.slot]: data.equipped }));
    }
  };

  return (
    <Panel title="Ironhide — Blacksmith" onClose={onClose}>
      {loading ? (
        <p className="font-pixel text-[8px] text-forge-wheat/50 animate-pulse">Loading inventory...</p>
      ) : (
        <>
          <div className="mb-4">
            <p className="font-pixel text-[8px] text-forge-amber mb-2">EQUIPPED</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="forge-panel p-2 text-center">
                <p className="font-pixel text-[7px] text-forge-wheat/50">WEAPON</p>
                <p className="font-pixel text-[8px] text-forge-red">{equipped.weapon ?? 'none'}</p>
              </div>
              <div className="forge-panel p-2 text-center">
                <p className="font-pixel text-[7px] text-forge-wheat/50">ARMOR</p>
                <p className="font-pixel text-[8px] text-forge-blue">{equipped.armor ?? 'none'}</p>
              </div>
            </div>
          </div>
          <div>
            <p className="font-pixel text-[8px] text-forge-amber mb-2">INVENTORY ({items.length})</p>
            {items.length === 0 ? (
              <p className="font-pixel text-[7px] text-forge-wheat/50">Your inventory is empty. Complete quests to earn gear!</p>
            ) : (
              items.map((item) => (
                <div key={item.id} className="forge-panel mb-2 p-2 flex justify-between items-center">
                  <div>
                    <p className="font-pixel text-[8px] text-forge-wheat">{item.details?.name ?? item.itemId}</p>
                    <p className="font-pixel text-[7px] text-forge-wheat/50">
                      {item.details?.type === 'weapon' ? `PWR ${item.details.power}` : `DEF ${item.details?.defense}`}
                    </p>
                  </div>
                  <button onClick={() => equipItem(item.itemId)} className="forge-btn text-[7px] py-1 px-2">Equip</button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </Panel>
  );
}

// ─── Arena Types ───
interface FightRound {
  round: number;
  cHp: number;
  dHp: number;
  cDmg: number;
  dDmg: number;
}

interface GhostFightResult {
  winner: string;
  playerWon: boolean;
  xpReward: number;
  goldReward: number;
  evolved: boolean;
  ghost: { username: string; tier: string; level: number; difficulty: number };
  fightLog: FightRound[];
  shareCard: { title: string; subtitle: string };
}

const TIER_COLORS: Record<string, string> = {
  villager: '#8B7355', apprentice: '#4A90D9',
  merchant: '#7B68EE', warrior: '#E74C3C', legend: '#F39C12',
};

const TIER_LABELS: Record<string, string> = {
  villager: 'VILLAGER', apprentice: 'APPRENTICE',
  merchant: 'MERCHANT', warrior: 'WARRIOR', legend: 'LEGEND',
};

// ─── Pixel Sprite (CSS-only character) ───
function PixelSprite({
  color, flipped = false, hit = false, dead = false, tier = 'villager',
}: {
  color: string; flipped?: boolean; hit?: boolean; dead?: boolean; tier?: string;
}) {
  const glow = hit ? `0 0 24px ${color}, 0 0 48px ${color}` : `0 0 8px ${color}40`;
  return (
    <div style={{
      width: 48, height: 64, position: 'relative',
      transform: `${flipped ? 'scaleX(-1)' : ''} ${dead ? 'rotate(90deg)' : ''}`,
      opacity: dead ? 0.3 : 1,
      transition: 'opacity 0.4s, transform 0.4s',
      imageRendering: 'pixelated',
      filter: hit ? `brightness(3) drop-shadow(0 0 8px ${color})` : 'none',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 12, width: 24, height: 20, backgroundColor: color, boxShadow: glow, borderRadius: '3px 3px 0 0' }} />
      <div style={{ position: 'absolute', top: 6, left: 16, width: 4, height: 4, backgroundColor: '#000', borderRadius: 1 }} />
      <div style={{ position: 'absolute', top: 6, left: 28, width: 4, height: 4, backgroundColor: '#000', borderRadius: 1 }} />
      <div style={{ position: 'absolute', top: 20, left: 10, width: 28, height: 24, backgroundColor: `${color}CC`, boxShadow: glow }} />
      <div style={{ position: 'absolute', top: 32, left: 10, width: 28, height: 3, backgroundColor: '#00000040' }} />
      <div style={{ position: 'absolute', top: 22, left: 2, width: 8, height: 18, backgroundColor: color, borderRadius: '0 0 3px 3px', boxShadow: glow }} />
      <div style={{ position: 'absolute', top: 22, right: 2, width: 8, height: 18, backgroundColor: color, borderRadius: '0 0 3px 3px', boxShadow: glow }} />
      <div style={{ position: 'absolute', top: 44, left: 11, width: 10, height: 20, backgroundColor: `${color}AA`, borderRadius: '0 0 3px 3px' }} />
      <div style={{ position: 'absolute', top: 44, right: 11, width: 10, height: 20, backgroundColor: `${color}AA`, borderRadius: '0 0 3px 3px' }} />
      {(tier === 'warrior' || tier === 'legend') && (
        <div style={{ position: 'absolute', top: 10, right: -8, width: 4, height: 36, backgroundColor: tier === 'legend' ? '#FFD700' : '#888', borderRadius: 2, boxShadow: tier === 'legend' ? '0 0 8px #FFD700' : 'none' }} />
      )}
    </div>
  );
}

// ─── Floating Damage Number ───
function DamageNumber({ damage, x, critical }: { damage: number; x: 'left' | 'right'; critical?: boolean }) {
  return (
    <div style={{
      position: 'absolute', top: 0, [x === 'left' ? 'left' : 'right']: 16,
      fontFamily: '"Press Start 2P", monospace',
      fontSize: critical ? 14 : 11,
      color: critical ? '#FFD700' : '#FF4444',
      textShadow: `0 0 8px ${critical ? '#FFD700' : '#FF0000'}, 2px 2px 0 #000`,
      animation: 'floatUp 0.8s ease-out forwards',
      pointerEvents: 'none', zIndex: 50, whiteSpace: 'nowrap',
    }}>
      {critical ? '💥 ' : ''}-{damage}
    </div>
  );
}

// ─── Segmented HP Bar ───
function HPBar({ current, max, name, color }: { current: number; max: number; name: string; color: string }) {
  const pct = Math.max(0, Math.min(1, current / max));
  const barColor = pct > 0.5 ? '#27AE60' : pct > 0.25 ? '#F39C12' : '#E74C3C';
  const segments = 10;
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
        <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 6, color: '#fff', textShadow: '1px 1px 0 #000', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
        <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 6, color: barColor }}>{Math.round(current)}</span>
      </div>
      <div style={{ height: 8, background: '#0a0818', border: `1px solid ${color}40`, borderRadius: 2, overflow: 'hidden', display: 'flex', gap: 1, padding: 1 }}>
        {Array.from({ length: segments }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: '100%', backgroundColor: i < Math.round(pct * segments) ? barColor : '#1a0a2e', transition: 'background-color 0.3s', borderRadius: 1 }} />
        ))}
      </div>
    </div>
  );
}

// ─── Arena Biome Backgrounds (6 CSS battle scenes) ───
type ArenaBiome = 'arena' | 'forest' | 'cave' | 'castle' | 'desert' | 'ruins';

const BIOME_STYLES: Record<ArenaBiome, {
  sky: string; ground: string; groundBorder: string;
  accent1: string; accent2: string; particle: string;
}> = {
  arena: {
    sky: 'linear-gradient(180deg, #0d0a1e 0%, #1a1030 60%, #2a1a4e 100%)',
    ground: 'repeating-linear-gradient(90deg, #1a1225 0px, #1a1225 31px, #221530 32px)',
    groundBorder: '#F39C1220',
    accent1: '🔥', accent2: '🔥', particle: '#F39C12',
  },
  forest: {
    sky: 'linear-gradient(180deg, #0a1a0a 0%, #0d2a0d 50%, #1a3a1a 100%)',
    ground: 'repeating-linear-gradient(90deg, #0d1a0d 0px, #0d1a0d 15px, #1a2a1a 16px)',
    groundBorder: '#2D5A2730',
    accent1: '🌲', accent2: '🌿', particle: '#2D5A27',
  },
  cave: {
    sky: 'linear-gradient(180deg, #0a0808 0%, #1a1210 50%, #2a1a10 100%)',
    ground: 'repeating-linear-gradient(90deg, #1a1410 0px, #1a1410 20px, #2a1e14 21px)',
    groundBorder: '#6B5B4F30',
    accent1: '🪨', accent2: '💎', particle: '#6B5B4F',
  },
  castle: {
    sky: 'linear-gradient(180deg, #0a0a14 0%, #14142a 50%, #1e1e3a 100%)',
    ground: 'repeating-linear-gradient(90deg, #141420 0px, #141420 23px, #1e1e30 24px)',
    groundBorder: '#7B68EE30',
    accent1: '🏰', accent2: '⚔', particle: '#7B68EE',
  },
  desert: {
    sky: 'linear-gradient(180deg, #1a1408 0%, #2a2010 50%, #3a2a14 100%)',
    ground: 'repeating-linear-gradient(90deg, #2a2010 0px, #2a2010 18px, #3a2a14 19px)',
    groundBorder: '#C0872030',
    accent1: '🌵', accent2: '☀', particle: '#C08720',
  },
  ruins: {
    sky: 'linear-gradient(180deg, #0a0a0a 0%, #1a1418 50%, #2a1a20 100%)',
    ground: 'repeating-linear-gradient(90deg, #141014 0px, #141014 25px, #1e1620 26px)',
    groundBorder: '#8B250040',
    accent1: '💀', accent2: '🕯', particle: '#8B2500',
  },
};

const BIOME_LIST: ArenaBiome[] = ['arena', 'forest', 'cave', 'castle', 'desert', 'ruins'];

function ArenaBackground({ flash, biome = 'arena' }: { flash: 'left' | 'right' | null; biome?: ArenaBiome }) {
  const s = BIOME_STYLES[biome] ?? BIOME_STYLES.arena;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 8, background: s.sky }}>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%', background: s.ground, borderTop: `2px solid ${s.groundBorder}` }} />
      <div style={{ position: 'absolute', top: 12, left: 16, fontSize: 14 }}>{s.accent1}</div>
      <div style={{ position: 'absolute', top: 12, right: 16, fontSize: 14 }}>{s.accent2}</div>
      {flash && (
        <div style={{ position: 'absolute', inset: 0, backgroundColor: flash === 'left' ? '#FF000020' : `${s.particle}20`, animation: 'flashFade 0.15s ease-out forwards', pointerEvents: 'none' }} />
      )}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.03, background: 'repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 3px)', pointerEvents: 'none' }} />
    </div>
  );
}

// ─── Arena Fight Scene (3-action combat) ───
type CombatAction = 'strike' | 'powerStrike' | 'block';

function ArenaFightScene({
  result, playerName, playerTier = 'villager', onDone, biome = 'arena',
}: {
  result: GhostFightResult; playerName: string; playerTier?: string; onDone: () => void; biome?: ArenaBiome;
}) {
  const log = result.fightLog;
  const maxHp = log.length > 0 ? Math.round(log[0].cHp + log[0].cDmg * 2) : 100;

  const [phase, setPhase] = useState<'intro' | 'fight' | 'result'>('intro');
  const [roundIdx, setRoundIdx] = useState(-1);
  const [cHp, setCHp] = useState(maxHp);
  const [dHp, setDHp] = useState(maxHp);
  const [dmgLeft, setDmgLeft] = useState<number | null>(null);
  const [dmgRight, setDmgRight] = useState<number | null>(null);
  const [hitLeft, setHitLeft] = useState(false);
  const [hitRight, setHitRight] = useState(false);
  const [shakeLeft, setShakeLeft] = useState(false);
  const [shakeRight, setShakeRight] = useState(false);
  const [flashBg, setFlashBg] = useState<'left' | 'right' | null>(null);
  const [canAttack, setCanAttack] = useState(false);
  const [intro, setIntro] = useState(true);
  const [playerEntered, setPlayerEntered] = useState(false);
  const [ghostEntered, setGhostEntered] = useState(false);
  const [vsVisible, setVsVisible] = useState(false);
  const [powerCharge, setPowerCharge] = useState(0);
  const [lastAction, setLastAction] = useState<CombatAction | null>(null);
  const [ghostAction, setGhostAction] = useState<string | null>(null);
  const [blocksUsed, setBlocksUsed] = useState(0);
  const busy = useRef(false);
  const realCHp = useRef(maxHp);
  const realDHp = useRef(maxHp);

  const ghostColor = TIER_COLORS[result.ghost.tier] || '#8B7355';
  const playerColor = TIER_COLORS[playerTier] || '#4A90D9';
  const isDead = (hp: number) => hp <= 0;
  const powerReady = powerCharge >= 2;

  // Ghost AI: block 20% when below 30% HP, power strike when 'charged'
  const getGhostAction = useCallback((gHpPct: number, rnd: number): CombatAction => {
    if (gHpPct < 0.3 && Math.random() < 0.2) return 'block';
    if (rnd > 0 && rnd % 3 === 0) return 'powerStrike';
    return 'strike';
  }, []);

  // Intro sequence
  useEffect(() => {
    const t1 = setTimeout(() => setPlayerEntered(true), 200);
    const t2 = setTimeout(() => setGhostEntered(true), 600);
    const t3 = setTimeout(() => setVsVisible(true), 1100);
    const t4 = setTimeout(() => { setIntro(false); setPhase('fight'); setCanAttack(true); }, 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  // Round execution with action modifiers
  const executeRound = useCallback((action: CombatAction) => {
    if (busy.current || !canAttack) return;
    if (action === 'powerStrike' && !powerReady) return;

    const next = roundIdx + 1;
    if (next >= log.length) { setPhase('result'); return; }
    busy.current = true;
    setCanAttack(false);
    setRoundIdx(next);
    setLastAction(action);

    const r = log[next];
    const gHpPct = realDHp.current / maxHp;
    const gAction = getGhostAction(gHpPct, next);
    setGhostAction(gAction);

    // Apply action modifiers to base damage
    let playerDmg = r.cDmg;
    if (action === 'powerStrike') playerDmg = Math.round(r.cDmg * 1.5);
    if (action === 'block') playerDmg = 0;
    if (gAction === 'block') playerDmg = Math.round(playerDmg * 0.4);

    let ghostDmg = r.dDmg;
    if (gAction === 'powerStrike') ghostDmg = Math.round(r.dDmg * 1.5);
    if (gAction === 'block') ghostDmg = 0;
    if (action === 'block') ghostDmg = Math.round(ghostDmg * 0.4);

    // Update charge counter
    if (action === 'powerStrike') {
      setPowerCharge(0);
    } else {
      setPowerCharge(prev => Math.min(prev + 1, 2));
    }

    if (action === 'block') setBlocksUsed(prev => prev + 1);

    // Calculate real HP after modifiers
    const newDHp = Math.max(0, realDHp.current - playerDmg);
    const newCHp = newDHp > 0 ? Math.max(0, realCHp.current - ghostDmg) : realCHp.current;

    // Player attacks ghost (unless blocking)
    if (action !== 'block') {
      setHitLeft(true);
      setFlashBg('right');
    }

    setTimeout(() => {
      setHitLeft(false);
      if (playerDmg > 0) {
        setShakeRight(true);
        setDmgRight(playerDmg);
      }
      realDHp.current = newDHp;
      setDHp(newDHp);

      setTimeout(() => {
        setShakeRight(false); setDmgRight(null); setFlashBg(null);
        if (isDead(newDHp)) {
          setTimeout(() => { setPhase('result'); busy.current = false; }, 600);
          return;
        }
        // Ghost retaliates
        setTimeout(() => {
          if (gAction !== 'block') {
            setHitRight(true);
            setFlashBg('left');
          }
          setTimeout(() => {
            setHitRight(false);
            if (ghostDmg > 0) {
              setShakeLeft(true);
              setDmgLeft(ghostDmg);
            }
            realCHp.current = newCHp;
            setCHp(newCHp);
            setTimeout(() => {
              setShakeLeft(false); setDmgLeft(null); setFlashBg(null);
              setGhostAction(null);
              if (isDead(newCHp)) {
                setTimeout(() => { setPhase('result'); busy.current = false; }, 600);
              } else {
                setCanAttack(true); busy.current = false;
              }
            }, 350);
          }, 200);
        }, 400);
      }, 300);
    }, action === 'block' ? 100 : 250);
  }, [roundIdx, log, canAttack, maxHp, powerReady, getGhostAction]);

  // Keyboard shortcuts: 1=Strike, 2=Power Strike, 3=Block, Space=Strike
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (phase === 'fight' && canAttack) {
        if (e.code === 'Space' || e.code === 'Digit1') { e.preventDefault(); executeRound('strike'); }
        if (e.code === 'Digit2' && powerReady) { e.preventDefault(); executeRound('powerStrike'); }
        if (e.code === 'Digit3') { e.preventDefault(); executeRound('block'); }
      }
      if ((e.code === 'Space' || e.code === 'Enter') && phase === 'result') { onDone(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [executeRound, phase, onDone, canAttack, powerReady]);

  const actionBtnStyle = (enabled: boolean, color: string, glowColor: string) => ({
    fontFamily: '"Press Start 2P", monospace' as const, fontSize: 7,
    padding: '8px 10px', flex: 1,
    background: enabled ? `linear-gradient(180deg, ${color} 0%, ${color}CC 100%)` : '#2a1a4e',
    color: enabled ? '#000' : '#ffffff30',
    border: `2px solid ${enabled ? color : '#2a1a4e'}`,
    borderRadius: 4, cursor: enabled ? 'pointer' : 'default',
    animation: enabled ? `pulseGlow 1.2s infinite` : 'none',
    transition: 'all 0.2s',
    textShadow: enabled ? '0 1px 0 #00000040' : 'none',
  });

  return (
    <>
      <style>{`
        @keyframes floatUp { 0% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(-40px); opacity: 0; } }
        @keyframes flashFade { 0% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes slideInLeft { from { transform: translateX(-120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideInRight { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes vsPopIn { 0% { transform: scale(0) rotate(-10deg); opacity: 0; } 60% { transform: scale(1.3) rotate(4deg); opacity: 1; } 100% { transform: scale(1) rotate(0deg); opacity: 1; } }
        @keyframes shakeX { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-8px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-6px); } 80% { transform: translateX(6px); } }
        @keyframes attackLunge { 0% { transform: translateX(0); } 40% { transform: translateX(20px); } 100% { transform: translateX(0); } }
        @keyframes attackLungeR { 0% { transform: scaleX(-1) translateX(0); } 40% { transform: scaleX(-1) translateX(20px); } 100% { transform: scaleX(-1) translateX(0); } }
        @keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 8px #F39C1240; } 50% { box-shadow: 0 0 24px #F39C12; } }
        @keyframes blockShimmer { 0% { opacity: 0.3; } 50% { opacity: 0.6; } 100% { opacity: 0.3; } }
      `}</style>

      <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '2px solid #F39C1240', background: '#0d0a1e', minHeight: 280, marginBottom: 12 }}>
        <ArenaBackground flash={flashBg} biome={biome} />

        {/* VS Intro overlay */}
        {intro && vsVisible && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0a1eDD' }}>
            <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 28, color: '#F39C12', textShadow: '0 0 24px #F39C12, 3px 3px 0 #000', animation: 'vsPopIn 0.4s ease-out forwards' }}>VS</span>
          </div>
        )}

        <div style={{ position: 'relative', zIndex: 10, padding: '16px 12px 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* HP Bars */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}><HPBar current={cHp} max={maxHp} name={`@${playerName}`} color={playerColor} /></div>
            <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: '#F39C12', paddingBottom: 2 }}>⚔</div>
            <div style={{ flex: 1 }}><HPBar current={dHp} max={maxHp} name={result.ghost.username} color={ghostColor} /></div>
          </div>

          {/* Sprites */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', minHeight: 100, padding: '4px 12px', position: 'relative' }}>
            {/* Player */}
            <div style={{ position: 'relative', animation: playerEntered ? (hitLeft ? 'attackLunge 0.4s ease-in-out' : shakeLeft ? 'shakeX 0.4s ease-in-out' : 'none') : 'slideInLeft 0.4s ease-out forwards' }}>
              <PixelSprite color={playerColor} tier={playerTier} hit={hitLeft} dead={isDead(cHp)} />
              {dmgLeft !== null && <DamageNumber damage={dmgLeft} x="left" critical={lastAction === 'block'} />}
              {lastAction === 'block' && !canAttack && (
                <div style={{ position: 'absolute', inset: -4, border: '2px solid #4A90D9', borderRadius: 8, animation: 'blockShimmer 0.6s infinite', pointerEvents: 'none' }} />
              )}
              <div style={{ textAlign: 'center', marginTop: 4, fontFamily: '"Press Start 2P", monospace', fontSize: 5, color: playerColor, textShadow: '1px 1px 0 #000' }}>{TIER_LABELS[playerTier] ?? 'VILLAGER'}</div>
            </div>

            {/* Center */}
            <div style={{ textAlign: 'center' }}>
              {phase === 'fight' && <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 7, color: '#ffffff40', marginBottom: 4 }}>{roundIdx < 0 ? 'READY' : `RND ${roundIdx + 1}`}</div>}
              {ghostAction && <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 5, color: ghostAction === 'block' ? '#4A90D9' : ghostAction === 'powerStrike' ? '#E74C3C' : '#ffffff30', marginBottom: 2 }}>{ghostAction === 'block' ? 'BLOCKED' : ghostAction === 'powerStrike' ? 'POWER!' : ''}</div>}
              <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 5, color: '#ffffff20' }}>{'👻'} GHOST</div>
            </div>

            {/* Ghost */}
            <div style={{ position: 'relative', animation: ghostEntered ? (hitRight ? 'attackLungeR 0.4s ease-in-out' : shakeRight ? 'shakeX 0.4s ease-in-out' : 'none') : 'slideInRight 0.4s ease-out forwards' }}>
              <PixelSprite color={ghostColor} flipped tier={result.ghost.tier} hit={hitRight} dead={isDead(dHp)} />
              {dmgRight !== null && <DamageNumber damage={dmgRight} x="right" critical={lastAction === 'powerStrike'} />}
              {ghostAction === 'block' && (
                <div style={{ position: 'absolute', inset: -4, border: '2px solid #4A90D9', borderRadius: 8, animation: 'blockShimmer 0.6s infinite', pointerEvents: 'none' }} />
              )}
              <div style={{ textAlign: 'center', marginTop: 4, fontFamily: '"Press Start 2P", monospace', fontSize: 5, color: ghostColor, textShadow: '1px 1px 0 #000' }}>{TIER_LABELS[result.ghost.tier] ?? 'VILLAGER'}</div>
            </div>
          </div>

          {/* 3-Action combat buttons */}
          {phase === 'fight' && (
            <div style={{ display: 'flex', gap: 6, paddingTop: 4 }}>
              {/* STRIKE */}
              <button
                onClick={() => executeRound('strike')}
                disabled={!canAttack}
                style={actionBtnStyle(canAttack, '#F39C12', '#F39C12')}
              >
                ⚔ STRIKE
                <div style={{ fontSize: 5, marginTop: 2, opacity: 0.6 }}>[1]</div>
              </button>

              {/* POWER STRIKE */}
              <button
                onClick={() => executeRound('powerStrike')}
                disabled={!canAttack || !powerReady}
                style={actionBtnStyle(canAttack && powerReady, '#E74C3C', '#E74C3C')}
              >
                {'💥'} POWER
                <div style={{ fontSize: 5, marginTop: 2, opacity: 0.6 }}>
                  {powerReady ? '[2]' : `⚡${powerCharge}/2`}
                </div>
              </button>

              {/* BLOCK */}
              <button
                onClick={() => executeRound('block')}
                disabled={!canAttack}
                style={actionBtnStyle(canAttack, '#4A90D9', '#4A90D9')}
              >
                {'🛡'} BLOCK
                <div style={{ fontSize: 5, marginTop: 2, opacity: 0.6 }}>[3]</div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Result screen */}
      {phase === 'result' && <ResultScreen result={result} onDone={onDone} />}
    </>
  );
}

// ─── Result Screen ───
function ResultScreen({ result, onDone }: { result: GhostFightResult; onDone: () => void }) {
  const [visible, setVisible] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  const [showEvo, setShowEvo] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 100);
    const t2 = setTimeout(() => setShowRewards(true), 700);
    const t3 = result.evolved ? setTimeout(() => setShowEvo(true), 1400) : null;
    return () => { clearTimeout(t1); clearTimeout(t2); if (t3) clearTimeout(t3); };
  }, [result.evolved]);

  const shareToX = () => {
    const text = `${result.shareCard.title}\n${result.shareCard.subtitle}\n\nmidforgegame.com`;
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div style={{
      borderRadius: 8, overflow: 'hidden',
      border: `2px solid ${result.playerWon ? '#27AE6060' : '#E74C3C60'}`,
      background: result.playerWon ? '#0a1f0e' : '#1f0a0a',
      padding: '20px 16px', textAlign: 'center',
      opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)',
      transition: 'opacity 0.4s, transform 0.4s',
    }}>
      <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 20, color: result.playerWon ? '#27AE60' : '#E74C3C', textShadow: `0 0 20px ${result.playerWon ? '#27AE60' : '#E74C3C'}, 3px 3px 0 #000`, marginBottom: 8, letterSpacing: 2 }}>
        {result.playerWon ? '🏆 VICTORY!' : '💀 DEFEATED'}
      </div>
      <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 7, color: '#ffffff50', marginBottom: 16 }}>
        vs {result.ghost.username} · Lv{result.ghost.level} {result.ghost.tier.toUpperCase()}
      </div>

      {showRewards && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16, animation: 'vsPopIn 0.3s ease-out forwards' }}>
          <div style={{ background: '#F39C1220', border: '1px solid #F39C1260', borderRadius: 20, padding: '6px 14px', fontFamily: '"Press Start 2P", monospace', fontSize: 9, color: '#F39C12' }}>
            +{result.xpReward} XP
          </div>
          {result.goldReward > 0 && (
            <div style={{ background: '#FFD70020', border: '1px solid #FFD70060', borderRadius: 20, padding: '6px 14px', fontFamily: '"Press Start 2P", monospace', fontSize: 9, color: '#FFD700' }}>
              +{result.goldReward}G
            </div>
          )}
        </div>
      )}

      {showEvo && result.evolved && (
        <div style={{ background: 'linear-gradient(90deg, #F39C1220, #FFD70040, #F39C1220)', border: '2px solid #F39C12', borderRadius: 8, padding: '10px 16px', marginBottom: 16, animation: 'vsPopIn 0.4s ease-out forwards' }}>
          <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 10, color: '#FFD700', textShadow: '0 0 12px #FFD700', animation: 'pulseGlow 0.8s infinite' }}>
            ✨ FORM EVOLVED!
          </div>
          <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 7, color: '#F39C12', marginTop: 6 }}>
            Your hero has grown stronger
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onDone} style={{ flex: 1, fontFamily: '"Press Start 2P", monospace', fontSize: 8, padding: '10px 0', background: 'linear-gradient(180deg, #F39C12, #E67E22)', color: '#000', border: '2px solid #F39C12', borderRadius: 4, cursor: 'pointer' }}>
          FIGHT AGAIN
        </button>
        <button onClick={shareToX} style={{ flex: 1, fontFamily: '"Press Start 2P", monospace', fontSize: 7, padding: '10px 0', background: '#1DA1F220', color: '#1DA1F2', border: '1px solid #1DA1F240', borderRadius: 4, cursor: 'pointer' }}>
          SHARE TO X
        </button>
      </div>
      <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 6, color: '#ffffff20', marginTop: 12 }}>
        SPACE / ENTER to continue
      </div>

      <style>{`
        @keyframes vsPopIn { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.2); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 8px #F39C1240; } 50% { box-shadow: 0 0 20px #F39C12; } }
      `}</style>
    </div>
  );
}

// ─── Arena Panel ───
// Brigand name → biome mapping
const BRIGAND_BIOME_MAP: Record<string, ArenaBiome> = {
  'Forest Brigand': 'forest',
  'Cave Troll': 'cave',
  'Deserter Knight': 'ruins',
};

export function ArenaPanel({ onClose, brigandData }: { onClose: () => void; brigandData?: any }) {
  const [fighting, setFighting] = useState(false);
  const [result, setResult] = useState<GhostFightResult | null>(null);
  const [playerTier, setPlayerTier] = useState('villager');
  const [fightBiome, setFightBiome] = useState<ArenaBiome>('arena');
  const isBrigand = !!brigandData;

  const fightGhost = useCallback(async () => {
    setFighting(true);
    setResult(null);
    // Random biome for arena fights
    setFightBiome(BIOME_LIST[Math.floor(Math.random() * BIOME_LIST.length)]);
    try {
      const res = await fetch('/api/arena/ghost', { method: 'POST' });
      if (!res.ok) throw new Error('Fight failed');
      const data = await res.json();
      setResult(data.fight);
      if (data.playerTier) setPlayerTier(data.playerTier);
    } catch {
      // ignore
    }
    setFighting(false);
  }, []);

  // Auto-start brigand fight
  useEffect(() => {
    if (brigandData?.fight) {
      setResult(brigandData.fight);
      if (brigandData.playerTier) setPlayerTier(brigandData.playerTier);
      setFightBiome(BRIGAND_BIOME_MAP[brigandData.brigandName] ?? 'ruins');
    }
  }, [brigandData]);

  const panelTitle = isBrigand
    ? `⚔ ${brigandData?.brigandName ?? 'Brigand'} — Encounter!`
    : '⚔ Valkyra — Arena';

  return (
    <Panel title={panelTitle} onClose={onClose}>
      {/* Active fight scene */}
      {result && !fighting && (
        <ArenaFightScene
          result={result}
          playerName="You"
          playerTier={playerTier}
          biome={fightBiome}
          onDone={() => {
            if (isBrigand) {
              onClose();
            } else {
              setResult(null);
              fightGhost();
            }
          }}
        />
      )}

      {/* Pre-fight screen (only for arena, not brigands) */}
      {!result && !isBrigand && (
        <div style={{ background: '#0a0818', border: '1px solid #F39C1230', borderRadius: 8, padding: 16, marginBottom: 12 }}>
          <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 9, color: '#E74C3C', marginBottom: 8 }}>⚔ SOLO ARENA</div>
          <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 7, color: '#ffffff50', lineHeight: 1.8, marginBottom: 16 }}>
            Fight AI ghost opponents.<br />
            Earn XP · Gold · Evolve your hero.
          </div>
          <button
            onClick={fightGhost}
            disabled={fighting}
            style={{
              width: '100%', fontFamily: '"Press Start 2P", monospace', fontSize: 9,
              padding: '12px 0',
              background: fighting ? '#2a1a4e' : 'linear-gradient(180deg, #E74C3C 0%, #C0392B 100%)',
              color: fighting ? '#ffffff30' : '#fff',
              border: `2px solid ${fighting ? '#2a1a4e' : '#E74C3C'}`,
              borderRadius: 4, cursor: fighting ? 'default' : 'pointer',
              textShadow: fighting ? 'none' : '0 1px 0 #00000060',
              animation: !fighting ? 'pulseGlow 1.5s infinite' : 'none',
            }}
          >
            {fighting ? 'FINDING OPPONENT...' : '⚔ FIGHT GHOST'}
          </button>
          <style>{`@keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 8px #F39C1240; } 50% { box-shadow: 0 0 20px #F39C12; } }`}</style>
        </div>
      )}

      {/* PvP teaser (only for arena) */}
      {!result && !isBrigand && (
        <div style={{ background: '#0a0818', border: '1px solid #7B68EE30', borderRadius: 8, padding: 12 }}>
          <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: '#7B68EE', marginBottom: 8 }}>{'👥'} PVP {'—'} COMING SOON</div>
          {['1. Find another player in the world', '2. Walk up and press E to challenge', '3. Winner takes 10% of loser\'s XP'].map((line, i) => (
            <div key={i} style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 6, color: '#ffffff40', marginBottom: 6, lineHeight: 1.6 }}>{line}</div>
          ))}
        </div>
      )}
    </Panel>
  );
}

// ─── Marketplace Panel ───
export function MarketplacePanel({ onClose }: { onClose: () => void }) {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/marketplace')
      .then((r) => r.json())
      .then((data) => {
        setListings(data.listings ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const buyItem = async (listingId: string) => {
    const res = await fetch('/api/marketplace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'buy', listingId }),
    });
    if (res.ok) {
      alert('Purchase successful!');
    } else {
      const data = await res.json();
      alert(data.error ?? 'Purchase failed');
    }
  };

  return (
    <Panel title="Goldbag — Marketplace" onClose={onClose}>
      {loading ? (
        <p className="font-pixel text-[8px] text-forge-wheat/50 animate-pulse">Loading marketplace...</p>
      ) : listings.length === 0 ? (
        <p className="font-pixel text-[8px] text-forge-wheat/50">No listings yet. Be the first to sell!</p>
      ) : (
        <div className="space-y-2">
          {listings.map((l) => (
            <div key={l.id} className="forge-panel p-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-pixel text-[8px] text-forge-wheat">{l.title}</p>
                  <p className="font-pixel text-[7px] text-forge-wheat/50">by @{l.sellerUsername} · {l.type}</p>
                  {l.description && (
                    <p className="font-pixel text-[7px] text-forge-wheat/40 mt-1">{l.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-pixel text-[9px] text-forge-green">{l.priceUsd}G</p>
                  <button onClick={() => buyItem(l.id)} className="forge-btn text-[7px] py-1 px-2 mt-1">Buy</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

// ─── Shared Panel Wrapper ───
function Panel({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="forge-panel w-80 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-pixel text-[9px] text-forge-amber">{title}</h2>
          <button onClick={onClose} className="font-pixel text-[8px] text-forge-wheat/50 hover:text-forge-wheat">X</button>
        </div>
        {children}
      </div>
    </div>
  );
}
