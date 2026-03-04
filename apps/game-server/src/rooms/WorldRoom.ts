import { Room, Client } from '@colyseus/core';
import { PlayerState } from '../schemas/PlayerSchema.js';
import { WorldState } from '../schemas/WorldSchema.js';

export class WorldRoom extends Room<WorldState> {
  maxClients = 50;

  onCreate() {
    this.setState(new WorldState());

    this.onMessage('move', (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      player.x = data.x;
      player.y = data.y;
      player.direction = data.direction;
    });
  }

  onJoin(client: Client, options: any) {
    const player = new PlayerState();
    player.username  = options.playerData?.xUsername ?? 'unknown';
    player.tier      = options.playerData?.tier ?? 'villager';
    player.x         = options.playerData?.positionX ?? 100;
    player.y         = options.playerData?.positionY ?? 100;
    player.mrr       = options.playerData?.mrr ?? 0;
    player.followers = options.playerData?.xFollowers ?? 0;
    player.level     = options.playerData?.level ?? 1;
    player.playerId  = options.playerData?.id ?? '';
    this.state.players.set(client.sessionId, player);

    console.log(`[WorldRoom] ${player.username} joined (${player.tier})`);
  }

  onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      console.log(`[WorldRoom] ${player.username} left`);
    }
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log('[WorldRoom] disposed');
  }
}
