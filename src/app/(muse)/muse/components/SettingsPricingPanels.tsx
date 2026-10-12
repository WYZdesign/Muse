// Rate Settings / Portfolio Settings / Availability Calendar sub-pages for
// SettingsScreen's "Portfolio & Availability" group (muse-side accounts).
// Each owns its own form state, seeded once from `preferences` on mount —
// nothing here is read anywhere else in the screen.
"use client";

import { useState } from "react";
import type { AuthFetchFn } from "../page-models";
import {
  sanitizeAvailabilityStatus,
  sanitizeBudgetRange,
  sanitizeTravelDates,
  sanitizeTravelDestinations,
  MAX_TRAVEL_DATES,
  type TravelDateRange,
} from "@/lib/muse-availability";
import { SettingsSubPage } from "./SettingsSubPage";
import { ToggleRow } from "./SettingsToggleRow";

interface SharedPanelProps {
  preferences: Record<string, unknown>;
  apiFetch?: AuthFetchFn;
  showToast: (msg: string | { msg: string; onTap?: () => void }) => void;
  onClose: () => void;
}

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

export function SettingsRateSettingsPanel({ preferences, apiFetch, showToast, onClose }: SharedPanelProps) {
  const [rateHourly, setRateHourly] = useState(String(preferences.rateHourly ?? ""));
  const [rateHalfDay, setRateHalfDay] = useState(String(preferences.rateHalfDay ?? ""));
  const [rateFullDay, setRateFullDay] = useState(String(preferences.rateFullDay ?? ""));
  const [rateCurrency, setRateCurrency] = useState(String(preferences.rateCurrency ?? "USD"));
  const [rateNotes, setRateNotes] = useState(String(preferences.rateNotes ?? ""));

  return (
    <SettingsSubPage title="Rate Settings" onClose={onClose}>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
        Your standard pricing. Clients see this on your profile and it pre-fills booking requests.
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Currency</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["USD", "EUR", "GBP", "CAD", "AUD"].map((cur) => (
            <button key={cur} aria-pressed={rateCurrency === cur} onClick={() => setRateCurrency(cur)}
              style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid var(--border-subtle)", background: rateCurrency === cur ? "var(--gold)" : "var(--glass)", color: rateCurrency === cur ? "#0a0612" : "var(--text)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {cur}
            </button>
          ))}
        </div>
      </div>

      {[
        { label: "Hourly rate", value: rateHourly, set: setRateHourly, ph: "150" },
        { label: "Half-day rate", value: rateHalfDay, set: setRateHalfDay, ph: "600" },
        { label: "Full-day rate", value: rateFullDay, set: setRateFullDay, ph: "1100" },
      ].map((f) => (
        <div key={f.label} style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{f.label}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 700 }}>{rateCurrency}</span>
            <input type="number" min={0} aria-label={f.label} placeholder={f.ph} value={f.value} onChange={(e) => f.set(e.target.value)}
              style={{ flex: 1, padding: "12px 14px", borderRadius: 12, border: "1px solid var(--border-subtle)", background: "var(--glass)", color: "var(--text)", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
          </div>
        </div>
      ))}

      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Notes shown to clients (optional)</div>
        <input type="text" aria-label="Rate notes" placeholder="e.g. Travel billed separately" value={rateNotes} onChange={(e) => setRateNotes(e.target.value)}
          style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid var(--border-subtle)", background: "var(--glass)", color: "var(--text)", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
      </div>

      <button className="btn btn-gold" style={{ width: "100%", marginTop: 16 }} onClick={async () => {
        try {
          await apiFetch?.("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-preferences", preferences: { rateHourly, rateHalfDay, rateFullDay, rateCurrency, rateNotes } }) });
          showToast("Rate settings saved!");
        } catch { showToast("Couldn't save — try again"); }
      }}>Save Rate Settings</button>
    </SettingsSubPage>
  );
}

