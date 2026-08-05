"use client";

import { useState, useEffect } from "react";
import { FiCamera, FiUsers, FiZap, FiShield, FiHeart, FiStar, FiArrowRight, FiMessageSquare, FiMapPin, FiClock, FiLock, FiGlobe } from "react-icons/fi";
import { TbQrcode } from "react-icons/tb";
import "./landing.css";

const QR_SOURCES = {
  default: "",
  mixer_la: "?src=mixer_la",
  mixer_nyc: "?src=mixer_nyc",
  mixer_chi: "?src=mixer_chi",
  instagram: "?src=instagram_bio",
  twitter: "?src=twitter_link",
  personal: "?src=personal_invite",
};

export default function MuseLandingPage() {
  const [signupCount, setSignupCount] = useState(0);
  const [selectedSource, setSelectedSource] = useState("default");
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({ email: "", phone: "", source: "default" });
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch live signup count
  useEffect(() => {
    fetch("/api/muse/landing-stats")
      .then(r => r.json())
      .then(d => { if (d.count !== undefined) setSignupCount(d.count); })
      .catch(() => {});
  }, []);

  const generateQrCode = async (source: string) => {
    const url = `https://wyzdesign.com/muse${QR_SOURCES[source as keyof typeof QR_SOURCES] || ""}`;
    try {
      const res = await fetch(`/api/qr?url=${encodeURIComponent(url)}`);
      const blob = await res.blob();
      setQrDataUrl(URL.createObjectURL(blob));
      setShowQrModal(true);
    } catch {
      setQrDataUrl("");
      setShowQrModal(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/muse/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, source: selectedSource }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitResult({ success: true, message: "You're on the list! We'll notify you when Muse launches." });
        setFormData({ email: "", phone: "", source: "default" });
      } else {
        setSubmitResult({ success: false, message: data.error || "Something went wrong" });
      }
    } catch {
      setSubmitResult({ success: false, message: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = () => {
    const url = `https://wyzdesign.com/muse${QR_SOURCES[selectedSource as keyof typeof QR_SOURCES] || ""}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-bg">
          <div className="landing-orb orb-1" />
          <div className="landing-orb orb-2" />
          <div className="landing-orb orb-3" />
        </div>
        <div className="landing-container">
          <header className="landing-header">
            <div className="landing-logo">Muse</div>
            <nav className="landing-nav">
              <a href="#features">Features</a>
              <a href="#how-it-works">How It Works</a>
              <a href="#safety">Safety</a>
            </nav>
          </header>

          <div className="landing-hero-content">
            <div className="landing-badge">
              <FiStar size={14} /> <span>Founding members get lifetime Pro</span>
            </div>
            <h1 className="landing-title">
              Where Creatives<br />
              <span className="landing-title-gold">Find Their Muse</span>
            </h1>
            <p className="landing-subtitle">
              The first platform built for photographers, models, filmmakers, musicians, and designers to connect, collaborate, and get booked — safely.
            </p>

            <div className="landing-stats">
              <div className="landing-stat">
                <span className="landing-stat-number">{signupCount.toLocaleString()}+</span>
                <span className="landing-stat-label">Creatives Signed Up</span>
              </div>
              <div className="landing-stat-divider" />
              <div className="landing-stat">
                <span className="landing-stat-number">12</span>
                <span className="landing-stat-label">Cities</span>
              </div>
              <div className="landing-stat-divider" />
              <div className="landing-stat">
                <span className="landing-stat-number">100%</span>
                <span className="landing-stat-label">Verified Profiles</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="landing-form">
              <div className="landing-form-row">
                <div className="landing-form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="you@domain.com"
                    value={formData.email}
                    onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="landing-form-group">
                  <label htmlFor="phone">Phone (optional)</label>
                  <input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>
              <button type="submit" className="landing-btn" disabled={submitting}>
                {submitting ? (
                  <>
                    <div className="landing-spinner" />
                    <span>Joining...</span>
                  </>
                ) : (
                  <>
                    <FiArrowRight size={18} />
                    <span>Join the Waitlist</span>
                  </>
                )}
              </button>
              {submitResult && (
                <div className={`landing-toast ${submitResult.success ? "success" : "error"}`}>
                  {submitResult.message}
                </div>
              )}
              <p className="landing-form-note">By joining, you agree to our <a href="/muse/terms">Terms</a> & <a href="/muse/privacy">Privacy Policy</a>. No spam, ever.</p>
            </form>

            <div className="landing-qr-section">
              <button 
                type="button" 
                className="landing-qr-btn"
                onClick={() => generateQrCode(selectedSource)}
              >
                <TbQrcode size={18} />
                <span>Get Your Personal QR Code</span>
              </button>
              <div className="landing-qr-sources">
                <label>Track your referrals:</label>
                <select 
                  value={selectedSource} 
                  onChange={e => setSelectedSource(e.target.value)}
                  className="landing-qr-select"
                >
                  <option value="default">General Link</option>
                  <option value="mixer_la">LA Photo Mixer</option>
                  <option value="mixer_nyc">NYC Photo Mixer</option>
                  <option value="mixer_chi">Chicago Photo Mixer</option>
                  <option value="instagram">Instagram Bio</option>
                  <option value="twitter">Twitter/X Link</option>
                  <option value="personal">Personal Invite</option>
                </select>
                <button type="button" className="landing-copy-btn" onClick={copyLink}>
                  {copied ? "✓ Copied!" : "Copy Link"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="landing-features">
        <div className="landing-container">
          <div className="landing-section-header">
            <h2>Built for How You Actually Work</h2>
            <p>Not a dating app. Not a job board. A creative convergence.</p>
          </div>

          <div className="landing-features-grid">
            <article className="landing-feature-card">
              <div className="landing-feature-icon"><FiCamera size={28} /></div>
              <h3>Discover & Match</h3>
              <p>Swipe-based discovery tailored to your creative type, style tags, and location. Match with photographers, models, filmmakers, and musicians who align with your vision.</p>
            </article>

            <article className="landing-feature-card">
              <div className="landing-feature-icon"><FiZap size={28} /></div>
              <h3>Collab Briefs</h3>
              <p>Post paid or TFP projects with budgets, timelines, and requirements. Creatives apply directly — no middlemen, no guesswork.</p>
            </article>

            <article className="landing-feature-card">
              <div className="landing-feature-icon"><FiMessageSquare size={28} /></div>
              <h3>Real Chat & Booking</h3>
              <p>Matched? Message instantly. Book sessions with built-in escrow payments, disclosure forms, and safety check-ins.</p>
            </article>

            <article className="landing-feature-card">
              <div className="landing-feature-icon"><FiShield size={28} /></div>
              <h3>Safety First</h3>
              <p>Mandatory disclosure forms for sensitive shoots, 24hr pre-shoot check-ins, trusted contact sharing, and instant block/report.</p>
            </article>

            <article className="landing-feature-card">
              <div className="landing-feature-icon"><FiUsers size={28} /></div>
              <h3>Communities & Events</h3>
              <p>Join local creative groups, RSVP to mixers, find studio partners, and connect with pros in your city.</p>
            </article>

            <article className="landing-feature-card">
              <div className="landing-feature-icon"><FiHeart size={28} /></div>
              <h3>Verified Profiles</h3>
              <p>Phone + email verification at signup. Face verification before paid bookings. Badges for responsiveness, portfolio completion, and collaboration history.</p>
            </article>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="landing-how">
        <div className="landing-container">
          <div className="landing-section-header">
            <h2>From Signup to Shoot in 4 Steps</h2>
          </div>

          <div className="landing-steps">
            <div className="landing-step">
              <div className="landing-step-number">1</div>
              <h3>Join & Verify</h3>
              <p>Create your profile, add your creative type, style tags, and portfolio. Verify phone + email instantly.</p>
            </div>
            <div className="landing-step">
              <div className="landing-step-number">2</div>
              <h3>Discover & Match</h3>
              <p>Swipe through creatives near you. Match when interest is mutual. No fake profiles, no bots.</p>
            </div>
            <div className="landing-step">
              <div className="landing-step-number">3</div>
              <h3>Collaborate Safely</h3>
              <p>Chat, share disclosure forms for sensitive work, book with escrow payments, and run 24hr safety check-ins.</p>
            </div>
            <div className="landing-step">
              <div className="landing-step-number">4</div>
              <h3>Build Your Network</h3>
              <p>Earn badges, get reviews, join communities, and grow a real creative network that books you work.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Safety Section */}
      <section id="safety" className="landing-safety">
        <div className="landing-container">
          <div className="landing-section-header">
            <h2>Safety Isn't a Feature. It's the Foundation.</h2>
            <p>Every tool exists because someone needed it and didn't have it.</p>
          </div>

          <div className="landing-safety-grid">
            <div className="landing-safety-card">
              <FiLock size={24} />
              <h3>Disclosure Forms</h3>
              <p>Structured checkboxes for compensation, content boundaries, location, and attendees. Both parties must confirm before booking.</p>
            </div>
            <div className="landing-safety-card">
              <FiClock size={24} />
              <h3>24hr Check-Ins</h3>
              <p>Automated prompt before every shoot. Confirm nothing's changed or cancel with one tap — no explanation needed.</p>
            </div>
            <div className="landing-safety-card">
              <FiMapPin size={24} />
              <h3>Trusted Contact Sharing</h3>
              <p>Share shoot details (location, time, who you're meeting) with anyone via SMS — they don't need the app.</p>
            </div>
            <div className="landing-safety-card">
              <FiShield size={24} />
              <h3>Two-Track Enforcement</h3>
              <p>Standard issues: graduated warnings. Explicit content + payment? Immediate block + founder review. No gray areas.</p>
            </div>
            <div className="landing-safety-card">
              <FiGlobe size={24} />
              <h3>Age Verification</h3>
              <p>Stripe Identity document + selfie verification required before any paid booking. No self-reported birthdates.</p>
            </div>
            <div className="landing-safety-card">
              <FiMessageSquare size={24} />
              <h3>Transparent Reporting</h3>
              <p>If you report someone, you'll know the outcome. Not just "we reviewed it" — the actual action taken.</p>
            </div>
            <div className="landing-safety-card">
              <FiLock size={24} />
              <h3>Content Scanning</h3>
              <p>Every upload scanned via AWS Rekognition. CSAM/explicit content auto-blocked and escalated to NCMEC.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Founding Members */}
      <section className="landing-founding">
        <div className="landing-container">
          <div className="landing-section-header">
            <h2>Founding Members Get More</h2>
            <p>The first 150 creatives shape what Muse becomes.</p>
          </div>

          <div className="landing-tiers">
            <article className="landing-tier-card founding">
              <div className="landing-tier-badge">FOUNDING</div>
              <h3>First 150</h3>
              <div className="landing-tier-perk">🏆 Lifetime Muse Pro</div>
              <div className="landing-tier-perk">📍 Founders Page Spotlight</div>
              <div className="landing-tier-perk">🎯 Direct Feedback Channel</div>
              <div className="landing-tier-perk">⚡ Early Access to Everything</div>
              <div className="landing-tier-perk">💎 Exclusive Founding Badge</div>
            </article>

            <article className="landing-tier-card early">
              <div className="landing-tier-badge">EARLY MEMBER</div>
              <h3>Up to 1,000</h3>
              <div className="landing-tier-perk">⭐ 6 Months Free Pro</div>
              <div className="landing-tier-perk">🎯 Early Access</div>
              <div className="landing-tier-perk">💎 Early Member Badge</div>
              <div className="landing-tier-perk">📊 Priority Support</div>
            </article>

            <article className="landing-tier-card standard">
              <div className="landing-tier-badge">STANDARD</div>
              <h3>Everyone Else</h3>
              <div className="landing-tier-perk">🆓 Free Tier Forever</div>
              <div className="landing-tier-perk">💰 Pro at $9.99/mo</div>
              <div className="landing-tier-perk">🔄 Earn Pro via Referrals</div>
            </article>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta">
        <div className="landing-container">
          <div className="landing-cta-card">
            <h2>Ready to Find Your Muse?</h2>
            <p>Join {signupCount.toLocaleString()}+ creatives already on the waitlist. Founding member spots are filling fast.</p>
            <form onSubmit={handleSubmit} className="landing-form">
              <div className="landing-form-row">
                <input type="email" placeholder="Email" value={formData.email} onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))} required />
                <input type="tel" placeholder="Phone (optional)" value={formData.phone} onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))} />
              </div>
              <button type="submit" className="landing-btn" disabled={submitting}>
                {submitting ? "Joining..." : "Claim My Spot"}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer-grid">
            <div>
              <div className="landing-logo">Muse</div>
              <p>Where creatives converge.</p>
            </div>
            <nav>
              <h4>Product</h4>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#safety">Safety</a></li>
                <li><a href="/muse/pricing">Pricing</a></li>
                <li><a href="/muse/faq">FAQ</a></li>
              </ul>
            </nav>
            <nav>
              <h4>Company</h4>
              <ul>
                <li><a href="/muse/about">About</a></li>
                <li><a href="/muse/blog">Blog</a></li>
                <li><a href="/muse/careers">Careers</a></li>
                <li><a href="/muse/press">Press</a></li>
              </ul>
            </nav>
            <nav>
              <h4>Legal</h4>
              <ul>
                <li><a href="/muse/terms">Terms</a></li>
                <li><a href="/muse/privacy">Privacy</a></li>
                <li><a href="/muse/guidelines">Community Guidelines</a></li>
                <li><a href="/muse/safety">Safety Center</a></li>
              </ul>
            </nav>
          </div>
          <div className="landing-footer-bottom">
            <p>© 2025 Muse. Built by WYZ Design.</p>
          </div>
        </div>
      </footer>

      {/* QR Modal */}
      {showQrModal && (
        <div className="landing-modal-overlay" onClick={() => setShowQrModal(false)}>
          <div className="landing-modal" onClick={e => e.stopPropagation()}>
            <button className="landing-modal-close" onClick={() => setShowQrModal(false)}>✕</button>
            <h3>Your Personal QR Code</h3>
            <p>Share this to track referrals from <strong>{selectedSource.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</strong></p>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code" className="landing-modal-qr" />
            ) : (
              <div className="landing-modal-qr-placeholder">QR Code Generator API needed</div>
            )}
            <div className="landing-modal-actions">
              <button className="landing-modal-btn" onClick={copyLink}>
                {copied ? "✓ Copied!" : "Copy Link"}
              </button>
              <button className="landing-modal-btn secondary" onClick={() => setShowQrModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}