"use client";

import { useState, useEffect, useRef } from "react";

const DURATION = 3000;

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

    // 60 stars (was 130) — less heat
    const cols = 10, rows = 6;
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
      { x: W*0.2, y: H*0.05, vx: 1.8, vy: 1.2, life: 0, maxLife: 80 },
      { x: W*0.7, y: H*0.02, vx: 2.0, vy: 0.8, life: 0, maxLife: 70, delay: 250 },
    ];

    // 16 embers
    const embers = Array.from({ length: 8 }, () => ({
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

      // Soft haze clouds — wide radial gradients drifting slowly at top
      const hazeLayers = [
        { x: W * 0.25, y: H * 0.06, r: W * 0.45, c1: "rgba(72,209,204,0.06)", c2: "transparent", vx: 0.15 },
        { x: W * 0.65, y: H * 0.04, r: W * 0.4, c1: "rgba(138,43,226,0.05)", c2: "transparent", vx: -0.12 },
        { x: W * 0.45, y: H * 0.09, r: W * 0.5, c1: "rgba(255,105,180,0.04)", c2: "transparent", vx: 0.1 },
        { x: W * 0.8, y: H * 0.03, r: W * 0.35, c1: "rgba(0,191,255,0.05)", c2: "transparent", vx: -0.18 },
        { x: W * 0.1, y: H * 0.07, r: W * 0.38, c1: "rgba(147,112,219,0.04)", c2: "transparent", vx: 0.13 },
      ];
      for (const hz of hazeLayers) {
        const cx = (hz.x + frame * hz.vx + W) % W;
        const grad = ctx.createRadialGradient(cx, hz.y, 0, cx, hz.y, hz.r);
        grad.addColorStop(0, hz.c1);
        grad.addColorStop(1, hz.c2);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H * 0.35);
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
        if ((c.delay || 0) > 0) { c.delay!--; continue; }
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

      // Horizon glow — warm sand meeting ocean
      const hGlow = ctx.createLinearGradient(0, H*0.62, 0, H);
      hGlow.addColorStop(0, "transparent");
      hGlow.addColorStop(0.3, "rgba(20,180,200,0.08)");
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
      {/* Beach scene: sand → ocean → horizon → galaxy */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        background: "linear-gradient(180deg, #0a0612 0%, #1a0f2e 12%, #2d1b4e 25%, #1a3a5c 38%, #0d7377 50%, #14a3a8 58%, #0d7377 65%, #1a8a9e 72%, #d4a76a 88%, #c4956a 94%, #a67c52 100%)",
      }} />

      {/* Canvas */}
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 2 }} />

      {/* Layered ocean waves — matches the landing promo page */}
      <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "100%", zIndex: 2, pointerEvents: "none" }}>
        <svg className="splash-waves-svg" viewBox="0 0 1440 360" preserveAspectRatio="none" aria-hidden="true">
          <path className="swv swv-6" d="M0,10 C240,50 480,-10 720,30 C960,70 1200,0 1440,20 L1440,360 L0,360 Z" />
          <path className="swv swv-7" d="M0,35 C180,80 400,10 600,55 C800,90 1040,20 1240,60 C1360,75 1420,40 1440,50 L1440,360 L0,360 Z" />
          <path className="swv swv-8" d="M0,60 C220,20 460,90 700,40 C940,0 1180,80 1440,55 L1440,360 L0,360 Z" />
          <path className="swv swv-1" d="M0,120 C200,30 360,180 540,110 C720,40 900,160 1100,70 C1280,-10 1380,140 1440,110 L1440,360 L0,360 Z" />
          <path className="swv swv-2" d="M0,150 C160,240 320,80 480,180 C640,260 800,100 980,190 C1160,270 1320,110 1440,170 L1440,360 L0,360 Z" />
          <path className="swv swv-3" d="M0,190 C220,100 440,260 660,160 C880,80 1100,240 1300,130 C1380,90 1420,160 1440,180 L1440,360 L0,360 Z" />
          <path className="swv swv-4" d="M0,225 C180,310 380,150 580,240 C780,320 980,170 1180,260 C1320,310 1400,210 1440,235 L1440,360 L0,360 Z" />
          <path className="swv swv-5" d="M0,260 C260,170 520,310 780,220 C1040,150 1260,290 1440,240 L1440,360 L0,360 Z" />
        </svg>
      </div>

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
        .splash-waves-svg{position:absolute;bottom:0;left:-8%;width:116%;height:100%;display:block}
        .splash-waves-svg .swv{transform-origin:center bottom;will-change:transform}
        .swv-1{fill:rgba(30,195,215,0.48);animation:swave1 6.2s ease-in-out infinite alternate}
        .swv-2{fill:rgba(18,155,182,0.56);animation:swave2 8.4s ease-in-out infinite -2.1s alternate}
        .swv-3{fill:rgba(12,122,155,0.64);animation:swave3 7.0s ease-in-out infinite -4.3s alternate}
        .swv-4{fill:rgba(8,92,128,0.72);animation:swave4 9.8s ease-in-out infinite -1.5s alternate}
        .swv-5{fill:rgba(6,60,96,0.85);animation:swave5 11.2s ease-in-out infinite -3.8s alternate}
        .swv-6{fill:rgba(30,195,215,0.3);animation:swave6 12s ease-in-out infinite alternate}
        .swv-7{fill:rgba(18,155,182,0.22);animation:swave7 10s ease-in-out infinite -3s alternate}
        .swv-8{fill:rgba(12,122,155,0.16);animation:swave8 8.8s ease-in-out infinite -5s alternate}
        @keyframes swave1{0%{transform:translateY(-18px) scaleY(1)}50%{transform:translateY(8px) scaleY(0.92)}100%{transform:translateY(16px) scaleY(1.08)}}
        @keyframes swave2{0%{transform:translateY(20px) scaleY(0.94)}50%{transform:translateY(-14px) scaleY(1.12)}100%{transform:translateY(-26px) scaleY(1.02)}}
        @keyframes swave3{0%{transform:translateY(-22px) scaleY(1.05)}50%{transform:translateY(16px) scaleY(0.9)}100%{transform:translateY(24px) scaleY(1.14)}}
        @keyframes swave4{0%{transform:translateY(24px) scaleY(0.92)}50%{transform:translateY(-18px) scaleY(1.08)}100%{transform:translateY(-32px) scaleY(1.04)}}
        @keyframes swave5{0%{transform:translateY(-14px) scaleY(1)}50%{transform:translateY(12px) scaleY(0.96)}100%{transform:translateY(18px) scaleY(1.06)}}
        @keyframes swave6{0%{transform:translateY(-12px) scaleY(1)}50%{transform:translateY(10px) scaleY(0.94)}100%{transform:translateY(14px) scaleY(1.06)}}
        @keyframes swave7{0%{transform:translateY(10px) scaleY(0.96)}50%{transform:translateY(-12px) scaleY(1.08)}100%{transform:translateY(-16px) scaleY(1.02)}}
        @keyframes swave8{0%{transform:translateY(-8px) scaleY(1.02)}50%{transform:translateY(6px) scaleY(0.96)}100%{transform:translateY(10px) scaleY(1.04)}}
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
