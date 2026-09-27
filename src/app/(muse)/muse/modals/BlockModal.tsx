"use client";

import { FiArrowLeft, FiX } from "react-icons/fi";
import { STRINGS } from "@/lib/strings";
import type { MuseModalsProps } from "./types";

type Props = Pick<
  MuseModalsProps,
  "blockTarget" | "setBlockTarget" | "blockTrap" | "matches" | "setMatches" | "setBlockedUsers" | "showScreen" | "showToast" | "apiFetch"
>;

export function BlockModal({
  blockTarget,
  setBlockTarget,
  blockTrap,
  matches,
  setMatches,
  setBlockedUsers,
  showScreen,
  showToast,
  apiFetch,
}: Props) {
  if (!blockTarget) return null;
  return (
    <div ref={blockTrap} className="modal-overlay" role="dialog" aria-modal="true" aria-label="Block user">
      <div className="modal-header">
        <button className="modal-back" aria-label="Back" onClick={()=>setBlockTarget(null)}><FiArrowLeft size={20} /></button>
        <div className="modal-title">Block</div>
        <button className="modal-close" onClick={()=>setBlockTarget(null)} aria-label="Close"><FiX size={18} /></button>
      </div>
      <div className="modal-body" style={{textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:16}}>🚫</div>
        <div style={{fontSize:18,fontWeight:700,color:"var(--text)",marginBottom:8}}>Block {blockTarget.name}?</div>
        <div style={{fontSize:14,color:"var(--text2)",marginBottom:24,lineHeight:1.6}}>They won&apos;t be able to see your profile, message you, or match with you again. This cannot be undone.</div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <button className="btn btn-gold" style={{width:"100%",background:"linear-gradient(135deg,#ff4444,#8b0000)",borderColor:"#ff4444"}} onClick={async()=>{const t=blockTarget;const prevMatches=matches;setMatches(prev=>prev.filter(m=>String(m.id)!==String(t.id)));setBlockTarget(null);setBlockedUsers(prev=>prev.includes(String(t.id))?prev:[...prev,String(t.id)]);showScreen("matches");showToast(t.name+" blocked");try{await apiFetch("/api/muse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"block",target_id:t.id})});}catch{setMatches(prevMatches);showToast("Couldn't block — try again")}}}>{STRINGS.block}</button>
          <button className="btn btn-outline" style={{width:"100%"}} onClick={()=>setBlockTarget(null)}>{STRINGS.cancel}</button>
        </div>
      </div>
    </div>
  );
}
