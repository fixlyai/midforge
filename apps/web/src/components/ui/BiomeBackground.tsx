'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════
//  BIOME BACKGROUND — real PNG parallax battle backgrounds
//  with 5-second intro sequence
// ═══════════════════════════════════════════════════════════

export type BiomeKey = 'town' | 'forest' | 'cave' | 'castle' | 'mountain' | 'prairie' | 'ruins' | 'lakeview';

export interface BiomeBackgroundProps {
  biome: BiomeKey;
  phase: 'intro' | 'fight' | 'result';
  playerWon?: boolean;
  onIntroComplete: () => void;
}

// ─── Biome title cards ───
const BIOME_META: Record<BiomeKey, { title: string; subtitle: string; color: string }> = {
  town:     { title: '⚔ VILLAGE ARENA',      subtitle: 'The crowd watches...',            color: '#F39C12' },
  forest:   { title: '🌲 DEEP FOREST',        subtitle: 'Something stirs in the dark...',  color: '#27AE60' },
  cave:     { title: '💀 MOUNTAIN CAVE',       subtitle: 'Dripping. Cold. Dangerous.',      color: '#8B9BB4' },
  castle:   { title: '🏰 CASTLE KEEP',         subtitle: 'The seat of power awaits.',       color: '#C0392B' },
  mountain: { title: '⛰ MOUNTAIN PEAK',       subtitle: 'Wind howls at this height.',      color: '#95A5A6' },
  prairie:  { title: '🌾 OPEN PLAINS',         subtitle: 'Nowhere to hide out here.',       color: '#F1C40F' },
  ruins:    { title: '🏚 ANCIENT RUINS',       subtitle: 'These stones remember war.',      color: '#7F8C8D' },
  lakeview: { title: '🔥 LAKESIDE CLEARING',   subtitle: 'Still water, restless night.',    color: '#3498DB' },
};

// ─── Shared image style ───
const IMG_BASE: React.CSSProperties = {
  position: 'absolute',
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  imageRendering: 'pixelated',
  top: 0,
  left: 0,
};

// ─── Town biome layers ───
function TownLayers({ layerOpacities, fightMode }: { layerOpacities: number[]; fightMode: boolean }) {
  const dur = fightMode ? 3 : 1; // 3x slower during fight
  const [smokeFrame, setSmokeFrame] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setSmokeFrame(f => (f % 8) + 1);
    }, fightMode ? 240 : 80);
    return () => clearInterval(interval);
  }, [fightMode]);

  return (
    <>
      {/* Layer 0: Sky — static */}
      <img
        src="/backgrounds/Town/TownSky.png"
        alt=""
        style={{ ...IMG_BASE, zIndex: 0, opacity: layerOpacities[0] ?? 0, transition: 'opacity 0.2s' }}
      />
      {/* Layer 1: ParallaxBG — slow drift */}
      <img
        src="/backgrounds/Town/TownParallaxBG.png"
        alt=""
        style={{
          ...IMG_BASE, zIndex: 1, opacity: layerOpacities[1] ?? 0, transition: 'opacity 0.15s',
          animation: `driftLeft ${8 * dur}s ease-in-out infinite`,
        }}
      />
      {/* Layer 2: Main scene — static */}
      <img
        src="/backgrounds/Town/Town.png"
        alt=""
        style={{ ...IMG_BASE, zIndex: 2, opacity: layerOpacities[2] ?? 0, transition: 'opacity 0.15s' }}
      />
      {/* Layer 3: Clouds — slow drift left */}
      <img
        src="/backgrounds/Town/TownClouds.png"
        alt=""
        style={{
          ...IMG_BASE, zIndex: 3, opacity: (layerOpacities[3] ?? 0) * 0.6, transition: 'opacity 0.15s',
          animation: `driftLeft ${20 * dur}s ease-in-out infinite`,
        }}
      />
      {/* Layer 4: Chimney smoke — animated frames */}
      <img
        src={`/backgrounds/Town/ChimneySmoke/Frames/Smoke${smokeFrame}.png`}
        alt=""
        style={{
          ...IMG_BASE, zIndex: 4, opacity: (layerOpacities[3] ?? 0) * 0.5, transition: 'opacity 0.15s',
        }}
      />
      {/* Layer 5: Foreground — static, topmost */}
      <img
        src="/backgrounds/Town/TownForeground.png"
        alt=""
        style={{ ...IMG_BASE, zIndex: 5, opacity: layerOpacities[4] ?? 0, transition: 'opacity 0.1s' }}
      />
    </>
  );
}

