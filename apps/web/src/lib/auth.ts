import NextAuth from 'next-auth';
import Twitter from 'next-auth/providers/twitter';
import { db } from '@midforge/db/client';
import { players } from '@midforge/db/schema';
import { eq } from 'drizzle-orm';
import { calculateTier, calculateLevel, getBestWeapon, getBestArmor } from '@midforge/shared/types';
import { getCharacterSpriteKey } from '@midforge/shared/constants/game';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Twitter({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || account.provider !== 'twitter') return false;

      const xUserId = account.providerAccountId;
      const xUsername = (profile as any)?.data?.username ?? user.name ?? 'unknown';
      const xDisplayName = (profile as any)?.data?.name ?? user.name ?? '';
      const xProfileImageUrl = (profile as any)?.data?.profile_image_url ?? user.image ?? '';
      const xFollowers = (profile as any)?.data?.public_metrics?.followers_count ?? 0;

      const existing = await db
        .select()
        .from(players)
        .where(eq(players.xUserId, xUserId))
        .limit(1);

      if (existing.length > 0) {
        // Update on each login
        const player = existing[0];
        const tier = calculateTier(player.mrr ?? 0, xFollowers);
        const level = calculateLevel(player.xp ?? 0);

        // Daily login XP check + evolution detection
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const isNewDay = player.lastLoginDate !== today;
        const dailyXpBonus = isNewDay ? 25 : 0;
        const oldXp = player.xp ?? 0;
        const newXp = oldXp + dailyXpBonus;

        const notifications: { type: string; message: string }[] = [];
        if (isNewDay) {
          notifications.push({ type: 'daily_login', message: '+25 XP — Daily Login Bonus' });

          // Check for form evolution
          const oldForm = getCharacterSpriteKey(tier, oldXp);
          const newForm = getCharacterSpriteKey(tier, newXp);
          if (newForm !== oldForm) {
            const formLabel = newForm.split('_').pop() ?? 'base';
            const formNum = formLabel === 'ascended' ? 'III' : formLabel === 'upgraded' ? 'II' : 'I';
            notifications.push({ type: 'evolution', message: `FORM UPGRADED — ${tier.toUpperCase()} ${formNum}` });
          }
        }

        // Resolve current character form
        const characterForm = getCharacterSpriteKey(tier, newXp).split('_').pop() ?? 'base';

        await db
          .update(players)
          .set({
            xUsername,
            xDisplayName,
            xProfileImageUrl,
            xFollowers,
            xFollowersVerifiedAt: new Date(),
            tier,
            level,
            equippedWeapon: getBestWeapon(player.mrr ?? 0),
            equippedArmor: getBestArmor(xFollowers),
            lastSeenAt: new Date(),
            characterForm,
            ...(isNewDay ? {
              xp: newXp,
              lastLoginDate: today,
              pendingNotifications: notifications,
            } : {}),
          })
          .where(eq(players.xUserId, xUserId));
      } else {
        // Create new player
        await db.insert(players).values({
          xUserId,
          xUsername,
          xDisplayName,
          xProfileImageUrl,
          xFollowers,
          xFollowersVerifiedAt: new Date(),
          tier: 'villager',
          level: 1,
          xp: 0,
          mrr: 0,
          gold: 50, // starter gold
          equippedWeapon: 'wooden_sword',
          equippedArmor: 'cloth_tunic',
          positionX: 100,
          positionY: 100,
          currentZone: 'starter_village',
        });
      }

      return true;
    },
    async jwt({ token, account, profile }) {
      if (account) {
        token.xUserId = account.providerAccountId;
        token.xUsername = (profile as any)?.data?.username ?? token.name ?? '';
      }
      return token;
    },
    async session({ session, token }) {
      if (token.xUserId) {
        const player = await db
          .select()
          .from(players)
          .where(eq(players.xUserId, token.xUserId as string))
          .limit(1);

        if (player.length > 0) {
          (session as any).player = player[0];
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});
