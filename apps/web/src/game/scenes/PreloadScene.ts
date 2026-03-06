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

    // ── Music tracks (graceful — silently skip if missing) ──
    const MUSIC_TRACKS = [
      'village', 'forest', 'cave', 'ruins', 'plains', 'lakeview', 'castle',
      'tavern', 'battle', 'battle_boss', 'victory', 'defeat', 'evolution',
    ];
    for (const track of MUSIC_TRACKS) {
      this.load.audio(`music_${track}`, `/assets/music/${track}.mp3`);
    }

    // ── Weather effects ──
    this.load.image('cf_clouds', '/assets/weather/Clouds.png');
    this.load.spritesheet('cf_rain_drop', '/assets/weather/Rain_Drop.png', {
      frameWidth: 16, frameHeight: 16,
    });
    this.load.spritesheet('cf_rain_impact', '/assets/weather/Rain_Drop_Impact.png', {
      frameWidth: 16, frameHeight: 16,
    });

    // ── 64×64 LPC Character Sprites (legacy — kept for fallback) ──
    const { frameWidth, frameHeight } = CHARACTER_SPRITE;
    for (const tier of CHARACTER_TIERS) {
      for (const form of CHARACTER_FORMS) {
        const key = `${tier}_${form}`;
        this.load.spritesheet(key, `/sprites/characters/${key}.png?v=4`, {
          frameWidth, frameHeight,
        });
      }
    }
    for (const npcKey of CHARACTER_NPC_KEYS) {
      this.load.spritesheet(npcKey, `/sprites/characters/${npcKey}.png?v=4`, {
        frameWidth, frameHeight,
      });
    }

    // ── Cute Fantasy Player Spritesheet (64×64 frames, 9 cols × 56 rows) ──
    this.load.spritesheet('cf_player', '/assets/characters/Player_Base_animations.png', {
      frameWidth: 64, frameHeight: 64,
    });

    // ── Cute Fantasy NPC Spritesheets (64×64 frames, 6 cols × 7 rows) ──
    const CF_NPC_KEYS = [
      'Bartender_Bruno', 'Bartender_Katy', 'Farmer_Bob', 'Farmer_Buba',
      'Fisherman_Fin', 'Lumberjack_Jack', 'Miner_Mike', 'Chef_Chloe',
    ];
    for (const npc of CF_NPC_KEYS) {
      this.load.spritesheet(`cf_npc_${npc}`, `/assets/characters/NPCs/${npc}.png`, {
        frameWidth: 64, frameHeight: 64,
      });
    }

    // ── Cute Fantasy Animals (32×32 frames) ──
    for (let i = 1; i <= 4; i++) {
      this.load.spritesheet(`cf_duck_${i}`, `/assets/animals/Duck/Duck_0${i}.png`, {
        frameWidth: 32, frameHeight: 32,
      });
    }
    this.load.spritesheet('cf_duck_hat', '/assets/animals/Duck/Duck_in_a_hat.png', {
      frameWidth: 32, frameHeight: 32,
    });
    for (let i = 1; i <= 2; i++) {
      this.load.spritesheet(`cf_horse_${i}`, `/assets/animals/Horse/Horse_0${i}.png`, {
        frameWidth: 32, frameHeight: 32,
      });
    }

    // ── Cute Fantasy Buildings (static images) ──
    this.load.image('cf_inn', '/assets/buildings/Inn_Blue.png');
    this.load.image('cf_blacksmith', '/assets/buildings/Blacksmith_House_Black.png');
    this.load.image('cf_market', '/assets/buildings/Market_Stalls.png');
    this.load.image('cf_church', '/assets/buildings/Church_Black.png');
    this.load.image('cf_windmill', '/assets/buildings/Windmill.png');
    this.load.spritesheet('cf_windmill_sail', '/assets/buildings/Windmill_Sail_Anim.png', {
      frameWidth: 64, frameHeight: 80,
    });

    // ── Cute Fantasy Decorations ──
    for (let i = 1; i <= 3; i++) {
      this.load.spritesheet(`cf_flower_${i}`, `/assets/decorations/flowers/Flowers_${i}_Anim.png`, {
        frameWidth: 16, frameHeight: 16,
      });
    }
    for (let i = 1; i <= 2; i++) {
      this.load.spritesheet(`cf_flower_pot_${i}`, `/assets/decorations/flowers_potted/Flowers_${i}_Potted_Anim.png`, {
        frameWidth: 16, frameHeight: 16,
      });
    }
    this.load.spritesheet('cf_campfire', '/assets/decorations/torches/Campfire_Anim.png', {
      frameWidth: 32, frameHeight: 32,
    });
    this.load.spritesheet('cf_torch', '/assets/decorations/torches/Torch_Anim.png', {
      frameWidth: 32, frameHeight: 32,
    });
    this.load.spritesheet('cf_torch_small', '/assets/decorations/torches/Torch_small_anim.png', {
      frameWidth: 16, frameHeight: 16,
    });
    this.load.spritesheet('cf_fountain', '/assets/decorations/torches/Fountain_Anim.png', {
      frameWidth: 48, frameHeight: 48,
    });

    // ── Tree sprites (Cute Fantasy) ──
    // Small trees: 96×64, 3 variants → 32×64 frames
    this.load.spritesheet('tree_small_birch', '/assets/trees/Small_Birch_Tree.png', { frameWidth: 32, frameHeight: 64 });
    this.load.spritesheet('tree_small_oak', '/assets/trees/Small_Oak_Tree.png', { frameWidth: 32, frameHeight: 64 });
    this.load.spritesheet('tree_small_spruce', '/assets/trees/Small_Spruce_Tree.png', { frameWidth: 32, frameHeight: 64 });
    this.load.spritesheet('tree_small_fruit', '/assets/trees/Small_Fruit_Tree.png', { frameWidth: 32, frameHeight: 64 });
    // Medium trees: 96×48, 2 variants → 48×48 frames
    this.load.spritesheet('tree_med_birch', '/assets/trees/Medium_Birch_Tree.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('tree_med_oak', '/assets/trees/Medium_Oak_Tree.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('tree_med_spruce', '/assets/trees/Medium_Spruce_Tree.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('tree_med_fruit', '/assets/trees/Medium_Fruit_Tree.png', { frameWidth: 48, frameHeight: 64 });
    // Big trees
    this.load.spritesheet('tree_big_birch', '/assets/trees/Big_Birch_Tree.png', { frameWidth: 48, frameHeight: 80 });
    this.load.spritesheet('tree_big_oak', '/assets/trees/Big_Oak_Tree.png', { frameWidth: 64, frameHeight: 80 });
    this.load.spritesheet('tree_big_spruce', '/assets/trees/Big_Spruce_tree.png', { frameWidth: 64, frameHeight: 80 });
    this.load.spritesheet('tree_big_fruit', '/assets/trees/Big_Fruit_Tree.png', { frameWidth: 48, frameHeight: 64 });
    // Leaf particles (16×16 single images)
    this.load.image('particle_birch', '/assets/trees/Birch_Leaf_Particle.png');
    this.load.image('particle_oak', '/assets/trees/Oak_Leaf_Particle.png');
    this.load.image('particle_spruce', '/assets/trees/Spruce_Needle_Particle.png');

    // ── Military Camp assets ──
    // Static images
    this.load.image('mc_tent', '/assets/military_camp/Military_Tents.png');
    this.load.image('mc_tower', '/assets/military_camp/Lookout_Towers.png');
    this.load.image('mc_palisade', '/assets/military_camp/Palisade.png');
    this.load.image('mc_cannon', '/assets/military_camp/Cannon.png');
    this.load.image('mc_catapult', '/assets/military_camp/Catapult.png');
    this.load.image('mc_mantlet', '/assets/military_camp/Mantlet.png');
    this.load.image('mc_spikes', '/assets/military_camp/Spiked_Barriers.png');
    this.load.image('mc_wood_spikes', '/assets/military_camp/Wood_Spikes.png');
    this.load.image('mc_target', '/assets/military_camp/Archery_Target.png');
    this.load.image('mc_dummy', '/assets/military_camp/Target_Dummys.png');
    this.load.image('mc_weapon_stand', '/assets/military_camp/Weapon_Stands.png');
    this.load.image('mc_bench', '/assets/military_camp/Split_Log_Benches.png');
    // Animated spritesheets
    this.load.spritesheet('mc_flag', '/assets/military_camp/Flags_Anim.png', {
      frameWidth: 16, frameHeight: 16,
    });
    this.load.spritesheet('mc_gate', '/assets/military_camp/Palisade_Gate_Anim.png', {
      frameWidth: 64, frameHeight: 64,
    });
    this.load.spritesheet('mc_campfire_pot', '/assets/military_camp/Campfire_Pot_Anim.png', {
      frameWidth: 32, frameHeight: 32,
    });

    // ── Dungeon assets ──
    this.load.image('dg1_tileset', '/assets/dungeons/Dungeon_1/Dungeon_1.png');
    this.load.image('dg1_pillars', '/assets/dungeons/Dungeon_1/Dungeon_1_Pillars.png');
    this.load.image('dg1_stairs', '/assets/dungeons/Dungeon_1/Dungeon_1_Stairs.png');
    this.load.image('dg1_stairs_down', '/assets/dungeons/Dungeon_1/Dungeon_1_Stairs_Down.png');
    this.load.image('dg1_arch', '/assets/dungeons/Dungeon_1/Dungeon_1_Arch.png');
    this.load.image('dg1_arch_open', '/assets/dungeons/Dungeon_1/Dungeon_1_Arch_Open.png');
    this.load.image('dg1_door_closed', '/assets/dungeons/Dungeon_1/Dungeon_1_Door_Closed.png');
    this.load.image('dg1_door_open', '/assets/dungeons/Dungeon_1/Dungeon_1_Door_Open.png');
    this.load.image('dg1_gate_closed', '/assets/dungeons/Dungeon_1/Dungeon_1_Gate_Closed.png');
    this.load.image('dg1_gate_open', '/assets/dungeons/Dungeon_1/Dungeon_1_Gate_Open.png');
    this.load.image('dg1_sewer', '/assets/dungeons/Dungeon_1/Dungeon_1_Sewer.png');
    this.load.image('dg1_pressure_plate', '/assets/dungeons/Dungeon_1/Dungeon_1_Pressure_Plate.png');
    this.load.image('dg1_spikes', '/assets/dungeons/Dungeon_1/Floor_spikes_1.png');
    // Animated dungeon sprites
    this.load.spritesheet('dg1_door_anim', '/assets/dungeons/Dungeon_1/Dungeon_1_Door_anim.png', {
      frameWidth: 32, frameHeight: 32,
    });
    this.load.spritesheet('dg1_gate_anim', '/assets/dungeons/Dungeon_1/Dungeon_1_Gate_anim.png', {
      frameWidth: 32, frameHeight: 32,
    });
    this.load.spritesheet('dg1_sewer_anim', '/assets/dungeons/Dungeon_1/Dungeon_1_Sewer_Anim.png', {
      frameWidth: 16, frameHeight: 16,
    });
    this.load.spritesheet('dg1_plate_anim', '/assets/dungeons/Dungeon_1/Dungeon_1_Pressure_Plate_Anim.png', {
      frameWidth: 16, frameHeight: 32,
    });
    // Dungeon objects
    this.load.image('dg_objects', '/assets/dungeons/Objects/Dungeon_Objects.png');
    this.load.image('dg_gold', '/assets/dungeons/Objects/Gold_Piles.png');
    this.load.image('dg_grills', '/assets/dungeons/Objects/Metal_Grills.png');
    this.load.spritesheet('dg_chest_anim', '/assets/dungeons/Objects/Chest_anim.png', {
      frameWidth: 32, frameHeight: 32,
    });

    // Suppress errors for missing sprite files (assets may not exist yet)
    this.load.on('loaderror', (file: any) => {
      if (file?.key && (file.key.includes('_base') || file.key.includes('_upgraded') ||
          file.key.includes('_ascended') || file.key.startsWith('npc_') || file.key.startsWith('cf_')
          || file.key.startsWith('mc_') || file.key.startsWith('music_')
          || file.key.startsWith('dg') || file.key.startsWith('tree_')
          || file.key.startsWith('particle_'))) {
        // Silently ignore — sprite/music file not found
      }
    });
  }

  create() {
    // Create animations for any successfully loaded 64×64 LPC sprite sheets
    createAllAnimations(this);

    // Create Cute Fantasy player animations
    this.createCuteFantasyAnimations();

    this.scene.start('WorldScene');
  }

  private createCuteFantasyAnimations() {
    const COLS = 9; // Player sheet is 9 cols wide
    const NPC_COLS = 6; // NPC sheets are 6 cols wide
    const anims = this.anims;

    // ── Player animations ──
    if (this.textures.exists('cf_player')) {
      // Cute Fantasy Player_Base layout:
      // Row 0: Idle Down (6 frames)  Row 1: Idle Right (6)  Row 2: Idle Up (6)  Row 3: Idle Left (6)
      // Row 4: Walk Down (6 frames)  Row 5: Walk Right (6)  Row 6: Walk Up (4)  Row 7: Walk Left (4)
      const idleRate = 6;
      const walkRate = 10;

      const dirMap: { dir: string; idleRow: number; idleFrames: number; walkRow: number; walkFrames: number }[] = [
        { dir: 'down',  idleRow: 0, idleFrames: 6, walkRow: 4, walkFrames: 6 },
        { dir: 'right', idleRow: 1, idleFrames: 6, walkRow: 5, walkFrames: 6 },
        { dir: 'up',    idleRow: 2, idleFrames: 6, walkRow: 6, walkFrames: 4 },
        { dir: 'left',  idleRow: 3, idleFrames: 6, walkRow: 7, walkFrames: 4 },
      ];

      for (const { dir, idleRow, idleFrames, walkRow, walkFrames } of dirMap) {
        // Idle animation per direction
        if (!anims.exists(`cf_player_idle_${dir}`)) {
          anims.create({
            key: `cf_player_idle_${dir}`,
            frames: anims.generateFrameNumbers('cf_player', {
              start: idleRow * COLS,
              end: idleRow * COLS + idleFrames - 1,
            }),
            frameRate: idleRate,
            repeat: -1,
          });
        }

        // Walk animation per direction
        if (!anims.exists(`cf_player_walk_${dir}`)) {
          anims.create({
            key: `cf_player_walk_${dir}`,
            frames: anims.generateFrameNumbers('cf_player', {
              start: walkRow * COLS,
              end: walkRow * COLS + walkFrames - 1,
            }),
            frameRate: walkRate,
            repeat: -1,
          });
        }
      }
    }

    // ── NPC animations ──
    const npcKeys = [
      'Bartender_Bruno', 'Bartender_Katy', 'Farmer_Bob', 'Farmer_Buba',
      'Fisherman_Fin', 'Lumberjack_Jack', 'Miner_Mike', 'Chef_Chloe',
    ];
    for (const npc of npcKeys) {
      const texKey = `cf_npc_${npc}`;
      if (!this.textures.exists(texKey)) continue;

      // NPC layout (6 cols × 7 rows):
      // Row 0: Idle Down (6)  Row 1: Idle Right (6)  Row 2: Idle Up (6)  Row 3: Idle Left (6)
      // Row 4: Walk Down (6)  Row 5: Walk Right (6)  Row 6: Walk Up (4)
      const dirs = [
        { dir: 'down',  idleRow: 0, walkRow: 4, walkFrames: 6 },
        { dir: 'right', idleRow: 1, walkRow: 5, walkFrames: 6 },
        { dir: 'up',    idleRow: 2, walkRow: 6, walkFrames: 4 },
        { dir: 'left',  idleRow: 3, walkRow: -1, walkFrames: 0 }, // no walk left row — flip right
      ];

      for (const { dir, idleRow, walkRow, walkFrames } of dirs) {
        if (!anims.exists(`${texKey}_idle_${dir}`)) {
          anims.create({
            key: `${texKey}_idle_${dir}`,
            frames: anims.generateFrameNumbers(texKey, {
              start: idleRow * NPC_COLS,
              end: idleRow * NPC_COLS + 1, // 2-frame breathing cycle
            }),
            frameRate: 1.6, // ~600ms per frame
            repeat: -1,
          });
        }

        if (walkRow >= 0 && !anims.exists(`${texKey}_walk_${dir}`)) {
          anims.create({
            key: `${texKey}_walk_${dir}`,
            frames: anims.generateFrameNumbers(texKey, {
              start: walkRow * NPC_COLS,
              end: walkRow * NPC_COLS + walkFrames - 1,
            }),
            frameRate: 8,
            repeat: -1,
          });
        }
      }
    }

    // ── Animal animations (32×32 frames, 8 cols) ──
    const ANIMAL_COLS = 8;
    // Duck idle: row 0, first 2 frames
    for (let i = 1; i <= 4; i++) {
      const key = `cf_duck_${i}`;
      if (this.textures.exists(key) && !anims.exists(`${key}_idle`)) {
        anims.create({
          key: `${key}_idle`,
          frames: anims.generateFrameNumbers(key, { start: 0, end: 1 }),
          frameRate: 2.5, // ~400ms per frame
          repeat: -1,
        });
      }
    }
    // Duck in a hat — same layout
    if (this.textures.exists('cf_duck_hat') && !anims.exists('cf_duck_hat_idle')) {
      anims.create({
        key: 'cf_duck_hat_idle',
        frames: anims.generateFrameNumbers('cf_duck_hat', { start: 0, end: 1 }),
        frameRate: 2.5,
        repeat: -1,
      });
    }
    // Horse idle: row 0, first 2 frames
    for (let i = 1; i <= 2; i++) {
      const key = `cf_horse_${i}`;
      if (this.textures.exists(key) && !anims.exists(`${key}_idle`)) {
        anims.create({
          key: `${key}_idle`,
          frames: anims.generateFrameNumbers(key, { start: 0, end: 1 }),
          frameRate: 1.5, // slow breathing
          repeat: -1,
        });
      }
    }

    // ── Decoration animations ──
    // Flowers: 16×16 frames, 6 cols × 10 rows — use row 0 (first color variant), 6 frames
    for (let i = 1; i <= 3; i++) {
      const key = `cf_flower_${i}`;
      if (this.textures.exists(key) && !anims.exists(`${key}_anim`)) {
        anims.create({
          key: `${key}_anim`,
          frames: anims.generateFrameNumbers(key, { start: 0, end: 5 }),
          frameRate: 3, // ~300ms per frame
          repeat: -1,
        });
      }
    }
    // Potted flowers: same layout
    for (let i = 1; i <= 2; i++) {
      const key = `cf_flower_pot_${i}`;
      if (this.textures.exists(key) && !anims.exists(`${key}_anim`)) {
        anims.create({
          key: `${key}_anim`,
          frames: anims.generateFrameNumbers(key, { start: 0, end: 5 }),
          frameRate: 3,
          repeat: -1,
        });
      }
    }
    // Campfire: 32×32, 4 frames
    if (this.textures.exists('cf_campfire') && !anims.exists('cf_campfire_anim')) {
      anims.create({
        key: 'cf_campfire_anim',
        frames: anims.generateFrameNumbers('cf_campfire', { start: 0, end: 3 }),
        frameRate: 6,
        repeat: -1,
      });
    }
    // Torch: 32×32, 4 frames
    if (this.textures.exists('cf_torch') && !anims.exists('cf_torch_anim')) {
      anims.create({
        key: 'cf_torch_anim',
        frames: anims.generateFrameNumbers('cf_torch', { start: 0, end: 3 }),
        frameRate: 6,
        repeat: -1,
      });
    }
    // Small torch: 16×16, 6 frames
    if (this.textures.exists('cf_torch_small') && !anims.exists('cf_torch_small_anim')) {
      anims.create({
        key: 'cf_torch_small_anim',
        frames: anims.generateFrameNumbers('cf_torch_small', { start: 0, end: 5 }),
        frameRate: 6,
        repeat: -1,
      });
    }
    // Fountain: 48×48, ~5 frames (256/48 ≈ 5)
    if (this.textures.exists('cf_fountain') && !anims.exists('cf_fountain_anim')) {
      anims.create({
        key: 'cf_fountain_anim',
        frames: anims.generateFrameNumbers('cf_fountain', { start: 0, end: 4 }),
        frameRate: 4,
        repeat: -1,
      });
    }
    // Windmill sail: 64×80, 4 frames
    if (this.textures.exists('cf_windmill_sail') && !anims.exists('cf_windmill_sail_anim')) {
      anims.create({
        key: 'cf_windmill_sail_anim',
        frames: anims.generateFrameNumbers('cf_windmill_sail', { start: 0, end: 3 }),
        frameRate: 6, // ~150ms per frame
        repeat: -1,
      });
    }

    // ── Military Camp animations ──
    // Flag: 16×16, row 0 = 6 frames (first color variant)
    if (this.textures.exists('mc_flag') && !anims.exists('mc_flag_anim')) {
      anims.create({
        key: 'mc_flag_anim',
        frames: anims.generateFrameNumbers('mc_flag', { start: 0, end: 5 }),
        frameRate: 7,
        repeat: -1,
      });
    }
    // Palisade gate: 64×64, 3 frames
    if (this.textures.exists('mc_gate') && !anims.exists('mc_gate_anim')) {
      anims.create({
        key: 'mc_gate_anim',
        frames: anims.generateFrameNumbers('mc_gate', { start: 0, end: 2 }),
        frameRate: 5,
        repeat: -1,
      });
    }
    // Campfire pot: 32×32, ~7 frames (240/32 ≈ 7)
    if (this.textures.exists('mc_campfire_pot') && !anims.exists('mc_campfire_pot_anim')) {
      anims.create({
        key: 'mc_campfire_pot_anim',
        frames: anims.generateFrameNumbers('mc_campfire_pot', { start: 0, end: 6 }),
        frameRate: 7,
        repeat: -1,
      });
    }

    // ── Dungeon animations ──
    // Door: 32×32, 5 frames (160/32)
    if (this.textures.exists('dg1_door_anim') && !anims.exists('dg1_door_anim_play')) {
      anims.create({
        key: 'dg1_door_anim_play',
        frames: anims.generateFrameNumbers('dg1_door_anim', { start: 0, end: 4 }),
        frameRate: 7,
        repeat: -1,
      });
    }
    // Gate: 32×32, 26 frames (832/32)
    if (this.textures.exists('dg1_gate_anim') && !anims.exists('dg1_gate_anim_play')) {
      anims.create({
        key: 'dg1_gate_anim_play',
        frames: anims.generateFrameNumbers('dg1_gate_anim', { start: 0, end: 25 }),
        frameRate: 7,
        repeat: -1,
      });
    }
    // Sewer: 16×16, 14 frames (224/16)
    if (this.textures.exists('dg1_sewer_anim') && !anims.exists('dg1_sewer_anim_play')) {
      anims.create({
        key: 'dg1_sewer_anim_play',
        frames: anims.generateFrameNumbers('dg1_sewer_anim', { start: 0, end: 13 }),
        frameRate: 5,
        repeat: -1,
      });
    }
    // Chest: 32×32, 8 frames (256/32)
    if (this.textures.exists('dg_chest_anim') && !anims.exists('dg_chest_anim_play')) {
      anims.create({
        key: 'dg_chest_anim_play',
        frames: anims.generateFrameNumbers('dg_chest_anim', { start: 0, end: 7 }),
        frameRate: 6,
        repeat: 0,
      });
    }
  }
}
