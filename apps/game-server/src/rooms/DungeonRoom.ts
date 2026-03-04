import { Room, Client } from '@colyseus/core';
import { Schema, MapSchema, defineTypes } from '@colyseus/schema';
import { PlayerState } from '../schemas/PlayerSchema.js';

class DungeonState extends Schema {
  players = new MapSchema<PlayerState>();
  phase: string = 'lobby'; // lobby | active | completed
  waveNumber: number = 0;
}

defineTypes(DungeonState, {
  players: { map: PlayerState },
  phase: 'string',
  waveNumber: 'number',
});

export class DungeonRoom extends Room<DungeonState> {
  maxClients = 4;

  onCreate() {
    this.setState(new DungeonState());
    console.log('[DungeonRoom] created — waiting for party');
  }

  onJoin(client: Client, options: any) {
    const player = new PlayerState();
    player.username  = options.playerData?.xUsername ?? 'unknown';
    player.tier      = options.playerData?.tier ?? 'villager';
    player.x         = 100;
    player.y         = 100;
    player.mrr       = options.playerData?.mrr ?? 0;
    player.followers = options.playerData?.xFollowers ?? 0;
    player.level     = options.playerData?.level ?? 1;
    player.playerId  = options.playerData?.id ?? '';
    this.state.players.set(client.sessionId, player);

    console.log(`[DungeonRoom] ${player.username} joined party (${this.state.players.size}/4)`);
  }

  onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      console.log(`[DungeonRoom] ${player.username} left`);
    }
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log('[DungeonRoom] disposed');
  }
}
