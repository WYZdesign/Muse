"use client";

import { useState, useEffect, useRef } from "react";

const SPRITES = ["✦", "✧", "⋆", "·", "◆", "◈", "✶", "⭑"];
const DURATION = 3800; // Fixed 3.8s scene, not tied to load time

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fade, setFade] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw nebula + stars on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth || 414;
    canvas.height = canvas.offsetHeight || 896;

    const stars: { x: number; y: number; r: number; a: number; da: number }[] = [];
    for (let i = 0; i < 100; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.5,
        r: Math.random() * 2 + 0.3,
        a: Math.random(),
        da: (Math.random() - 0.5) * 0.02,
      });
    }

    const nebulaColors = [
      { x: canvas.width * 0.2, y: canvas.height * 0.1, r: canvas.width * 0.4, c: "rgba(138,43,226,0.07)" },
      { x: canvas.width * 0.7, y: canvas.height * 0.06, r: canvas.width * 0.3, c: "rgba(255,105,180,0.06)" },
      { x: canvas.width * 0.5, y: canvas.height * 0.03, r: canvas.width * 0.45, c: "rgba(72,61,139,0.08)" },
      { x: canvas.width * 0.85, y: canvas.height * 0.18, r: canvas.width * 0.22, c: "rgba(255,215,0,0.04)" },
    ];

    let frame = 0;
    let animId: number;

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const n of nebulaColors) {
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
        grad.addColorStop(0, n.c);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height * 0.55);
      }

      for (const s of stars) {
        s.a += s.da;
        if (s.a <= 0.1 || s.a >= 1) s.da *= -1;
        s.a = Math.max(0.1, Math.min(1, s.a));
        ctx.fillStyle = `rgba(255,255,255,${0.25 + s.a * 0.75})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (frame % 90 < 45) {
        const cx = ((frame * 2) % canvas.width);
        const cy = 25 + Math.sin(frame * 0.015) * 35;
        const cg = ctx.createLinearGradient(cx, cy, cx + 90, cy);
        cg.addColorStop(0, "rgba(255,215,0,0.25)");
        cg.addColorStop(1, "transparent");
        ctx.fillStyle = cg;
        ctx.fillRect(cx - 70, cy - 1.5, 90, 3);
      }

      frame++;
      animId = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  // Fixed-duration scene: always 3.8s regardless of load
  useEffect(() => {
    const appReady = () => {
      setFade(true);
      setTimeout(() => setVisible(false), 700);
    };
    window.addEventListener("muse:ready", appReady, { once: true });
    // Minimum 3.8s, then dismiss even if app isn't ready yet
    const timer = setTimeout(() => {
      if (!document.hidden) appReady();
    }, DURATION);
    return () => {
      window.removeEventListener("muse:ready", appReady);
      clearTimeout(timer);
    };
  }, []);

  if (!visible) return null;

  const sprites = Array.from({ length: 20 }, (_, i) => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    char: SPRITES[i % SPRITES.length],
    size: 7 + Math.random() * 16,
    delay: Math.random() * 2,
    duration: 2.5 + Math.random() * 3.5,
    opacity: 0.15 + Math.random() * 0.5,
  }));

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transition: "opacity .7s cubic-bezier(.4,0,.2,1)",
        opacity: fade ? 0 : 1,
        pointerEvents: fade ? "none" : "auto",
        overflow: "hidden",
      }}
    >
      {/* California sunset gradient background */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        background: "linear-gradient(180deg, #0a0612 0%, #1a0f2e 15%, #2d1b4e 30%, #4a1942 45%, #8b2252 55%, #c1440e 70%, #e8a040 85%, #f4c873 100%)",
      }} />

      {/* Horizon line glow */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: "20%", zIndex: 1,
        background: "linear-gradient(0deg, rgba(244,200,115,0.55) 0%, rgba(193,68,14,0.2) 50%, transparent 100%)",
      }} />

      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, zIndex: 2 }} />

      {/* Floating sprites */}
      <div style={{ position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none" }}>
        {sprites.map((s, i) => (
          <span
            key={i}
            style={{
              position: "absolute", left: `${s.x}%`, top: `${s.y}%`,
              fontSize: s.size,
              color: i % 4 === 0 ? "#FFD700" : i % 4 === 1 ? "#D4A5FF" : i % 4 === 2 ? "#FF8A80" : "rgba(255,255,255,0.5)",
              opacity: 0, animation: `spriteIn ${s.duration}s ease-in-out ${s.delay}s forwards,spriteFloat ${s.duration}s ease-in-out ${s.delay}s infinite`,
            }}
          >
            {s.char}
          </span>
        ))}
      </div>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 4, display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* Muse logo — same font + gradient animation as discover page hero */}
        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontStyle: "italic",
          fontSize: 80,
          fontWeight: 900,
          letterSpacing: -2,
          background: "linear-gradient(120deg,var(--gold,#FFD700),var(--amber,#FFBF00),var(--pink,#FF6B6B),var(--lavender,#D4A5FF),var(--sunset-orange,#FF8C69),var(--gold,#FFD700))",
          backgroundSize: "300% 300%",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          filter: "drop-shadow(0 2px 16px rgba(255,215,0,0.45))",
          animation: "lavaFlow 7s ease-in-out infinite, logoIn 0.6s ease-out",
          marginBottom: 2,
        }}>
          Muse
        </div>

        <div style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: 4,
          color: "rgba(255,255,255,0.45)",
          textTransform: "uppercase",
          marginBottom: 36,
          animation: "fadeUp 0.8s 0.3s ease-out both",
        }}>
          Creative Professional Network
        </div>

        <div style={{ display: "flex", gap: 12, animation: "fadeUp 0.8s 0.6s ease-out both" }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: i === 0 ? "#FFD700" : i === 1 ? "#FF8A80" : "#D4A5FF",
                animation: `dotPulse 1.6s ease-in-out ${i * 0.25}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spriteIn { from { opacity: 0; transform: scale(0) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes spriteFloat { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-14px) scale(1.25); } }
        @keyframes lavaFlow { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes logoIn { from { opacity: 0; transform: translateY(16px) scale(0.92); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes dotPulse { 0%,100% { transform: scale(1); opacity: 0.35; } 50% { transform: scale(2); opacity: 1; } }
      `}</style>
    </div>
  );
}
