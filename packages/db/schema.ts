import {
  pgTable,
  uuid,
  text,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';

export const players = pgTable('players', {
  id: uuid('id').defaultRandom().primaryKey(),
  xUserId: text('x_user_id').unique().notNull(),
  xUsername: text('x_username').notNull(),
  xDisplayName: text('x_display_name'),
  xProfileImageUrl: text('x_profile_image_url'),
  xFollowers: integer('x_followers').default(0),
  xFollowersVerifiedAt: timestamp('x_followers_verified_at'),
  stripeAccountId: text('stripe_account_id'),
  mrr: integer('mrr').default(0), // in cents
  mrrVerifiedAt: timestamp('mrr_verified_at'),
  xp: integer('xp').default(0),
  level: integer('level').default(1),
  tier: text('tier').default('villager'), // villager | apprentice | merchant | warrior | legend
  equippedWeapon: text('equipped_weapon').default('wooden_sword'),
  equippedArmor: text('equipped_armor').default('cloth_tunic'),
  equippedHelmet: text('equipped_helmet'),
  positionX: real('position_x').default(100),
  positionY: real('position_y').default(100),
  currentZone: text('current_zone').default('starter_village'),
  gold: integer('gold').default(0),
  seasonTitle: text('season_title'),
  characterForm: text('character_form').default('base'),
  inviteCode: text('invite_code'),
  invitedBy: text('invited_by'),
  lastLoginDate: text('last_login_date'),
  loginStreak: integer('login_streak').default(0),
  arenaStreak: integer('arena_streak').default(0),
  lastArenaDate: text('last_arena_date'),
  pendingNotifications: jsonb('pending_notifications').$type<{ type: string; message: string }[]>(),
  friends: jsonb('friends').$type<string[]>().default([]),
  achievements: jsonb('achievements').$type<string[]>().default([]),
  tilesWalked: integer('tiles_walked').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  lastSeenAt: timestamp('last_seen_at').defaultNow(),
});

export const inventory = pgTable('inventory', {
  id: uuid('id').defaultRandom().primaryKey(),
  playerId: uuid('player_id').references(() => players.id),
  itemId: text('item_id').notNull(),
  itemType: text('item_type').notNull(), // weapon | armor | helmet | consumable | cosmetic
  unlockedAt: timestamp('unlocked_at').defaultNow(),
  unlockedBy: text('unlocked_by'), // 'stripe_mrr' | 'followers' | 'quest' | 'purchase'
});

export const quests = pgTable('quests', {
  id: uuid('id').defaultRandom().primaryKey(),
  playerId: uuid('player_id').references(() => players.id),
  questId: text('quest_id').notNull(),
  status: text('status').default('active'), // active | completed | failed
  progress: integer('progress').default(0),
  target: integer('target').notNull(),
  rewardXp: integer('reward_xp').default(0),
  rewardItemId: text('reward_item_id'),
  rewardGold: integer('reward_gold').default(0),
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});

export const marketplace = pgTable('marketplace', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id').references(() => players.id),
  title: text('title').notNull(),
  description: text('description'),
  type: text('type').notNull(), // course | blueprint | agent | service
  priceUsd: integer('price_usd').notNull(), // in cents
  pricingModel: text('pricing_model').default('one_time'), // one_time | monthly
  stripeProductId: text('stripe_product_id'),
  stripePriceId: text('stripe_price_id'),
  active: boolean('active').default(true),
  salesCount: integer('sales_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const arenaFights = pgTable('arena_fights', {
  id: uuid('id').defaultRandom().primaryKey(),
  challengerId: uuid('challenger_id').references(() => players.id),
  defenderId: uuid('defender_id').references(() => players.id),
  winnerId: uuid('winner_id').references(() => players.id),
  xpTransferred: integer('xp_transferred').default(0),
  fightLog: jsonb('fight_log'), // array of fight events for replay
  // Phase 5: Arena streaming columns
  broadcastId: text('broadcast_id'),     // X Live broadcast ID
  liveTweetId: text('live_tweet_id'),    // Tweet announcing the live stream
  resultTweetId: text('result_tweet_id'),// Reply tweet with fight result
  rtmpEgressId: text('rtmp_egress_id'),  // LiveKit egress ID for stop
  fightedAt: timestamp('fighted_at').defaultNow(),
});

// NPC quest chains (separate from the old MRR-based quests table)
export const npcQuests = pgTable('npc_quests', {
  id: uuid('id').defaultRandom().primaryKey(),
  playerId: uuid('player_id').references(() => players.id).notNull(),
  questId: text('quest_id').notNull(),
  status: text('status').default('active'), // active | completed
  progress: integer('progress').default(0),
  target: integer('target').default(1),
  acceptedAt: timestamp('accepted_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});

// Game events for activity feed + social proof
export const gameEvents = pgTable('game_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  playerId: uuid('player_id').references(() => players.id),
  eventType: text('event_type').notNull(), // evolution | arena_win | tier_up | quest_complete | new_player
  username: text('username').notNull(),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Daily quest progress (resets each day)
export const dailyQuestProgress = pgTable('daily_quest_progress', {
  id: uuid('id').defaultRandom().primaryKey(),
  playerId: uuid('player_id').references(() => players.id).notNull(),
  questId: text('quest_id').notNull(),
  dateStr: text('date_str').notNull(), // YYYY-MM-DD
  progress: integer('progress').default(0),
  target: integer('target').default(1),
  completed: boolean('completed').default(false),
});

export const leaderboard = pgTable('leaderboard', {
  id: uuid('id').defaultRandom().primaryKey(),
  playerId: uuid('player_id').references(() => players.id),
  season: integer('season').default(1),
  rank: integer('rank'),
  score: integer('score').default(0), // composite: xp + mrr_score + follower_score
  peakRank: integer('peak_rank'),
  updatedAt: timestamp('updated_at').defaultNow(),
});
