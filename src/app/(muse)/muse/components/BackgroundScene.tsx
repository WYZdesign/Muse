"use client";
import { useEffect, useRef, useMemo } from "react";

const PC = ["#FFD700","#FF6B6B","#D4A5FF","#98FB98","#FFDAB9","#87CEEB","#FF8A80","#FFD1A4","#FFB5C2","#FFE4B5","#FF9A56","#E6E6FA"];

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function BackgroundScene({ flash }: { flash: string | null }) {
  const cometRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);
  const starPos = useMemo(() => Array.from({length:50}, (_,i) => ({
    l:`${(i*7.3+3.1)%100}%`, t:`${(i*11.7+5.8)%100}%`, d:`${2+(i*3.7)%6}s`, dl:`${(i*1.9)%10}s`
  })), []);
  const spPos = useMemo(() => Array.from({length:20}, (_,i) => ({
    l:`${(i*13.7+2.1)%100}%`, t:`${(i*9.3+4.5)%100}%`, d:`${5+(i*5.3)%8}s`, dl:`${(i*2.3)%10}s`,
    c:['#FFD700','#FFB5C2','#D4A5FF','#FFDAB9','#98FB98'][i%5]
  })), []);
  const emPos = useMemo(() => Array.from({length:10}, (_,i) => ({
    l:`${10+(i*8.7)%80}%`, d:`${12+(i*3.1)%15}s`, dl:`${(i*4.3)%20}s`,
    w:`${2+(i*0.7)%2}px`, h:`${2+(i*1.1)%2}px`
  })), []);

  useEffect(() => {
    const orbs = document.querySelectorAll('.scene-orb');
    if (!orbs.length) return;
    let mx = 0.5, my = 0.5;
    const onMove = (e: MouseEvent) => { mx = e.clientX / window.innerWidth; my = e.clientY / window.innerHeight; };
    const onGyro = (e: DeviceOrientationEvent) => {
      if (e.gamma != null) mx = (e.gamma + 45) / 90;
      if (e.beta != null) my = (e.beta + 45) / 90;
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('deviceorientation', onGyro, { passive: true });
    let frame: number;
    const animate = () => {
      orbs.forEach((orb, i) => {
        const f = (i + 1) * 10;
        (orb as HTMLElement).style.transform = `translate(${(mx - 0.5) * f}px,${(my - 0.5) * f}px)`;
      });
      frame = requestAnimationFrame(animate);
    };
    animate();
    return () => { cancelAnimationFrame(frame); window.removeEventListener('mousemove', onMove); window.removeEventListener('deviceorientation', onGyro); };
  }, []);

  useEffect(() => {
    if (!particlesRef.current) return;
    const c = particlesRef.current;
    c.innerHTML = "";
    for (let i = 0; i < 50; i++) {
      const p = document.createElement("div");
      p.className = "particle";
      p.style.cssText = `left:${Math.random()*100}%;animation-duration:${3+Math.random()*7}s;animation-delay:${Math.random()*8}s;width:${1.5+Math.random()*4}px;height:${1.5+Math.random()*4}px;background:${PC[~~(Math.random()*PC.length)]}`;
      c.appendChild(p);
    }
  }, []);

  useEffect(() => {
    const canvas = cometRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let w = 0, h = 0;
    const resize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const COLORS = ["#FFD700","#FF8A80","#D4A5FF","#FFBF00","#FFDAB9","#87CEEB","#98FB98","#FF69B4"];
    const mice = { x: w/2, y: h/2 };
    const onMouse = (e: MouseEvent | TouchEvent) => {
      const p = "touches" in e ? { x: (e as TouchEvent).touches[0].clientX, y: (e as TouchEvent).touches[0].clientY } : { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
      mice.x = p.x; mice.y = p.y;
    };
    window.addEventListener("mousemove", onMouse);
    window.addEventListener("touchmove", onMouse);
    const comets: any[] = [];
    let animId = 0, spawnTimer = 0;
    function spawnComet() {
      if (comets.filter((c: any) => c.active).length >= 4) return;
      const angle = Math.random() * Math.PI * 2, speed = 2 + Math.random() * 4, edge = Math.random();
      let x: number, y: number;
      if (edge < 0.25) { x = -50; y = Math.random() * h; }
      else if (edge < 0.5) { x = w + 50; y = Math.random() * h; }
      else if (edge < 0.75) { x = Math.random() * w; y = -50; }
      else { x = Math.random() * w; y = h + 50; }
      comets.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, color: COLORS[~~(Math.random() * COLORS.length)], tailLen: 60 + Math.random() * 100, life: 0, maxLife: 300 + Math.random() * 400, sparks: [], active: true, size: 3 + Math.random() * 3 });
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
        const dx = mice.x - c.x, dy = mice.y - c.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 300 && dist > 10) { c.vx += dx / dist * 0.05; c.vy += dy / dist * 0.05; }
        c.x += c.vx; c.y += c.vy;
        if (Math.random() > 0.7) c.sparks.push({ x: c.x, y: c.y, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, life: 20 + Math.random() * 30, size: 1 + Math.random() * 2 });
        const fadeIn = Math.min(c.life / 20, 1), fadeOut = c.life > c.maxLife - 60 ? (c.maxLife - c.life) / 60 : 1, opacity = fadeIn * fadeOut;
        // Fluid trail via smooth path
        const tailSteps = Math.floor(c.tailLen);
        ctx!.beginPath();
        ctx!.moveTo(c.x, c.y);
        for (let t = 1; t <= tailSteps; t++) {
          const p = t / tailSteps;
          const tx = c.x - c.vx * t * 0.85 + Math.sin(t * 0.25 + c.life * 0.04) * (1 - p) * 18;
          const ty = c.y - c.vy * t * 0.85 + Math.cos(t * 0.25 + c.life * 0.04) * (1 - p) * 18;
          ctx!.lineTo(tx, ty);
        }
        const endX = c.x - c.vx * tailSteps * 0.85, endY = c.y - c.vy * tailSteps * 0.85;
        const tailGrad = ctx!.createLinearGradient(c.x, c.y, endX, endY);
        tailGrad.addColorStop(0, hexToRgba(c.color, opacity));
        tailGrad.addColorStop(0.25, hexToRgba(c.color, opacity * 0.6));
        tailGrad.addColorStop(0.5, `rgba(160, 190, 255, ${opacity * 0.25})`);
        tailGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx!.strokeStyle = tailGrad;
        ctx!.lineWidth = c.size * 2.8;
        ctx!.lineCap = 'round';
        ctx!.stroke();
        // Inner bright core
        ctx!.beginPath();
        ctx!.moveTo(c.x, c.y);
        for (let t = 1; t <= tailSteps * 0.5; t++) {
          const p = t / (tailSteps * 0.5);
          const tx = c.x - c.vx * t * 0.85, ty = c.y - c.vy * t * 0.85;
          ctx!.lineTo(tx, ty);
        }
        ctx!.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.3})`;
        ctx!.lineWidth = c.size * 1.2;
        ctx!.stroke();
        // Soft aura scatter around head
        for (let t = 0; t < tailSteps * 0.15; t++) {
          const p = t / (tailSteps * 0.15), rad = c.size * (1 - p) * 3;
          ctx!.beginPath(); ctx!.arc(c.x - c.vx * t + (Math.random()-0.5)*8, c.y - c.vy * t + (Math.random()-0.5)*8, rad, 0, Math.PI*2);
          ctx!.fillStyle = `rgba(180,200,255,${opacity*(1-p)*0.15})`; ctx!.fill();
        }
        const g = ctx!.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.size * 4);
        g.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
        g.addColorStop(0.3, hexToRgba(c.color, opacity * 0.6));
        g.addColorStop(1, hexToRgba(c.color, 0));
        ctx!.beginPath(); ctx!.arc(c.x, c.y, c.size * 4, 0, Math.PI * 2); ctx!.fillStyle = g; ctx!.fill();
        ctx!.beginPath(); ctx!.arc(c.x, c.y, c.size * 0.7, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(255, 255, 255, ${opacity})`; ctx!.fill();
        for (let s = c.sparks.length - 1; s >= 0; s--) {
          const sp = c.sparks[s]; sp.x += sp.vx; sp.y += sp.vy; sp.life--;
          if (sp.life <= 0) { c.sparks.splice(s, 1); continue; }
          ctx!.beginPath(); ctx!.arc(sp.x, sp.y, sp.size * (sp.life / 30), 0, Math.PI * 2);
          ctx!.fillStyle = `${c.color.replace(")",",")}, ${(sp.life / 30) * 0.8})`; ctx!.fill();
        }
      }
      animId = requestAnimationFrame(animate);
    }
    for (let i = 0; i < 2; i++) spawnComet();
    animId = requestAnimationFrame(animate);
    const onVis = () => { if (document.hidden) { cancelAnimationFrame(animId); } else { animId = requestAnimationFrame(animate); } };
    document.addEventListener("visibilitychange", onVis);
    return () => { cancelAnimationFrame(animId); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("resize", resize); window.removeEventListener("mousemove", onMouse); window.removeEventListener("touchmove", onMouse); };
  }, []);

  return (
    <>
      <div className="scene">
        <div className="scene-wash" />
        <div className="scene-orb orb-coral" /><div className="scene-orb orb-gold" />
        <div className="scene-orb orb-pink" /><div className="scene-orb orb-lavender" />
        <div className="scene-orb orb-amber" /><div className="scene-orb orb-peach" />
        <div className="scene-orb orb-sunset" /><div className="scene-orb orb-honey" />
      </div>
      <div className="star-field">
        {starPos.map((s,i) => (
          <div key={i} className={"star"+(i%4===0?" bright":"")+(i%7===0?" warm":"")+(i%11===0?" blue":"")} style={{left:s.l,top:s.t,animationDuration:s.d,animationDelay:s.dl}} />
        ))}
      </div>
      <canvas className="comet-field" ref={cometRef} />
      <div className="nebula-fog nf-1" /><div className="nebula-fog nf-2" /><div className="nebula-fog nf-3" />
      <div className="nebula-fog nf-4" /><div className="nebula-fog nf-5" /><div className="nebula-fog nf-6" />
      <div className="nebula-fog nf-7" /><div className="nebula-fog nf-8" />
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
      <div className="particles" ref={particlesRef} />
      {flash && <div className="screen-flash" style={{background:flash}} />}
    </>
  );
}
