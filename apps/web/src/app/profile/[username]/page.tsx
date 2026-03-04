import { db } from '@midforge/db/client';
import { players } from '@midforge/db/schema';
import { eq } from 'drizzle-orm';
import { TIERS, ITEMS, type TierKey, type ItemKey } from '@midforge/shared/types';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function ProfilePage({
  params,
}: {
  params: { username: string };
}) {
  const { username } = await params;

  const result = await db
    .select()
    .from(players)
    .where(eq(players.xUsername, username))
    .limit(1);

  if (result.length === 0) notFound();

  const player = result[0];
  const tierKey = (player.tier ?? 'villager') as TierKey;
  const tierData = TIERS[tierKey];
  const weaponKey = (player.equippedWeapon ?? 'wooden_sword') as ItemKey;
  const armorKey = (player.equippedArmor ?? 'cloth_tunic') as ItemKey;
  const weapon = ITEMS[weaponKey];
  const armor = ITEMS[armorKey];

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-lg mx-auto">
        <Link href="/world" className="forge-btn text-[9px] mb-6 inline-block">
          Back to World
        </Link>

        <div className="forge-panel">
          {/* Character preview */}
          <div className="flex items-center gap-6 mb-6">
            <div
              className="w-16 h-24 flex-shrink-0"
              style={{ backgroundColor: tierData.color }}
            />
            <div>
              <h1 className="font-pixel text-sm" style={{ color: tierData.color }}>
                @{player.xUsername}
              </h1>
              {player.xDisplayName && (
                <p className="font-pixel text-[9px] text-forge-wheat/60 mt-1">
                  {player.xDisplayName}
                </p>
              )}
              <p className="font-pixel text-[8px] text-forge-wheat/40 mt-1">
                {tierData.emoji} {tierData.label} · Level {player.level}
              </p>
              {player.seasonTitle && (
                <p className="font-pixel text-[8px] text-forge-amber mt-1">
                  {player.seasonTitle}
                </p>
              )}
            </div>
          </div>

          {/* Verified Stats */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="forge-panel text-center py-3">
              <p className="font-pixel text-[8px] text-forge-wheat/50 mb-1">MRR</p>
              <p className="font-pixel text-sm text-forge-green">
                ${((player.mrr ?? 0) / 100).toLocaleString()}
              </p>
              <p className="font-pixel text-[7px] text-forge-wheat/30 mt-1">verified</p>
            </div>
            <div className="forge-panel text-center py-3">
              <p className="font-pixel text-[8px] text-forge-wheat/50 mb-1">FOLLOWERS</p>
              <p className="font-pixel text-sm text-forge-blue">
                {(player.xFollowers ?? 0).toLocaleString()}
              </p>
              <p className="font-pixel text-[7px] text-forge-wheat/30 mt-1">verified</p>
            </div>
          </div>

          {/* Game Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="text-center">
              <p className="font-pixel text-[8px] text-forge-wheat/50">XP</p>
              <p className="font-pixel text-xs text-forge-wheat">{(player.xp ?? 0).toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="font-pixel text-[8px] text-forge-wheat/50">GOLD</p>
              <p className="font-pixel text-xs text-forge-amber">{(player.gold ?? 0).toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="font-pixel text-[8px] text-forge-wheat/50">LEVEL</p>
              <p className="font-pixel text-xs text-forge-wheat">{player.level}</p>
            </div>
          </div>

          {/* Equipment */}
          <div className="border-t border-forge-amber/20 pt-4">
            <p className="font-pixel text-[8px] text-forge-wheat/50 mb-3">EQUIPMENT</p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-pixel text-[9px] text-forge-wheat/70">{weapon.name}</span>
                <span className="font-pixel text-[8px] text-forge-red">PWR {weapon.power}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-pixel text-[9px] text-forge-wheat/70">{armor.name}</span>
                <span className="font-pixel text-[8px] text-forge-blue">DEF {armor.defense}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