export function SettingsPortfolioPanel({ preferences, apiFetch, showToast, onClose }: SharedPanelProps) {
  const [portfolioVisibility, setPortfolioVisibility] = useState(String(preferences.portfolioVisibility ?? "everyone"));
  const [portfolioFeatured, setPortfolioFeatured] = useState(preferences.portfolioFeatured !== false);
  const [portfolioShowOnProfile, setPortfolioShowOnProfile] = useState(preferences.portfolioShowOnProfile !== false);

  return (
    <SettingsSubPage title="Portfolio Settings" onClose={onClose}>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
        Control who can see your portfolio and how your work is presented.
      </div>
      <div id="portfolio-visibility-label" style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", margin: "4px 0 8px" }}>Who can see your portfolio</div>
      <div aria-labelledby="portfolio-visibility-label">
        {[
          { k: "everyone", l: "Musa members", d: "Any signed-in Musa member can view your work" },
          { k: "matches", l: "Matches only", d: "Only people you've matched with" },
          { k: "private", l: "Private", d: "Visible only to you" },
        ].map(o => (
          <button key={o.k} type="button" aria-pressed={portfolioVisibility === o.k} onClick={() => setPortfolioVisibility(o.k)}
            style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 16px", marginBottom: 8, border: "1px solid var(--border-subtle)", borderRadius: 14, background: portfolioVisibility === o.k ? "var(--gold)" : "var(--glass)", color: portfolioVisibility === o.k ? "#0a0612" : "var(--text)", cursor: "pointer" }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{o.l}</div>
            <div style={{ fontSize: 11, opacity: .75, marginTop: 2 }}>{o.d}</div>
          </button>
        ))}
      </div>
      <ToggleRow label="Featured work" desc="Highlight your best pieces first" checked={portfolioFeatured} onToggle={() => setPortfolioFeatured(v => !v)} />
      <ToggleRow label="Show portfolio on my profile" checked={portfolioShowOnProfile} onToggle={() => setPortfolioShowOnProfile(v => !v)} />
      <button className="btn btn-gold" style={{ width: "100%", marginTop: 16 }} onClick={async () => {
        if (DEMO_MODE) {
          showToast("Portfolio settings saved for this demo session.");
          return;
        }
        try {
          await apiFetch?.("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-preferences", preferences: { portfolioVisibility, portfolioFeatured, portfolioShowOnProfile } }) });
          showToast("Portfolio settings saved!");
        } catch { showToast("Couldn't save — try again"); }
      }}>Save Portfolio Settings</button>
    </SettingsSubPage>
  );
}

