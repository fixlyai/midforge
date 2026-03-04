import { Schema, defineTypes } from '@colyseus/schema';

export class PlayerState extends Schema {
  username: string = '';
  tier: string = 'villager';
  x: number = 100;
  y: number = 100;
  direction: string = 'down';
  mrr: number = 0;
  followers: number = 0;
  level: number = 1;
  playerId: string = '';
}

defineTypes(PlayerState, {
  username: 'string',
  tier: 'string',
  x: 'number',
  y: 'number',
  direction: 'string',
  mrr: 'number',
  followers: 'number',
  level: 'number',
  playerId: 'string',
});