// ─── Forest biome layers ───
function ForestLayers({ layerOpacities, fightMode }: { layerOpacities: number[]; fightMode: boolean }) {
  const dur = fightMode ? 3 : 1;
  const h = new Date().getHours();
  const night = h >= 20 || h < 6;

  return (
    <>
      <img
        src={night ? '/backgrounds/Forest/ForestSkyNight.png' : '/backgrounds/Forest/ForestSky.png'}
        alt="" style={{ ...IMG_BASE, zIndex: 0, opacity: layerOpacities[0] ?? 0, transition: 'opacity 0.2s' }}
      />
      <img
        src={night ? '/backgrounds/Forest/ForestParallaxBGNight.png' : '/backgrounds/Forest/ForestParallaxBG.png'}
        alt="" style={{ ...IMG_BASE, zIndex: 1, opacity: layerOpacities[1] ?? 0, transition: 'opacity 0.15s', animation: `driftLeft ${10 * dur}s ease-in-out infinite` }}
      />
      <img
        src={night ? '/backgrounds/Forest/ForestNight.png' : '/backgrounds/Forest/Forest.png'}
        alt="" style={{ ...IMG_BASE, zIndex: 2, opacity: layerOpacities[2] ?? 0, transition: 'opacity 0.15s' }}
      />
      <img
        src={night ? '/backgrounds/Forest/MistNight.png' : '/backgrounds/Forest/Mist.png'}
        alt="" style={{ ...IMG_BASE, zIndex: 3, opacity: (layerOpacities[3] ?? 0) * 0.35, transition: 'opacity 0.15s', animation: `driftRight ${15 * dur}s ease-in-out infinite` }}
      />
      <img
        src="/backgrounds/Forest/Fern.png"
        alt="" style={{ ...IMG_BASE, zIndex: 5, opacity: layerOpacities[4] ?? 0, transition: 'opacity 0.1s', animation: `driftLeft ${6 * dur}s ease-in-out infinite` }}
      />
    </>
  );
}

// ─── Cave biome layers ───
function CaveLayers({ layerOpacities, fightMode }: { layerOpacities: number[]; fightMode: boolean }) {
  const dur = fightMode ? 3 : 1;
  const [wfFrame, setWfFrame] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setWfFrame(f => (f % 8) + 1);
    }, fightMode ? 240 : 80);
    return () => clearInterval(interval);
  }, [fightMode]);

  return (
    <>
      <img src="/backgrounds/Cave/CaveSky.png" alt="" style={{ ...IMG_BASE, zIndex: 0, opacity: layerOpacities[0] ?? 0, transition: 'opacity 0.2s' }} />
      <img src="/backgrounds/Cave/CaveParallaxBG.png" alt="" style={{ ...IMG_BASE, zIndex: 1, opacity: layerOpacities[1] ?? 0, transition: 'opacity 0.15s', animation: `driftLeft ${12 * dur}s ease-in-out infinite` }} />
      <img src="/backgrounds/Cave/Cave.png" alt="" style={{ ...IMG_BASE, zIndex: 2, opacity: layerOpacities[2] ?? 0, transition: 'opacity 0.15s' }} />
      <img src="/backgrounds/Cave/CaveBridge.png" alt="" style={{ ...IMG_BASE, zIndex: 3, opacity: layerOpacities[2] ?? 0, transition: 'opacity 0.15s' }} />
      <img src="/backgrounds/Cave/CaveMushroom.png" alt="" style={{ ...IMG_BASE, zIndex: 3, opacity: (layerOpacities[2] ?? 0) * 0.85, transition: 'opacity 0.15s', animation: `mushroomPulse ${3 * dur}s ease-in-out infinite` }} />
      <img src={`/backgrounds/Cave/Waterfall/Waterfall${wfFrame}.png`} alt="" style={{ ...IMG_BASE, zIndex: 4, opacity: layerOpacities[3] ?? 0, transition: 'opacity 0.15s' }} />
      <img src="/backgrounds/Cave/ForegroundLeft.png" alt="" style={{ ...IMG_BASE, zIndex: 5, opacity: layerOpacities[4] ?? 0, transition: 'opacity 0.1s' }} />
      <img src="/backgrounds/Cave/ForegroundRight.png" alt="" style={{ ...IMG_BASE, zIndex: 5, opacity: layerOpacities[4] ?? 0, transition: 'opacity 0.1s' }} />
    </>
  );
}

