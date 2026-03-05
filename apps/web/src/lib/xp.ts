import { db } from '@midforge/db/client';
import { players } from '@midforge/db/schema';
import { eq } from 'drizzle-orm';
import { getCharacterSpriteKey } from '@midforge/shared/constants/game';

/**
 * Award XP to a player, check for form evolution, and set pending notifications if evolved.
 */
export async function awardXP(
  playerId: string,
  amount: number,
  source: string,
): Promise<{ newXP: number; evolved: boolean; newForm?: string }> {
  const result = await db
    .select({ xp: players.xp, tier: players.tier })
    .from(players)
    .where(eq(players.id, playerId))
    .limit(1);

  if (result.length === 0) return { newXP: 0, evolved: false };

  const player = result[0];
  const oldXP = player.xp ?? 0;
  const tier = player.tier ?? 'villager';
  const oldForm = getCharacterSpriteKey(tier, oldXP);
  const newXP = oldXP + amount;
  const newForm = getCharacterSpriteKey(tier, newXP);
  const evolved = newForm !== oldForm;

  const formLabel = newForm.split('_').pop() ?? 'base'; // 'base' | 'upgraded' | 'ascended'
  const formNumber = formLabel === 'ascended' ? 'III' : formLabel === 'upgraded' ? 'II' : 'I';

  await db
    .update(players)
    .set({
      xp: newXP,
      characterForm: formLabel,
      ...(evolved
        ? {
            pendingNotifications: [
              {
                type: 'evolution',
                message: `FORM UPGRADED — ${tier.toUpperCase()} ${formNumber}`,
              },
            ],
          }
        : {}),
    })
    .where(eq(players.id, playerId));

  return { newXP, evolved, newForm: evolved ? newForm : undefined };
}