export function SettingsAvailabilityPanel({ preferences, apiFetch, showToast, onClose }: SharedPanelProps) {
  const [availabilityStatus, setAvailabilityStatus] = useState(String(preferences.availabilityStatus ?? "available"));
  const [availabilityNote, setAvailabilityNote] = useState(String(preferences.availabilityNote ?? ""));
  const [bookingLeadDays, setBookingLeadDays] = useState(Number(preferences.bookingLeadDays ?? 3));
  const [travelDates, setTravelDates] = useState<TravelDateRange[]>(() => sanitizeTravelDates(preferences.travelDates));
  const [travelDestinations, setTravelDestinations] = useState<string>(() => sanitizeTravelDestinations(preferences.travelDestinations).join(", "));
  const [budgetRange, setBudgetRange] = useState(String(preferences.budgetRange ?? ""));

  return (
    <SettingsSubPage title="Availability Calendar" onClose={onClose}>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
        Tell clients when you&apos;re bookable. This drives your Discover badge and booking requests.
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", margin: "4px 0 8px" }}>Current status</div>
      {[
        { k: "available", l: "Available", d: "Open to booking requests" },
        { k: "busy", l: "Busy", d: "Working — limited availability" },
        { k: "unavailable", l: "Not accepting", d: "Paused all new bookings" },
      ].map(o => (
        <button key={o.k} aria-pressed={availabilityStatus === o.k} onClick={() => setAvailabilityStatus(o.k)}
          style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 16px", marginBottom: 8, border: "1px solid var(--border-subtle)", borderRadius: 14, background: availabilityStatus === o.k ? "var(--gold)" : "var(--glass)", color: availabilityStatus === o.k ? "#0a0612" : "var(--text)", cursor: "pointer" }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{o.l}</div>
          <div style={{ fontSize: 11, opacity: .75, marginTop: 2 }}>{o.d}</div>
        </button>
      ))}
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Booking lead time (days)</div>
        <input type="number" aria-label="Booking lead time (days)" placeholder="3" value={String(bookingLeadDays)} onChange={e => setBookingLeadDays(Math.max(0, Math.min(90, Number(e.target.value) || 0)))}
          style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid var(--border-subtle)", background: "var(--glass)", color: "var(--text)", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Away / travel dates</div>
        {travelDates.map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <input type="date" aria-label={`Travel from ${i + 1}`} value={r.from} onChange={e => setTravelDates(ds => ds.map((x, j) => j === i ? { ...x, from: e.target.value } : x))}
              style={{ flex: 1, minWidth: 0, padding: "10px 12px", borderRadius: 12, border: "1px solid var(--border-subtle)", background: "var(--glass)", color: "var(--text)", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
            <span aria-hidden="true" style={{ color: "var(--muted)" }}>&ndash;</span>
            <input type="date" aria-label={`Travel to ${i + 1}`} value={r.to} onChange={e => setTravelDates(ds => ds.map((x, j) => j === i ? { ...x, to: e.target.value } : x))}
              style={{ flex: 1, minWidth: 0, padding: "10px 12px", borderRadius: 12, border: "1px solid var(--border-subtle)", background: "var(--glass)", color: "var(--text)", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
            <button type="button" aria-label={`Remove travel date range ${i + 1}`} onClick={() => setTravelDates(ds => ds.filter((_, j) => j !== i))}
              style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid var(--border-subtle)", background: "var(--glass)", color: "var(--text)", cursor: "pointer", fontSize: 14 }}>&#10005;</button>
          </div>
        ))}
        {travelDates.length < MAX_TRAVEL_DATES && (
          <button type="button" className="btn btn-outline" aria-label="Add travel date range" style={{ width: "100%" }} onClick={() => setTravelDates(ds => [...ds, { from: "", to: "" }])}>+ Add date range</button>
        )}
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Travel destinations</div>
        <input type="text" aria-label="Travel destinations" placeholder="e.g. New York, Los Angeles" value={travelDestinations} onChange={e => setTravelDestinations(e.target.value)}
          style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid var(--border-subtle)", background: "var(--glass)", color: "var(--text)", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Typical budget range</div>
        <input type="text" aria-label="Typical budget range" placeholder="e.g. $500&ndash;$2,000" value={budgetRange} onChange={e => setBudgetRange(e.target.value)}
          style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid var(--border-subtle)", background: "var(--glass)", color: "var(--text)", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Note shown to clients (optional)</div>
        <input type="text" aria-label="Note shown to clients (optional)" placeholder="e.g. Booking 2 weeks out" value={availabilityNote} onChange={e => setAvailabilityNote(e.target.value)}
          style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid var(--border-subtle)", background: "var(--glass)", color: "var(--text)", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
      </div>
      <button className="btn btn-gold" style={{ width: "100%", marginTop: 16 }} onClick={async () => {
        // Persist both: the structured profile COLUMNS (what Discover/search
        // filters actually read) and the preferences blob (display
        // back-compat). Values are sanitised identically on both paths.
        const cleanStatus = sanitizeAvailabilityStatus(availabilityStatus) ?? "available";
        const cleanDates = sanitizeTravelDates(travelDates);
        const cleanDests = sanitizeTravelDestinations(travelDestinations);
        const cleanBudget = sanitizeBudgetRange(budgetRange) ?? "";
        try {
          await apiFetch?.("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-preferences", preferences: { availabilityStatus: cleanStatus, availabilityNote, bookingLeadDays, travelDates: cleanDates, travelDestinations: cleanDests, budgetRange: cleanBudget } }) });
          await apiFetch?.("/api/muse/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update-profile", availability_status: cleanStatus, travel_dates: cleanDates, travel_destinations: cleanDests, budget_range: cleanBudget }) });
          showToast("Availability saved!");
        } catch { showToast("Couldn't save — try again"); }
      }}>Save Availability</button>
    </SettingsSubPage>
  );
}
