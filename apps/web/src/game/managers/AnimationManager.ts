// @ts-ignore — Phaser exports default from ESM build
import Phaser from 'phaser';
import { CHARACTER_SPRITE } from '@midforge/shared/constants/game';

/**
 * Create walk + idle animations for a single character sprite key.
 * Sprite sheet layout: 384×192px, 48×48 frames, 8 cols × 4 rows
 *   Row 0 (frames 0-7):   Walk DOWN
 *   Row 1 (frames 8-15):  Walk LEFT
 *   Row 2 (frames 16-23): Walk RIGHT
 *   Row 3 (frames 24-31): Walk UP
 */
export function createCharacterAnimations(
  anims: Phaser.Animations.AnimationManager,
  key: string,
) {
  const rate = CHARACTER_SPRITE.frameRate;

  // Guard: don't create if already exists
  if (anims.exists(`${key}_walk_down`)) return;

  // Walk DOWN (row 0)
  anims.create({
    key: `${key}_walk_down`,
    frames: anims.generateFrameNumbers(key, { start: 0, end: 7 }),
    frameRate: rate,
    repeat: -1,
  });

  // Walk LEFT (row 1)
  anims.create({
    key: `${key}_walk_left`,
    frames: anims.generateFrameNumbers(key, { start: 8, end: 15 }),
    frameRate: rate,
    repeat: -1,
  });

  // Walk RIGHT (row 2)
  anims.create({
    key: `${key}_walk_right`,
    frames: anims.generateFrameNumbers(key, { start: 16, end: 23 }),
    frameRate: rate,
    repeat: -1,
  });

  // Walk UP (row 3)
  anims.create({
    key: `${key}_walk_up`,
    frames: anims.generateFrameNumbers(key, { start: 24, end: 31 }),
    frameRate: rate,
    repeat: -1,
  });

  // Idle — single frame facing down
  anims.create({
    key: `${key}_idle`,
    frames: anims.generateFrameNumbers(key, { start: 0, end: 0 }),
    frameRate: 1,
    repeat: -1,
  });
}

/**
 * Create animations for all player tier forms + NPC characters.
 * Call once in PreloadScene.create() after all sprite sheets are loaded.
 * Pass the scene so we can check which textures actually loaded.
 */
export function createAllAnimations(scene: Phaser.Scene) {
  const anims = scene.anims;
  const textures = scene.textures;
  const tiers = ['villager', 'apprentice', 'merchant', 'warrior', 'legend'];
  const forms = ['base', 'upgraded', 'ascended'];

  // Player tier × form combos (15 total)
  for (const tier of tiers) {
    for (const form of forms) {
      const key = `${tier}_${form}`;
      // Only create if the texture exists (sprite sheet was loaded)
      if (textures.exists(key)) {
        createCharacterAnimations(anims, key);
      }
    }
  }

  // NPC characters
  const npcKeys = ['npc_elder', 'npc_guard', 'npc_merchant', 'npc_villager'];
  for (const key of npcKeys) {
    if (textures.exists(key)) {
      createCharacterAnimations(anims, key);
    }
  }
}
