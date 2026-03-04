'use client';

interface PlayerCardData {
  username: string;
  tier: string;
  mrr: number;
  followers: number;
  level: number;
}

const TIER_COLORS: Record<string, string> = {
  villager: '#8B7355', apprentice: '#4A90D9',
  merchant: '#7B68EE', warrior: '#E74C3C', legend: '#F39C12',
};

const TIER_LABELS: Record<string, string> = {
  villager: 'Villager', apprentice: 'Apprentice',
  merchant: 'Merchant', warrior: 'Warrior', legend: 'Legend',
};

export function PlayerCard({
  player,
  onClose,
}: {
  player: PlayerCardData;
  onClose: () => void;
}) {
  const color = TIER_COLORS[player.tier] || '#ffffff';
  const label = TIER_LABELS[player.tier] || 'Unknown';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="forge-panel w-72 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Character preview */}
        <div
          className="w-12 h-16 mx-auto mb-3"
          style={{ backgroundColor: color }}
        />

        <p className="font-pixel text-sm mb-1" style={{ color }}>
          @{player.username}
        </p>
        <p className="font-pixel text-[8px] text-forge-wheat/50 mb-4">
          {label} · Level {player.level}
        </p>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="forge-panel py-2">
            <p className="font-pixel text-[7px] text-forge-wheat/50">MRR</p>
            <p className="font-pixel text-[10px] text-forge-green">
              ${(player.mrr / 100).toLocaleString()}
            </p>
          </div>
          <div className="forge-panel py-2">
            <p className="font-pixel text-[7px] text-forge-wheat/50">FOLLOWERS</p>
            <p className="font-pixel text-[10px] text-forge-blue">
              {player.followers >= 1000
                ? (player.followers / 1000).toFixed(1) + 'K'
                : player.followers}
            </p>
          </div>
        </div>

        <button onClick={onClose} className="forge-btn text-[8px] w-full">
          Close
        </button>
      </div>
    </div>
  );
}
