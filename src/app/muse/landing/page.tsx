"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { FiCamera, FiUsers, FiZap, FiShield, FiHeart, FiStar, FiArrowRight, FiMessageSquare, FiMapPin, FiClock, FiLock, FiGlobe, FiLink } from "react-icons/fi";
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
  { icon: <FiHeart size={28} />, title: "Discover & Match", desc: "Swipe-based discovery tailored to your creative type, style tags, and location. Match with photographers, models, filmmakers, and musicians who align with your vision." },
  { icon: <FiZap size={28} />, title: "Collab Briefs", desc: "Post paid or TFP projects with budgets, timelines, and requirements. Creatives apply directly — no middlemen, no guesswork." },
  { icon: <FiMessageSquare size={28} />, title: "Real Chat & Booking", desc: "Matched? Message instantly. Book sessions with built-in escrow payments, disclosure forms, and safety check-ins." },
  { icon: <FiShield size={28} />, title: "Safety First", desc: "Mandatory disclosure forms for sensitive shoots, 24hr pre-shoot check-ins, trusted contact sharing, and instant block/report." },
  { icon: <FiUsers size={28} />, title: "Communities & Events", desc: "Join local creative groups, RSVP to mixers, find studio partners, and connect with pros in your city." },
  { icon: <FiCamera size={28} />, title: "Verified Profiles", desc: "Phone + email verification at signup. Face verification before paid bookings. Badges for responsiveness and collaboration history." },
];

const STEPS = [
  { num: "01", title: "Join & Verify", desc: "Create your profile, add your creative type, style tags, and portfolio. Verify phone + email instantly." },
  { num: "02", title: "Discover & Match", desc: "Swipe through creatives near you. Match when interest is mutual. No fake profiles, no bots." },
  { num: "03", title: "Collaborate Safely", desc: "Chat, share disclosure forms, book with escrow, and run 24hr safety check-ins." },
  { num: "04", title: "Build Your Network", desc: "Earn badges, get reviews, join communities, and grow a network that books you work." },
];

const SAFETY = [
  { icon: <FiLock size={22} />, title: "Disclosure Forms", desc: "Structured checkboxes for compensation, content boundaries, location, and attendees. Both parties confirm before booking." },
  { icon: <FiClock size={22} />, title: "24hr Check-Ins", desc: "Automated prompt before every shoot. Confirm nothing's changed or cancel with one tap." },
  { icon: <FiMapPin size={22} />, title: "Trusted Contact", desc: "Share shoot details with anyone via SMS — they don't need the app." },
  { icon: <FiShield size={22} />, title: "Two-Track Enforcement", desc: "Standard issues: graduated warnings. Explicit content + payment? Immediate block + founder review." },
  { icon: <FiGlobe size={22} />, title: "Age Verification", desc: "Stripe Identity document + selfie verification before any paid booking. No self-reported birthdates." },
  { icon: <FiMessageSquare size={22} />, title: "Transparent Reporting", desc: "Report someone and know the actual outcome — not just \"we reviewed it\"." },
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
  const [loaded, setLoaded] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 1600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    fetch("/api/muse/landing-stats").then(r => r.json()).then(d => { if (d.count !== undefined) setSignupCount(d.count); }).catch(() => {});
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setNavScrolled(window.scrollY > 40);
      const h = document.documentElement;
      const p = h.scrollTop / (h.scrollHeight - h.clientHeight) * 100;
      if (progressRef.current) progressRef.current.style.width = p + "%";
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
      <div className="muse-noise" />
      <div ref={progressRef} className="muse-progress" />
      <Cursor />

      {/* Preloader */}
      <div className={`muse-preloader ${loaded ? "done" : ""}`}>
        <div className="muse-preloader-word">
          <span>M</span><span>u</span><span className="accent">s</span><span>e</span>
        </div>
      </div>

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
      <section className="muse-hero">
        <div className="muse-hero-bg">
          <div className="muse-orb gold" />
          <div className="muse-orb coral" />
          <div className="muse-orb lavender" />
        </div>
        <div className="muse-hero-inner">
          <div className="muse-hero-eyebrow"><span className="dot" /> Founding members get lifetime Pro</div>
          <h1 className="muse-hero-title">
            <span className="line"><SplitText text="Where Creatives" delay={0.15} /></span>
            <span className="line"><SplitText text="Find Their" delay={0.4} /></span>
            <span className="line gradient"><SplitText text="Muse" delay={0.65} /></span>
          </h1>
          <p className="muse-hero-sub">The first platform built for photographers, models, filmmakers, musicians, actors, and designers to connect, collaborate, and get booked — safely.</p>
          <div className="muse-hero-actions">
            <Magnetic><a href="#join" className="muse-btn primary">Join the Waitlist <FiArrowRight size={16} /></a></Magnetic>
            <Magnetic><a href="#features" className="muse-btn ghost">Explore Features</a></Magnetic>
          </div>
        </div>
        <div className="muse-hero-scroll">
          <span>Scroll</span>
          <div className="track" />
        </div>
      </section>

      <Marquee />

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
                <article className="muse-feature-card">
                  <div className="muse-feature-icon">{f.icon}</div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </article>
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
                <div className="muse-safety-card">
                  {s.icon}
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
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
                <article className={`muse-tier-card ${t.cls}`}>
                  <span className="muse-tier-badge">{t.badge}</span>
                  <h3>{t.name}</h3>
                  {t.perks.map(p => <div key={p} className="muse-tier-perk"><FiStar size={13} /> {p}</div>)}
                </article>
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
    </div>
  );
}
