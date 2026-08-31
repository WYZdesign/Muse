"use client";

import React, { memo, useState } from "react";

export interface FdStudio {
  id: string;
  name: string;
  feature: string;
  slug: string;
  price: string;
}

interface FdBuilding {
  id: string;
  label: string;
  phone: string;
  hours: string;
  address?: string;
  emoji: string;
  studios: FdStudio[];
}

const FD_BASE = "https://www.fdphotostudio.com";

// Live data pulled from https://www.fdphotostudio.com (Aug 2026).
// Booking links go DIRECT to each studio's /studio-rent/<slug>/ page so users
// book at the studio itself. Prices are the card "from" rates; see the weekly
// rates table below for the full hour/package breakdown.
const BUILDINGS: FdBuilding[] = [
  {
    id: "main",
    label: "Main Building",
    phone: "+1 (323) 454-2323",
    hours: "24 hrs / 7 days",
    emoji: "🌆",
    studios: [
      { id: "studio-a", name: "Studio A", feature: "Classic · 1000 sq ft + lots of natural light", slug: "studio-a", price: "$34.99" },
      { id: "studio-b", name: "Studio B", feature: "Blackout · black walls & ceiling", slug: "studio-b", price: "$34.99" },
      { id: "studio-c", name: "Studio C", feature: "Large stage · 19 ft Cyc Wall", slug: "studio-c", price: "$49.99" },
      { id: "studio-d", name: "Studio D", feature: "1800 sq ft daylight · North & West windows", slug: "studio-d", price: "$44.99" },
      { id: "studio-e", name: "Studio E", feature: "Daylight · soft light + 3 big windows", slug: "studio-e", price: "$34.99" },
      { id: "studio-f", name: "Studio F", feature: "Downtown skyline views · 2-zone laminate floor", slug: "studio-f", price: "$34.99" },
    ],
  },
  {
    id: "art",
    label: "Art Building",
    phone: "+1 (213) 536-5631",
    hours: "24 hrs / 7 days",
    emoji: "🎨",
    studios: [
      { id: "art-1", name: "Art 1", feature: "White Steps · NW windows, stairs to window, DT views", slug: "art-1", price: "$54.99" },
      { id: "art-2", name: "Art 2", feature: "Wood Floor · real wood, brick wall, podium", slug: "art-2", price: "$44.99" },
      { id: "art-3", name: "Art 3", feature: "Flower Wall · gold furniture, drapes, bath tub", slug: "art-3", price: "$44.99" },
      { id: "art-4", name: "Art 4", feature: "Wood Corner · dark wood corner, marquee star", slug: "art-4", price: "$44.99" },
    ],
  },
  {
    id: "hill",
    label: "Hill Building",
    phone: "+1 (213) 536-8030",
    hours: "24 hrs / 7 days",
    emoji: "🏔️",
    studios: [
      { id: "hill-1", name: "Hill 1", feature: "White Floor · queen wooden bed + baldachin", slug: "hill-1", price: "$39.99" },
      { id: "hill-2", name: "Hill 2", feature: "Light Wall · true blackout, dimmable light wall", slug: "hill-2", price: "$39.99" },
      { id: "hill-3", name: "Hill 3", feature: "Mirror Wall · full mirror wall, white brick", slug: "hill-3", price: "$44.99" },
      { id: "hill-4", name: "Hill 4", feature: "Tuscan/Jungle · corner stage + Vespa scooter", slug: "hill-4", price: "$39.99" },
      { id: "hill-5", name: "Hill 5", feature: "Pink Wall · romantic white stage + French wall", slug: "hill-5", price: "$29.99" },
      { id: "hill-6", name: "Hill 6", feature: "Moroccan Shower · shower, bathtub, lots of props", slug: "hill-6", price: "$44.99" },
      { id: "hill-7", name: "Hill 7", feature: "Rain Room · aqua stage, rain feature + platform", slug: "hill-7", price: "$44.99" },
      { id: "hill-8", name: "Hill 8", feature: "Concrete Wall · phone booth, rusted wall, barn doors", slug: "hill-8", price: "$34.99" },
    ],
  },
  {
    id: "loft",
    label: "LA Lofts",
    phone: "+1 (323) 997-8644",
    hours: "8 AM – 11 PM",
    emoji: "🏠",
    studios: [
      { id: "la-loft-1", name: "LA Loft 1", feature: "French Loft · bedroom + living room sets", slug: "la-loft-1", price: "$54.99" },
      { id: "la-loft-2", name: "LA Loft 2", feature: "Scandinavian · gorgeous loft styling", slug: "la-loft-2", price: "$39.99" },
      { id: "la-loft-3", name: "LA Loft 3", feature: "French Manor · kitchen, dining, seamstress area", slug: "la-loft-3", price: "$44.99" },
      { id: "la-loft-4", name: "LA Loft 4", feature: "Man Cave · RGB screen, pool table, leather", slug: "la-loft-4", price: "$39.99" },
      { id: "la-loft-5", name: "LA Loft 5", feature: "Sunny Loft · daylight + downtown view", slug: "la-loft-5", price: "$49.99" },
      { id: "la-loft-6", name: "LA Loft 6", feature: "Sunset Cycwall · daylight + afternoon light", slug: "la-loft-6", price: "$49.99" },
    ],
  },
  {
    id: "olympic",
    label: "Olympic Building",
    phone: "+1 (323) 968-1089",
    hours: "24 hrs / 7 days",
    emoji: "🏅",
    studios: [
      { id: "olympic-1", name: "Olympic 1", feature: "Underwater · pool + shower, RGB tunnel, roll-up door", slug: "olympic-1", price: "$125" },
      { id: "olympic-2", name: "Olympic 2", feature: "Black Cyc-wall · car studio, cyc wall + rain", slug: "olympic-2", price: "$54.99" },
      { id: "olympic-3", name: "Olympic 3", feature: "Car Turntable · white cycwall, car access", slug: "olympic-3", price: "$44.99" },
      { id: "olympic-4", name: "Olympic 4", feature: "Private Jet · full jet interior", slug: "olympic-4", price: "$34.99" },
      { id: "olympic-5", name: "Olympic 5", feature: "Metal Garage · 3600 sq ft, car access, textures", slug: "olympic-5", price: "$54.99" },
    ],
  },
  {
    id: "yukon",
    label: "Yukon Building",
    phone: "+1 (424) 453-2162",
    hours: "24 hrs / 7 days",
    emoji: "🪩",
    studios: [
      { id: "yukon-1", name: "Yukon 1", feature: "Corner Cyc · large studio with corner cyc wall", slug: "yukon-1", price: "$44.99" },
      { id: "yukon-2", name: "Yukon 2", feature: "White Steps · high ceiling, Greek steps", slug: "yukon-2", price: "$39.99" },
      { id: "yukon-3", name: "Yukon 3", feature: "Water Studio · minimalist white, leather couch", slug: "yukon-3", price: "$29.99" },
      { id: "yukon-4", name: "Yukon 4", feature: "Light Cube · production studio, car access", slug: "yukon-4", price: "$44.99" },
      { id: "yukon-5", name: "Yukon 5", feature: "The RGB Cave · blackout, RGB ceiling, car access", slug: "yukon-5", price: "$49.99" },
    ],
  },
];

