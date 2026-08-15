"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { FiCamera, FiUsers, FiZap, FiShield, FiHeart, FiStar, FiArrowRight, FiMessageSquare, FiMapPin, FiClock, FiLock, FiGlobe, FiLink } from "react-icons/fi";
import SplashScreen from "@/components/SplashScreen";
import BackgroundScene from "@/components/BackgroundScene";
import "@/components/BackgroundScene.css";
import "./landing.css";

const QR_SOURCES = {
  default: "",
  mixer_la: "?src=mixer_la",
  mixer_nyc: "?src=mixer_nyc",
  mixer_chi: "?src=mixer_chi",
  instagram: "?src=instagram_bio",
  twitter: "?src=twitter_link",
  personal: "?src=personal_invite",
} as const;

/* ── In-view hook ── */
function useInView<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold, rootMargin: "0px 0px -8% 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/* ── Reveal wrapper ── */
function Reveal({ children, delay = 0, className = "", scale = false }: { children: React.ReactNode; delay?: number; className?: string; scale?: boolean }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={`muse-reveal ${scale ? "scale-in" : ""} ${inView ? "in" : ""} ${className}`} style={{ "--rd": `${delay}s` } as React.CSSProperties}>
      {children}
    </div>
  );
}

/* ── Split text reveal ── */
function SplitText({ text, delay = 0, className = "" }: { text: string; delay?: number; className?: string }) {
  const { ref, inView } = useInView<HTMLSpanElement>(0.4);
  const words = text.split(" ");
  return (
    <span ref={ref} className={`muse-split ${inView ? "in" : ""} ${className}`}>
      {words.map((w, i) => (
        <span key={i} className="word" style={{ marginRight: "0.24em" }}>
          <span style={{ "--sd": `${delay + i * 0.06}s` } as React.CSSProperties}>{w}</span>
        </span>
      ))}
    </span>
  );
}

/* ── Magnetic wrapper ── */
function Magnetic({ children, strength = 0.25 }: { children: React.ReactNode; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el || window.matchMedia("(hover: none)").matches) return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
  }, [strength]);
  const onLeave = useCallback(() => {
    const el = ref.current;
    if (el) el.style.transform = "translate(0,0)";
  }, []);
  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} style={{ transition: "transform .18s ease-out", display: "inline-block" }}>
      {children}
    </div>
  );
}

/* ── Mouse + gyroscope parallax ── */
function useParallax<T extends HTMLElement>(strength = 16) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let tx = 0, ty = 0, cx = 0, cy = 0;
    const onMouse = (e: MouseEvent) => { tx = (e.clientX / innerWidth - 0.5) * 2; ty = (e.clientY / innerHeight - 0.5) * 2; };
    const onOrient = (e: DeviceOrientationEvent) => { const g = Math.max(-1, Math.min(1, (e.gamma ?? 0) / 45)); const b = Math.max(-1, Math.min(1, (e.beta ?? 0) / 90)); tx = g; ty = b; };
    let raf = 0;
    const tick = () => {
      cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
      el.querySelectorAll<HTMLElement>("[data-depth]").forEach((n) => { const d = parseFloat(n.dataset.depth || "0"); n.style.transform = `translate(${cx * d * strength}px, ${cy * d * strength}px)`; });
      raf = requestAnimationFrame(tick);
    };
    addEventListener("mousemove", onMouse);
    addEventListener("deviceorientation", onOrient);
    raf = requestAnimationFrame(tick);
    return () => { removeEventListener("mousemove", onMouse); removeEventListener("deviceorientation", onOrient); cancelAnimationFrame(raf); };
  }, [strength]);
  return ref;
}

/* ── Count-up number ── */
function CountUp({ end, duration = 1600 }: { end: number; duration?: number }) {
  const { ref, inView } = useInView<HTMLSpanElement>(0.5);
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / duration);
      setVal(Math.round(end * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, end, duration]);
  return <span ref={ref}>{val.toLocaleString()}</span>;
}

