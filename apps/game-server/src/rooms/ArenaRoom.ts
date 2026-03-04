import { Room, Client } from '@colyseus/core';
import { Schema, MapSchema, defineTypes } from '@colyseus/schema';
import { PlayerState } from '../schemas/PlayerSchema.js';

class ArenaState extends Schema {
  players = new MapSchema<PlayerState>();
  phase: string = 'waiting'; // waiting | fighting | finished
  winnerId: string = '';
}

defineTypes(ArenaState, {
  players: { map: PlayerState },
  phase: 'string',
  winnerId: 'string',
});

export class ArenaRoom extends Room<ArenaState> {
  maxClients = 2;

  onCreate() {
    this.setState(new ArenaState());
    console.log('[ArenaRoom] created — waiting for fighters');
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

    console.log(`[ArenaRoom] ${player.username} entered (${this.state.players.size}/2)`);

    if (this.state.players.size === 2) {
      this.state.phase = 'fighting';
      this.broadcast('fight_start');
      console.log('[ArenaRoom] fight started!');
    }
  }

  onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      console.log(`[ArenaRoom] ${player.username} left`);
    }
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log('[ArenaRoom] disposed');
  }
}
