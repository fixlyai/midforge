export interface NpcDef {
  id: string;
  name: string;
  role: string;
  color: number;
  tileX: number;
  tileY: number;
  dialogLines: string[];
  interactionEvent: string; // emitted to React layer
}

export const NPCS: NpcDef[] = [
  {
    id: 'quest_giver',
    name: 'Elder Forge',
    role: 'Quest Giver',
    color: 0xF39C12,
    tileX: 10,
    tileY: 14,
    dialogLines: [
      'Welcome, creator.',
      'I have tasks for those who seek glory.',
      'Prove your worth with real results.',
    ],
    interactionEvent: 'npc_quests',
  },
  {
    id: 'blacksmith',
    name: 'Ironhide',
    role: 'Blacksmith',
    color: 0xE74C3C,
    tileX: 6,
    tileY: 10,
    dialogLines: [
      'Need better gear?',
      'Your MRR forges weapons.',
      'Your followers forge armor.',
    ],
    interactionEvent: 'npc_inventory',
  },
  {
    id: 'arena_master',
    name: 'Valkyra',
    role: 'Arena Master',
    color: 0x9B59B6,
    tileX: 30,
    tileY: 14,
    dialogLines: [
      'The Arena awaits, warrior.',
      'Fight for XP and glory.',
      'Only the strong survive.',
    ],
    interactionEvent: 'npc_arena',
  },
  {
    id: 'merchant_npc',
    name: 'Goldbag',
    role: 'Marketplace',
    color: 0x27AE60,
    tileX: 20,
    tileY: 10,
    dialogLines: [
      'Buy and sell, friend!',
      'Courses, blueprints, agents...',
      'Everything has a price.',
    ],
    interactionEvent: 'npc_marketplace',
  },
];
