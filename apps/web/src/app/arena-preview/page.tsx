'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function ArenaPreviewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0818]" />}>
      <ArenaPreviewContent />
    </Suspense>
  );
}

function ArenaPreviewContent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);
  const searchParams = useSearchParams();
  const isRecord = searchParams.get('record') === 'true';

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    async function initArena() {
      const PhaserModule = await import('phaser');
      const Phaser = PhaserModule.default || PhaserModule;

      if (gameRef.current) return;

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        width: 960,
        height: 540,
        parent: containerRef.current!,
        pixelArt: true,
        antialias: false,
        backgroundColor: '#0a0818',
        render: {
          pixelArt: true,
          antialias: false,
          roundPixels: true,
        },
        scene: {
          key: 'ArenaPreviewScene',
          preload: function (this: Phaser.Scene) {
            // Load Kenney dungeon spritesheet for character sprites
            this.load.spritesheet('dungeon', '/tilesets/tilemap-characters_packed.png', {
              frameWidth: 16, frameHeight: 16, spacing: 1, margin: 0,
            });
            this.load.spritesheet('town', '/tilesets/tilemap_packed.png', {
              frameWidth: 16, frameHeight: 16, spacing: 1, margin: 0,
            });
          },
          create: function (this: Phaser.Scene) {
            const W = 960;
            const H = 540;
            const record = (game.registry.get('record') as boolean) ?? false;

            // Cobblestone floor (scrolling)
            const floorGfx = this.add.graphics();
            floorGfx.fillStyle(0x1a1030, 1);
            floorGfx.fillRect(0, 0, W, H);

            // Draw grid lines for cobblestone feel
            const gridGfx = this.add.graphics();
            gridGfx.lineStyle(1, 0xF39C12, 0.08);
            for (let x = 0; x < W; x += 32) {
              gridGfx.moveTo(x, 0); gridGfx.lineTo(x, H);
            }
            for (let y = 0; y < H; y += 32) {
              gridGfx.moveTo(0, y); gridGfx.lineTo(W, y);
            }
            gridGfx.strokePath();

            // Floor line
            const floorY = H - 120;
            this.add.graphics()
              .lineStyle(2, 0xF39C12, 0.3)
              .moveTo(0, floorY).lineTo(W, floorY).strokePath();
            this.add.graphics()
              .fillStyle(0x0d0a1e, 0.6)
              .fillRect(0, floorY, W, H - floorY);

            // VS text background
            const vsText = this.add.text(W / 2, H / 2 - 40, 'VS', {
              fontFamily: '"Press Start 2P"', fontSize: '48px', color: '#F39C12',
            }).setOrigin(0.5).setAlpha(0.15);

            // Fighter sprites (using dungeon spritesheet)
            // Warrior (red) — frame 26 (knight)
            const warrior = this.add.image(-60, floorY - 16, 'dungeon', 26)
              .setScale(4).setDepth(10);
            // Merchant (purple) — frame 28
            const merchant = this.add.image(W + 60, floorY - 16, 'dungeon', 28)
              .setScale(4).setDepth(10);

            // Labels
            const wLabel = this.add.text(-60, floorY - 70, '@indie_builder', {
              fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#E74C3C',
            }).setOrigin(0.5).setDepth(11);
            const wTier = this.add.text(-60, floorY - 55, 'WARRIOR', {
              fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#E74C3C',
            }).setOrigin(0.5).setAlpha(0.7).setDepth(11);

            const mLabel = this.add.text(W + 60, floorY - 70, '@solofounder', {
              fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#7B68EE',
            }).setOrigin(0.5).setDepth(11);
            const mTier = this.add.text(W + 60, floorY - 55, 'MERCHANT', {
              fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#7B68EE',
            }).setOrigin(0.5).setAlpha(0.7).setDepth(11);

            // HP bars
            const hpW = 80;
            const hpH = 8;
            const wHpBg = this.add.graphics().fillStyle(0x000000, 0.6).fillRect(0, 0, hpW, hpH).setDepth(11);
            const wHpFill = this.add.graphics().fillStyle(0xE74C3C, 1).fillRect(0, 0, hpW, hpH).setDepth(12);
            const mHpBg = this.add.graphics().fillStyle(0x000000, 0.6).fillRect(0, 0, hpW, hpH).setDepth(11);
            const mHpFill = this.add.graphics().fillStyle(0x7B68EE, 1).fillRect(0, 0, hpW, hpH).setDepth(12);

            function positionHpBars() {
              wHpBg.setPosition(warrior.x - hpW / 2, floorY - 85);
              wHpFill.setPosition(warrior.x - hpW / 2, floorY - 85);
              mHpBg.setPosition(merchant.x - hpW / 2, floorY - 85);
              mHpFill.setPosition(merchant.x - hpW / 2, floorY - 85);
            }

            // Animation timeline
            const scene = this;
            let loopCount = 0;

            function runSequence() {
              // Reset positions
              warrior.setPosition(-60, floorY - 16).setAlpha(1).setScale(4);
              merchant.setPosition(W + 60, floorY - 16).setAlpha(1).setScale(4);
              wLabel.setPosition(-60, floorY - 70);
              wTier.setPosition(-60, floorY - 55);
              mLabel.setPosition(W + 60, floorY - 70);
              mTier.setPosition(W + 60, floorY - 55);
              wHpFill.clear().fillStyle(0xE74C3C, 1).fillRect(0, 0, hpW, hpH);
              mHpFill.clear().fillStyle(0x7B68EE, 1).fillRect(0, 0, hpW, hpH);
              positionHpBars();

              // Phase 1: Walk in (1.5s)
              scene.tweens.add({
                targets: [warrior, wLabel, wTier],
                x: W * 0.35,
                duration: 1500,
                ease: 'Power2',
              });
              scene.tweens.add({
                targets: [merchant, mLabel, mTier],
                x: W * 0.65,
                duration: 1500,
                ease: 'Power2',
              });
              scene.tweens.add({
                targets: [wHpBg, wHpFill],
                x: W * 0.35 - hpW / 2,
                duration: 1500,
                ease: 'Power2',
              });
              scene.tweens.add({
                targets: [mHpBg, mHpFill],
                x: W * 0.65 - hpW / 2,
                duration: 1500,
                ease: 'Power2',
              });

              // Phase 2: Clash sequence (at 2s)
              scene.time.delayedCall(2000, () => {
                // Warrior lunges
                scene.tweens.add({
                  targets: warrior,
                  x: W * 0.45,
                  duration: 200,
                  yoyo: true,
                  ease: 'Power3',
                });
                // Merchant HP drops
                scene.time.delayedCall(200, () => {
                  mHpFill.clear().fillStyle(0x7B68EE, 1).fillRect(0, 0, hpW * 0.6, hpH);
                });
              });

              // Phase 3: Second clash (at 3s)
              scene.time.delayedCall(3000, () => {
                // Merchant lunges
                scene.tweens.add({
                  targets: merchant,
                  x: W * 0.55,
                  duration: 200,
                  yoyo: true,
                  ease: 'Power3',
                });
                scene.time.delayedCall(200, () => {
                  wHpFill.clear().fillStyle(0xE74C3C, 1).fillRect(0, 0, hpW * 0.75, hpH);
                });
              });

              // Phase 4: Final blow (at 4s)
              scene.time.delayedCall(4000, () => {
                scene.tweens.add({
                  targets: warrior,
                  x: W * 0.5,
                  duration: 150,
                  ease: 'Power4',
                });
                scene.time.delayedCall(150, () => {
                  // Screen flash
                  const flash = scene.add.graphics()
                    .fillStyle(0xffffff, 0.8).fillRect(0, 0, W, H).setDepth(50);
                  scene.tweens.add({
                    targets: flash, alpha: 0, duration: 400,
                    onComplete: () => flash.destroy(),
                  });
                  // Merchant defeated
                  mHpFill.clear().fillStyle(0x7B68EE, 1).fillRect(0, 0, 0, hpH);
                  scene.tweens.add({
                    targets: merchant, alpha: 0.3, duration: 500,
                  });
                });
              });

              // Phase 5: Victory (at 5s)
              scene.time.delayedCall(5000, () => {
                // XP float
                const xpText = scene.add.text(W * 0.35, floorY - 100, '+450 XP', {
                  fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#F39C12',
                }).setOrigin(0.5).setDepth(20);
                scene.tweens.add({
                  targets: xpText, y: floorY - 160, alpha: 0,
                  duration: 2000, onComplete: () => xpText.destroy(),
                });

                // Winner text
                const winText = scene.add.text(W / 2, H / 2 + 40, '@indie_builder WINS!', {
                  fontFamily: '"Press Start 2P"', fontSize: '16px', color: '#F39C12',
                }).setOrigin(0.5).setDepth(20).setAlpha(0);
                scene.tweens.add({
                  targets: winText, alpha: 1, duration: 500,
                });

                // Loop or stop
                if (!record) {
                  scene.time.delayedCall(3000, () => {
                    winText.destroy();
                    loopCount++;
                    runSequence();
                  });
                }
              });
            }

            game.registry.set('record', record);
            runSequence();
          },
        },
      });

      game.registry.set('record', isRecord);
      gameRef.current = game;
    }

    initArena();

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [isRecord]);

  return (
    <div
      className="w-screen h-screen flex items-center justify-center"
      style={{ background: '#050308' }}
    >
      <div
        ref={containerRef}
        className="overflow-hidden"
        style={{ width: 960, height: 540, imageRendering: 'pixelated' as any }}
      />
    </div>
  );
}
