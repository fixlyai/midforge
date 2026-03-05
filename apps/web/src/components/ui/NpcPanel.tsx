'use client';

import { useCallback, useEffect, useState } from 'react';

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

// ─── Arena Fight Scene (visual combat) ───
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

function ArenaFightScene({
  result,
  playerName,
  onDone,
}: {
  result: GhostFightResult;
  playerName: string;
  onDone: () => void;
}) {
  const log = result.fightLog;
  const maxCHp = log.length > 0 ? (log[0].cHp + log[0].cDmg + log[0].dDmg) : 100;
  const maxDHp = maxCHp;

  const [roundIdx, setRoundIdx] = useState(-1);
  const [cHp, setCHp] = useState(maxCHp);
  const [dHp, setDHp] = useState(maxDHp);
  const [lastCDmg, setLastCDmg] = useState(0);
  const [lastDDmg, setLastDDmg] = useState(0);
  const [shake, setShake] = useState<'left' | 'right' | null>(null);
  const [flash, setFlash] = useState<'left' | 'right' | null>(null);
  const [done, setDone] = useState(false);
  const [prompt, setPrompt] = useState('SPACE to attack!');

  const advanceRound = useCallback(() => {
    const next = roundIdx + 1;
    if (next >= log.length) {
      setDone(true);
      setPrompt('');
      return;
    }

    const r = log[next];
    setRoundIdx(next);
    setPrompt('');

    // Player attacks first
    setFlash('right');
    setShake('right');
    setLastCDmg(r.cDmg);
    setLastDDmg(0);

    setTimeout(() => {
      setDHp(Math.max(0, r.dHp));
      setShake(null);
      setFlash(null);

      // Foe attacks back (if still alive)
      if (r.dHp > 0 && r.dDmg > 0) {
        setTimeout(() => {
          setFlash('left');
          setShake('left');
          setLastDDmg(r.dDmg);

          setTimeout(() => {
            setCHp(Math.max(0, r.cHp));
            setShake(null);
            setFlash(null);

            setTimeout(() => {
              if (next + 1 >= log.length) {
                setDone(true);
                setPrompt('');
              } else {
                setPrompt('SPACE to attack!');
              }
            }, 200);
          }, 300);
        }, 400);
      } else {
        setDone(true);
        setPrompt('');
      }
    }, 300);
  }, [roundIdx, log]);

  // Keyboard listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (done) {
          onDone();
        } else if (prompt) {
          advanceRound();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [advanceRound, done, prompt, onDone]);

  const cPct = Math.max(0, cHp / maxCHp);
  const dPct = Math.max(0, dHp / maxDHp);
  const ghostColor = TIER_COLORS[result.ghost.tier] || '#8B7355';

  return (
    <div className="relative">
      {/* Arena stage */}
      <div className="forge-panel p-3 mb-3 relative overflow-hidden" style={{ minHeight: 180 }}>
        {/* Background */}
        <div className="absolute inset-0 opacity-20" style={{
          background: 'radial-gradient(ellipse at center, #F39C12 0%, transparent 70%)',
        }} />

        {/* Round counter */}
        <div className="text-center mb-2 relative z-10">
          <span className="font-pixel text-[7px] text-forge-wheat/50">
            {done ? 'FIGHT OVER' : roundIdx < 0 ? 'READY?' : `ROUND ${roundIdx + 1}`}
          </span>
        </div>

        {/* Fighters */}
        <div className="flex justify-between items-end relative z-10" style={{ minHeight: 100 }}>
          {/* Player (left) */}
          <div className={`text-center transition-transform duration-150 ${shake === 'left' ? 'translate-x-2' : ''}`}>
            <div
              className={`w-12 h-16 mx-auto mb-1 rounded transition-all duration-150 ${flash === 'left' ? 'brightness-200' : ''}`}
              style={{
                backgroundColor: '#4A90D9',
                boxShadow: flash === 'right' ? '0 0 12px #F39C12' : 'none',
                imageRendering: 'pixelated',
              }}
            />
            <p className="font-pixel text-[6px] text-forge-wheat truncate max-w-[60px]">
              @{playerName}
            </p>
            {/* HP bar */}
            <div className="w-14 h-2 mx-auto mt-1 bg-[#1a0a2e] rounded-sm overflow-hidden border border-forge-amber/30">
              <div
                className="h-full transition-all duration-500 ease-out"
                style={{
                  width: `${cPct * 100}%`,
                  backgroundColor: cPct > 0.5 ? '#27AE60' : cPct > 0.2 ? '#F39C12' : '#E74C3C',
                }}
              />
            </div>
            <p className="font-pixel text-[5px] text-forge-wheat/40 mt-0.5">{Math.round(cHp)} HP</p>
            {/* Damage taken */}
            {lastDDmg > 0 && shake === 'left' && (
              <p className="font-pixel text-[8px] text-forge-red animate-bounce absolute -top-2 left-4">
                -{Math.round(lastDDmg)}
              </p>
            )}
          </div>

          {/* VS */}
          <div className="font-pixel text-[12px] text-forge-red self-center">
            ⚔
          </div>

          {/* Ghost opponent (right) */}
          <div className={`text-center transition-transform duration-150 ${shake === 'right' ? '-translate-x-2' : ''}`}>
            <div
              className={`w-12 h-16 mx-auto mb-1 rounded transition-all duration-150 ${flash === 'right' ? 'brightness-200' : ''}`}
              style={{
                backgroundColor: ghostColor,
                boxShadow: flash === 'left' ? '0 0 12px #F39C12' : 'none',
                imageRendering: 'pixelated',
                opacity: 0.8,
              }}
            />
            <p className="font-pixel text-[6px] text-forge-wheat/70 truncate max-w-[60px]">
              {result.ghost.username}
            </p>
            {/* HP bar */}
            <div className="w-14 h-2 mx-auto mt-1 bg-[#1a0a2e] rounded-sm overflow-hidden border border-forge-amber/30">
              <div
                className="h-full transition-all duration-500 ease-out"
                style={{
                  width: `${dPct * 100}%`,
                  backgroundColor: dPct > 0.5 ? '#27AE60' : dPct > 0.2 ? '#F39C12' : '#E74C3C',
                }}
              />
            </div>
            <p className="font-pixel text-[5px] text-forge-wheat/40 mt-0.5">{Math.round(dHp)} HP</p>
            {/* Damage taken */}
            {lastCDmg > 0 && shake === 'right' && (
              <p className="font-pixel text-[8px] text-forge-red animate-bounce absolute -top-2 right-4">
                -{Math.round(lastCDmg)}
              </p>
            )}
          </div>
        </div>

        {/* Attack prompt */}
        {prompt && !done && (
          <div className="text-center mt-3 relative z-10">
            <button
              onClick={advanceRound}
              className="forge-btn text-[8px] px-6 py-2 animate-pulse"
            >
              {prompt}
            </button>
          </div>
        )}
      </div>

      {/* Fight result (shown when done) */}
      {done && (
        <div className={`text-center py-3 mb-3 rounded ${result.playerWon ? 'bg-forge-green/10' : 'bg-forge-red/10'}`}>
          <p className={`font-pixel text-[12px] ${result.playerWon ? 'text-forge-green' : 'text-forge-red'}`}>
            {result.playerWon ? '🏆 VICTORY' : '💀 DEFEATED'}
          </p>
          <p className="font-pixel text-[7px] text-forge-wheat/60 mt-1">
            vs {result.ghost.username} (Lv{result.ghost.level})
          </p>
          <p className="font-pixel text-[9px] text-forge-amber mt-2">
            +{result.xpReward} XP{result.goldReward > 0 ? ` · +${result.goldReward}G` : ''}
          </p>
          {result.evolved && (
            <p className="font-pixel text-[9px] text-forge-amber mt-1 animate-pulse">✨ FORM EVOLVED</p>
          )}
          <p className="font-pixel text-[6px] text-forge-wheat/30 mt-2">SPACE to continue</p>
        </div>
      )}
    </div>
  );
}

