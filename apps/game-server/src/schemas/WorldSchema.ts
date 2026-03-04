import { Schema, MapSchema, defineTypes } from '@colyseus/schema';
import { PlayerState } from './PlayerSchema.js';

export class WorldState extends Schema {
  players = new MapSchema<PlayerState>();
}

defineTypes(WorldState, {
  players: { map: PlayerState },
});
