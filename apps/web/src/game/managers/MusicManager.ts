// @ts-ignore — Phaser exports default from ESM build
import Phaser from 'phaser';

/**
 * Zone-based music system with crossfade support.
 *
 * Music files expected at /public/assets/music/{name}.mp3:
 *   village, forest, cave, ruins, plains, lakeview, castle,
 *   tavern, battle, battle_boss, victory, defeat, evolution
 *
 * Usage:
 *   const mm = new MusicManager(scene);
 *   mm.playZoneMusic('village');       // crossfades to village.mp3
 *   mm.playNpcMusic('tavern');         // fades to tavern.mp3, remembers zone
 *   mm.resumeZoneMusic();             // fades back to village.mp3
 *   mm.playCombatMusic('battle');     // cuts immediately to battle.mp3
 *   mm.playOnce('victory', () => mm.resumeZoneMusic());
 *   mm.playLayered('evolution');      // plays evolution.mp3 over current track
 */

const CROSSFADE_MS = 800;
const DEFAULT_VOLUME: Record<string, number> = {
  village: 0.55, forest: 0.55, cave: 0.55, ruins: 0.55,
  plains: 0.55, lakeview: 0.55, castle: 0.55,
  tavern: 0.65,
  battle: 0.75, battle_boss: 0.75,
  victory: 0.7, defeat: 0.7,
  evolution: 0.8,
};

export class MusicManager {
  private scene: Phaser.Scene;
  private currentTrack: Phaser.Sound.BaseSound | null = null;
  private currentKey = '';
  private currentZoneKey = 'village';
  private audioUnlocked = false;
  private pendingZone: string | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // iOS audio unlock — queue pending music until first touch
    if (scene.sound.locked) {
      scene.sound.once('unlocked', () => {
        this.audioUnlocked = true;
        if (this.pendingZone) {
          this.playZoneMusic(this.pendingZone);
          this.pendingZone = null;
        }
      });
    } else {
      this.audioUnlocked = true;
    }
  }

  /** Crossfade to zone music. Remembers current zone for resumeZoneMusic(). */
  playZoneMusic(zoneKey: string) {
    if (!this.audioUnlocked) {
      this.pendingZone = zoneKey;
      return;
    }
    this.currentZoneKey = zoneKey;
    this.crossfadeTo(zoneKey, true);
  }

  /** Crossfade to NPC dialogue music (e.g. tavern). Zone is preserved for resume. */
  playNpcMusic(trackKey: string) {
    if (!this.audioUnlocked) return;
    this.crossfadeTo(trackKey, true);
  }

  /** Resume the last zone music after NPC dialogue closes. */
  resumeZoneMusic() {
    if (!this.audioUnlocked) return;
    this.crossfadeTo(this.currentZoneKey, true);
  }

  /** Immediately cut to combat music (no crossfade). */
  playCombatMusic(trackKey: string) {
    if (!this.audioUnlocked) return;
    this.stopCurrent();
    this.playTrack(trackKey, true);
  }

  /** Play a one-shot track (victory/defeat), then call onComplete. */
  playOnce(trackKey: string, onComplete?: () => void) {
    if (!this.audioUnlocked) return;
    this.stopCurrent();
    const vol = DEFAULT_VOLUME[trackKey] ?? 0.7;
    const key = `music_${trackKey}`;
    if (!this.scene.cache.audio.exists(key)) return;

    const sound = this.scene.sound.add(key, { volume: vol, loop: false });
    sound.play();
    this.currentTrack = sound;
    this.currentKey = trackKey;

    if (onComplete) {
      sound.once('complete', onComplete);
    }
  }

  /** Play a layered track over current music (e.g. evolution). Does NOT stop current. */
  playLayered(trackKey: string) {
    if (!this.audioUnlocked) return;
    const vol = DEFAULT_VOLUME[trackKey] ?? 0.8;
    const key = `music_${trackKey}`;
    if (!this.scene.cache.audio.exists(key)) return;

    const sound = this.scene.sound.add(key, { volume: 0, loop: false });
    sound.play();
    this.scene.tweens.add({
      targets: sound,
      volume: vol,
      duration: 300,
    });
    sound.once('complete', () => sound.destroy());
  }

  /** Stop all music immediately. */
  stopAll() {
    this.stopCurrent();
  }

  get currentZone() { return this.currentZoneKey; }

  // ── Internal ──────────────────────────────────────────

  private crossfadeTo(trackKey: string, loop: boolean) {
    if (trackKey === this.currentKey && this.currentTrack && (this.currentTrack as any).isPlaying) return;

    const oldTrack = this.currentTrack;
    const oldKey = this.currentKey;

    // Start new track at volume 0, tween up
    this.playTrack(trackKey, loop, 0);
    const targetVol = DEFAULT_VOLUME[trackKey] ?? 0.55;

    if (this.currentTrack) {
      this.scene.tweens.add({
        targets: this.currentTrack,
        volume: targetVol,
        duration: CROSSFADE_MS,
      });
    }

    // Fade out old track
    if (oldTrack && oldTrack !== this.currentTrack) {
      this.scene.tweens.add({
        targets: oldTrack,
        volume: 0,
        duration: CROSSFADE_MS,
        onComplete: () => {
          oldTrack.stop();
          oldTrack.destroy();
        },
      });
    }
  }

  private playTrack(trackKey: string, loop: boolean, startVol?: number) {
    const key = `music_${trackKey}`;
    if (!this.scene.cache.audio.exists(key)) return;

    const vol = startVol ?? (DEFAULT_VOLUME[trackKey] ?? 0.55);
    const sound = this.scene.sound.add(key, { volume: vol, loop });
    sound.play();
    this.currentTrack = sound;
    this.currentKey = trackKey;
  }

  private stopCurrent() {
    if (this.currentTrack) {
      this.currentTrack.stop();
      this.currentTrack.destroy();
      this.currentTrack = null;
      this.currentKey = '';
    }
  }
}
