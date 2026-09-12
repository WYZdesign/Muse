"use client";
import { useEffect, useRef, useMemo } from "react";
import { ensureDeviceTiltActive, getDeviceTilt } from "../hooks/useDeviceTilt";

const PC = ["#FFD700","#FF6B6B","#D4A5FF","#98FB98","#FFDAB9","#87CEEB","#FF8A80","#FFD1A4","#FFB5C2","#FFE4B5","#FF9A56","#E6E6FA"];

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function BackgroundScene({ flash, paused = false }: { flash: string | null; paused?: boolean }) {
  const cometRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);

  const starPos = useMemo(() => Array.from({length:39}, (_,i) => ({
    l:`${(i*7.3+3.1)%100}%`, t:`${(i*11.7+5.8)%35}%`, d:`${2+(i*3.7)%6}s`, dl:`${(i*1.9)%10}s`
  })), []);

  const spPos = useMemo(() => Array.from({length:7}, (_,i) => ({
    l:`${(i*13.7+2.1)%100}%`, t:`${(i*9.3+4.5)%25}%`, d:`${5+(i*5.3)%8}s`, dl:`${(i*2.3)%10}s`,
    c:['#FFD700','#FFB5C2','#D4A5FF','#FFDAB9','#98FB98','#87CEEB','#FF8A80','#FFD1A4','#FFB5C2','#FFE4B5','#FF9A56','#E6E6FA','#FFD700','#FF6B6B','#D4A5FF'][i%15]
  })), []);

  const emPos = useMemo(() => Array.from({length:4}, (_,i) => ({
    l:`${10+(i*6.7)%80}%`, t:`${(i*11.7+5.8)%30}%`, d:`${12+(i*3.1)%15}s`, dl:`${(i*4.3)%20}s`,
    w:`${2+(i*0.7)%2}px`, h:`${2+(i*1.1)%2}px`
  })), []);

  useEffect(() => {
    const orbs = document.querySelectorAll('.scene-orb');
    if (!orbs.length) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    ensureDeviceTiltActive();
    const animFrameRef = { current: 0 };
    let lastTime = 0;
    const STEP = 1000 / 30;
    const animate = (now: number) => {
      if (now - lastTime < STEP) { animFrameRef.current = requestAnimationFrame(animate); return; }
      lastTime = now;
      const tilt = getDeviceTilt();
      orbs.forEach((orb, i) => {
        const f = (i + 1) * 10;
        const tiltAmt = 6 + i * 1.5;
        const tx = (Math.sin(Date.now()/6000 + i) - 0.5) * f + tilt.x * tiltAmt;
        const ty = (Math.cos(Date.now()/7000 + i*2) - 0.5) * f + tilt.y * tiltAmt;
        (orb as HTMLElement).style.transform = `translate(${tx}px,${ty}px)`;
      });
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    const onVis = () => { if (document.hidden) { cancelAnimationFrame(animFrameRef.current); } else { lastTime = 0; animFrameRef.current = requestAnimationFrame(animate); } };
    document.addEventListener("visibilitychange", onVis);
    return () => { if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); } document.removeEventListener("visibilitychange", onVis); };
  }, []);

  useEffect(() => {
    if (!particlesRef.current) return;
    const c = particlesRef.current;
    c.innerHTML = "";
    for (let i = 0; i < 20; i++) {
      const p = document.createElement("div");
      p.className = "particle";
      p.style.cssText = `left:${Math.random()*100}%;animation-duration:${3+Math.random()*7}s;animation-delay:${Math.random()*8}s;width:${1.5+Math.random()*4}px;height:${1.5+Math.random()*4}px;background:${PC[~~(Math.random()*PC.length)]}`;
      c.appendChild(p);
    }
  }, []);

  useEffect(() => {
    if (paused) return;
    const canvas = cometRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let w = 0, h = 0;
    const resize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const COLORS = ["#FFD700","#FF8A80","#D4A5FF","#FFBF00","#FFDAB9","#87CEEB","#98FB98","#FF69B4","#FFB5C2","#E6E6FA"];
    const comets: any[] = [];
    let animId = 0, spawnTimer = 0, t = 0;

    function spawnComet() {
      if (comets.filter((c: any) => c.active).length >= 2) return;
      const angle = Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 0.3;
      const speed = 3.2 + Math.random() * 0.8;
      const x = Math.random() * w, y = -50;
      comets.push({
        x, y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        color: COLORS[~~(Math.random() * COLORS.length)],
        tailLen: 60 + Math.random() * 80,
        life: 0, maxLife: 120 + Math.random() * 80,
        sparks: [], active: true,
        size: 2 + Math.random() * 2,
        freq: 0.12 + Math.random() * 0.2,
        amp: 8 + Math.random() * 16,
      });
    }

    function animate() {
      ctx!.clearRect(0, 0, w, h);
      spawnTimer++;
      if (spawnTimer > 60 + Math.random() * 120) { spawnComet(); spawnTimer = 0; }
      for (let i = comets.length - 1; i >= 0; i--) {
        const c = comets[i];
        if (!c.active) continue;
        c.life++;
        if (c.life > c.maxLife) { c.active = false; comets.splice(i, 1); continue; }
        c.x += c.vx; c.y += c.vy;
        if (Math.random() > 0.75 && c.sparks.length < 3) {
          c.sparks.push({ x: c.x, y: c.y, vx: (Math.random()-0.5)*2.5, vy: (Math.random()-0.5)*2.5, life: 20+Math.random()*25, size: 1+Math.random()*2, color: c.color });
        }
        const fadeIn = Math.min(c.life / 25, 1);
        const fadeOut = c.life > c.maxLife - 70 ? (c.maxLife - c.life) / 70 : 1;
        const opacity = fadeIn * fadeOut;
        const tailSteps = Math.floor(c.tailLen / 2);
        ctx!.beginPath();
        ctx!.moveTo(c.x, c.y);
        for (let tt = 1; tt <= tailSteps; tt++) {
          const p = tt / tailSteps;
          const tx = c.x - c.vx * tt * 0.9 + Math.sin(tt * 0.18 + c.life * 0.03) * (1 - p) * 2.2;
          const ty = c.y - c.vy * tt * 0.9 + Math.cos(tt * 0.16 + c.life * 0.03) * (1 - p) * 1.8;
          ctx!.lineTo(tx, ty);
        }
        const endX = c.x - c.vx * tailSteps * 0.9, endY = c.y - c.vy * tailSteps * 0.9;
        const tailGrad = ctx!.createLinearGradient(c.x, c.y, endX, endY);
        tailGrad.addColorStop(0, hexToRgba(c.color, opacity));
        tailGrad.addColorStop(0.15, hexToRgba(c.color, opacity * 0.55));
        tailGrad.addColorStop(0.45, `rgba(160, 200, 255, ${opacity * 0.2})`);
        tailGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx!.strokeStyle = tailGrad;
        ctx!.lineWidth = Math.max(1, c.size * 0.6);
        ctx!.lineCap = 'round';
        ctx!.stroke();
        const g = ctx!.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.size * 4);
        g.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
        g.addColorStop(0.2, hexToRgba(c.color, opacity * 0.7));
        g.addColorStop(0.5, hexToRgba(c.color, opacity * 0.2));
        g.addColorStop(1, hexToRgba(c.color, 0));
        ctx!.beginPath(); ctx!.arc(c.x, c.y, c.size * 4, 0, Math.PI * 2); ctx!.fillStyle = g; ctx!.fill();
        ctx!.beginPath(); ctx!.arc(c.x, c.y, c.size * 0.6, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(255, 255, 255, ${opacity})`; ctx!.fill();
        for (let s = c.sparks.length - 1; s >= 0; s--) {
          const sp = c.sparks[s];
          sp.x += sp.vx; sp.y += sp.vy;
          sp.life--;
          if (sp.life <= 0) { c.sparks.splice(s, 1); continue; }
          const spOp = (sp.life / 30) * opacity;
          ctx!.beginPath(); ctx!.arc(sp.x, sp.y, sp.size * (sp.life / 35), 0, Math.PI * 2);
          ctx!.fillStyle = hexToRgba(sp.color, spOp * 0.8);
          ctx!.fill();
        }
      }
      t++;
      animId = requestAnimationFrame(animate);
    }

    for (let i = 0; i < 2; i++) spawnComet();
    animId = requestAnimationFrame(animate);
    const onVis = () => { if (document.hidden) { cancelAnimationFrame(animId); } else { animId = requestAnimationFrame(animate); } };
    document.addEventListener("visibilitychange", onVis);
    return () => { cancelAnimationFrame(animId); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("resize", resize); };
  }, [paused]);

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: -1, background: "#0a0612" } as React.CSSProperties} />
      <div className="scene" style={{ opacity: "var(--scene-opacity, 1)" } as React.CSSProperties} />
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", opacity: "var(--sprite-opacity, 1)" } as React.CSSProperties}>
        <div className="scene-orb orb-coral" />
        <div className="scene-orb orb-gold" />
        <div className="scene-orb orb-pink" />
        <div className="star-field">
          {starPos.map((s,i) => (
            <div key={i} className={"star"+(i%5===0?" bright":"")+(i%8===0?" warm":"")+(i%13===0?" blue":"")+(i%17===0?" gold":"")} style={{left:s.l,top:s.t,animationDuration:s.d,animationDelay:s.dl}} />
          ))}
        </div>
        <canvas className="comet-field" ref={cometRef} />
        <div className="nebula-fog nf-1" /><div className="nebula-fog nf-2" /><div className="nebula-fog nf-3" /><div className="nebula-fog nf-4" /><div className="nebula-fog nf-5" /><div className="nebula-fog nf-6" /><div className="nebula-fog nf-7" /><div className="nebula-fog nf-8" /><div className="nebula-fog nf-9" /><div className="nebula-fog nf-10" />
        <div className="aurora-strip aurora-s1" /><div className="aurora-strip aurora-s2" />
        <div className="aurora-strip aurora-s3" />
        <div className="sparkle-field">
          {spPos.map((s,i) => (
            <div key={i} className="sparkle-particle" style={{left:s.l,top:s.t,animationDuration:s.d,animationDelay:s.dl,color:s.c,background:s.c}} />
          ))}
        </div>
        <div className="ember-field">
          {emPos.map((s,i) => (
            <div key={i} className="ember" style={{left:s.l,animationDuration:s.d,animationDelay:s.dl,width:s.w,height:s.h}} />
          ))}
        </div>
        <div className="fizzy-bubbles">
          {[...Array(20)].map((_,i) => (
            <div key={i} className="bubble" style={{
              left: Math.random()*100 + '%',
              top: Math.random()*80 + 10 + '%',
              width: 2 + Math.random()*4 + 'px',
              height: 2 + Math.random()*4 + 'px',
              opacity: 0.3 + Math.random()*0.4,
              animationDuration: 3 + Math.random()*6 + 's',
              animationDelay: Math.random()*10 + 's'
            }} />
          ))}
        </div>
        <div className="particles" ref={particlesRef} />
      </div>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 } as React.CSSProperties}>
        <div className="scene-wash" style={{ opacity: "var(--scene-opacity, 1)" } as React.CSSProperties} />
      </div>
    </>
  );
}