'use client';

import React, { useRef, useEffect, useCallback } from 'react';

// ── Joystick Widget ──────────────────────────────────────────────
function JoystickWidget() {
  const containerRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ active: false, ox: 0, oy: 0 });
  const RADIUS = 52;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      e.preventDefault();
      const rect = el!.getBoundingClientRect();
      stateRef.current = {
        active: true,
        ox: rect.left + rect.width / 2,
        oy: rect.top + rect.height / 2,
      };
    }

    function onTouchMove(e: TouchEvent) {
      e.preventDefault();
      if (!stateRef.current.active) return;
      const t = e.touches[0];
      const dx = t.clientX - stateRef.current.ox;
      const dy = t.clientY - stateRef.current.oy;
      const dist = Math.min(Math.hypot(dx, dy), RADIUS);
      const angle = Math.atan2(dy, dx);
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist;

      if (thumbRef.current) {
        thumbRef.current.style.transform = `translate(${tx}px, ${ty}px)`;
      }

      const threshold = 18;
      window.dispatchEvent(new CustomEvent('mobile-joystick', {
        detail: {
          left:  dx < -threshold,
          right: dx > threshold,
          up:    dy < -threshold,
          down:  dy > threshold,
          dx, dy,
        }
      }));
    }

    function onTouchEnd(e: TouchEvent) {
      e.preventDefault();
      stateRef.current.active = false;
      if (thumbRef.current) {
        thumbRef.current.style.transform = 'translate(0px, 0px)';
      }
      window.dispatchEvent(new CustomEvent('mobile-joystick', {
        detail: { left: false, right: false, up: false, down: false, dx: 0, dy: 0 }
      }));
    }

    el.addEventListener('touchstart',  onTouchStart, { passive: false });
    el.addEventListener('touchmove',   onTouchMove,  { passive: false });
    el.addEventListener('touchend',    onTouchEnd,   { passive: false });
    el.addEventListener('touchcancel', onTouchEnd,   { passive: false });

    return () => {
      el.removeEventListener('touchstart',  onTouchStart);
      el.removeEventListener('touchmove',   onTouchMove);
      el.removeEventListener('touchend',    onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width:  RADIUS * 2,
        height: RADIUS * 2,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.06)',
        border: '2px solid rgba(243,156,18,0.4)',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 0 24px rgba(243,156,18,0.15)',
        touchAction: 'none',
      }}
    >
      {/* Crosshair guides */}
      <div style={{ position: 'absolute', width: '100%', height: '1px', background: 'rgba(243,156,18,0.2)' }} />
      <div style={{ position: 'absolute', height: '100%', width: '1px', background: 'rgba(243,156,18,0.2)' }} />
      {/* Arrow hints */}
      {([
        { symbol: '▲', top: '4px',    left: '50%', transform: 'translateX(-50%)' },
        { symbol: '▼', bottom: '4px', left: '50%', transform: 'translateX(-50%)' },
        { symbol: '◀', left: '4px',   top: '50%',  transform: 'translateY(-50%)' },
        { symbol: '▶', right: '4px',  top: '50%',  transform: 'translateY(-50%)' },
      ] as const).map(({ symbol, ...style }) => (
        <div key={symbol} style={{
          position: 'absolute',
          fontSize: '10px',
          color: 'rgba(243,156,18,0.5)',
          fontFamily: 'monospace',
          lineHeight: 1,
          ...style,
        }}>{symbol}</div>
      ))}
      {/* Thumb */}
      <div
        ref={thumbRef}
        style={{
          width:  44,
          height: 44,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #F39C12 0%, #e67e22 100%)',
          boxShadow: '0 0 12px rgba(243,156,18,0.6)',
          transition: 'transform 0.05s ease-out',
          position: 'absolute',
          touchAction: 'none',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

// ── Action Button ────────────────────────────────────────────────
function ActionButton({ label, color, textColor, onPress }: {
  label: string;
  color: string;
  textColor: string;
  onPress: () => void;
}) {
  return (
    <button
      onPointerDown={(e) => { e.preventDefault(); onPress(); }}
      style={{
        width: 64,
        height: 64,
        borderRadius: '50%',
        background: color,
        border: `3px solid ${color}cc`,
        boxShadow: `0 0 16px ${color}66`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"Press Start 2P"',
        fontSize: '16px',
        color: textColor,
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      {label}
    </button>
  );
}

// ── Main Control Panel ───────────────────────────────────────────
export function MobileControlPanel() {
  const handleInteract = useCallback(() => {
    window.dispatchEvent(new CustomEvent('mobile-interact'));
  }, []);

  const handleInventory = useCallback(() => {
    window.dispatchEvent(new CustomEvent('mobile-inventory'));
  }, []);

  return (
    <div style={{
      width: '100%',
      height: '34dvh',
      background: 'linear-gradient(180deg, #0a0818 0%, #130d2e 100%)',
      borderTop: '2px solid #F39C12',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      boxSizing: 'border-box',
      flexShrink: 0,
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {/* LEFT: Joystick zone */}
      <div style={{
        width: '45%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        <JoystickWidget />
      </div>

      {/* CENTER: status dot */}
      <div style={{
        width: '10%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
      }}>
        <div style={{
          width: 8, height: 8,
          borderRadius: '50%',
          background: '#22c55e',
        }} />
      </div>

      {/* RIGHT: Action buttons */}
      <div style={{
        width: '45%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
      }}>
        <ActionButton label="E" color="#F39C12" textColor="#000" onPress={handleInteract} />
        <ActionButton label="I" color="#7B68EE" textColor="#fff" onPress={handleInventory} />
      </div>
    </div>
  );
}