/* ── 3D tilt card ── */
function TiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el || window.matchMedia("(hover: none)").matches) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${px * 9}deg) rotateX(${-py * 9}deg) translateY(-4px)`;
  };
  const onLeave = () => { const el = ref.current; if (el) el.style.transform = "perspective(900px) rotateY(0) rotateX(0) translateY(0)"; };
  return <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} className={`muse-tilt ${className}`}>{children}</div>;
}

/* ── Floating particles ── */
function Particles({ count = 16 }: { count?: number }) {
  return (
    <div className="muse-particles" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="muse-particle" style={{ "--x": `${(i * 61) % 100}%`, "--d": `${14 + (i % 8) * 2}s`, "--i": i } as React.CSSProperties} />
      ))}
    </div>
  );
}

/* ── Bouncing scroll cue ── */
function ScrollCue() {
  return (
    <div className="muse-scroll-cue" aria-hidden="true">
      <div className="chev">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
      </div>
    </div>
  );
}

/* ── Custom cursor ── */
function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia("(hover: none)").matches) return;
    const dot = dotRef.current, ring = ringRef.current;
    if (!dot || !ring) return;
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, hovering = false;
    const onMove = (e: MouseEvent) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`;
      const t = e.target as HTMLElement;
      const hov = !!t.closest("a, button, input, select, .muse-feature-card, .muse-tier-card");
      if (hov !== hovering) { hovering = hov; ring.classList.toggle("hovering", hov); }
    };
    const onDown = () => ring.classList.add("clicking");
    const onUp = () => ring.classList.remove("clicking");
    const tick = () => {
      rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
      requestAnimationFrame(tick);
    };
    addEventListener("mousemove", onMove);
    addEventListener("mousedown", onDown);
    addEventListener("mouseup", onUp);
    const raf = requestAnimationFrame(tick);
    return () => { removeEventListener("mousemove", onMove); removeEventListener("mousedown", onDown); removeEventListener("mouseup", onUp); cancelAnimationFrame(raf); };
  }, []);
  return (
    <>
      <div ref={dotRef} className="muse-cursor-dot" />
      <div ref={ringRef} className="muse-cursor-ring" />
    </>
  );
}

