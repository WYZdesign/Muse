"use client";

import { useState, useEffect } from "react";

const QUOTES = [
  "Where creatives connect",
  "Your next collaboration starts here",
  "Find your creative match",
  "Book. Create. Inspire.",
];

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fade, setFade] = useState(false);
  const [quote, setQuote] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setQuote((q) => (q + 1) % QUOTES.length), 3000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onLoaded = () => {
      setFade(true);
      setTimeout(() => setVisible(false), 500);
    };
    // Wait until real session resolution (not just hydrate)
    window.addEventListener("muse:ready", onLoaded, { once: true });
    // Fallback: hide after 10s max if session never resolves
    const fallback = setTimeout(onLoaded, 10000);
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
        background: "radial-gradient(ellipse at 50% 40%, #1a0f2e 0%, #0a0612 60%)",
        transition: "opacity .5s ease",
        opacity: fade ? 0 : 1,
        pointerEvents: fade ? "none" : "auto",
      }}
    >
      {/* Ambient background dots */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        {Array.from({ length: 40 }, (_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: 2 + Math.random() * 3,
              height: 2 + Math.random() * 3,
              borderRadius: "50%",
              background: i % 3 === 0 ? "#FFD700" : i % 3 === 1 ? "#D4A5FF" : "rgba(255,255,255,0.3)",
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `splashFloat ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Logo */}
      <div
        style={{
          fontSize: 56,
          fontWeight: 800,
          letterSpacing: -2,
          background: "linear-gradient(135deg, #FFD700 0%, #FF8A80 50%, #D4A5FF 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: 8,
          animation: "splashPulse 2s ease-in-out infinite",
        }}
      >
        Muse
      </div>

      {/* Tagline */}
      <div
        style={{
          fontSize: 13,
          color: "rgba(255,255,255,0.4)",
          marginBottom: 32,
          minHeight: 20,
          textAlign: "center",
          transition: "opacity .3s ease",
        }}
      >
        {QUOTES[quote]}
      </div>

      {/* Loading bar */}
      <div
        style={{
          width: 120,
          height: 3,
          borderRadius: 2,
          background: "rgba(255,255,255,0.06)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            width: "40%",
            borderRadius: 2,
            background: "linear-gradient(90deg, #FFD700, #D4A5FF, #FFD700)",
            animation: "splashBar 1.5s ease-in-out infinite",
          }}
        />
      </div>

      <style>{`
        @keyframes splashFloat {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.6; }
          50% { transform: translateY(-12px) scale(1.2); opacity: 1; }
        }
        @keyframes splashPulse {
          0%, 100% { opacity: 1; filter: brightness(1); }
          50% { opacity: 0.85; filter: brightness(1.1); }
        }
        @keyframes splashBar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
}
