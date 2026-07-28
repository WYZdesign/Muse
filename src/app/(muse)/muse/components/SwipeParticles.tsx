"use client";
import { useEffect, useState } from "react";

const COLORS = ["#FFD700","#FF8A80","#D4A5FF","#98FB98","#FF69B4"];

export default function SwipeParticles({ active, dir }: { active: boolean; dir: "left" | "right" }) {
  const [ps, setPs] = useState<{id:number;x:number;y:number;color:string;vx:number;vy:number;size:number;life:number}[]>([]);

  useEffect(() => {
    if (!active) { setPs([]); return; }
    const w = window.innerWidth, h = window.innerHeight;
    const cx = w / 2, cy = h / 2;
    const burst = Array.from({length:24}, (_,i) => ({
      id: i, x: cx, y: cy, color: COLORS[i % COLORS.length],
      vx: (dir === "right" ? Math.random() * 8 + 2 : -(Math.random() * 8 + 2)) + (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 12 - 4,
      size: 3 + Math.random() * 6, life: 1,
    }));
    setPs(burst);
    const t = setTimeout(() => setPs([]), 700);
    return () => clearTimeout(t);
  }, [active, dir]);

  if (!ps.length) return null;

  return (
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:998}}>
      {ps.map(p => (
        <div key={p.id} className="swipe-particle" style={{
          left: p.x, top: p.y, width: p.size, height: p.size,
          background: p.color, '--vx': `${p.vx}px`, '--vy': `${p.vy}px`,
        } as React.CSSProperties} />
      ))}
    </div>
  );
}
