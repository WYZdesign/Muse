"use client";

import { useState, useEffect } from "react";

const DURATION = 3000;

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const done = () => { setFade(true); setTimeout(() => setVisible(false), 700); };
    window.addEventListener("muse:ready", done, { once: true });
    const t = setTimeout(done, DURATION);
    return () => { window.removeEventListener("muse:ready", done); clearTimeout(t); };
  }, []);

  if (!visible) return null;

  const sprites = Array.from({ length: 28 }, (_, i) => ({
    row: Math.floor(i / 7),
    col: i % 7,
    char: ["✦", "✧", "⋆", "·", "◆", "◈", "✶", "⭑"][i % 8],
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
      background: "#0a0612",
    }}>
      {/* FUSION SUNSET SCENE — galaxy top, golden sunset mid, ocean bottom */}
      <div className="fusion-scene" aria-hidden="true">
        <div className="fusion-sky" />
        <div className="fusion-overlay" />

        {/* Twinkling stars — upper galaxy twilight */}
        <div className="fusion-stars">
          {Array.from({ length: 60 }).map((_, i) => (
            <span key={i} className="star" style={{ left: `${(i * 37) % 100}%`, top: `${(i * 13) % 42}%`, animationDelay: `${(i % 10) * 0.45}s` }} />
          ))}
        </div>

        {/* Aurora nebula ribbons */}
        <div className="fusion-nebula neb-1" /><div className="fusion-nebula neb-2" /><div className="fusion-nebula neb-3" />
        <div className="fusion-nebula neb-4" /><div className="fusion-nebula neb-5" /><div className="fusion-nebula neb-6" />

        {/* Shooting stars */}
        <div className="fusion-shooting-star ss-1" />
        <div className="fusion-shooting-star ss-2" />
        <div className="fusion-shooting-star ss-3" />
        <div className="fusion-shooting-star ss-4" />
        <div className="fusion-shooting-star ss-5" />

        {/* Golden hour sun */}
        <div className="fusion-sun-glow" />
        <div className="fusion-sun" />

        {/* Drifting clouds */}
        <div className="fusion-clouds">
          <span className="fusion-cloud c-1" />
          <span className="fusion-cloud c-2" />
          <span className="fusion-cloud c-3" />
          <span className="fusion-cloud c-4" />
          <span className="fusion-cloud c-5" />
        </div>

        {/* Birds */}
        <div className="fusion-birds">
          <div className="fusion-flock bf-0"><span className="bird-wing-left" /><span className="bird-wing-right" /></div>
          <div className="fusion-flock bf-1"><span className="bird-wing-left" /><span className="bird-wing-right" /></div>
          <div className="fusion-flock bf-2"><span className="bird-wing-left" /><span className="bird-wing-right" /></div>
          <div className="fusion-flock bf-3"><span className="bird-wing-left" /><span className="bird-wing-right" /></div>
        </div>

        {/* Sparkle sprites — the ✦✧⋆ field from the galaxy splash */}
        <div className="fusion-sparkles">
          {sprites.map((s, i) => (
            <div key={i} className="fusion-sparkle" style={{ gridRow: s.row + 1, gridColumn: s.col + 1 }}>
              <span style={{ fontSize: s.size, color: i % 4 === 0 ? "#FFD700" : i % 4 === 1 ? "#D4A5FF" : i % 4 === 2 ? "#FF8A80" : "rgba(255,255,255,0.6)", animation: `sprIn ${s.duration}s ease-in-out ${s.delay}s forwards, sprFloat ${s.duration}s ease-in-out ${s.delay}s infinite` }}>{s.char}</span>
            </div>
          ))}
        </div>

        {/* Rising embers — warm near the ocean */}
        <div className="fusion-embers">
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} className="ember" style={{ left: `${(i * 53) % 100}%`, animationDelay: `${(i % 6) * 0.7}s`, animationDuration: `${4 + (i % 4)}s` }} />
          ))}
        </div>

        {/* Layered ocean waves — bottom third, incrementally smaller toward horizon */}
        <div className="fusion-ocean">
          <svg className="fusion-waves-svg" viewBox="0 0 1440 360" preserveAspectRatio="none" aria-hidden="true">
            <path className="fwv fwv-6" d="M0,8 C180,14 360,2 540,9 C720,16 900,2 1080,9 C1260,16 1380,6 1440,10 L1440,360 L0,360 Z" />
            <path className="fwv fwv-7" d="M0,22 C180,30 360,10 540,24 C720,34 900,12 1080,26 C1260,36 1380,20 1440,26 L1440,360 L0,360 Z" />
            <path className="fwv fwv-8" d="M0,40 C180,52 360,22 540,44 C720,60 900,26 1080,46 C1260,62 1380,38 1440,46 L1440,360 L0,360 Z" />
            <path className="fwv fwv-1" d="M0,90 C180,108 360,60 540,96 C720,122 900,66 1080,98 C1260,124 1380,84 1440,98 L1440,360 L0,360 Z" />
            <path className="fwv fwv-2" d="M0,140 C180,162 360,100 540,148 C720,184 900,108 1080,150 C1260,184 1380,128 1440,150 L1440,360 L0,360 Z" />
            <path className="fwv fwv-3" d="M0,185 C200,215 380,135 560,196 C760,250 940,145 1120,200 C1260,236 1380,168 1440,196 L1440,360 L0,360 Z" />
            <path className="fwv fwv-4" d="M0,228 C180,262 380,168 580,242 C780,302 980,176 1180,248 C1320,292 1400,210 1440,248 L1440,360 L0,360 Z" />
            <path className="fwv fwv-5" d="M0,268 C220,312 420,198 640,282 C860,348 1060,206 1260,290 C1360,326 1410,252 1440,288 L1440,360 L0,360 Z" />
          </svg>
        </div>
      </div>

      {/* Centered branding + loader — raised high, oversized */}
      <div style={{ position: "relative", zIndex: 4, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "34vh" }}>
        <img src="/muse-app-icon.png" alt="Muse" style={{ width: 132, height: 132, borderRadius: 36, objectFit: "cover", boxShadow: "0 12px 60px rgba(0,0,0,0.55)", animation: "splashIconFloat 4.2s ease-in-out infinite" }} />
        <div style={{
          fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 68, fontWeight: 900, letterSpacing: -2,
          background: "linear-gradient(120deg,#FFD700,#FF8A80,#D4A5FF,#FFB5C2,#FF8C69,#FFD700)",
          backgroundSize: "300% 300%", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          animation: "fontLava 7s ease-in-out infinite", marginTop: 16,
          textShadow: "0 2px 20px rgba(255,215,0,0.25)",
        }}>Muse</div>
        <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: 5, textIndent: 5, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", marginTop: 8, marginBottom: 28, whiteSpace: "nowrap" }}>Creative Professional Network</div>
        <div style={{ width: 180, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.12)", overflow: "hidden" }}>
          <div style={{ width: "40%", height: "100%", borderRadius: 2, background: "linear-gradient(90deg,#FFD700,#FF8A80,#D4A5FF)", animation: "splashLoad 1.4s ease-in-out infinite" }} />
        </div>
      </div>

      <style>{`
        .fusion-scene{position:absolute;inset:0;pointer-events:none;overflow:hidden}
        .fusion-sky{position:absolute;inset:0;background:linear-gradient(180deg,#0a0612 0%,#1a0f2e 10%,#2d1b4e 20%,#4d1c52 30%,#8c2a52 40%,#c9454a 48%,#e86842 54%,#f79646 60%,#fdbb58 64%,#fed980 66.7%,#f09f54 66.7%,#186b84 67%,#0d4662 82%,#072235 100%)}
        .fusion-overlay{position:absolute;inset:0;background:rgba(0,0,0,0.22);z-index:2;pointer-events:none}
        .fusion-stars{position:absolute;top:0;left:0;right:0;height:50%;z-index:1}
        .fusion-stars .star{position:absolute;width:2px;height:2px;border-radius:50%;background:#fff;box-shadow:0 0 4px rgba(255,255,255,0.7);animation:sunsetTwinkle 3s ease-in-out infinite}
        .fusion-stars .star:nth-child(3n){background:#ffd98a;box-shadow:0 0 5px rgba(255,217,138,0.8)}
        .fusion-stars .star:nth-child(5n){width:3px;height:3px}
        .fusion-stars .star:nth-child(7n){background:#d4a5ff;box-shadow:0 0 6px rgba(212,165,255,0.8)}
        @keyframes sunsetTwinkle{0%,100%{opacity:0.2;transform:scale(0.7)}50%{opacity:1;transform:scale(1.3)}}
        .fusion-shooting-star{position:absolute;width:150px;height:2px;border-radius:999px;background:linear-gradient(90deg,transparent 0%,rgba(255,140,80,0.28) 35%,rgba(255,215,0,0.72) 75%,#fff 100%);filter:drop-shadow(0 0 4px rgba(255,215,0,0.8));opacity:0;pointer-events:none;z-index:1;will-change:transform,opacity}
        .fusion-shooting-star::before{content:"";position:absolute;right:-1px;top:50%;transform:translateY(-50%);width:3px;height:3px;border-radius:50%;background:#fff;box-shadow:0 0 8px 2px rgba(255,255,255,0.9),0 0 18px 4px rgba(255,215,0,0.5)}
        .fusion-shooting-star.ss-2,.fusion-shooting-star.ss-5{background:linear-gradient(270deg,transparent 0%,rgba(255,140,80,0.28) 35%,rgba(255,215,0,0.72) 75%,#fff 100%)}
        .fusion-shooting-star.ss-2::before,.fusion-shooting-star.ss-5::before{right:auto;left:-1px}
        .fusion-shooting-star.ss-1{top:8%;left:30%;animation:shootA 7.5s linear infinite 1.5s}
        .fusion-shooting-star.ss-2{top:13%;right:20%;animation:shootB 9.5s linear infinite 4.8s}
        .fusion-shooting-star.ss-3{top:5%;left:52%;animation:shootC 8.5s linear infinite 6.5s}
        .fusion-shooting-star.ss-4{top:17%;left:12%;animation:shootD 10s linear infinite 2.8s}
        .fusion-shooting-star.ss-5{top:9%;right:6%;animation:shootE 11s linear infinite 8.2s}
        @keyframes shootA{0%{transform:translate(0,0) rotate(28deg) scaleX(0);opacity:0}4%{opacity:1;transform:translate(32px,17px) rotate(28deg) scaleX(1)}36%{opacity:0.9;transform:translate(288px,153px) rotate(28deg) scaleX(1)}48%{opacity:0;transform:translate(384px,204px) rotate(28deg) scaleX(0.6)}100%{opacity:0;transform:translate(384px,204px) rotate(28deg) scaleX(0)}}
        @keyframes shootC{0%{transform:translate(0,0) rotate(22deg) scaleX(0);opacity:0}4%{opacity:1;transform:translate(34px,14px) rotate(22deg) scaleX(1)}36%{opacity:0.9;transform:translate(306px,126px) rotate(22deg) scaleX(1)}48%{opacity:0;transform:translate(408px,168px) rotate(22deg) scaleX(0.6)}100%{opacity:0;transform:translate(408px,168px) rotate(22deg) scaleX(0)}}
        @keyframes shootD{0%{transform:translate(0,0) rotate(33deg) scaleX(0);opacity:0}4%{opacity:1;transform:translate(28px,18px) rotate(33deg) scaleX(1)}36%{opacity:0.9;transform:translate(252px,162px) rotate(33deg) scaleX(1)}48%{opacity:0;transform:translate(336px,216px) rotate(33deg) scaleX(0.6)}100%{opacity:0;transform:translate(336px,216px) rotate(33deg) scaleX(0)}}
        @keyframes shootB{0%{transform:translate(0,0) rotate(-33deg) scaleX(0);opacity:0}4%{opacity:1;transform:translate(-32px,18px) rotate(-33deg) scaleX(1)}36%{opacity:0.9;transform:translate(-288px,162px) rotate(-33deg) scaleX(1)}48%{opacity:0;transform:translate(-384px,216px) rotate(-33deg) scaleX(0.6)}100%{opacity:0;transform:translate(-384px,216px) rotate(-33deg) scaleX(0)}}
        @keyframes shootE{0%{transform:translate(0,0) rotate(-26deg) scaleX(0);opacity:0}4%{opacity:1;transform:translate(-30px,15px) rotate(-26deg) scaleX(1)}36%{opacity:0.9;transform:translate(-270px,135px) rotate(-26deg) scaleX(1)}48%{opacity:0;transform:translate(-360px,180px) rotate(-26deg) scaleX(0.6)}100%{opacity:0;transform:translate(-360px,180px) rotate(-26deg) scaleX(0)}}
        .fusion-nebula{position:absolute;border-radius:50%;filter:blur(34px);mix-blend-mode:screen;opacity:0.9;animation:sunsetDrift 14s ease-in-out infinite;z-index:1}
        .neb-1{width:48vw;height:25vw;background:radial-gradient(ellipse at 40% 60%,rgba(0,255,180,0.7) 0%,rgba(20,180,210,0.5) 40%,rgba(138,43,226,0.2) 70%,transparent 85%);top:1%;left:-8%}
        .neb-2{width:44vw;height:23vw;background:radial-gradient(ellipse at 60% 40%,rgba(255,20,147,0.7) 0%,rgba(186,85,211,0.55) 40%,rgba(75,0,130,0.22) 70%,transparent 85%);top:7%;right:-6%;animation-delay:-3.5s}
        .neb-3{width:36vw;height:19vw;background:radial-gradient(ellipse at 50% 50%,rgba(0,220,255,0.75) 0%,rgba(255,215,0,0.5) 45%,rgba(0,128,128,0.22) 75%,transparent 85%);top:0%;left:32%;animation-delay:-7s}
        .neb-4{width:34vw;height:18vw;background:radial-gradient(ellipse at 30% 70%,rgba(147,112,219,0.7) 0%,rgba(138,43,226,0.55) 45%,transparent 80%);top:12%;left:6%;animation-delay:-9.5s}
        .neb-5{width:40vw;height:20vw;background:radial-gradient(ellipse at 70% 30%,rgba(255,105,180,0.75) 0%,rgba(255,140,80,0.52) 40%,rgba(212,165,255,0.28) 75%,transparent 85%);top:3%;right:20%;animation-delay:-5.5s}
        .neb-6{width:32vw;height:17vw;background:radial-gradient(ellipse at 50% 50%,rgba(0,191,255,0.7) 0%,rgba(65,105,225,0.55) 45%,transparent 80%);top:18%;right:2%;animation-delay:-11s}
        @keyframes sunsetDrift{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(26px,-16px) scale(1.08)}}
        .fusion-sun-glow{position:absolute;left:50%;bottom:20%;transform:translateX(-50%);width:70vw;height:38vw;border-radius:70vw 70vw 0 0;background:radial-gradient(ellipse at 50% 100%,rgba(255,200,90,0.7) 0%,rgba(255,140,60,0.34) 45%,transparent 75%);filter:blur(16px);animation:sunsetSunPulse 5s ease-in-out infinite;z-index:1}
        .fusion-sun{position:absolute;left:50%;bottom:33.3%;transform:translateX(-50%);width:17vw;min-width:120px;max-width:192px;height:8.4vw;min-height:60px;max-height:96px;border-radius:192px 192px 0 0;background:radial-gradient(ellipse at 50% 100%,#ffffff 0%,#fff2be 25%,#ffb648 60%,#f1683c 100%);box-shadow:0 -8px 60px 20px rgba(255,185,75,0.75),0 -2px 18px 4px rgba(255,255,255,0.9);animation:sunsetSunBob 5s ease-in-out infinite;z-index:1}
        @keyframes sunsetSunPulse{0%,100%{opacity:0.85;transform:translateX(-50%) scale(1)}50%{opacity:1;transform:translateX(-50%) scale(1.06)}}
        @keyframes sunsetSunBob{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(3px)}}
        .fusion-clouds{position:absolute;inset:0;z-index:1}
        .fusion-cloud{position:absolute;border-radius:50%;filter:blur(26px);opacity:0.75;mix-blend-mode:screen;animation:sunsetCloud linear infinite}
        .c-1{width:26vw;height:7vw;top:20%;left:-30%;background:radial-gradient(ellipse,rgba(255,220,185,0.38),rgba(255,140,100,0.1) 55%,transparent 75%);animation-duration:26s}
        .c-2{width:20vw;height:5.5vw;top:14%;left:-22%;background:radial-gradient(ellipse,rgba(255,190,215,0.34),rgba(212,165,255,0.1) 55%,transparent 75%);animation-duration:32s;animation-delay:-9s}
        .c-3{width:30vw;height:8vw;top:30%;left:-35%;background:radial-gradient(ellipse,rgba(255,200,150,0.36),rgba(240,110,80,0.1) 55%,transparent 75%);animation-duration:22s;animation-delay:-4s}
        .c-4{width:22vw;height:6vw;top:25%;left:-26%;background:radial-gradient(ellipse,rgba(255,230,170,0.34),rgba(255,150,90,0.08) 55%,transparent 75%);animation-duration:29s;animation-delay:-14s}
        .c-5{width:16vw;height:4.5vw;top:36%;left:-18%;background:radial-gradient(ellipse,rgba(255,180,150,0.3),rgba(255,120,90,0.07) 55%,transparent 75%);animation-duration:36s;animation-delay:-18s}
        @keyframes sunsetCloud{0%{transform:translateX(0) scaleX(1)}50%{transform:translateX(70vw) scaleX(1.15)}100%{transform:translateX(140vw) scaleX(1)}}
        .fusion-birds{position:absolute;inset:0;z-index:1}
        .fusion-flock{position:absolute;display:flex;align-items:center;justify-content:center;will-change:transform}
        .fusion-flock.bf-0{top:48%;left:-60px;animation:birdFlight0 11s linear infinite;animation-delay:0s}
        .fusion-flock.bf-1{top:52%;left:-60px;animation:birdFlight1 14s linear infinite;animation-delay:3.5s;transform:scale(0.75)}
        .fusion-flock.bf-2{top:56%;left:-60px;animation:birdFlight2 12.5s linear infinite;animation-delay:7s;transform:scale(0.85)}
        .fusion-flock.bf-3{top:60%;left:-60px;animation:birdFlight3 16s linear infinite;animation-delay:10.5s;transform:scale(0.65)}
        .bird-wing-left,.bird-wing-right{display:inline-block;width:14px;height:8px;border-top:2.2px solid #1f0b29;border-radius:50% 50% 0 0;transform-origin:bottom center}
        .bird-wing-left{transform:rotate(-16deg);animation:flapLeft 0.38s ease-in-out infinite alternate}
        .bird-wing-right{transform:rotate(16deg);animation:flapRight 0.38s ease-in-out infinite alternate;margin-left:-2px}
        .bf-0 .bird-wing-left{animation-duration:0.32s}
        .bf-0 .bird-wing-right{animation-duration:0.32s}
        .bf-1 .bird-wing-left{animation-duration:0.44s}
        .bf-1 .bird-wing-right{animation-duration:0.44s}
        .bf-2 .bird-wing-left{animation-duration:0.36s}
        .bf-2 .bird-wing-right{animation-duration:0.36s}
        .bf-3 .bird-wing-left{animation-duration:0.5s}
        .bf-3 .bird-wing-right{animation-duration:0.5s}
        @keyframes flapLeft{0%{transform:rotate(-24deg) scaleY(1.1)}100%{transform:rotate(18deg) scaleY(0.4)}}
        @keyframes flapRight{0%{transform:rotate(24deg) scaleY(1.1)}100%{transform:rotate(-18deg) scaleY(0.4)}}
        @keyframes birdFlight0{0%{transform:translateX(0) translateY(0)}15%{transform:translateX(21vw) translateY(-22px)}30%{transform:translateX(42vw) translateY(8px)}50%{transform:translateX(70vw) translateY(-18px)}70%{transform:translateX(98vw) translateY(14px)}85%{transform:translateX(119vw) translateY(-10px)}100%{transform:translateX(140vw) translateY(6px)}}
        @keyframes birdFlight1{0%{transform:translateX(0) translateY(0)}20%{transform:translateX(28vw) translateY(12px)}40%{transform:translateX(56vw) translateY(-20px)}60%{transform:translateX(84vw) translateY(16px)}80%{transform:translateX(112vw) translateY(-8px)}100%{transform:translateX(140vw) translateY(4px)}}
        @keyframes birdFlight2{0%{transform:translateX(0) translateY(0)}18%{transform:translateX(25vw) translateY(-14px)}35%{transform:translateX(49vw) translateY(18px)}55%{transform:translateX(77vw) translateY(-24px)}75%{transform:translateX(105vw) translateY(10px)}90%{transform:translateX(126vw) translateY(-6px)}100%{transform:translateX(140vw) translateY(2px)}}
        @keyframes birdFlight3{0%{transform:translateX(0) translateY(0)}25%{transform:translateX(35vw) translateY(16px)}45%{transform:translateX(63vw) translateY(-12px)}65%{transform:translateX(91vw) translateY(20px)}85%{transform:translateX(119vw) translateY(-16px)}100%{transform:translateX(140vw) translateY(8px)}}
        .fusion-sparkles{position:absolute;inset:0;z-index:3;display:grid;grid-template-columns:repeat(7,1fr);grid-template-rows:repeat(4,1fr);pointer-events:none}
        .fusion-sparkle{display:flex;align-items:center;justify-content:center}
        .fusion-sparkle span{opacity:0}
        @keyframes sprIn{from{opacity:0;transform:scale(0) translateY(10px)}to{opacity:0.5;transform:scale(1) translateY(0)}}
        @keyframes sprFloat{0%,100%{transform:translateY(0) scale(1);opacity:0.35}50%{transform:translateY(-10px) scale(1.2);opacity:0.65}}
        .fusion-embers{position:absolute;left:0;right:0;bottom:28%;height:20%;z-index:2;pointer-events:none}
        .fusion-embers .ember{position:absolute;bottom:0;width:3px;height:3px;border-radius:50%;background:radial-gradient(circle,#ffd98a 0%,#ff8c50 60%,transparent 100%);box-shadow:0 0 6px 1px rgba(255,180,80,0.6);opacity:0;animation:emberRise ease-in-out infinite}
        @keyframes emberRise{0%{opacity:0;transform:translateY(0) scale(1)}10%{opacity:0.7}100%{opacity:0;transform:translateY(-60px) scale(0.3)}}
        .fusion-ocean{position:absolute;left:0;right:0;bottom:0;height:33.3%;z-index:2}
        .fusion-waves-svg{position:absolute;bottom:0;left:-8%;width:116%;height:100%;display:block}
        .fusion-waves-svg .fwv{transform-origin:center bottom;will-change:transform}
        .fwv-6{fill:rgba(34,235,245,0.6);animation:waveRise6 12s ease-in-out infinite alternate}
        .fwv-7{fill:rgba(30,215,232,0.6);animation:waveRise7 10s ease-in-out infinite -3s alternate}
        .fwv-8{fill:rgba(26,195,218,0.6);animation:waveRise8 8.8s ease-in-out infinite -5s alternate}
        .fwv-1{fill:rgba(20,170,200,0.6);animation:waveRise1 6.2s ease-in-out infinite alternate}
        .fwv-2{fill:rgba(15,142,178,0.6);animation:waveRise2 8.4s ease-in-out infinite -2.1s alternate}
        .fwv-3{fill:rgba(11,112,154,0.6);animation:waveRise3 7.0s ease-in-out infinite -4.3s alternate}
        .fwv-4{fill:rgba(8,84,130,0.6);animation:waveRise4 9.8s ease-in-out infinite -1.5s alternate}
        .fwv-5{fill:rgba(5,58,102,0.6);animation:waveRise5 11.2s ease-in-out infinite -3.8s alternate}
        @keyframes waveRise1{0%{transform:translateY(-18px) scaleY(1)}50%{transform:translateY(8px) scaleY(0.92)}100%{transform:translateY(16px) scaleY(1.08)}}
        @keyframes waveRise2{0%{transform:translateY(20px) scaleY(0.94)}50%{transform:translateY(-14px) scaleY(1.12)}100%{transform:translateY(-26px) scaleY(1.02)}}
        @keyframes waveRise3{0%{transform:translateY(-22px) scaleY(1.05)}50%{transform:translateY(16px) scaleY(0.9)}100%{transform:translateY(24px) scaleY(1.14)}}
        @keyframes waveRise4{0%{transform:translateY(24px) scaleY(0.92)}50%{transform:translateY(-18px) scaleY(1.08)}100%{transform:translateY(-32px) scaleY(1.04)}}
        @keyframes waveRise5{0%{transform:translateY(-14px) scaleY(1)}50%{transform:translateY(12px) scaleY(0.96)}100%{transform:translateY(18px) scaleY(1.06)}}
        @keyframes waveRise6{0%{transform:translateY(-12px) scaleY(1)}50%{transform:translateY(10px) scaleY(0.94)}100%{transform:translateY(14px) scaleY(1.06)}}
        @keyframes waveRise7{0%{transform:translateY(10px) scaleY(0.96)}50%{transform:translateY(-12px) scaleY(1.08)}100%{transform:translateY(-16px) scaleY(1.02)}}
        @keyframes waveRise8{0%{transform:translateY(-8px) scaleY(1.02)}50%{transform:translateY(6px) scaleY(0.96)}100%{transform:translateY(10px) scaleY(1.04)}}
        @keyframes splashIconFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes fontLava{0%{background-position:0 50%}50%{background-position:100% 50%}100%{background-position:0 50%}}
        @keyframes splashLoad{0%{transform:translateX(-100%)}100%{transform:translateX(350%)}}
      `}</style>
    </div>
  );
}
