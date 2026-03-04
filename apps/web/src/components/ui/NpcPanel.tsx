'use client';

import { useEffect, useState } from 'react';

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

// ─── Arena Panel ───
export function ArenaPanel({ onClose }: { onClose: () => void }) {
  return (
    <Panel title="Valkyra — Arena" onClose={onClose}>
      <p className="font-pixel text-[8px] text-forge-wheat/70 mb-4">
        Challenge other players to fight for XP and glory.
        Click on any player in the world to view their card, then challenge them from there.
      </p>
      <div className="forge-panel p-3 text-center">
        <p className="font-pixel text-[9px] text-forge-red mb-2">HOW IT WORKS</p>
        <div className="space-y-2 text-left">
          <p className="font-pixel text-[7px] text-forge-wheat/60">1. Walk up to another player</p>
          <p className="font-pixel text-[7px] text-forge-wheat/60">2. Click them to view their stats</p>
          <p className="font-pixel text-[7px] text-forge-wheat/60">3. Challenge them to a fight</p>
          <p className="font-pixel text-[7px] text-forge-wheat/60">4. Winner takes 10% of loser&apos;s XP</p>
          <p className="font-pixel text-[7px] text-forge-wheat/60">5. Fight results auto-post to X</p>
        </div>
      </div>
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