/* ── Marquee ── */
const MARQUEE = ["Photographers", "Models", "Filmmakers", "Musicians", "Designers", "Actors", "Directors", "Artists"];
function Marquee() {
  const items = [...MARQUEE, ...MARQUEE];
  return (
    <div className="muse-marquee" aria-hidden="true">
      <div className="muse-marquee-track">
        {items.map((w, i) => (
          <span key={i} className={`muse-marquee-item ${i % 3 === 0 ? "solid" : i % 3 === 1 ? "outline" : "dim"}`}>
            {w} <span style={{ opacity: 0.4, marginLeft: "0.6em" }}>✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: <FiHeart size={28} />, title: "Discover & Match", desc: "Swipe through creatives near you. Match when you're both into it." },
  { icon: <FiZap size={28} />, title: "Collab Briefs", desc: "Post a paid or TFP project. Creatives apply directly. No middlemen." },
  { icon: <FiMessageSquare size={28} />, title: "Chat & Booking", desc: "Message instantly. Book with escrow and disclosure forms built in." },
  { icon: <FiShield size={28} />, title: "Safety First", desc: "Disclosure forms, check-ins, and instant block — for every shoot." },
  { icon: <FiUsers size={28} />, title: "Communities & Events", desc: "Find your people. RSVP to mixers and local creative events." },
  { icon: <FiCamera size={28} />, title: "Verified Profiles", desc: "Phone + face verification. Real people, real portfolios." },
];

const STEPS = [
  { num: "01", title: "Join & Verify", desc: "Make your profile. Verify in seconds." },
  { num: "02", title: "Discover & Match", desc: "Swipe. Match. Skip the cold DMs." },
  { num: "03", title: "Collaborate Safely", desc: "Chat, book, and shoot — with safety built in." },
  { num: "04", title: "Build Your Network", desc: "Grow a network that books you work." },
];

const SAFETY = [
  { icon: <FiLock size={22} />, title: "Disclosure Forms", desc: "Both parties agree on boundaries before booking." },
  { icon: <FiClock size={22} />, title: "24hr Check-Ins", desc: "A quick prompt before every shoot. Cancel with one tap." },
  { icon: <FiMapPin size={22} />, title: "Trusted Contact", desc: "Share shoot details with anyone via SMS." },
  { icon: <FiShield size={22} />, title: "Two-Track Enforcement", desc: "Clear rules. Instant action when they're broken." },
  { icon: <FiGlobe size={22} />, title: "Age Verification", desc: "Stripe Identity before paid bookings. No self-reporting." },
  { icon: <FiMessageSquare size={22} />, title: "Transparent Reporting", desc: "Report someone and see the actual outcome." },
];

const TIERS = [
  { cls: "founding", badge: "Founding", name: "First 150", perks: ["Lifetime Muse Pro", "Founders Page Spotlight", "Direct Feedback Channel", "Early Access to Everything", "Exclusive Founding Badge"] },
  { cls: "early", badge: "Early Member", name: "Up to 1,000", perks: ["6 Months Free Pro", "Early Access", "Early Member Badge", "Priority Support"] },
  { cls: "standard", badge: "Standard", name: "Everyone Else", perks: ["Free Tier Forever", "Pro at $9.99/mo", "Earn Pro via Referrals"] },
];

export default function MuseLandingPage() {
  const [signupCount, setSignupCount] = useState(0);
  const [selectedSource, setSelectedSource] = useState<keyof typeof QR_SOURCES>("default");
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({ email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);
  const [navScrolled, setNavScrolled] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const railFillRef = useRef<HTMLDivElement>(null);
  const railDotRef = useRef<HTMLDivElement>(null);
  const heroParallax = useParallax<HTMLDivElement>(16);

  useEffect(() => {
    fetch("/api/muse/landing-stats").then(r => r.json()).then(d => { if (d.count !== undefined) setSignupCount(d.count); }).catch(() => {});
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setNavScrolled(window.scrollY > 40);
      const h = document.documentElement;
      const p = h.scrollTop / (h.scrollHeight - h.clientHeight) * 100;
      if (progressRef.current) progressRef.current.style.width = p + "%";
      if (railFillRef.current) railFillRef.current.style.height = p + "%";
      if (railDotRef.current) railDotRef.current.style.top = p + "%";
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, []);

  const generateQrCode = async (source: keyof typeof QR_SOURCES) => {
    const url = `https://wyzdesign.com/muse/landing${QR_SOURCES[source] || ""}`;
    try {
      const res = await fetch(`/api/qr?url=${encodeURIComponent(url)}`);
      const blob = await res.blob();
      setQrDataUrl(URL.createObjectURL(blob));
    } catch { setQrDataUrl(""); }
    setShowQrModal(true);
  };

  const copyLink = () => {
    navigator.clipboard?.writeText(`https://wyzdesign.com/muse/landing${QR_SOURCES[selectedSource] || ""}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/muse/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...formData, source: selectedSource }) });
      const data = await res.json();
      if (res.ok) {
        setSubmitResult({ success: true, message: "You're on the list! We'll notify you when Muse launches." });
        setFormData({ email: "", phone: "" });
      } else setSubmitResult({ success: false, message: data.error || "Something went wrong" });
    } catch { setSubmitResult({ success: false, message: "Network error. Please try again." }); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="muse-landing">
      <BackgroundScene flash={null} />
      <div className="muse-noise" />
      <div ref={progressRef} className="muse-progress" />
      <div className="muse-scroll-rail" aria-hidden="true">
        <div ref={railFillRef} className="muse-scroll-rail-fill" />
        <div ref={railDotRef} className="muse-scroll-rail-dot" />
      </div>
      <Cursor />

      <div className="muse-content">
      {/* Nav */}
      <nav className={`muse-nav ${navScrolled ? "scrolled" : ""}`}>
        <div className="muse-nav-logo">Muse<span className="accent">✦</span></div>
        <div className="muse-nav-links">
          <a href="#features">Features</a>
          <a href="#how">How It Works</a>
          <a href="#safety">Safety</a>
          <a href="#founding">Founding</a>
        </div>
        <a href="#join" className="muse-nav-cta">Join the Waitlist</a>
      </nav>

      {/* Hero */}
      <section className="muse-hero" ref={heroParallax}>
        <div className="muse-hero-bg">
          <div className="muse-orb gold" data-depth="1" />
          <div className="muse-orb coral" data-depth="1.7" />
          <div className="muse-orb lavender" data-depth="2.4" />
        </div>
        <div className="muse-hero-inner">
          <div className="muse-hero-eyebrow" data-depth="-0.6"><span className="dot" /> Founding members get lifetime Pro</div>
          <h1 className="muse-hero-title">
            <span className="line" data-depth="-0.4"><SplitText text="Where Creatives" delay={0.15} /></span>
            <span className="line" data-depth="-0.4"><SplitText text="Find Their" delay={0.4} /></span>
            <span className="line gradient muse-animated-gradient" data-depth="-0.4"><SplitText text="Muse" delay={0.65} /></span>
          </h1>
          <p className="muse-hero-sub" data-depth="-0.3">Connect with photographers, models, filmmakers, and more. Collaborate on real work. Get booked — safely.</p>
          <div className="muse-hero-actions">
            <Magnetic><a href="#join" className="muse-btn primary muse-shimmer">Join the Waitlist <FiArrowRight size={16} /></a></Magnetic>
            <Magnetic><a href="#features" className="muse-btn ghost">Explore Features</a></Magnetic>
          </div>
        </div>
        <div className="muse-hero-scroll">
          <span>Scroll</span>
          <div className="track" />
        </div>
      </section>

      <Marquee />

      {/* Stats */}
      <section className="muse-stats">
        <Reveal>
          <div className="muse-stats-grid">
            <div className="muse-stat"><span className="num"><CountUp end={signupCount} />+</span><span className="lbl">Creatives</span></div>
            <div className="muse-stat"><span className="num"><CountUp end={12} /></span><span className="lbl">Cities</span></div>
            <div className="muse-stat"><span className="num"><CountUp end={100} />%</span><span className="lbl">Verified</span></div>
          </div>
        </Reveal>
      </section>

      <ScrollCue />

      {/* Features */}
      <section id="features" className="muse-section">
        <div className="muse-container">
          <Reveal className="muse-section-head">
            <span className="muse-kicker">The Platform</span>
            <h2 className="muse-section-title">Built for How You <span className="accent">Actually Work</span></h2>
            <p className="muse-section-sub">Not a dating app. Not a job board. A creative convergence.</p>
          </Reveal>
          <div className="muse-features-grid">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.08}>
                <TiltCard className="h-full">
                  <article className="muse-feature-card">
                    <div className="muse-feature-icon">{f.icon}</div>
                    <h3>{f.title}</h3>
                    <p>{f.desc}</p>
                  </article>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="muse-section">
        <div className="muse-container">
          <Reveal className="muse-section-head">
            <span className="muse-kicker">The Journey</span>
            <h2 className="muse-section-title">From Signup to <span className="accent">Shoot</span> in 4 Steps</h2>
          </Reveal>
          <div className="muse-steps">
            {STEPS.map((s, i) => (
              <Reveal key={s.num} delay={i * 0.1}>
                <div className="muse-step">
                  <div className="muse-step-num">{s.num}</div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Safety */}
      <section id="safety" className="muse-section muse-safety">
        <div className="muse-container">
          <Reveal className="muse-section-head">
            <span className="muse-kicker">Trust &amp; Safety</span>
            <h2 className="muse-section-title">Safety Isn't a Feature.<br /><span className="accent">It's the Foundation.</span></h2>
            <p className="muse-section-sub">Every tool exists because someone needed it and didn't have it.</p>
          </Reveal>
          <div className="muse-safety-grid">
            {SAFETY.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.06}>
                <TiltCard className="h-full">
                  <div className="muse-safety-card">
                    {s.icon}
                    <h3>{s.title}</h3>
                    <p>{s.desc}</p>
                  </div>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Founding members */}
      <section id="founding" className="muse-section">
        <div className="muse-container">
          <Reveal className="muse-section-head">
            <span className="muse-kicker">Founding Program</span>
            <h2 className="muse-section-title">Founding Members <span className="accent">Get More</span></h2>
            <p className="muse-section-sub">The first 150 creatives shape what Muse becomes.</p>
          </Reveal>
          <div className="muse-tiers">
            {TIERS.map((t, i) => (
              <Reveal key={t.name} delay={i * 0.1}>
                <TiltCard className="h-full">
                  <article className={`muse-tier-card ${t.cls}`}>
                    <span className="muse-tier-badge">{t.badge}</span>
                    <h3>{t.name}</h3>
                    {t.perks.map(p => <div key={p} className="muse-tier-perk"><FiStar size={13} /> {p}</div>)}
                  </article>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="join" className="muse-cta">
        <div className="muse-container">
          <Reveal>
            <div className="muse-cta-card">
              <h2>Ready to Find Your <span className="accent" style={{ color: "var(--gold)", fontStyle: "italic" }}>Muse?</span></h2>
              <p>Join {signupCount.toLocaleString()}+ creatives already on the waitlist. Founding member spots are filling fast.</p>
              <form onSubmit={handleSubmit} className="muse-form">
                <div className="muse-form-row">
                  <div className="muse-form-group">
                    <label htmlFor="email">Email</label>
                    <input id="email" type="email" placeholder="you@domain.com" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} required />
                  </div>
                  <div className="muse-form-group">
                    <label htmlFor="phone">Phone (optional)</label>
                    <input id="phone" type="tel" placeholder="+1 (555) 000-0000" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                </div>
                <button type="submit" className="muse-btn primary" style={{ width: "100%", justifyContent: "center" }} disabled={submitting}>{submitting ? (<><span className="muse-spinner" /> Joining...</>) : (<>Claim My Spot <FiArrowRight size={16} /></>)}</button>
                {submitResult && <div className={`muse-toast ${submitResult.success ? "success" : "error"}`}>{submitResult.message}</div>}
                <p className="muse-form-note">By joining, you agree to our <a href="/muse/terms">Terms</a> &amp; <a href="/muse/privacy">Privacy Policy</a>. No spam, ever.</p>
              </form>

              <div className="muse-qr">
                <button type="button" className="muse-qr-btn" onClick={() => generateQrCode(selectedSource)}><FiLink size={16} /> Get Your Personal QR Code</button>
                <div className="muse-qr-sources">
                  <label>Track your referrals:</label>
                  <select value={selectedSource} onChange={e => setSelectedSource(e.target.value as keyof typeof QR_SOURCES)} className="muse-qr-select">
                    <option value="default">General Link</option>
                    <option value="mixer_la">LA Photo Mixer</option>
                    <option value="mixer_nyc">NYC Photo Mixer</option>
                    <option value="mixer_chi">Chicago Photo Mixer</option>
                    <option value="instagram">Instagram Bio</option>
                    <option value="twitter">Twitter/X Link</option>
                    <option value="personal">Personal Invite</option>
                  </select>
                  <button type="button" className="muse-copy-btn" onClick={copyLink}>{copied ? "✓ Copied!" : "Copy Link"}</button>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="muse-footer">
        <div className="muse-container">
          <div className="muse-footer-grid">
            <div>
              <div className="muse-footer-logo">Muse<span className="accent">✦</span></div>
              <p>Where creatives converge.</p>
            </div>
            <nav><h4>Product</h4><ul><li><a href="#features">Features</a></li><li><a href="#safety">Safety</a></li><li><a href="/muse/pricing">Pricing</a></li><li><a href="/muse/faq">FAQ</a></li></ul></nav>
            <nav><h4>Company</h4><ul><li><a href="/muse/about">About</a></li><li><a href="/muse/blog">Blog</a></li><li><a href="/muse/careers">Careers</a></li><li><a href="/muse/press">Press</a></li></ul></nav>
            <nav><h4>Legal</h4><ul><li><a href="/muse/terms">Terms</a></li><li><a href="/muse/privacy">Privacy</a></li><li><a href="/muse/guidelines">Guidelines</a></li><li><a href="/muse/safety">Safety Center</a></li></ul></nav>
          </div>
          <div className="muse-footer-bottom"><p>© {new Date().getFullYear()} Muse. Built by WYZ Design.</p></div>
        </div>
      </footer>
      </div>

      {/* QR Modal */}
      {showQrModal && (
        <div className="muse-modal-overlay" onClick={() => setShowQrModal(false)}>
          <div className="muse-modal" onClick={e => e.stopPropagation()}>
            <button className="muse-modal-close" onClick={() => setShowQrModal(false)}>✕</button>
            <h3>Your Personal QR Code</h3>
            <p>Share this to track referrals from <strong>{String(selectedSource).replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</strong></p>
            {qrDataUrl ? <img src={qrDataUrl} alt="QR Code" className="muse-modal-qr" /> : <div className="muse-modal-qr-placeholder">QR Code Generator API needed</div>}
            <div className="muse-modal-actions">
              <button className="muse-modal-btn" onClick={copyLink}>{copied ? "✓ Copied!" : "Copy Link"}</button>
              <button className="muse-modal-btn secondary" onClick={() => setShowQrModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <SplashScreen />
    </div>
  );
}
