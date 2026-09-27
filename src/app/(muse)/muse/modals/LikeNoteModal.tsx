"use client";

import Image from "next/image";
import { FiArrowLeft, FiX } from "react-icons/fi";
import { persistMessage } from "@/app/muse-realtime";
import type { MuseModalsProps } from "./types";

type Props = Pick<
  MuseModalsProps,
  | "showLikeNote"
  | "setShowLikeNote"
  | "noteTargetProfile"
  | "setNoteTargetProfile"
  | "likeNoteTrap"
  | "likeNoteAnchor"
  | "setLikeNoteAnchor"
  | "likeNoteText"
  | "setLikeNoteText"
  | "handleImgError"
  | "doSwipe"
  | "apiFetch"
  | "authUser"
  | "setMatches"
  | "showToast"
>;

export function LikeNoteModal({
  showLikeNote,
  setShowLikeNote,
  noteTargetProfile,
  setNoteTargetProfile,
  likeNoteTrap,
  likeNoteAnchor,
  setLikeNoteAnchor,
  likeNoteText,
  setLikeNoteText,
  handleImgError,
  doSwipe,
  apiFetch,
  authUser,
  setMatches,
  showToast,
}: Props) {
  if (!showLikeNote || !noteTargetProfile) return null;
  return (
    <div className="modal-overlay" style={{zIndex:500}} ref={likeNoteTrap} role="dialog" aria-modal="true" aria-label="Like and note">
      <div className="modal-header">
        <button className="modal-back" aria-label="Back" onClick={()=>{setShowLikeNote(false);setLikeNoteAnchor(null);}}><FiArrowLeft size={20} /></button>
        <div className="modal-title">Like + Note</div>
        <button className="modal-close" onClick={()=>{setShowLikeNote(false);setLikeNoteAnchor(null);}} aria-label="Close"><FiX size={18} /></button>
      </div>
      <div className="modal-body" style={{display:"flex",flexDirection:"column",gap:16,paddingTop:20}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <Image loading="lazy" src={noteTargetProfile.img} alt={noteTargetProfile.name} width={48} height={48} style={{borderRadius:"50%",objectFit:"cover"}} onError={handleImgError} />
          <div>
            <div style={{fontWeight:700,fontSize:16,color:"var(--text)"}}>{noteTargetProfile.name}</div>
            <div style={{fontSize:13,color:"var(--muted)"}}>{noteTargetProfile.type}</div>
          </div>
        </div>
        {likeNoteAnchor && (
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:10,background:"rgba(255,215,0,0.1)",border:"1px solid rgba(255,215,0,0.25)",fontSize:12,color:"var(--gold)",fontWeight:600}}>
            ✦ Liking {likeNoteAnchor.type === "prompt" ? `their prompt: "${likeNoteAnchor.value}"` : likeNoteAnchor.value.toLowerCase()}
          </div>
        )}
        <textarea className="inp" aria-label="Like note" placeholder="Send a note with your like…" rows={4} value={likeNoteText} onChange={e=>setLikeNoteText(e.target.value)} style={{fontSize:14,resize:"none",borderRadius:12}} />
        <div style={{fontSize:12,color:"var(--muted)",textAlign:"right"}}>{likeNoteText.length}/200</div>
        <button className="btn btn-gold" onClick={async ()=>{
          if (!noteTargetProfile) return;
          const target = noteTargetProfile;
          const anchor = likeNoteAnchor;
          doSwipe("right");
          const note = likeNoteText.trim().slice(0,200);
          setShowLikeNote(false);
          setLikeNoteText("");
          setNoteTargetProfile(null);
          setLikeNoteAnchor(null);
          // Persist the like with its anchor/note so the recipient sees
          // exactly what was liked (in their notifications). doSwipe only
          // calls the match action when it judges a mutual match, so an
          // anchored/annotated like needs its own explicit record —
          // matchCreate merges anchor/note into the existing row either way.
          if (target?.id) {
            apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "match", target_id: target.id, note, anchor_type: anchor?.type, anchor_value: anchor?.value }) }).catch(() => {});
          }
          if (note) {
            const msg = note;
            const myId = authUser?.profile?.id || authUser?.id || "local";
            const clientMsgId = `${myId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const userMsg = { from: "me", text: msg, time: "Just now", clientMsgId };
            setMatches(prev => prev.map(m => m.id === target.id ? { ...m, messages: [...(m.messages||[]), userMsg] } : m));
            let sent = true;
            try { sent = (await persistMessage({ myId, theirId: String(target.id), text: msg, clientMsgId })).ok; } catch { sent = false; }
            if (!sent && myId !== "local") {
              setMatches(prev => prev.map(m => m.id === target.id ? { ...m, messages: m.messages.filter(mm => mm !== userMsg) } : m));
              showToast("Liked, but the note couldn't be sent");
            } else {
              showToast("Liked + note sent!");
            }
          }
        }} style={{width:"100%",padding:"14px"}}>
          ✦ Send Like & Note
        </button>
      </div>
    </div>
  );
}
