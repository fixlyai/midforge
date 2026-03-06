'use client';

import { useEffect, useRef } from 'react';

export function StarField() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const STAR_COUNT = 40;
    const frag = document.createDocumentFragment();

    for (let i = 0; i < STAR_COUNT; i++) {
      const star = document.createElement('div');
      const size = Math.random() > 0.8 ? 2 : 1;
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const opacity = 0.3 + Math.random() * 0.5;
      const delay = Math.random() * 4;
      const duration = 2 + Math.random() * 3;

      star.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: #fff;
        border-radius: 50%;
        left: ${x}%;
        top: ${y}%;
        opacity: ${opacity};
        animation: starTwinkle ${duration}s ease-in-out ${delay}s infinite;
        pointer-events: none;
      `;
      frag.appendChild(star);
    }

    el.appendChild(frag);

    return () => {
      el.innerHTML = '';
    };
  }, []);

  return (
    <>
      <style>{`
        @keyframes starTwinkle {
          0%, 100% { opacity: var(--star-base, 0.4); }
          50% { opacity: 0.1; }
        }
      `}</style>
      <div
        ref={containerRef}
        className="fixed inset-0 pointer-events-none z-0"
        style={{ overflow: 'hidden' }}
      />
    </>
  );
}
