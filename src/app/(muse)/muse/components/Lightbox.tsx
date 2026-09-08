"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";

type Props = {
  photos: string[];
  idx: number;
  onClose: () => void;
  onNavigate: (idx: number) => void;
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
};

export default function Lightbox({ photos, idx, onClose, onNavigate, onError }: Props) {
  const [zoomed, setZoomed] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const lastTap = useRef(0);

  const goPrev = useCallback(() => {
    onNavigate((idx - 1 + photos.length) % photos.length);
  }, [idx, photos.length, onNavigate]);

  const goNext = useCallback(() => {
    onNavigate((idx + 1) % photos.length);
  }, [idx, photos.length, onNavigate]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "f" || e.key === "F") {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen?.();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, goPrev, goNext]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) goNext();
      else goPrev();
    }
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      setZoomed(z => !z);
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  };

  const handleShare = async () => {
    const url = photos[idx];
    if (navigator.share) {
      try { await navigator.share({ url, title: "Photo from Muse" }); } catch {}
    } else {
      try { await navigator.clipboard.writeText(url); } catch {}
    }
  };

  const handleDownload = async () => {
    const url = photos[idx];
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `muse-photo-${idx + 1}.jpg`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {}
  };

  return (
    <div
      role="presentation"
      aria-hidden="true"
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.95)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button onClick={(e) => { e.stopPropagation(); onClose(); }} aria-label="Close" style={{ position: "absolute", top: 16, right: 16, zIndex: 2, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontSize: 18 }}>✕</button>
      {photos.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); goPrev(); }} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", zIndex: 2, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontSize: 22 }}>‹</button>
          <button onClick={(e) => { e.stopPropagation(); goNext(); }} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", zIndex: 2, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontSize: 22 }}>›</button>
        </>
      )}
      <div
        onClick={(e) => { e.stopPropagation(); handleDoubleTap(); }}
        style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <Image
          src={photos[idx] || photos[0]}
          alt="Photo"
          fill
          sizes="100vw"
          style={{ objectFit: "contain", transform: zoomed ? "scale(2)" : "scale(1)", transition: "transform 0.2s" }}
          onClick={(e) => e.stopPropagation()}
          onError={onError}
          unoptimized
        />
      </div>
      <div style={{ position: "absolute", bottom: 20, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>{idx + 1} / {photos.length}</div>
        <button onClick={(e) => { e.stopPropagation(); handleShare(); }} aria-label="Share" style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontSize: 14 }}>↗</button>
        <button onClick={(e) => { e.stopPropagation(); handleDownload(); }} aria-label="Download" style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontSize: 14 }}>↓</button>
      </div>
    </div>
  );
}