"use client";

import { useState, useEffect, useRef } from "react";

const SPRITES = ["✦", "✧", "⋆", "·", "◆", "◈", "✶", "⭑"];
const TAGLINES = [
  "Where creatives connect",
  "Your next collaboration starts here",
  "Find your creative match",
  "Book. Create. Inspire.",
  "Real connections. Real work.",
];

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fade, setFade] = useState(false);
  const [tagline, setTagline] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Cycle taglines
  useEffect(() => {
    const id = setInterval(() => setTagline((q) => (q + 1) % TAGLINES.length), 3500);
    return () => clearInterval(id);
  }, []);

  // Draw nebula + stars on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const stars: { x: number; y: number; r: number; a: number; da: number }[] = [];
    for (let i = 0; i < 80; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.55, // upper half
        r: Math.random() * 1.8 + 0.3,
        a: Math.random(),
        da: (Math.random() - 0.5) * 0.015,
      });
    }

    // Nebula layers
    const nebulaColors = [
      { x: canvas.width * 0.2, y: canvas.height * 0.15, r: canvas.width * 0.35, c: "rgba(138,43,226,0.06)" },
      { x: canvas.width * 0.7, y: canvas.height * 0.08, r: canvas.width * 0.28, c: "rgba(255,105,180,0.05)" },
      { x: canvas.width * 0.5, y: canvas.height * 0.05, r: canvas.width * 0.4, c: "rgba(72,61,139,0.07)" },
      { x: canvas.width * 0.85, y: canvas.height * 0.22, r: canvas.width * 0.2, c: "rgba(255,215,0,0.03)" },
    ];

    let frame = 0;
    let animId: number;

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Nebula
      for (const n of nebulaColors) {
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
        grad.addColorStop(0, n.c);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height * 0.6);
      }

      // Stars
      for (const s of stars) {
        s.a += s.da;
        if (s.a <= 0 || s.a >= 1) s.da *= -1;
        ctx.fillStyle = `rgba(255,255,255,${0.3 + s.a * 0.7})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Comet trail
      if (frame % 120 < 60) {
        const cx = ((frame * 1.5) % canvas.width);
        const cy = 20 + Math.sin(frame * 0.02) * 30;
        const cg = ctx.createLinearGradient(cx, cy, cx + 80, cy);
        cg.addColorStop(0, "rgba(255,215,0,0.2)");
        cg.addColorStop(1, "transparent");
        ctx.fillStyle = cg;
        ctx.fillRect(cx - 60, cy - 1, 80, 3);
      }

      frame++;
      animId = requestAnimationFrame(draw);
    }

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    draw();

    return () => cancelAnimationFrame(animId);
  }, []);

  // Sprites
  const sprites = useRef(
    Array.from({ length: 18 }, (_, i) => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      char: SPRITES[i % SPRITES.length],
      size: 8 + Math.random() * 14,
      delay: Math.random() * 3,
      duration: 3 + Math.random() * 4,
      opacity: 0.2 + Math.random() * 0.5,
    }))
  );

  // Wait for session resolution
  useEffect(() => {
    const onLoaded = () => {
      setFade(true);
      setTimeout(() => setVisible(false), 600);
    };
    window.addEventListener("muse:ready", onLoaded, { once: true });
    const fallback = setTimeout(onLoaded, 12000);
    return () => {
      window.removeEventListener("muse:ready", onLoaded);
      clearTimeout(fallback);
    };
  }, []);

  if (!visible) return null;

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
        transition: "opacity .6s cubic-bezier(.4,0,.2,1)",
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
        position: "absolute", bottom: 0, left: 0, right: 0, height: "18%", zIndex: 1,
        background: "linear-gradient(0deg, rgba(244,200,115,0.5) 0%, rgba(193,68,14,0.15) 50%, transparent 100%)",
      }} />

      {/* Nebula + stars canvas */}
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, zIndex: 2 }} />

      {/* Floating sprites */}
      <div style={{ position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none" }}>
        {sprites.current.map((s, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              left: `${s.x}%`,
              top: `${s.y}%`,
              fontSize: s.size,
              color: i % 4 === 0 ? "#FFD700" : i % 4 === 1 ? "#D4A5FF" : i % 4 === 2 ? "#FF8A80" : "rgba(255,255,255,0.6)",
              opacity: s.opacity,
              animation: `spriteFloat ${s.duration}s ease-in-out ${s.delay}s infinite`,
            }}
          >
            {s.char}
          </span>
        ))}
      </div>

      {/* Content */}
      <div style={{
        position: "relative", zIndex: 4,
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        {/* Muse logo text */}
        <div style={{
          fontSize: 72,
          fontWeight: 900,
          letterSpacing: -3,
          background: "linear-gradient(180deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          filter: "drop-shadow(0 2px 12px rgba(255,215,0,0.4))",
          animation: "logoIn 1s ease-out",
          marginBottom: 4,
        }}>
          Muse
        </div>

        {/* Subtitle */}
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 3,
          color: "rgba(255,255,255,0.5)",
          textTransform: "uppercase",
          marginBottom: 28,
        }}>
          Creative Professional Network
        </div>

        {/* Tagline */}
        <div style={{
          fontSize: 13,
          color: "rgba(255,255,255,0.35)",
          minHeight: 20,
          textAlign: "center",
          transition: "opacity .4s ease",
          marginBottom: 36,
        }}>
          {TAGLINES[tagline]}
        </div>

        {/* Loading indicator — animated dots */}
        <div style={{ display: "flex", gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: i === 0 ? "#FFD700" : i === 1 ? "#FF8A80" : "#D4A5FF",
                animation: `dotPulse 1.4s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spriteFloat {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.2; }
          50% { transform: translateY(-16px) scale(1.3); opacity: 0.7; }
        }
        @keyframes logoIn {
          from { opacity: 0; transform: translateY(20px) scale(0.9); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes dotPulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.8); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
