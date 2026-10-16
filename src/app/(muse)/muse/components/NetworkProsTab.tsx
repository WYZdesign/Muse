// Professionals directory tab body for NetworkScreen: search bar, filter
// pills/panels, and the professional card grid. Pure presentational — all
// filter state and the filtered list live in NetworkScreen; this renders it
// and forwards callbacks.
"use client";

import Image from "next/image";
import { FiMapPin, FiBriefcase, FiStar, FiUserPlus, FiSearch, FiBookmark } from "react-icons/fi";
import type { Professional } from "./types";
import { buildProfessionalBadges } from "./badgeColors";

export type ProExp = "all" | "rising" | "established" | "veteran";
export type ProSort = "match" | "expDesc" | "expAsc" | "rateDesc" | "rateAsc" | "openings";
export type ProRateBand = "all" | "tfp" | "50to100" | "100to150" | "gt150";

export interface NetworkProsTabProps {
  iAmIndustry: boolean;
  proSearch: string;
  setProSearch: (v: string) => void;
  onSearchSubmit: (value: string) => void;
  filterSections: Record<string, boolean>;
  setFilterSections: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  proExp: ProExp;
  setProExp: (v: ProExp) => void;
  proSort: ProSort;
  setProSort: (v: ProSort) => void;
  proHiringOnly: boolean;
  setProHiringOnly: (v: boolean) => void;
  proRateBand: ProRateBand;
  setProRateBand: (v: ProRateBand) => void;
  proSkill: string[];
  setProSkill: React.Dispatch<React.SetStateAction<string[]>>;
  proLooking: string;
  setProLooking: (v: string) => void;
  allSkills: string[];
  allLooking: string[];
  proList: Professional[];
  savedProfileIds: (string | number)[];
  onToggleSave: (id: string | number) => void;
  handleImgError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  onOpenProfile: (p: Professional) => void;
  /** Advanced talent filters (skills, experience, rate, sort, looking) are Musa Pro. */
  proFiltersLocked?: boolean;
  setUpsell?: (v: { feature: string; reason: string; icon?: string } | null) => void;
}

