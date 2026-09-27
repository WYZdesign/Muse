"use client";

import { FiArrowLeft, FiX } from "react-icons/fi";
import { STRINGS } from "@/lib/strings";
import type { MuseModalsProps } from "./types";

type Props = Pick<
  MuseModalsProps,
  "unmatchTarget" | "setUnmatchTarget" | "unmatchTrap" | "matches" | "setMatches" | "showScreen" | "showToast" | "apiFetch"
>;

export function UnmatchModal({
  unmatchTarget,
  setUnmatchTarget,
  unmatchTrap,
  matches,
  setMatches,
  showScreen,
  showToast,
  apiFetch,
}: Props) {
  if (!unmatchTarget) return null;
  return (
    <div ref={unmatchTrap} className="modal-overlay" role="dialog" aria-modal="true" aria-label="Unmatch">
      <div className="modal-header">
        <button className="modal-back" aria-label="Back" onClick={()=>setUnmatchTarget(null)}><FiArrowLeft size={20} /></button>
        <div className="modal-title">Unmatch</div>
        <button className="modal-close" onClick={()=>setUnmatchTarget(null)} aria-label="Close"><FiX size={18} /></button>
      </div>
      <div className="modal-body" style={{textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:16}}>💔</div>
        <div style={{fontSize:18,fontWeight:700,color:"var(--text)",marginBottom:8}}>Unmatch with {unmatchTarget.name}?</div>
        <div style={{fontSize:14,color:"var(--text2)",marginBottom:24,lineHeight:1.6}}>This will remove them from your matches and delete all messages. This cannot be undone.</div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <button className="btn btn-gold" style={{width:"100%",background:"linear-gradient(135deg,var(--coral),#ff4444)",borderColor:"var(--coral)"}} onClick={async()=>{
            const t=unmatchTarget;
            const prevMatches=matches;
            setMatches(prev=>prev.filter(m=>String(m.id)!==String(t.id)));
            setUnmatchTarget(null);
            showScreen("matches");
            showToast("Unmatched");
            try{
              const r=await apiFetch("/api/muse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"unmatch",target_id:t.id})});
              if(!r.ok) throw new Error("unmatch failed");
            }catch{
              setMatches(prevMatches);
              showToast("Couldn't unmatch — try again");
            }
          }}>{STRINGS.unmatch}</button>
          <button className="btn btn-outline" style={{width:"100%"}} onClick={()=>setUnmatchTarget(null)}>{STRINGS.cancel}</button>
        </div>
      </div>
    </div>
  );
}