// ─── Keep (Castle) biome layers ───
function KeepLayers({ layerOpacities, fightMode }: { layerOpacities: number[]; fightMode: boolean }) {
  const dur = fightMode ? 3 : 1;
  return (
    <>
      <img src="/backgrounds/Keep/KeepBackwall.png" alt="" style={{ ...IMG_BASE, zIndex: 0, opacity: layerOpacities[0] ?? 0, transition: 'opacity 0.2s' }} />
      <img src="/backgrounds/Keep/KeepTiling.png" alt="" style={{ ...IMG_BASE, zIndex: 1, opacity: layerOpacities[0] ?? 0, transition: 'opacity 0.2s', objectFit: 'cover' }} />
      <img src="/backgrounds/Keep/KeepWalls.png" alt="" style={{ ...IMG_BASE, zIndex: 1, opacity: layerOpacities[1] ?? 0, transition: 'opacity 0.15s' }} />
      <img src="/backgrounds/Keep/KeepPillarBG.png" alt="" style={{ ...IMG_BASE, zIndex: 2, opacity: layerOpacities[1] ?? 0, transition: 'opacity 0.15s' }} />
      <img src="/backgrounds/Keep/KeepPassageway.png" alt="" style={{ ...IMG_BASE, zIndex: 2, opacity: layerOpacities[2] ?? 0, transition: 'opacity 0.15s' }} />
      <img src="/backgrounds/Keep/KeepDoor.png" alt="" style={{ ...IMG_BASE, zIndex: 3, opacity: layerOpacities[2] ?? 0, transition: 'opacity 0.15s' }} />
      <img src="/backgrounds/Keep/Keep.png" alt="" style={{ ...IMG_BASE, zIndex: 3, opacity: layerOpacities[2] ?? 0, transition: 'opacity 0.15s' }} />
      <img src="/backgrounds/Keep/KeepLantern.png" alt="" style={{ ...IMG_BASE, zIndex: 4, opacity: layerOpacities[3] ?? 0, transition: 'opacity 0.15s', animation: `lanternFlicker ${0.6 * dur}s ease-in-out infinite alternate` }} />
      <img src="/backgrounds/Keep/KeepPillar.png" alt="" style={{ ...IMG_BASE, zIndex: 5, opacity: layerOpacities[4] ?? 0, transition: 'opacity 0.1s' }} />
    </>
  );
}

// ─── Mountains biome layers ───
function MountainLayers({ layerOpacities, fightMode }: { layerOpacities: number[]; fightMode: boolean }) {
  const dur = fightMode ? 3 : 1;
  return (
    <>
      <img src="/backgrounds/Mountains/MountainsSky.png" alt="" style={{ ...IMG_BASE, zIndex: 0, opacity: layerOpacities[0] ?? 0, transition: 'opacity 0.2s' }} />
      <img src="/backgrounds/Mountains/MountainsRollingCloudsBack.png" alt="" style={{ ...IMG_BASE, zIndex: 1, opacity: (layerOpacities[1] ?? 0) * 0.7, transition: 'opacity 0.15s', animation: `driftLeft ${25 * dur}s ease-in-out infinite` }} />
      <img src="/backgrounds/Mountains/MountainsParallaxBG.png" alt="" style={{ ...IMG_BASE, zIndex: 2, opacity: layerOpacities[1] ?? 0, transition: 'opacity 0.15s', animation: `driftLeft ${15 * dur}s ease-in-out infinite` }} />
      <img src="/backgrounds/Mountains/Mountains.png" alt="" style={{ ...IMG_BASE, zIndex: 3, opacity: layerOpacities[2] ?? 0, transition: 'opacity 0.15s' }} />
      <img src="/backgrounds/Mountains/MountainsRollingCloudsFront.png" alt="" style={{ ...IMG_BASE, zIndex: 4, opacity: (layerOpacities[3] ?? 0) * 0.5, transition: 'opacity 0.15s', animation: `driftLeft ${18 * dur}s ease-in-out infinite` }} />
      <img src="/backgrounds/Mountains/ForegroundRock.png" alt="" style={{ ...IMG_BASE, zIndex: 5, opacity: layerOpacities[4] ?? 0, transition: 'opacity 0.1s' }} />
      <img src="/backgrounds/Mountains/ForegroundPillarLarge.png" alt="" style={{ ...IMG_BASE, zIndex: 5, opacity: layerOpacities[4] ?? 0, transition: 'opacity 0.1s' }} />
      <img src="/backgrounds/Mountains/ForegroundOvergrownRock.png" alt="" style={{ ...IMG_BASE, zIndex: 5, opacity: layerOpacities[4] ?? 0, transition: 'opacity 0.1s' }} />
    </>
  );
}

