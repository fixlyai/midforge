import NextAuth from 'next-auth';
import Twitter from 'next-auth/providers/twitter';
import { db } from '@midforge/db/client';
import { players } from '@midforge/db/schema';
import { eq } from 'drizzle-orm';
import { calculateTier, calculateLevel, getBestWeapon, getBestArmor } from '@midforge/shared/types';

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
        const tier = calculateTier(existing[0].mrr ?? 0, xFollowers);
        const level = calculateLevel(existing[0].xp ?? 0);
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
            equippedWeapon: getBestWeapon(existing[0].mrr ?? 0),
            equippedArmor: getBestArmor(xFollowers),
            lastSeenAt: new Date(),
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