// ─── Arena Panel ───
export function ArenaPanel({ onClose }: { onClose: () => void }) {
  const [fighting, setFighting] = useState(false);
  const [result, setResult] = useState<GhostFightResult | null>(null);
  const [showScene, setShowScene] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const fightGhost = async () => {
    setFighting(true);
    setResult(null);
    setShowScene(false);
    setShowResult(false);
    try {
      const res = await fetch('/api/arena/ghost', { method: 'POST' });
      if (!res.ok) {
        setFighting(false);
        return;
      }
      const data = await res.json();
      setResult(data.fight);
      setShowScene(true);
    } catch {
      // ignore
    }
    setFighting(false);
  };

  const shareToX = () => {
    if (!result) return;
    const text = `${result.shareCard.title}\n${result.shareCard.subtitle}\n\nPlay at midforgegame.com`;
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <Panel title="Valkyra — Arena" onClose={onClose}>
      {/* Visual fight scene */}
      {showScene && result && !showResult && (
        <ArenaFightScene
          result={result}
          playerName="You"
          onDone={() => { setShowScene(false); setShowResult(true); }}
        />
      )}

      {/* Pre-fight / post-fight */}
      {!showScene && (
        <div className="forge-panel p-3 mb-4">
          <p className="font-pixel text-[9px] text-forge-red mb-2">⚔️ SOLO ARENA</p>

          {!showResult ? (
            <>
              <p className="font-pixel text-[7px] text-forge-wheat/60 mb-3">
                Fight AI opponents to earn XP and gold. Press SPACE to attack each round.
              </p>
              <button
                onClick={fightGhost}
                disabled={fighting}
                className="forge-btn text-[8px] w-full"
              >
                {fighting ? 'FINDING OPPONENT...' : 'FIGHT GHOST OPPONENT'}
              </button>
            </>
          ) : result && (
            <>
              <div className={`text-center py-2 mb-3 rounded ${result.playerWon ? 'bg-forge-green/10' : 'bg-forge-red/10'}`}>
                <p className={`font-pixel text-[10px] ${result.playerWon ? 'text-forge-green' : 'text-forge-red'}`}>
                  {result.playerWon ? '🏆 VICTORY' : '💀 DEFEATED'}
                </p>
                <p className="font-pixel text-[7px] text-forge-wheat/60 mt-1">
                  vs {result.ghost.username} (Lv{result.ghost.level})
                </p>
                <p className="font-pixel text-[8px] text-forge-amber mt-1">
                  +{result.xpReward} XP{result.goldReward > 0 ? ` · +${result.goldReward}G` : ''}
                </p>
                {result.evolved && (
                  <p className="font-pixel text-[8px] text-forge-amber mt-1 animate-pulse">✨ FORM EVOLVED</p>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setShowResult(false); fightGhost(); }} disabled={fighting} className="forge-btn text-[7px] flex-1">
                  {fighting ? 'FINDING...' : 'FIGHT AGAIN'}
                </button>
                <button onClick={shareToX} className="forge-btn text-[7px] flex-1 bg-[#1DA1F2]/20">
                  SHARE TO X
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* PvP Instructions */}
      {!showScene && (
        <div className="forge-panel p-3">
          <p className="font-pixel text-[9px] text-forge-purple mb-2">👥 PVP ARENA</p>
          <div className="space-y-2 text-left">
            <p className="font-pixel text-[7px] text-forge-wheat/60">1. Walk up to another player in the world</p>
            <p className="font-pixel text-[7px] text-forge-wheat/60">2. Click them to view their stats</p>
            <p className="font-pixel text-[7px] text-forge-wheat/60">3. Hit &quot;Challenge&quot; to fight</p>
            <p className="font-pixel text-[7px] text-forge-wheat/60">4. Winner takes 10% of loser&apos;s XP</p>
          </div>
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