interface FdStudioWidgetProps {
  apiFetch: (url: string, opts?: any) => Promise<any>;
}

export const FdStudioWidget = memo(function FdStudioWidget({ apiFetch }: FdStudioWidgetProps) {
  const [open, setOpen] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const count = BUILDINGS.reduce((n, b) => n + b.studios.length, 0);

  const toggle = (id: string) => setOpen(open === id ? null : id);

  const track = (studioId: string, studioName: string) => {
    apiFetch("/api/muse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "track-event", name: "fd_studio_click", props: { from: "sessions", studio: studioId, studioName } }),
    }).catch(() => {});
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: 14,
          borderRadius: 14,
          background: "linear-gradient(135deg, rgba(233,30,99,0.12), rgba(156,39,176,0.12))",
          border: "1px solid rgba(233,30,99,0.25)",
        }}
      >
        <div style={{ fontSize: 26 }}>📸</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>FD Photo Studio — Los Angeles</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
            {count} studios · {BUILDINGS.length} buildings · from $29.99/hr · book direct
          </div>
        </div>
        {open !== null && (
          <div style={{ fontSize: 12, fontWeight: 700, color: "#F48FB1", cursor: "pointer" }} onClick={() => setOpen(null)}>Close ✕</div>
        )}
      </div>

      {BUILDINGS.map((b) => (
        <div key={b.id} style={{ marginTop: 10, borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
          <button
            onClick={() => toggle(b.id)}
            aria-expanded={open === b.id}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 14px",
              background: "none",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              color: "var(--text)",
            }}
          >
            <div style={{ fontSize: 18 }}>{b.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{b.label}</div>
              <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 1 }}>{b.studios.length} studios · {b.hours} · {b.phone}</div>
            </div>
            <div style={{ fontSize: 12, color: open === b.id ? "#F48FB1" : "var(--gold)", fontWeight: 700 }}>{open === b.id ? "−" : "+"}</div>
          </button>

          {open === b.id && (
            <div style={{ padding: "4px 12px 12px" }}>
              {b.studios.map((s) => (
                <div
                  key={s.id}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 4px", borderTop: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>{s.name}</div>
                    <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 1, lineHeight: 1.35 }}>{s.feature}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gold)", marginTop: 3 }}>{s.price}/hr</div>
                  </div>
                  <a
                    href={`${FD_BASE}/studio-rent/${s.slug}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => track(s.id, s.name)}
                    style={{
                      flexShrink: 0,
                      fontSize: 11.5,
                      fontWeight: 700,
                      padding: "8px 12px",
                      borderRadius: 10,
                      textDecoration: "none",
                      color: "#fff",
                      background: "linear-gradient(135deg,#E91E63,#9C27B0)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Book →
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <div
        style={{
          marginTop: 10,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "11px 12px",
          borderRadius: 12,
          background: "rgba(156,39,176,0.08)",
          border: "1px solid rgba(156,39,176,0.25)",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 700,
          color: "var(--text)",
        }}
        role="button"
        tabIndex={0}
        aria-expanded={guideOpen}
        onClick={() => setGuideOpen(!guideOpen)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setGuideOpen(!guideOpen); } }}
      >
        <div style={{ fontSize: 16 }}>📖</div>
        <div style={{ flex: 1 }}>Client Guide — booking, shooting & rules</div>
        <div style={{ fontSize: 12, color: guideOpen ? "#CE93D8" : "var(--gold)", fontWeight: 700 }}>{guideOpen ? "−" : "+"}</div>
      </div>

      {guideOpen && (
        <div style={{ marginTop: 8, padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", fontSize: 11.5, color: "var(--text2)", lineHeight: 1.7 }}>
          <Section icon="🧾" title="How booking works">
            <LI>Pick a studio above (or the “Rent Studio” Calendar on the FD site), check availability, and submit your request.</LI>
            <LI>FD contacts you to confirm project details and issues a <b>payment link</b> — you have <b>48 hrs</b> to pay (unless last-minute).</LI>
            <LI>As soon as you pay, you get a <b>confirmation email</b> with your access code + entry instructions.</LI>
            <LI>Call <b>844-644-3377</b> or chat on their site for help any time.</LI>
          </Section>
          <Section icon="🎟️" title="Check-in & your time slot">
            <LI><b>Self check-in:</b> use the access code you receive on the day — no key pickup needed.</LI>
            <LI>Access code activates <b>10 min before</b> your slot and deactivates <b>10 min after</b> it ends.</LI>
            <LI>Your booking time <b>includes setup, the shoot, and breakdown</b> — plan accordingly.</LI>
            <LI>If the previous crew finished early, you can start as soon as your code is live.</LI>
            <LI>Every stage is <b>private</b> with a lockable door. All-day hours except <b>LA Lofts 8 AM–11 PM</b>.</LI>
          </Section>
          <Section icon="💡" title="What’s included">
            <LI>Most stages: <b>3× AlienBees 800 lights</b> on C-stands + wireless trigger, light modifiers, sandbags, apple boxes, A-clamps, and 2 extra C-stands with arms.</LI>
            <LI>Makeup station (mirror + 2 stools), clothing racks, and a <b>steamer at no cost</b>.</LI>
            <LI>Bluetooth/aux <b>sound system</b>, complimentary <b>Wi-Fi</b>, mini-fridge + microwave in reception.</LI>
            <LI>Fog machine available — reserve ahead: <b>$15/hr</b> (1-hr min).</LI>
            <LI>Stools & folding chairs at no extra charge (shared — return after use).</LI>
            <LI>Specialty stages (cars, cyc walls, water, rain) vary — confirm with FD when booking.</LI>
          </Section>
          <Section icon="💰" title="Hourly vs packages — save money">
            <LI>Hourly is best to try a studio once; packages pay off for regular clients.</LI>
            <LI><b>4 / 8 / 12-hr packs</b> save roughly 11% / 22% / 33% vs the hourly rate.</LI>
            <LI>Pack hours never expire, can be split across many sessions, and lock in the price.</LI>
            <LI>Any fraction of an hour is billed as a full hour.</LI>
          </Section>
          <Section icon="🖼️" title="Backdrops & extras (payable)" details>
            <LI>Paper backdrop stays off the floor, no damage — <b>FREE</b>.</LI>
            <LI>One sweep (up to 6 ft on floor) — <b>$29.99</b>; more than one sweep — <b>$59</b>; full seamless roll 107"×36' — <b>$75</b>.</LI>
            <LI>Cyc wall repaint: small cycs <b>$75</b>, large <b>$100</b>, Olympic 3 / Yukon 1 with a car on the cyc <b>$150</b> — request in advance.</LI>
            <LI>Bringing your own gear/lights? Fine — but call ahead about <b>amperage limits</b> and doorway fit for large props.</LI>
          </Section>
          <Section icon="🧾" title="Fees & fine print" details>
            <LI><b>5%</b> card fee · <b>4%</b> PayPal fee — or pay <b>Venmo @FD-Studios</b>.</LI>
            <LI>Flat <b>$7.50</b> utilities/services charge per booking (only once per package).</LI>
            <LI>Exiting past your finish time → <b>$75 late exit fee</b>.</LI>
            <LI>Major cleaning needed after your session → fee <b>from $150</b>.</LI>
            <LI>Group size: <b>10 people</b> included; <b>$5 per extra person</b>.</LI>
            <LI>Overnight bookings past 11 PM need a <b>$525 refundable deposit</b>.</LI>
          </Section>
          <Section icon="↩️" title="Cancellation & refunds" details>
            <LI>Cancel <b>48+ hrs</b> ahead → <b>full refund</b>.</LI>
            <LI><b>24–48 hrs</b> → <b>50%</b> refund.</LI>
            <LI>Under <b>24 hrs</b> → <b>non-refundable</b>.</LI>
            <LI>No refund once the rental starts, except if the studio is unsuitable and you notify FD and leave within the first <b>15 min</b>.</LI>
          </Section>
          <Section icon="⚠️" title="House rules" details>
            <LI>Leave the studio as you found it. Clean up food/refreshments (fine for keeping some in-studio). <b>No alcohol</b>.</LI>
            <LI>No smoking; no fireworks/pyrotechnics; no firearms, explosives, or live ammo; no combustibles/fire without permits.</LI>
            <LI><b>Alcohol or drugs → $500 fine</b> per incident. No one who’s drunk/under the influence is admitted.</LI>
            <LI>Hard-to-clean materials (confetti, milk, flour, powder, fake blood, wax, body oil) need <b>advance approval + refundable deposit</b>.</LI>
            <LI>Pets allowed with prior consent (pet waiver). Music at reasonable levels — studios are <b>not soundproof</b>.</LI>
          </Section>
          <Section icon="📞" title="Questions?">
            <LI>LA: <b>323-454-2323</b> · NYC: <b>844-644-3377</b> · email <b>info@fdphotostudio.com</b></LI>
            <LI>Book a tour, or assistants/photographers on-site — FD can arrange crew.</LI>
          </Section>
        </div>
      )}
    </div>
  );
});

function Section({ icon, title, children, details }: { icon: string; title: string; children: React.ReactNode; details?: boolean }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--gold)", marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}>
        <span>{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function LI({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <span style={{ color: "var(--gold)", flexShrink: 0 }}>·</span>
      <span>{children}</span>
    </div>
  );
}

export default FdStudioWidget;