// ─── Plains (Prairie) biome layers ───
function PlainsLayers({ layerOpacities, fightMode }: { layerOpacities: number[]; fightMode: boolean }) {
  const dur = fightMode ? 3 : 1;
  const h = new Date().getHours();
  const night = h >= 20 || h < 6;

  return (
    <>
      <img src={night ? '/backgrounds/Plains/PlainsSkyNight.png' : '/backgrounds/Plains/PlainsSky.png'} alt="" style={{ ...IMG_BASE, zIndex: 0, opacity: layerOpacities[0] ?? 0, transition: 'opacity 0.2s' }} />
      <img src={night ? '/backgrounds/Plains/PlainsCloudsNight.png' : '/backgrounds/Plains/PlainsClouds.png'} alt="" style={{ ...IMG_BASE, zIndex: 1, opacity: (layerOpacities[1] ?? 0) * 0.7, transition: 'opacity 0.15s', animation: `driftLeft ${20 * dur}s ease-in-out infinite` }} />
      <img src={night ? '/backgrounds/Plains/PlainsParallaxBGNight.png' : '/backgrounds/Plains/PlainsParallaxBG.png'} alt="" style={{ ...IMG_BASE, zIndex: 2, opacity: layerOpacities[1] ?? 0, transition: 'opacity 0.15s', animation: `driftLeft ${10 * dur}s ease-in-out infinite` }} />
      <img src={night ? '/backgrounds/Plains/PlainsNight.png' : '/backgrounds/Plains/Plains.png'} alt="" style={{ ...IMG_BASE, zIndex: 3, opacity: layerOpacities[2] ?? 0, transition: 'opacity 0.15s' }} />
      <img src={night ? '/backgrounds/Plains/PlainsTreeNight.png' : '/backgrounds/Plains/PlainsTree.png'} alt="" style={{ ...IMG_BASE, zIndex: 4, opacity: layerOpacities[3] ?? 0, transition: 'opacity 0.15s' }} />
      <img src={night ? '/backgrounds/Plains/PlainsStumpNight.png' : '/backgrounds/Plains/PlainsStump.png'} alt="" style={{ ...IMG_BASE, zIndex: 4, opacity: layerOpacities[3] ?? 0, transition: 'opacity 0.15s' }} />
      <img src="/backgrounds/Plains/PlainsForeground.png" alt="" style={{ ...IMG_BASE, zIndex: 5, opacity: layerOpacities[4] ?? 0, transition: 'opacity 0.1s' }} />
    </>
  );
}

// ─── Ruins biome layers ───
function RuinsLayers({ layerOpacities, fightMode }: { layerOpacities: number[]; fightMode: boolean }) {
  const dur = fightMode ? 3 : 1;
  return (
    <>
      <img src="/backgrounds/Ruins/RuinsSky.png" alt="" style={{ ...IMG_BASE, zIndex: 0, opacity: layerOpacities[0] ?? 0, transition: 'opacity 0.2s' }} />
      <img src="/backgrounds/Ruins/RuinsParallaxBG.png" alt="" style={{ ...IMG_BASE, zIndex: 1, opacity: layerOpacities[1] ?? 0, transition: 'opacity 0.15s', animation: `driftLeft ${10 * dur}s ease-in-out infinite` }} />
      <img src="/backgrounds/Ruins/Ruins.png" alt="" style={{ ...IMG_BASE, zIndex: 2, opacity: layerOpacities[2] ?? 0, transition: 'opacity 0.15s' }} />
      <img src="/backgrounds/Ruins/RuinsMist.png" alt="" style={{ ...IMG_BASE, zIndex: 3, opacity: (layerOpacities[3] ?? 0) * 0.4, transition: 'opacity 0.15s', animation: `driftRight ${18 * dur}s ease-in-out infinite` }} />
      <img src="/backgrounds/Ruins/RuinsForegroundStone.png" alt="" style={{ ...IMG_BASE, zIndex: 5, opacity: layerOpacities[4] ?? 0, transition: 'opacity 0.1s' }} />
      <img src="/backgrounds/Ruins/RuinsForegroundVegetation.png" alt="" style={{ ...IMG_BASE, zIndex: 5, opacity: layerOpacities[4] ?? 0, transition: 'opacity 0.1s' }} />
    </>
  );
}

