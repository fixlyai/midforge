// @ts-ignore — Phaser exports default from ESM build
import Phaser from 'phaser';
import {
  TILESHEET_TOWN,
  TILESHEET_BATTLE,
  TILESHEET_DUNGEON,
  AUDIO,
  MAP_FILE,
  CHARACTER_SPRITE,
  CHARACTER_TIERS,
  CHARACTER_FORMS,
  CHARACTER_NPC_KEYS,
} from '@midforge/shared/constants/game';
import { createAllAnimations } from '@/game/managers/AnimationManager';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    // ── Map JSON ─────────────────────────────────────────
    this.load.json('map_data', MAP_FILE);

    // ── Tilesheets ───────────────────────────────────────
    this.load.spritesheet(TILESHEET_TOWN.key, TILESHEET_TOWN.path, {
      frameWidth: TILESHEET_TOWN.frameWidth,
      frameHeight: TILESHEET_TOWN.frameHeight,
      spacing: TILESHEET_TOWN.spacing,
      margin: TILESHEET_TOWN.margin,
    });

    this.load.spritesheet(TILESHEET_BATTLE.key, TILESHEET_BATTLE.path, {
      frameWidth: TILESHEET_BATTLE.frameWidth,
      frameHeight: TILESHEET_BATTLE.frameHeight,
      spacing: TILESHEET_BATTLE.spacing,
      margin: TILESHEET_BATTLE.margin,
    });

    this.load.spritesheet(TILESHEET_DUNGEON.key, TILESHEET_DUNGEON.path, {
      frameWidth: TILESHEET_DUNGEON.frameWidth,
      frameHeight: TILESHEET_DUNGEON.frameHeight,
      spacing: TILESHEET_DUNGEON.spacing,
      margin: TILESHEET_DUNGEON.margin,
    });

    // ── Audio ────────────────────────────────────────────
    AUDIO.footstepGrass.forEach((path, i) => {
      this.load.audio(`footstep_grass_${i}`, path);
    });
    AUDIO.footstepStone.forEach((path, i) => {
      this.load.audio(`footstep_stone_${i}`, path);
    });
    this.load.audio('sfx_interact', AUDIO.interact);
    this.load.audio('sfx_door_open', AUDIO.doorOpen);
    this.load.audio('sfx_coins', AUDIO.coins);
    this.load.audio('sfx_knife', AUDIO.knifeSlice);
    this.load.audio('sfx_metal', AUDIO.metalClick);
    this.load.audio('sfx_book', AUDIO.bookOpen);

    // ── 48×48 Character Sprites (only loaded if files exist) ──
    const { frameWidth, frameHeight } = CHARACTER_SPRITE;
    for (const tier of CHARACTER_TIERS) {
      for (const form of CHARACTER_FORMS) {
        const key = `${tier}_${form}`;
        this.load.spritesheet(key, `/sprites/characters/${key}.png`, {
          frameWidth, frameHeight,
        });
      }
    }
    for (const npcKey of CHARACTER_NPC_KEYS) {
      this.load.spritesheet(npcKey, `/sprites/characters/${npcKey}.png`, {
        frameWidth, frameHeight,
      });
    }

    // Suppress errors for missing sprite files (assets may not exist yet)
    this.load.on('loaderror', (file: any) => {
      if (file?.key && (file.key.includes('_base') || file.key.includes('_upgraded') ||
          file.key.includes('_ascended') || file.key.startsWith('npc_'))) {
        // Silently ignore — 48×48 sprites not yet generated
      }
    });
  }

  create() {
    // Create animations for any successfully loaded 48×48 sprite sheets
    createAllAnimations(this);
    this.scene.start('WorldScene');
  }
}
