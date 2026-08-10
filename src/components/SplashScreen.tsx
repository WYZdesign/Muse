"use client";

import { useState, useEffect, useRef } from "react";

const DURATION = 3800;

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fade, setFade] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    const W = canvas.width;
    const H = canvas.height;

    // 130 stars — evenly spaced grid across FULL canvas
    const cols = 13, rows = 10;
    const stars: { x: number; y: number; r: number; a: number; da: number; hue: number }[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        stars.push({
          x: (col / cols) * W + (Math.random() - 0.5) * (W / cols),
          y: (row / rows) * (H * 0.55) + Math.random() * (H * 0.55 / rows),
          r: Math.random() * 1.6 + 0.3,
          a: Math.random(),
          da: (Math.random() - 0.5) * 0.018,
          hue: Math.random() > 0.3 ? 0 : (Math.random() > 0.5 ? 50 : 280),
        });
      }
    }

    // 3 wide aurora strips
    // 8 nebula fogs
    const nebulae = [
      { x: W*0.15, y: H*0.12, r: W*0.3, c: "rgba(138,43,226,0.05)" },
      { x: W*0.5, y: H*0.05, r: W*0.35, c: "rgba(255,105,180,0.04)" },
      { x: W*0.8, y: H*0.1, r: W*0.28, c: "rgba(72,61,139,0.06)" },
      { x: W*0.35, y: H*0.02, r: W*0.32, c: "rgba(147,112,219,0.04)" },
      { x: W*0.65, y: H*0.15, r: W*0.24, c: "rgba(255,215,0,0.025)" },
      { x: W*0.9, y: H*0.06, r: W*0.22, c: "rgba(220,20,60,0.03)" },
      { x: W*0.05, y: H*0.2, r: W*0.26, c: "rgba(0,191,255,0.025)" },
      { x: W*0.45, y: H*0.08, r: W*0.28, c: "rgba(186,85,211,0.04)" },
    ];

    // Comets — 3 dynamic shooting stars with trails
    const comets = [
      { x: W*0.2, y: H*0.05, vx: 1.8 + Math.random() * 1.5, vy: 1.2 + Math.random() * 0.8, life: 0, maxLife: 80 + Math.random() * 60 },
      { x: W*0.7, y: H*0.02, vx: 2.0 + Math.random() * 1.5, vy: 0.8 + Math.random() * 0.6, life: 0, maxLife: 70 + Math.random() * 50, delay: 200 },
      { x: W*0.5, y: H*0.01, vx: 2.5 + Math.random() * 1.5, vy: 1.5 + Math.random() * 0.7, life: 0, maxLife: 60 + Math.random() * 40, delay: 350 },
    ];

    // 16 embers
    const embers = Array.from({ length: 16 }, () => ({
      x: Math.random() * W,
      y: H * 0.55 + Math.random() * H * 0.35,
      r: Math.random() * 2.5 + 0.5,
      vy: -(Math.random() * 0.8 + 0.3),
      vx: (Math.random() - 0.5) * 0.4,
      life: Math.random(),
      maxLife: 0.6 + Math.random() * 0.4,
      hue: 20 + Math.random() * 20,
    }));

    let frame = 0;
    let animId: number;

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, W, H);

      // Nebula fogs
      for (const n of nebulae) {
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
        grad.addColorStop(0, n.c);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H * 0.6);
      }

      // Aurora borealis — ribbon effect with curling bands
      for (let band = 0; band < 3; band++) {
        ctx.save();
        const baseY = H * 0.04 + band * H * 0.06;
        const ribbonGrad = ctx.createLinearGradient(0, baseY - 20, 0, baseY + 40);
        const colors = band === 0
          ? ["rgba(138,43,226,0)", "rgba(72,209,204,0.15)", "rgba(138,43,226,0.1)", "transparent"]
          : band === 1
            ? ["rgba(255,105,180,0)", "rgba(147,112,219,0.12)", "rgba(0,191,255,0.08)", "transparent"]
            : ["rgba(72,61,139,0)", "rgba(0,255,127,0.1)", "rgba(138,43,226,0.08)", "transparent"];
        ribbonGrad.addColorStop(0, colors[0]);
        ribbonGrad.addColorStop(0.3, colors[1]);
        ribbonGrad.addColorStop(0.7, colors[2]);
        ribbonGrad.addColorStop(1, colors[3]);
        ctx.fillStyle = ribbonGrad;
        ctx.beginPath();
        ctx.moveTo(-20, baseY - 10);
        for (let x = -20; x <= W + 20; x += 4) {
          const y = baseY + Math.sin(x * 0.006 + frame * 0.015 + band) * 30
            + Math.cos(x * 0.012 + frame * 0.02 + band * 2) * 18;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(W + 20, baseY + 50);
        ctx.lineTo(-20, baseY + 50);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Stars (unchanged)
      for (const s of stars) {
        s.a += s.da;
        if (s.a <= 0.1 || s.a >= 1) s.da *= -1;
        s.a = Math.max(0.1, Math.min(1, s.a));
        const alpha = 0.25 + s.a * 0.75;
        const color = s.hue === 0
          ? `rgba(255,255,255,${alpha})`
          : s.hue === 50
            ? `rgba(255,215,0,${alpha*0.7})`
            : `rgba(212,165,255,${alpha*0.7})`;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
        ctx.fill();
      }

      // Dynamic comets with trails
      for (const c of comets) {
        if (c.delay > 0) { c.delay--; continue; }
        c.life++;
        if (c.life > c.maxLife) {
          c.x = Math.random() * W * 0.9;
          c.y = 10 + Math.random() * H * 0.15;
          c.life = 0;
          c.maxLife = 60 + Math.random() * 50;
          c.vx = 1.5 + Math.random() * 2;
          c.vy = 1 + Math.random() * 1;
        }
        const progress = c.life / c.maxLife;
        const cx = c.x + c.vx * c.life;
        const cy = c.y + c.vy * c.life;
        // Trail
        const trailLen = 70;
        const angle = Math.atan2(c.vy, c.vx);
        for (let t = 0; t < trailLen; t+=3) {
          const tx = cx - Math.cos(angle) * t;
          const ty = cy - Math.sin(angle) * t;
          const ta = (1 - t/trailLen) * (1 - progress) * 0.5;
          ctx.fillStyle = `rgba(255,215,0,${ta})`;
          ctx.beginPath();
          ctx.arc(tx, ty, 1.5, 0, Math.PI*2);
          ctx.fill();
        }
        // Head
        ctx.fillStyle = `rgba(255,255,255,${(1-progress)*0.9})`;
        ctx.beginPath();
        ctx.arc(cx, cy, 2.5, 0, Math.PI*2);
        ctx.fill();
      }

      // Embers
      for (const e of embers) {
        e.x += e.vx;
        e.y += e.vy;
        e.life -= 0.002;
        if (e.life <= 0 || e.y < H*0.3) {
          e.x = Math.random() * W;
          e.y = H*0.55 + Math.random() * H*0.35;
          e.life = e.maxLife;
        }
        const alpha = Math.max(0, e.life/e.maxLife) * 0.6;
        ctx.fillStyle = `rgba(255,${100+e.hue},${20+e.hue*0.5},${alpha})`;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI*2);
        ctx.fill();
      }

      // Waves at bottom — animated sine waves
      for (let w = 0; w < 3; w++) {
        ctx.save();
        ctx.beginPath();
        const waveY = H * 0.68 + w * 22;
        ctx.moveTo(-10, H);
        for (let x = -10; x <= W + 10; x += 4) {
          const y = waveY + Math.sin(x * 0.008 + frame * 0.03 + w) * 14
            + Math.cos(x * 0.015 + frame * 0.05 + w * 1.5) * 8;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(W + 10, H);
        ctx.closePath();
        const waveAlpha = 0.08 - w * 0.02;
        ctx.fillStyle = `rgba(244,200,115,${waveAlpha})`;
        ctx.fill();
        ctx.restore();
      }

      // Horizon glow
      const hGlow = ctx.createLinearGradient(0, H*0.5, 0, H);
      hGlow.addColorStop(0, "transparent");
      hGlow.addColorStop(0.3, "rgba(244,200,115,0.08)");
      hGlow.addColorStop(0.6, "rgba(193,68,14,0.12)");
      hGlow.addColorStop(1, "rgba(244,200,115,0.3)");
      ctx.fillStyle = hGlow;
      ctx.fillRect(0, H*0.5, W, H*0.5);

      frame++;
      animId = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  useEffect(() => {
    const done = () => { setFade(true); setTimeout(() => setVisible(false), 700); };
    window.addEventListener("muse:ready", done, { once: true });
    const t = setTimeout(done, DURATION);
    return () => { window.removeEventListener("muse:ready", done); clearTimeout(t); };
  }, []);

  if (!visible) return null;

  // 35 sprites evenly spaced across full page using CSS grid
  const sprites = Array.from({ length: 35 }, (_, i) => ({
    row: Math.floor(i / 7),
    col: i % 7,
    char: ["✦","✧","⋆","·","◆","◈","✶","⭑"][i % 8],
    size: 8 + (i % 4) * 3,
    delay: (i * 0.08) % 2,
    duration: 2.5 + (i % 3) * 1.5,
  }));

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      transition: "opacity .7s cubic-bezier(.4,0,.2,1)",
      opacity: fade ? 0 : 1, pointerEvents: fade ? "none" : "auto", overflow: "hidden",
    }}>
      {/* Sunset gradient */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        background: "linear-gradient(180deg, #0a0612 0%, #1a0f2e 15%, #2d1b4e 30%, #4a1942 45%, #8b2252 55%, #c1440e 70%, #e8a040 85%, #f4c873 100%)",
      }} />

      {/* Canvas */}
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 2 }} />

      {/* Evenly dispersed sprites grid */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none",
        display: "grid", gridTemplateColumns: "repeat(7,1fr)", gridTemplateRows: "repeat(5,1fr)",
      }}>
        {sprites.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{
              fontSize: s.size, opacity: 0,
              color: i%4===0?"#FFD700":i%4===1?"#D4A5FF":i%4===2?"#FF8A80":"rgba(255,255,255,0.5)",
              animation: `sprIn ${s.duration}s ease-in-out ${s.delay}s forwards, sprFloat ${s.duration}s ease-in-out ${s.delay}s infinite`,
            }}>{s.char}</span>
          </div>
        ))}
      </div>

      {/* Logo */}
      <div style={{ position: "relative", zIndex: 4, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{
          fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 80, fontWeight: 900, letterSpacing: -2,
          background: "linear-gradient(120deg,#FFD700,#FFBF00,#FF6B6B,#D4A5FF,#FF8C69,#FFD700)",
          backgroundSize: "300% 300%",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          filter: "drop-shadow(0 2px 16px rgba(255,215,0,0.45))",
          animation: "fontLava 7s ease-in-out infinite, fontIn 0.6s ease-out",
          marginBottom: 2,
        }}>Muse</div>
        <div style={{
          fontSize: 10, fontWeight: 600, letterSpacing: 4, color: "rgba(255,255,255,0.45)", textTransform: "uppercase",
          marginBottom: 36, animation: "fontFadeUp 0.8s 0.3s ease-out both",
        }}>Creative Professional Network</div>
        <div style={{ display: "flex", gap: 14, animation: "fontFadeUp 0.8s 0.6s ease-out both" }}>
          {[0,1,2].map(i=>(
            <div key={i} style={{ width: 10, height: 10, borderRadius: "50%",
              background: i===0?"#FFD700":i===1?"#FF8A80":"#D4A5FF",
              animation: `fontDot 1.6s ease-in-out ${i*0.25}s infinite`,
            }}/>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes fontLava { 0%{background-position:0 50%} 50%{background-position:100% 50%} 100%{background-position:0 50%} }
        @keyframes fontIn { from{opacity:0;transform:translateY(16px) scale(0.92)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes fontFadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fontDot { 0%,100%{transform:scale(1);opacity:0.3} 50%{transform:scale(2.2);opacity:1} }
        @keyframes sprIn { from{opacity:0;transform:scale(0) translateY(10px)} to{opacity:0.4;transform:scale(1) translateY(0)} }
        @keyframes sprFloat { 0%,100%{transform:translateY(0) scale(1);opacity:0.3} 50%{transform:translateY(-10px) scale(1.2);opacity:0.6} }
      `}</style>
    </div>
  );
}