// ─── Lakeview biome layers ───
function LakeviewLayers({ layerOpacities, fightMode }: { layerOpacities: number[]; fightMode: boolean }) {
  const dur = fightMode ? 3 : 1;
  return (
    <>
      <img src="/backgrounds/Lakeview/FBB_LakeviewSky.png" alt="" style={{ ...IMG_BASE, zIndex: 0, opacity: layerOpacities[0] ?? 0, transition: 'opacity 0.2s' }} />
      <img src="/backgrounds/Lakeview/Cloud1.png" alt="" style={{ ...IMG_BASE, zIndex: 1, opacity: (layerOpacities[1] ?? 0) * 0.6, transition: 'opacity 0.15s', animation: `driftLeft ${22 * dur}s ease-in-out infinite` }} />
      <img src="/backgrounds/Lakeview/Cloud2.png" alt="" style={{ ...IMG_BASE, zIndex: 1, opacity: (layerOpacities[1] ?? 0) * 0.5, transition: 'opacity 0.15s', animation: `driftLeft ${30 * dur}s ease-in-out infinite` }} />
      <img src="/backgrounds/Lakeview/FBB_Lakeview.png" alt="" style={{ ...IMG_BASE, zIndex: 2, opacity: layerOpacities[2] ?? 0, transition: 'opacity 0.15s' }} />
      <img src="/backgrounds/Lakeview/ForegroundLeft.png" alt="" style={{ ...IMG_BASE, zIndex: 5, opacity: layerOpacities[4] ?? 0, transition: 'opacity 0.1s' }} />
      <img src="/backgrounds/Lakeview/ForegroundRight.png" alt="" style={{ ...IMG_BASE, zIndex: 5, opacity: layerOpacities[4] ?? 0, transition: 'opacity 0.1s' }} />
    </>
  );
}

