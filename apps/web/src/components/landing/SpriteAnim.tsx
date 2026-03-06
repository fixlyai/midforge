'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

interface SpriteAnimProps {
  src: string;
  frameW: number;
  frameH: number;
  cols: number;
  row: number;
  fps: number;
  scale?: number;
  flipped?: boolean;
  style?: CSSProperties;
}

export function SpriteAnim({
  src,
  frameW,
  frameH,
  cols,
  row,
  fps,
  scale = 1,
  flipped = false,
  style = {},
}: SpriteAnimProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const frameRef = useRef(0);
  const [loaded, setLoaded] = useState(false);

  const displayW = frameW * scale;
  const displayH = frameH * scale;

  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      imgRef.current = img;
      setLoaded(true);
    };
    img.onerror = () => setLoaded(false);
  }, [src]);

  // Animation frame cycling
  useEffect(() => {
    if (fps <= 0) return;
    const interval = setInterval(() => {
      frameRef.current = (frameRef.current + 1) % cols;
    }, 1000 / fps);
    return () => clearInterval(interval);
  }, [fps, cols]);

  // Render loop
  useEffect(() => {
    if (!loaded) return;
    let raf: number;

    const draw = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const img = imgRef.current;
      if (!canvas || !ctx || !img) {
        raf = requestAnimationFrame(draw);
        return;
      }

      ctx.clearRect(0, 0, displayW, displayH);
      ctx.imageSmoothingEnabled = false;

      ctx.save();
      if (flipped) {
        ctx.translate(displayW, 0);
        ctx.scale(-1, 1);
      }

      const col = fps > 0 ? frameRef.current : 0;
      const sx = col * frameW;
      const sy = row * frameH;
      ctx.drawImage(img, sx, sy, frameW, frameH, 0, 0, displayW, displayH);
      ctx.restore();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [loaded, displayW, displayH, frameW, frameH, row, flipped, fps]);

  return (
    <canvas
      ref={canvasRef}
      width={displayW}
      height={displayH}
      style={{
        width: displayW,
        height: displayH,
        imageRendering: 'pixelated',
        ...style,
      }}
    />
  );
}
