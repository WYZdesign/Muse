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

    canvas.width = canvas.offsetWidth || 414;
    canvas.height = canvas.offsetHeight || 896;
    const W = canvas.width;
    const H = canvas.height;

    // --- 130 evenly-spaced stars (match BackgroundScene) ---
    const stars: { x: number; y: number; r: number; a: number; da: number; hue: number }[] = [];
    for (let i = 0; i < 130; i++) {
      stars.push({
        x: (i % 13) * (W / 12) + (Math.random() - 0.5) * 30,
        y: Math.floor(i / 13) * (H * 0.45 / 10) + Math.random() * (H * 0.45 / 10),
        r: Math.random() * 1.6 + 0.3,
        a: Math.random(),
        da: (Math.random() - 0.5) * 0.018,
        hue: Math.random() > 0.3 ? 0 : (Math.random() > 0.5 ? 50 : 280),
      });
    }

    // --- 3 wide aurora strips (horizontally spread) ---
    const auroras = [
      { y: H * 0.08, w: W * 1.2, h: H * 0.18, colors: ["rgba(138,43,226,0.07)", "rgba(75,0,130,0.03)", "transparent"] },
      { y: H * 0.18, w: W * 1.1, h: H * 0.13, colors: ["rgba(255,105,180,0.05)", "rgba(147,112,219,0.02)", "transparent"] },
      { y: H * 0.04, w: W * 1.3, h: H * 0.15, colors: ["rgba(72,61,139,0.08)", "rgba(25,25,112,0.03)", "transparent"] },
    ];

    // --- 8 nebula fogs ---
    const nebulae = [
      { x: W * 0.15, y: H * 0.12, r: W * 0.28, c: "rgba(138,43,226,0.05)" },
      { x: W * 0.5, y: H * 0.05, r: W * 0.32, c: "rgba(255,105,180,0.04)" },
      { x: W * 0.8, y: H * 0.1, r: W * 0.25, c: "rgba(72,61,139,0.06)" },
      { x: W * 0.35, y: H * 0.02, r: W * 0.3, c: "rgba(147,112,219,0.04)" },
      { x: W * 0.65, y: H * 0.15, r: W * 0.22, c: "rgba(255,215,0,0.025)" },
      { x: W * 0.9, y: H * 0.06, r: W * 0.2, c: "rgba(220,20,60,0.03)" },
      { x: W * 0.05, y: H * 0.2, r: W * 0.24, c: "rgba(0,191,255,0.025)" },
      { x: W * 0.45, y: H * 0.08, r: W * 0.26, c: "rgba(186,85,211,0.04)" },
    ];

    // --- 16 ember particles ---
    const embers = Array.from({ length: 16 }, () => ({
      x: Math.random() * W,
      y: H * 0.55 + Math.random() * H * 0.35,
      r: Math.random() * 2.5 + 0.5,
      vy: -(Math.random() * 0.8 + 0.3),
      vx: (Math.random() - 0.5) * 0.3,
      life: Math.random(),
      maxLife: 0.6 + Math.random() * 0.4,
      hue: 20 + Math.random() * 20,
    }));

    // --- 35 sparkle particles (evenly spread across entire page) ---
    const sparkles = Array.from({ length: 35 }, (_, i) => ({
      x: (i % 7) * (W / 6) + (Math.random() - 0.5) * 40,
      y: Math.floor(i / 7) * (H / 5) + Math.random() * (H / 5),
      r: Math.random() * 1.5 + 0.3,
      phase: Math.random() * Math.PI * 2,
      speed: 0.02 + Math.random() * 0.04,
      hue: Math.random() > 0.5 ? 50 : 280,
    }));

    let frame = 0;
    let animId: number;

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, W, H);

      // Nebula fogs (low opacity, dreamy)
      for (const n of nebulae) {
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
        grad.addColorStop(0, n.c);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H * 0.55);
      }

      // Aurora strips (horizontally spread)
      for (const a of auroras) {
        const grad = ctx.createRadialGradient(W * 0.5, a.y, 0, W * 0.5, a.y, a.w);
        grad.addColorStop(0, a.colors[0]);
        grad.addColorStop(0.6, a.colors[1]);
        grad.addColorStop(1, a.colors[2]);
        ctx.fillStyle = grad;
        ctx.fillRect(a.w * -0.1, a.y - a.h * 0.3, a.w, a.h);
      }

      // Stars (evenly spaced, twinkling)
      for (const s of stars) {
        s.a += s.da;
        if (s.a <= 0.1 || s.a >= 1) s.da *= -1;
        s.a = Math.max(0.1, Math.min(1, s.a));
        const color = s.hue === 0
          ? `rgba(255,255,255,${0.25 + s.a * 0.75})`
          : s.hue === 50
            ? `rgba(255,215,0,${0.2 + s.a * 0.5})`
            : `rgba(212,165,255,${0.2 + s.a * 0.5})`;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Sparkles (evenly spaced, pulsing)
      for (const s of sparkles) {
        const alpha = 0.3 + Math.sin(frame * s.speed + s.phase) * 0.5;
        const color = s.hue === 50
          ? `rgba(255,215,0,${alpha})`
          : `rgba(255,255,255,${alpha * 0.7})`;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        // Glow halo
        ctx.fillStyle = color.replace(/[\d.]+\)$/, `${alpha * 0.3})`);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Embers (rising from horizon)
      for (const e of embers) {
        e.x += e.vx;
        e.y += e.vy;
        e.life -= 0.002;
        if (e.life <= 0 || e.y < H * 0.3) {
          e.x = Math.random() * W;
          e.y = H * 0.55 + Math.random() * H * 0.35;
          e.life = e.maxLife;
        }
        const alpha = Math.max(0, e.life / e.maxLife) * 0.6;
        ctx.fillStyle = `rgba(255,${100 + e.hue},${20 + e.hue * 0.5},${alpha})`;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Comet trail
      if (frame % 70 < 30) {
        const cx = ((frame * 2.5) % W);
        const cy = 25 + Math.sin(frame * 0.012) * 40;
        const cg = ctx.createLinearGradient(cx, cy, cx + 100, cy);
        cg.addColorStop(0, "rgba(255,215,0,0.3)");
        cg.addColorStop(1, "transparent");
        ctx.fillStyle = cg;
        ctx.fillRect(cx - 80, cy - 1.5, 100, 3);
      }

      // Horizon glow (wave effect — higher, more spread)
      const hGlow = ctx.createLinearGradient(0, H * 0.5, 0, H);
      hGlow.addColorStop(0, "transparent");
      hGlow.addColorStop(0.3, "rgba(244,200,115,0.08)");
      hGlow.addColorStop(0.6, "rgba(193,68,14,0.12)");
      hGlow.addColorStop(1, "rgba(244,200,115,0.3)");
      ctx.fillStyle = hGlow;
      ctx.fillRect(0, H * 0.5, W, H * 0.5);

      frame++;
      animId = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  useEffect(() => {
    const done = () => { setFade(true); setTimeout(() => setVisible(false), 700); };
    window.addEventListener("muse:ready", done, { once: true });
    const t = setTimeout(done, DURATION);
    return () => { window.removeEventListener("muse:ready", done); clearTimeout(t); };
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        transition: "opacity .7s cubic-bezier(.4,0,.2,1)",
        opacity: fade ? 0 : 1, pointerEvents: fade ? "none" : "auto", overflow: "hidden",
      }}
    >
      {/* Sunset gradient background */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        background: "linear-gradient(180deg, #0a0612 0%, #1a0f2e 15%, #2d1b4e 30%, #4a1942 45%, #8b2252 55%, #c1440e 70%, #e8a040 85%, #f4c873 100%)",
      }} />

      {/* Canvas: stars + nebula + aurora + sparkles + embers + comet + horizon */}
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, zIndex: 2 }} />

      {/* Centered content */}
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
          fontSize: 10, fontWeight: 600, letterSpacing: 4,
          color: "rgba(255,255,255,0.45)", textTransform: "uppercase",
          marginBottom: 36, animation: "fontFadeUp 0.8s 0.3s ease-out both",
        }}>Creative Professional Network</div>
        <div style={{ display: "flex", gap: 14, animation: "fontFadeUp 0.8s 0.6s ease-out both" }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: "50%",
              background: i === 0 ? "#FFD700" : i === 1 ? "#FF8A80" : "#D4A5FF",
              animation: `fontDot 1.6s ease-in-out ${i * 0.25}s infinite`,
            }} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes fontLava { 0%{background-position:0 50%} 50%{background-position:100% 50%} 100%{background-position:0 50%} }
        @keyframes fontIn { from{opacity:0;transform:translateY(16px) scale(0.92)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes fontFadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fontDot { 0%,100%{transform:scale(1);opacity:0.3} 50%{transform:scale(2.2);opacity:1} }
      `}</style>
    </div>
  );
}
