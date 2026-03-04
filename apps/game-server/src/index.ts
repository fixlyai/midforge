import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WorldRoom } from './rooms/WorldRoom.js';
import { ArenaRoom } from './rooms/ArenaRoom.js';
import { DungeonRoom } from './rooms/DungeonRoom.js';

const app = express();
const port = Number(process.env.PORT) || 2567;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', rooms: ['world_room', 'arena_room', 'dungeon_room'] });
});

const httpServer = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

// Register rooms
gameServer.define('world_room', WorldRoom);
gameServer.define('arena_room', ArenaRoom);
gameServer.define('dungeon_room', DungeonRoom);

httpServer.listen(port, () => {
  console.log(`⚔️ Midforge Game Server listening on port ${port}`);
  console.log(`   Rooms: world_room, arena_room, dungeon_room`);
});