export function NetworkProsTab({
  iAmIndustry, proSearch, setProSearch, onSearchSubmit, filterSections, setFilterSections,
  proExp, setProExp, proSort, setProSort, proHiringOnly, setProHiringOnly, proRateBand, setProRateBand,
  proSkill, setProSkill, proLooking, setProLooking, allSkills, allLooking, proList,
  savedProfileIds, onToggleSave, handleImgError, onOpenProfile,
  proFiltersLocked = false, setUpsell,
}: NetworkProsTabProps) {
  return (
    <>
      <div style={{ margin: "0 0 10px", fontSize: 12, color: "var(--muted)", lineHeight: 1.5, textAlign: "center" }}>
        {iAmIndustry ? "Your peers — network, co-hire, and trade talent." : "Pros who can book, pay, and launch your career."}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44, margin: "0 0 10px", padding: "0 13px", background: "var(--card-bg)", border: "1px solid var(--border-subtle)", borderRadius: 12, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)" }}>
        <FiSearch size={16} aria-hidden="true" color="var(--muted)" style={{ flexShrink: 0 }} />
        <input
          className="inp search-input"
          aria-label="Search professionals"
          placeholder="Search pros — name, craft, skills, who they're looking for…"
          value={proSearch}
          onChange={(e) => setProSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onSearchSubmit(e.currentTarget.value); }}
          style={{ minWidth: 0, margin: 0, padding: 0, border: "none", background: "transparent", boxShadow: "none", fontSize: 13, color: "var(--text)" }}
        />
      </div>
      {/* Filter bubbles row - horizontally scrollable.
          Audit fix (2026-09-08, wyzmind's Torreé batch item 6): every category
          pill used the same gold gradient when active, while each category's
          expanded sub-options below used an unrelated grab-bag of colors
          (e.g. Experience's "Rising"/"Established"/"Veteran" were blue/gold/
          lavender — three different hues under one category). Torreé asked
          for sub-filter buttons to read as shades of their own category's
          color so the group reads as one family at a glance. Gave each
          category a base gradient here and reused that same hue (just
          lighter/darker shades) for its sub-options below — Skills (pink)
          and Looking (teal) already used one consistent hue for their
          sub-options, so their pill gradient now matches that hue too. */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10, alignItems: "center", overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", paddingBottom: 2, position: "relative", maskImage: "linear-gradient(to right,transparent 0,#000 12px,#000 calc(100% - 28px),transparent 100%)", WebkitMaskImage: "linear-gradient(to right,transparent 0,#000 12px,#000 calc(100% - 28px),transparent 100%)" }} aria-label="Filter professionals">
        {([
          { key: "experience", label: "Experience", active: proExp !== "all", grad: "linear-gradient(135deg,#90CAF9,#42A5F5)" },
          { key: "sort", label: "Sort", active: proSort !== "match", grad: "linear-gradient(135deg,var(--gold),var(--amber))" },
          { key: "rate", label: "Rate", active: proRateBand !== "all", grad: "linear-gradient(135deg,#81C784,#43A047)" },
          { key: "skills", label: "Skills", active: proSkill.length > 0, grad: "linear-gradient(135deg,#FF9EC7,#FF69B4)" },
          { key: "looking", label: "Looking", active: proLooking !== "all", grad: "linear-gradient(135deg,#4DD0C4,#20B2AA)" },
        ]).map(f => (
          <button
            key={f.key}
            type="button"
            aria-label={`${f.label} filter${f.active ? " (active)" : ""}`}
            onClick={() => {
              if (proFiltersLocked) {
                setUpsell?.({ feature: "Advanced Talent Filters", reason: "Narrow the directory by skills, experience, rate and who they are looking for. Upgrade to Musa Pro to use the advanced talent filters.", icon: "🔎" });
                return;
              }
              setFilterSections(s => ({ ...s, [f.key]: !s[f.key] }));
            }}
            style={{ cursor: "pointer", fontSize: 11, fontWeight: 700, color: f.active ? "#0a0612" : "var(--text)", background: f.active ? f.grad : "rgba(255,255,255,0.06)", border: f.active ? "none" : "1px solid rgba(255,255,255,0.1)", borderRadius: 99, padding: "10px 14px", minHeight: 44, display: "flex", alignItems: "center", transition: "all .2s", whiteSpace: "nowrap", flexShrink: 0 }}
          >
            {f.label}{f.active ? " ✓" : ""}{proFiltersLocked ? " · Pro" : ""}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={proHiringOnly}
          aria-label={`Hiring filter${proHiringOnly ? " (active)" : ""}`}
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setProHiringOnly(!proHiringOnly); } }}
          onClick={() => setProHiringOnly(!proHiringOnly)}
          style={{ cursor: "pointer", fontSize: 11, fontWeight: 700, color: "var(--text)", background: proHiringOnly ? "#4cdd88" : "rgba(255,255,255,0.06)", border: proHiringOnly ? "none" : "1px solid rgba(255,255,255,0.1)", borderRadius: 99, padding: "10px 14px", minHeight: 44, display: "flex", alignItems: "center", transition: "all .2s", whiteSpace: "nowrap", flexShrink: 0 }}
        >
          Hiring{proHiringOnly ? " ✓" : ""}
        </button>
      </div>
      {/* Expanded filter panels — single-line horizontal scroll, color-coded per category */}
      {filterSections.experience && (
        <div className="filter-scroll-row" role="tablist" aria-label="Experience level filter" style={{ marginBottom: 10 }}>
          {([
            { k: "all", label: "All levels", color: "var(--muted)", accent: "rgba(255,255,255,0.1)" },
            { k: "rising", label: "Rising", color: "#BBDEFB", accent: "rgba(187,222,251,0.3)" },
            { k: "established", label: "Established", color: "#64B5F6", accent: "rgba(100,181,246,0.3)" },
            { k: "veteran", label: "Veteran", color: "#1E88E5", accent: "rgba(30,136,229,0.3)" },
          ] as const).map((b) => (
            <button type="button" key={b.k} role="tab" aria-selected={proExp === b.k} tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setProExp(b.k); } }}
              onClick={() => setProExp(b.k)}
              style={{ cursor: "pointer", fontSize: 11, fontWeight: 600, color: proExp === b.k ? "var(--text)" : b.color, background: proExp === b.k ? b.accent : "rgba(255,255,255,0.06)", border: proExp === b.k ? `1.5px solid ${b.accent}` : "1px solid rgba(255,255,255,0.08)", borderRadius: 99, padding: "10px 14px", minHeight: 44, display: "flex", alignItems: "center", transition: "all .15s", flexShrink: 0, whiteSpace: "nowrap" }}
            >{b.label}</button>
          ))}
        </div>
      )}
      {filterSections.sort && (
        <div className="filter-scroll-row" style={{ marginBottom: 10 }}>
          {([
            { k: "match", label: "Featured", color: "#FFD700", accent: "rgba(255,215,0,0.25)" },
            { k: "expDesc", label: "Most exp", color: "#FFCA28", accent: "rgba(255,202,40,0.25)" },
            { k: "expAsc", label: "Least exp", color: "#FFE082", accent: "rgba(255,224,130,0.25)" },
            { k: "rateDesc", label: "Rate ↓", color: "#FFB300", accent: "rgba(255,179,0,0.25)" },
            { k: "rateAsc", label: "Rate ↑", color: "#FFA000", accent: "rgba(255,160,0,0.25)" },
            { k: "openings", label: "Most openings", color: "#FF8F00", accent: "rgba(255,143,0,0.25)" },
          ] as const).map((b) => (
            <button type="button" key={b.k}
              onClick={() => setProSort(b.k)}
              style={{ cursor: "pointer", fontSize: 11, fontWeight: 600, color: proSort === b.k ? "var(--text)" : b.color, background: proSort === b.k ? b.accent : "rgba(255,255,255,0.06)", border: proSort === b.k ? `1.5px solid ${b.accent}` : "1px solid rgba(255,255,255,0.08)", borderRadius: 99, padding: "10px 14px", minHeight: 44, display: "flex", alignItems: "center", transition: "all .15s", flexShrink: 0, whiteSpace: "nowrap" }}
            >{b.label}</button>
          ))}
        </div>
      )}
      {filterSections.rate && (
        <div className="filter-scroll-row" style={{ marginBottom: 10 }}>
          {([
            { k: "all", label: "Any rate", color: "var(--muted)", accent: "rgba(255,255,255,0.1)" },
            { k: "tfp", label: "TFP", color: "#A5D6A7", accent: "rgba(165,214,167,0.3)" },
            { k: "50to100", label: "$50-100", color: "#81C784", accent: "rgba(129,199,132,0.3)" },
            { k: "100to150", label: "$100-150", color: "#4CDD88", accent: "rgba(76,221,136,0.3)" },
            { k: "gt150", label: "$150+", color: "#2E7D32", accent: "rgba(46,125,50,0.3)" },
          ] as const).map((b) => (
            <button type="button" key={b.k}
              onClick={() => setProRateBand(b.k)}
              style={{ cursor: "pointer", fontSize: 11, fontWeight: 600, color: proRateBand === b.k ? "var(--text)" : b.color, background: proRateBand === b.k ? b.accent : "rgba(255,255,255,0.06)", border: proRateBand === b.k ? `1.5px solid ${b.accent}` : "1px solid rgba(255,255,255,0.08)", borderRadius: 99, padding: "10px 14px", minHeight: 44, display: "flex", alignItems: "center", transition: "all .15s", flexShrink: 0, whiteSpace: "nowrap" }}
            >{b.label}</button>
          ))}
        </div>
      )}
      {filterSections.skills && (
        <div className="filter-scroll-row" style={{ marginBottom: 10 }}>
          <button type="button" aria-pressed={!proSkill.length} onClick={() => setProSkill([])}
            className="filter-chip" style={{ cursor: "pointer", fontSize: 11, fontWeight: 600, color: !proSkill.length ? "var(--text)" : "#FF69B4", background: !proSkill.length ? "rgba(255,105,180,0.3)" : "rgba(255,255,255,0.06)", border: !proSkill.length ? "1.5px solid rgba(255,105,180,0.4)" : "1px solid rgba(255,255,255,0.08)", borderRadius: 99, padding: "10px 14px", minHeight: 44, display: "flex", alignItems: "center", transition: "all .15s", flexShrink: 0, whiteSpace: "nowrap" }}>All skills</button>
          {allSkills.map((s) => (
            <button key={s} type="button" aria-pressed={proSkill.includes(s)}
              onClick={() => setProSkill(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
              style={{ cursor: "pointer", fontSize: 11, fontWeight: 600, color: proSkill.includes(s) ? "var(--text)" : "#FF69B4", background: proSkill.includes(s) ? "rgba(255,105,180,0.3)" : "rgba(255,255,255,0.06)", border: proSkill.includes(s) ? "1.5px solid rgba(255,105,180,0.4)" : "1px solid rgba(255,255,255,0.08)", borderRadius: 99, padding: "10px 14px", minHeight: 44, display: "flex", alignItems: "center", transition: "all .15s", flexShrink: 0, whiteSpace: "nowrap" }}>{s}</button>
          ))}
        </div>
      )}
      {filterSections.looking && allLooking.length > 0 && (
        <div className="filter-scroll-row" style={{ marginBottom: 10 }}>
          <button type="button" onClick={() => setProLooking("all")}
            style={{ cursor: "pointer", fontSize: 11, fontWeight: 600, color: proLooking === "all" ? "var(--text)" : "#20B2AA", background: proLooking === "all" ? "rgba(32,178,170,0.25)" : "rgba(255,255,255,0.06)", border: proLooking === "all" ? "1.5px solid rgba(32,178,170,0.35)" : "1px solid rgba(255,255,255,0.08)", borderRadius: 99, padding: "10px 14px", minHeight: 44, display: "flex", alignItems: "center", transition: "all .15s", flexShrink: 0, whiteSpace: "nowrap" }}>Anyone</button>
          {allLooking.map((l) => (
            <button key={l} type="button" onClick={() => setProLooking(l)}
              style={{ cursor: "pointer", fontSize: 11, fontWeight: 600, color: proLooking === l ? "var(--text)" : "#20B2AA", background: proLooking === l ? "rgba(32,178,170,0.25)" : "rgba(255,255,255,0.06)", border: proLooking === l ? "1.5px solid rgba(32,178,170,0.35)" : "1px solid rgba(255,255,255,0.08)", borderRadius: 99, padding: "10px 14px", minHeight: 44, display: "flex", alignItems: "center", transition: "all .15s", flexShrink: 0, whiteSpace: "nowrap" }}>{l}</button>
          ))}
        </div>
      )}
      {proList.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 48, textAlign: "center", gap: 12 }}>
          <div style={{ fontSize: 36 }}>👥</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>No professionals match those filters</div>
          <div style={{ fontSize: 13, color: "var(--text2)", maxWidth: 280 }}>Try clearing filters or adjust your search — new pros join weekly.</div>
        </div>
      )}
      {proList.map((p) => (
        <div key={p.id} className="pro-card" style={{ marginBottom: 14, borderRadius: 16, overflow: "hidden", position: "relative", height: 570 }}>
          {/* Full-card target as a real <button> that is a SIBLING of the
              Save control below (which sits at zIndex 2), never an
              ancestor of it — a clickable div wrapping a button is an axe
              `nested-interactive` violation, and the div had no keyboard
              access at all (pointer-only). */}
          <button
            type="button"
            className="pro-card-open"
            aria-label={`View ${p.name}'s profile`}
            onClick={() => onOpenProfile(p)}
            style={{ position: "absolute", inset: 0, zIndex: 1, padding: 0, border: "none", background: "transparent", cursor: "pointer" }}
          />
          <Image
            loading="lazy"
            src={p.img}
            alt={p.name}
            fill
            sizes="(max-width: 600px) 100vw, 500px"
            style={{ objectFit: "cover", objectPosition: "center top" }}
            onError={handleImgError}
          />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(10,6,18,0.88) 0%,rgba(10,6,18,0.25) 55%,rgba(10,6,18,0.1) 100%)" }} />
          <button
            type="button"
            aria-label={savedProfileIds.includes(p.id) ? "Unsave professional" : "Save professional"}
            title={savedProfileIds.includes(p.id) ? "Saved" : "Save"}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); e.preventDefault(); onToggleSave(p.id); } }}
            onClick={(e) => { e.stopPropagation(); onToggleSave(p.id); }}
            style={{
              position: "absolute", top: 12, right: 12, width: 44, height: 44, borderRadius: 10,
              background: savedProfileIds.includes(p.id) ? "rgba(255,215,0,0.22)" : "rgba(0,0,0,0.45)",
              border: savedProfileIds.includes(p.id) ? "1px solid rgba(255,215,0,0.4)" : "1px solid var(--border-subtle)",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              color: savedProfileIds.includes(p.id) ? "var(--gold)" : "#fff", zIndex: 2,
            }}
          >
            <FiBookmark size={16} fill={savedProfileIds.includes(p.id) ? "currentColor" : "none"} />
          </button>
          <div className="pro-card-content" style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 22, fontWeight: 800, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
              {p.name}
              {p.verified && <span className="card-verified-mark" title="Identity verified" style={{ fontSize: 12 }}>✓</span>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, color: "var(--gold)", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
              <FiBriefcase size={13} /> {p.type}
            </div>
            {!!p.reviewCount && (
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
                <FiStar size={12} style={{ marginRight: 4, verticalAlign: -1, color: "var(--gold)" }} />
                {p.reviewRating}★ ({p.reviewCount} review{p.reviewCount === 1 ? "" : "s"})
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
              <FiMapPin size={13} /> {p.loc}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {p.exp && (
                <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 99, background: "rgba(255,215,0,0.22)", border: "1px solid rgba(255,215,0,0.4)", color: "var(--gold)", fontWeight: 700 }}>
                  {p.exp}
                </span>
              )}
              {p.openings > 0 && (
                <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 99, background: "rgba(135,206,235,0.2)", border: "1px solid rgba(135,206,235,0.35)", color: "#b7e4f7", fontWeight: 700 }}>
                  {p.openings} openings
                </span>
              )}
              {p.rate && (
                <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 99, background: "rgba(76,221,136,0.15)", border: "1px solid rgba(76,221,136,0.35)", color: "#4cdd88", fontWeight: 700 }}>
                  {p.rate}
                </span>
              )}
            </div>
            {(p.looking || []).length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", fontSize: 11, color: "rgba(255,255,255,0.65)" }}>
                <FiUserPlus size={12} style={{ color: "var(--lavender)" }} />
                <span>Seeking:</span>
                {p.looking.map((l: string) => (
                  <span key={l} style={{ padding: "2px 8px", borderRadius: 99, background: "rgba(212,165,255,0.14)", border: "1px solid rgba(212,165,255,0.3)", color: "#e6d3ff", fontWeight: 600 }}>{l}</span>
                ))}
              </div>
            )}
            {/* BADGES ROW */}
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {(() => {
                const badges = buildProfessionalBadges(p);
                return badges.slice(0, 5).map((b) => (
                  <span key={b.label} style={{ fontSize: 10, padding: "3px 9px", borderRadius: 99, background: b.bg, border: `1px solid ${b.bd}`, color: b.c, fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
                    {b.icon} {b.label}
                  </span>
                ));
              })()}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>
              Tap to see details ›
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
