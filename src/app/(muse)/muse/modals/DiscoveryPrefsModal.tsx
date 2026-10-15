/** Discovery preferences modal: age range, style filters, match score floor, and saved searches for the Discover deck. */
"use client";
// Discovery filter preferences modal.


import { FiArrowLeft, FiLock } from "react-icons/fi";
import { STRINGS } from "@/lib/strings";
import { AESTHETICS } from "../components/types";
import { isPaidTier } from "../components/subscriptionTiers";
import type { MuseModalsProps } from "./types";

type Props = Pick<
  MuseModalsProps,
  | "showDiscoveryPrefs"
  | "setShowDiscoveryPrefs"
  | "discoveryPrefsTrap"
  | "discoveryPrefs"
  | "setDiscoveryPrefs"
  | "searchQuery"
  | "filterStyles"
  | "setFilterStyles"
  | "filterScore"
  | "setFilterScore"
  | "savedSearches"
  | "setSavedSearches"
  | "DEMO_MODE"
  | "showToast"
  | "apiFetch"
  | "userTier"
  | "setUpsell"
>;

export function DiscoveryPrefsModal({
  showDiscoveryPrefs,
  setShowDiscoveryPrefs,
  discoveryPrefsTrap,
  discoveryPrefs,
  setDiscoveryPrefs,
  searchQuery,
  filterStyles,
  setFilterStyles,
  filterScore,
  setFilterScore,
  savedSearches,
  setSavedSearches,
  DEMO_MODE,
  showToast,
  apiFetch,
  userTier = "free",
  setUpsell,
}: Props) {
  // "Advanced discovery filters (styles, distance, vibe)" is what Musa Pro
  // sells, so those three controls are locked for free accounts and open the
  // upsell instead. Age range and Show Me stay free as the basic filters.
  const isPro = isPaidTier(userTier);
  const lockPro = (feature: string, reason: string) => {
    setUpsell?.({ feature, reason, icon: "🔒" });
  };
  if (!showDiscoveryPrefs) return null;
  return (
    <div className="modal-overlay" ref={discoveryPrefsTrap} role="dialog" aria-modal="true" aria-label="Discovery preferences" onPointerDown={(e) => { if (e.target === e.currentTarget) setShowDiscoveryPrefs(false); }}>
      <div className="modal-header">
        <button className="modal-back" aria-label="Close discovery preferences" onClick={()=>setShowDiscoveryPrefs(false)}><FiArrowLeft size={20} /></button>
        <div className="modal-title" style={{fontSize:16.5,whiteSpace:"nowrap"}}>Discovery Preferences</div>
      </div>
      <div className="modal-body">
        <div style={{marginBottom:20}}>
          <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:8}}>Age Range: {discoveryPrefs.ageMin} to {discoveryPrefs.ageMax}</div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <input type="range" aria-label="Minimum age" min={18} max={65} value={discoveryPrefs.ageMin} onChange={e=>setDiscoveryPrefs(p=>({...p,ageMin:Math.min(Number(e.target.value),p.ageMax-1)}))} style={{flex:1,accentColor:"var(--gold)"}} />
          <input type="range" aria-label="Maximum age" min={18} max={65} value={discoveryPrefs.ageMax} onChange={e=>setDiscoveryPrefs(p=>({...p,ageMax:Math.max(Number(e.target.value),p.ageMin+1)}))} style={{flex:1,accentColor:"var(--gold)"}} />
          </div>
        </div>
        <div style={{marginBottom:20}}>
          <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:8}}>
            Max Distance: {discoveryPrefs.distance} mi
            {!isPro && <span style={{marginLeft:6,fontSize:10,fontWeight:700,color:"var(--gold)",border:"1px solid rgba(255,215,0,0.35)",borderRadius:99,padding:"2px 7px",verticalAlign:"middle"}}>MUSA PRO</span>}
          </div>
          <input type="range" aria-label="Maximum distance in miles" min={1} max={100} value={discoveryPrefs.distance} disabled={!isPro}
            onClick={() => { if (!isPro) lockPro("Distance Filter", "See who's actually close enough to shoot with. Upgrade to Musa Pro to filter by distance."); }}
            onChange={e=>setDiscoveryPrefs(p=>({...p,distance:Number(e.target.value)}))}
            style={{width:"100%",accentColor:"var(--gold)",opacity:isPro?1:0.45,pointerEvents:isPro?"auto":"none"}} />
        </div>
        <div style={{marginBottom:20,opacity:isPro?1:0.55}}>
          <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:8}}>
            Styles{filterStyles.length ? `: ${filterStyles.length} selected` : ""}
            {!isPro && <span style={{marginLeft:6,fontSize:10,fontWeight:700,color:"var(--gold)",border:"1px solid rgba(255,215,0,0.35)",borderRadius:99,padding:"2px 7px",verticalAlign:"middle"}}>MUSA PRO</span>}
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {AESTHETICS.map((s) => {
              const on = filterStyles.includes(s);
              return (
                <button key={s} type="button" aria-pressed={on} aria-disabled={!isPro}
                  onClick={() => {
                    if (!isPro) { lockPro("Advanced Filters", "Filter Discover by aesthetic and style. Upgrade to Musa Pro to narrow the deck to exactly what you shoot."); return; }
                    setFilterStyles(on ? filterStyles.filter((x) => x !== s) : [...filterStyles, s]);
                  }}
                  style={{minHeight:36,padding:"7px 13px",borderRadius:99,cursor:"pointer",fontSize:12,fontWeight:600,transition:"all .25s",background:on?"rgba(255,215,0,0.12)":"rgba(255,255,255,0.04)",border:"1px solid "+(on?"rgba(255,215,0,0.3)":"rgba(255,255,255,0.06)"),color:on?"var(--gold)":"var(--muted)"}}>
                  {s}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{marginBottom:20}}>
          <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:8}}>
            Vibe: {filterScore <= 50 ? "any" : `min ${filterScore}%`}
            {!isPro && <span style={{marginLeft:6,fontSize:10,fontWeight:700,color:"var(--gold)",border:"1px solid rgba(255,215,0,0.35)",borderRadius:99,padding:"2px 7px",verticalAlign:"middle"}}>MUSA PRO</span>}
          </div>
          <input type="range" aria-label="Minimum vibe match percent" min={50} max={95} value={filterScore} disabled={!isPro}
            onClick={() => { if (!isPro) lockPro("Vibe Filter", "Only show people you actually click with. Upgrade to Musa Pro to set a minimum vibe score."); }}
            onChange={e=>setFilterScore(Number(e.target.value))}
            style={{width:"100%",accentColor:"var(--gold)",opacity:isPro?1:0.45,pointerEvents:isPro?"auto":"none"}} />
          <div style={{fontSize:11,color:"var(--muted)",marginTop:6}}>{filterScore <= 50 ? "Show everyone, however you vibe." : `Hide anyone below a ${filterScore}% vibe match.`}</div>
        </div>
        <div style={{marginBottom:20}}>
          <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:8}}>Show Me</div>
          <div style={{display:"flex",gap:8,overflowX:"auto",whiteSpace:"nowrap",scrollbarWidth:"none",paddingBottom:4,WebkitOverflowScrolling:"touch"}}>
            {["all","women","men","non-binary"].map(g=>(
               <button key={g} type="button" aria-pressed={discoveryPrefs.gender===g} onClick={()=>setDiscoveryPrefs(p=>({...p,gender:g}))} style={{minWidth:44,minHeight:44,padding:"8px 16px",borderRadius:99,cursor:"pointer",fontSize:12,fontWeight:600,transition:"all .25s",whiteSpace:"nowrap",flexShrink:0,background:discoveryPrefs.gender===g?"rgba(255,215,0,0.12)":"rgba(255,255,255,0.04)",border:"1px solid "+(discoveryPrefs.gender===g?"rgba(255,215,0,0.3)":"rgba(255,255,255,0.06)"),color:discoveryPrefs.gender===g?"var(--gold)":"var(--muted)"}}>{g.charAt(0).toUpperCase()+g.slice(1)}</button>
            ))}
          </div>
        </div>
        <button className="btn btn-outline" style={{width:"100%",marginBottom:10}} onClick={async ()=>{
          // Auto-name from the active filters; prefer the live search prompt
          // when the user has typed one (same convention as search).
          const autoName = `${discoveryPrefs.gender==="all"?"Anyone":discoveryPrefs.gender.charAt(0).toUpperCase()+discoveryPrefs.gender.slice(1)} · ${discoveryPrefs.ageMin}-${discoveryPrefs.ageMax} · ${discoveryPrefs.distance}mi`;
          const name = (searchQuery||"").trim() || autoName;
          const filters = { ...discoveryPrefs, filterStyles, filterScore };
          if (DEMO_MODE) {
            setSavedSearches(prev => [...prev, { id: `demo-search-${Date.now()}`, name, query: (searchQuery||"").trim(), filters }]);
            showToast("Search saved for this demo session");
            return;
          }
          try {
            const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "saved-search-save", name, query: (searchQuery||"").trim(), filters }) });
            if (!r.ok) throw new Error("failed");
            showToast("Search saved");
            try { const lr = await apiFetch("/api/muse?type=saved-search-list"); const ld = await lr.json(); setSavedSearches(Array.isArray(ld.searches)?ld.searches:[]); } catch { console.debug("[muse] saved searches could not be refreshed"); }
          } catch { showToast("Couldn't save search"); }
        }}>Save this search</button>
        <button className="btn btn-gold" style={{width:"100%"}} onClick={()=>{
          setShowDiscoveryPrefs(false);
          showToast("Preferences saved!");
          // Was local-state-only despite the toast claiming it saved — ageMin/
          // ageMax/distance/gender are already whitelisted server-side (unlike
          // filterStyles/filterScore, which do have their own persistence
          // effect), they just were never sent. Persist on this explicit Save
          // click rather than debouncing every slider tick.
          if (!DEMO_MODE) apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-preferences", preferences: discoveryPrefs }) }).catch(() => {});
        }}>{STRINGS.save}</button>
        {savedSearches.length > 0 && (
          <div style={{marginTop:16}}>
            <div style={{fontSize:12,fontWeight:700,color:"var(--text2)",marginBottom:8}}>Saved Searches</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {savedSearches.map(s => (
                <div key={s.id} style={{display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:10,padding:"8px 10px"}}>
                  <button onClick={()=>{
                    const f = s.filters || {};
                    setDiscoveryPrefs(p=>({...p, ageMin: typeof f.ageMin==="number"?f.ageMin:p.ageMin, ageMax: typeof f.ageMax==="number"?f.ageMax:p.ageMax, distance: typeof f.distance==="number"?f.distance:p.distance, gender: typeof f.gender==="string"?f.gender:p.gender}));
                    if (Array.isArray(f.filterStyles)) setFilterStyles(f.filterStyles);
                    if (typeof f.filterScore==="number") setFilterScore(f.filterScore);
                    setShowDiscoveryPrefs(false);
                    showToast("Search applied");
                  }} style={{flex:1,minHeight:44,textAlign:"left",background:"none",border:"none",color:"var(--text)",fontSize:13,fontWeight:600,cursor:"pointer",padding:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name}</button>
                  <button aria-label="Delete saved search" title="Delete" onClick={async (e)=>{
                    e.stopPropagation();
                    const prev = savedSearches;
                    setSavedSearches(p=>p.filter(x=>x.id!==s.id));
                    if (DEMO_MODE) return;
                    try {
                      const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "saved-search-delete", searchId: s.id, id: s.id }) });
                      if (!r.ok) throw new Error("failed");
                    } catch { setSavedSearches(prev); showToast("Couldn't delete"); }
                  }} style={{width:44,minWidth:44,height:44,background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:14,lineHeight:1,padding:"2px 4px"}}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
