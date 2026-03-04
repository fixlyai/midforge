# Midforge

A retro 2D multiplayer RPG where indie hackers and solopreneurs level up their in-game character using **real verified data**: X (Twitter) follower count and Stripe MRR.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Game Engine:** Phaser 3 (Phase 2)
- **Multiplayer:** Colyseus (Node.js game server)
- **Database:** Neon (serverless Postgres)
- **ORM:** Drizzle ORM
- **Auth:** X (Twitter) OAuth via Auth.js v5
- **Styling:** Tailwind CSS + custom pixel art CSS

## Monorepo Structure

```
midforge/
├── apps/
│   ├── web/              # Next.js app (port 3000)
│   └── game-server/      # Colyseus server (port 2567)
└── packages/
    ├── db/               # Drizzle + Neon schema
    └── shared/           # Shared types, quests, combat
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment

```bash
cp apps/web/.env.example apps/web/.env.local
```

Fill in your credentials:
- `NEXTAUTH_SECRET` — run `openssl rand -base64 32`
- `TWITTER_CLIENT_ID` / `TWITTER_CLIENT_SECRET` — from X Developer Portal
- `DATABASE_URL` — from Neon dashboard

### 3. Push database schema

```bash
npm run db:push
```

### 4. Run both servers

```bash
# Terminal 1 — Next.js (port 3000)
npm run dev:web

# Terminal 2 — Colyseus game server (port 2567)
npm run dev:server
```

Or run both together:

```bash
npm run dev
```

## Pages

| Route | Description |
|---|---|
| `/` | Landing page |
| `/login` | X OAuth login |
| `/world` | Main game view (Phaser canvas in Phase 2) |
| `/leaderboard` | Global rankings by XP |
| `/profile/[username]` | Player profile with verified stats |

## API Routes

| Route | Method | Description |
|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | Auth.js handlers |
| `/api/player/stats` | GET | Current player data |

---

*Built on Neon · Powered by real revenue · Forged in Midgard*
