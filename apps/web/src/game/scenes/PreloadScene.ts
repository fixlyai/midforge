// @ts-ignore — Phaser exports default from ESM build
import Phaser from 'phaser';
import {
  TILESHEET_TOWN,
  TILESHEET_BATTLE,
  TILESHEET_DUNGEON,
  AUDIO,
} from '@midforge/shared/constants/game';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
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
  }

  create() {
    this.scene.start('WorldScene');
  }
}