// ─── Main BiomeBackground component ───
export default function BiomeBackground({ biome, phase, playerWon, onIntroComplete }: BiomeBackgroundProps) {
  // 5 layer opacities: [sky, parallax, main, overlay, foreground]
  const [layerOpacities, setLayerOpacities] = useState([0, 0, 0, 0, 0]);
  const [titleVisible, setTitleVisible] = useState(false);
  const [titleExiting, setTitleExiting] = useState(false);
  const [battleText, setBattleText] = useState(false);
  const [battleTextFading, setBattleTextFading] = useState(false);
  const introCalledRef = useRef(false);

  const fightMode = phase === 'fight' || phase === 'result';
  const meta = BIOME_META[biome] ?? BIOME_META.town;

  // 5-second intro timing chain
  useEffect(() => {
    if (phase !== 'intro') {
      // If phase is already fight/result, show all layers immediately
      setLayerOpacities([1, 1, 1, 1, 1]);
      return;
    }

    introCalledRef.current = false;

    // 300ms — layers fade in sequentially
    const t1 = setTimeout(() => setLayerOpacities([1, 0, 0, 0, 0]), 300);
    const t2 = setTimeout(() => setLayerOpacities([1, 1, 0, 0, 0]), 450);
    const t3 = setTimeout(() => setLayerOpacities([1, 1, 1, 0, 0]), 600);
    const t4 = setTimeout(() => setLayerOpacities([1, 1, 1, 1, 0]), 750);
    const t5 = setTimeout(() => setLayerOpacities([1, 1, 1, 1, 1]), 850);

    // 1000ms — title card slides in
    const t6 = setTimeout(() => setTitleVisible(true), 1000);

    // 1800ms — title card slides out
    const t7 = setTimeout(() => setTitleExiting(true), 1800);
    const t8 = setTimeout(() => { setTitleVisible(false); setTitleExiting(false); }, 2100);

    // 3000ms — BATTLE START text
    const t9 = setTimeout(() => setBattleText(true), 3000);
    const t10 = setTimeout(() => setBattleTextFading(true), 3350);
    const t11 = setTimeout(() => { setBattleText(false); setBattleTextFading(false); }, 3500);

    // 3500ms — intro complete
    const t12 = setTimeout(() => {
      if (!introCalledRef.current) {
        introCalledRef.current = true;
        onIntroComplete();
      }
    }, 3500);

    return () => {
      [t1, t2, t3, t4, t5, t6, t7, t8, t9, t10, t11, t12].forEach(clearTimeout);
    };
  }, [phase, biome, onIntroComplete]);

  // Result phase filter
  const resultFilter = phase === 'result' && !playerWon
    ? 'saturate(0.25) brightness(0.55)'
    : undefined;

  const showGoldSweep = phase === 'result' && playerWon;

  return (
    <div className="battle-bg-container" style={{
      position: 'relative',
      width: '100%',
      height: 180,
      overflow: 'hidden',
      borderRadius: '8px 8px 0 0',
      background: '#0a0818',
      filter: resultFilter,
      transition: resultFilter ? 'filter 1s ease' : undefined,
    }}>
      <style>{`
        .battle-bg-container img, .battle-bg-container canvas {
          image-rendering: pixelated;
          image-rendering: crisp-edges;
          image-rendering: -moz-crisp-edges;
        }
        @keyframes driftLeft {
          0%   { transform: translateX(0); }
          50%  { transform: translateX(-12px); }
          100% { transform: translateX(0); }
        }
        @keyframes driftRight {
          0%   { transform: translateX(0); }
          50%  { transform: translateX(12px); }
          100% { transform: translateX(0); }
        }
        @keyframes lanternFlicker {
          0%, 100% { opacity: 0.8; }
          50%      { opacity: 1.0; }
        }
        @keyframes mushroomPulse {
          0%, 100% { opacity: 0.7; }
          50%      { opacity: 1.0; }
        }
        @keyframes titleSlideIn {
          from { transform: translateY(-110%); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        @keyframes titleSlideOut {
          from { transform: translateY(0); opacity: 1; }
          to   { transform: translateY(-110%); opacity: 0; }
        }
        @keyframes battleStartPop {
          0%   { transform: scale(0); opacity: 0; }
          50%  { transform: scale(1.5); opacity: 1; }
          100% { transform: scale(1.0); opacity: 1; }
        }
        @keyframes battleStartFade {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        @keyframes goldSweep {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      {/* Biome-specific layers */}
      {biome === 'town' && <TownLayers layerOpacities={layerOpacities} fightMode={fightMode} />}
      {biome === 'forest' && <ForestLayers layerOpacities={layerOpacities} fightMode={fightMode} />}
      {biome === 'cave' && <CaveLayers layerOpacities={layerOpacities} fightMode={fightMode} />}
      {biome === 'castle' && <KeepLayers layerOpacities={layerOpacities} fightMode={fightMode} />}
      {biome === 'mountain' && <MountainLayers layerOpacities={layerOpacities} fightMode={fightMode} />}
      {biome === 'prairie' && <PlainsLayers layerOpacities={layerOpacities} fightMode={fightMode} />}
      {biome === 'ruins' && <RuinsLayers layerOpacities={layerOpacities} fightMode={fightMode} />}
      {biome === 'lakeview' && <LakeviewLayers layerOpacities={layerOpacities} fightMode={fightMode} />}

      {/* Scanline overlay */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.04, background: 'repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 3px)', pointerEvents: 'none', zIndex: 10 }} />

      {/* Title card */}
      {titleVisible && (
        <div style={{
          position: 'absolute',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20,
          background: '#000000E0',
          border: `1px solid ${meta.color}`,
          borderRadius: 4,
          padding: '10px 16px',
          textAlign: 'center',
          animation: titleExiting
            ? 'titleSlideOut 0.25s ease-in forwards'
            : 'titleSlideIn 0.3s ease-out forwards',
        }}>
          <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 9, color: meta.color, marginBottom: 4 }}>
            {meta.title}
          </div>
          <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 6, color: '#ffffff60' }}>
            {meta.subtitle}
          </div>
        </div>
      )}

      {/* BATTLE START text */}
      {battleText && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 25,
          pointerEvents: 'none',
        }}>
          <span style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 14,
            color: '#fff',
            textShadow: '0 0 24px #F39C12, 0 0 48px #F39C12',
            animation: battleTextFading
              ? 'battleStartFade 0.15s ease-out forwards'
              : 'battleStartPop 0.35s ease-out forwards',
          }}>
            BATTLE START!
          </span>
        </div>
      )}

      {/* Gold sweep on victory */}
      {showGoldSweep && (
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 30,
          pointerEvents: 'none',
          background: 'linear-gradient(110deg, transparent 30%, #F39C1230 48%, #F39C1260 50%, #F39C1230 52%, transparent 70%)',
          backgroundSize: '200% 100%',
          animation: 'goldSweep 1.5s ease-out forwards',
        }} />
      )}
    </div>
  );
}
