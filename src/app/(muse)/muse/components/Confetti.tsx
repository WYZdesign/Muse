"use client";
import { useEffect, useState } from "react";

const COLORS = ["#FFD700","#FF8A80","#D4A5FF","#FFBF00","#FFDAB9","#87CEEB","#98FB98","#FF69B4","#FF6B6B","#FFE4B5"];

export default function Confetti({ active, duration = 2500 }: { active: boolean; duration?: number }) {
  const [pieces, setPieces] = useState<{id:number;left:number;color:string;delay:number;size:number;rot:number;drift:number}[]>([]);

  useEffect(() => {
    if (!active) { setPieces([]); return; }
    const p = Array.from({length:60}, (_,i) => ({
      id: i, left: Math.random() * 100, color: COLORS[i % COLORS.length],
      delay: Math.random() * 0.5, size: 4 + Math.random() * 8,
      rot: Math.random() * 360, drift: (Math.random() - 0.5) * 40,
    }));
    setPieces(p);
    const t = setTimeout(() => setPieces([]), duration);
    return () => clearTimeout(t);
  }, [active, duration]);

  if (!pieces.length) return null;

  return (
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:999,overflow:"hidden"}}>
      {pieces.map(p => (
        <div key={p.id} className="confetti-piece" style={{
          left: `${p.left}%`, width: p.size, height: p.size * 0.6,
          background: p.color, animationDelay: `${p.delay}s`,
          '--drift': `${p.drift}px`, '--rot': `${p.rot}deg`,
        } as React.CSSProperties} />
      ))}
    </div>
  );
}
