// @ts-ignore — Phaser exports default from ESM build
import Phaser from 'phaser';
import { CHARACTER_SPRITE } from '@midforge/shared/constants/game';

/**
 * Create walk + idle animations for a single character sprite key.
 * Sprite sheet layout: 576×256px, 64×64 frames, 9 cols × 4 rows (LPC walk-only extract)
 *   Row 0 (frames 0-8):   Walk UP
 *   Row 1 (frames 9-17):  Walk LEFT
 *   Row 2 (frames 18-26): Walk DOWN
 *   Row 3 (frames 27-35): Walk RIGHT
 */
export function createCharacterAnimations(
  anims: Phaser.Animations.AnimationManager,
  key: string,
) {
  const rate = CHARACTER_SPRITE.frameRate;
  const n = CHARACTER_SPRITE.framesPerRow; // 9 frames per direction

  // Guard: don't create if already exists
  if (anims.exists(`${key}_walk_down`)) return;

  // Walk UP (row 0)
  anims.create({
    key: `${key}_walk_up`,
    frames: anims.generateFrameNumbers(key, { start: 0, end: n - 1 }),
    frameRate: rate,
    repeat: -1,
  });

  // Walk LEFT (row 1)
  anims.create({
    key: `${key}_walk_left`,
    frames: anims.generateFrameNumbers(key, { start: n, end: n * 2 - 1 }),
    frameRate: rate,
    repeat: -1,
  });

  // Walk DOWN (row 2)
  anims.create({
    key: `${key}_walk_down`,
    frames: anims.generateFrameNumbers(key, { start: n * 2, end: n * 3 - 1 }),
    frameRate: rate,
    repeat: -1,
  });

  // Walk RIGHT (row 3)
  anims.create({
    key: `${key}_walk_right`,
    frames: anims.generateFrameNumbers(key, { start: n * 3, end: n * 4 - 1 }),
    frameRate: rate,
    repeat: -1,
  });

  // Idle — single frame facing down (row 2, frame 0)
  anims.create({
    key: `${key}_idle`,
    frames: anims.generateFrameNumbers(key, { start: n * 2, end: n * 2 }),
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
