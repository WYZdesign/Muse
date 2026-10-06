"use client";

import Image from "next/image";
import { FiArrowLeft } from "react-icons/fi";
import { STRINGS } from "@/lib/strings";
import { BEHIND_CAMERA, IN_FRONT_CAMERA, lookingForOptions } from "../components/types";
import type { MuseModalsProps } from "./types";

type Props = Pick<
  MuseModalsProps,
  | "showEditProfile"
  | "setShowEditProfile"
  | "editProfileTrap"
  | "editAvatar"
  | "setEditAvatar"
  | "editAvatarInputRef"
  | "editName"
  | "setEditName"
  | "editBio"
  | "setEditBio"
  | "editLoc"
  | "setEditLoc"
  | "editMediaKit"
  | "setEditMediaKit"
  | "editType"
  | "setEditType"
  | "editCustomTypePending"
  | "setEditCustomTypePending"
  | "editLooking"
  | "setEditLooking"
  | "editNsfw"
  | "setEditNsfw"
  | "currentUser"
  | "obData"
  | "handleImgError"
  | "uploadImage"
  | "saveProfileEdits"
  | "showToast"
>;

export function EditProfileModal({
  showEditProfile,
  setShowEditProfile,
  editProfileTrap,
  editAvatar,
  setEditAvatar,
  editAvatarInputRef,
  editName,
  setEditName,
  editBio,
  setEditBio,
  editLoc,
  setEditLoc,
  editMediaKit,
  setEditMediaKit,
  editType,
  setEditType,
  editCustomTypePending,
  setEditCustomTypePending,
  editLooking,
  setEditLooking,
  editNsfw,
  setEditNsfw,
  currentUser,
  obData,
  handleImgError,
  uploadImage,
  saveProfileEdits,
  showToast,
}: Props) {
  if (!showEditProfile) return null;
  return (
    <div ref={editProfileTrap} className="modal-overlay" role="dialog" aria-modal="true" aria-label="Edit profile">
      <div className="modal-header" style={{ position: "relative" }}>
        <button className="modal-back" onClick={()=>setShowEditProfile(false)} aria-label="Back"><FiArrowLeft size={20} /></button>
        <div className="modal-title" style={{ flex: 1, textAlign: "center" }}>Edit Profile</div>
        <div style={{ width: 42 }} />
      </div>
      <div className="modal-body">
        <div style={{display:"flex",justifyContent:"center",marginBottom:16}}>
          <div style={{position:"relative"}}>
            <Image src={editAvatar || currentUser.avatar} alt="Avatar" width={88} height={88} style={{borderRadius:"50%",objectFit:"cover",border:"3px solid var(--gold)",background:"#1a0a2e"}} onError={handleImgError} />
            <button type="button" onClick={()=>editAvatarInputRef.current?.click()} style={{position:"absolute",bottom:0,right:0,width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#ffd700,#ff8a80)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#0a0612"}} title="Upload profile photo" aria-label="Upload profile photo">+</button>
            <input ref={editAvatarInputRef} type="file" accept="image/*" aria-label="Upload profile photo" style={{display:"none"}} onChange={async (e)=>{const f=e.target.files?.[0];if(f){showToast("Uploading...");const url=await uploadImage(f,"avatars");if(url){setEditAvatar(url);showToast("Photo added!")}}}} />
          </div>
        </div>
        <input className="inp" aria-label="Display name" placeholder="Display Name" value={editName} onChange={e=>setEditName(e.target.value)} />
        <textarea className="inp" aria-label="Bio" placeholder="Bio" rows={3} value={editBio} onChange={e=>setEditBio(e.target.value)} />
        <input className="inp" aria-label="Location" placeholder="Location" value={editLoc} onChange={e=>setEditLoc(e.target.value)} />
        <input className="inp" aria-label="Media kit link" placeholder="Media Kit link (PDF or portfolio one-pager)" value={editMediaKit} onChange={e=>setEditMediaKit(e.target.value)} />
        <div style={{ marginBottom: 12 }}>
          <div className="side-label">Creative Type</div>
          <div className="side-sub" style={{ marginBottom: 6 }}>🎬 Behind the Camera</div>
          <div className="chips" style={{ marginBottom: 8 }}>
            {BEHIND_CAMERA.map(t => <button type="button" key={t} aria-pressed={editType===t} className={"chip"+(editType===t?" sel":"")} onClick={()=>{setEditType(t);setEditCustomTypePending(false);}}><span>{t}</span></button>)}
          </div>
          <div className="side-sub" style={{ marginBottom: 6 }}>📸 In Front of the Camera</div>
          <div className="chips">
            {IN_FRONT_CAMERA.map(t => <button type="button" key={t} aria-pressed={editType===t} className={"chip"+(editType===t?" sel":"")} onClick={()=>{setEditType(t);setEditCustomTypePending(false);}}><span>{t}</span></button>)}
            {/* Torreé audit item 6 */}
            <button type="button" key="other" aria-pressed={editCustomTypePending} className={"chip"+(editCustomTypePending?" sel":"")} onClick={()=>{setEditType("");setEditCustomTypePending(true);}}><span>Add New +</span></button>
          </div>
          {editCustomTypePending && (
            <input className="inp" aria-label="Creative role" placeholder="Type your creative role..." value={editType} onChange={e=>setEditType(e.target.value)} style={{ marginTop: 10 }} />
          )}
        </div>
        <div style={{ marginBottom: 14 }}>
          <div className="side-label">Looking For</div>
          <div className="chips">
            {lookingForOptions(editType || currentUser.type || "").map(l => {
              const sel = (editLooking.length?editLooking:obData.looking||[]).includes(l);
              return (
                <button type="button" key={l} aria-pressed={sel} className={"chip"+(sel?" sel":"")} onClick={()=>{const cur: string[] = editLooking.length?editLooking:((obData.looking||[]) as string[]); setEditLooking(cur.includes(l)?cur.filter((x: string)=>x!==l):[...cur,l]);}}><span>{l}</span></button>
              );
            })}
          </div>
        </div>
        <div style={{ marginBottom: 14, padding: "12px 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>NSFW Profile</div>
              <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 2 }}>Mark your profile as 18+ — content will be age-gated in Discovery</div>
            </div>
            <div role="switch" aria-checked={editNsfw} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setEditNsfw(!editNsfw); } }} onClick={() => setEditNsfw(!editNsfw)} className={"toggle-track" + (editNsfw ? " active" : "")} style={{ width: 44, height: 24, borderRadius: 12, cursor: "pointer", position: "relative", transition: "all .3s", background: editNsfw ? "linear-gradient(135deg,var(--coral),var(--pink))" : "rgba(255,255,255,0.1)", flexShrink: 0 }}>
              <div style={{ width: 20, height: 20, borderRadius: 10, background: "#fff", position: "absolute", top: 2, left: editNsfw ? 22 : 2, transition: "all .3s" }} />
            </div>
          </div>
        </div>
        <button className="btn btn-gold" style={{width:"100%"}} onClick={saveProfileEdits}>{STRINGS.save}</button>
      </div>
    </div>
  );
}
