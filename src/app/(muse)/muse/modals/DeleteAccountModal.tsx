"use client";

import { FiArrowLeft, FiX } from "react-icons/fi";
import { STRINGS } from "@/lib/strings";
import { safeRemoveItem } from "../lib/safe-storage";
import type { MuseModalsProps } from "./types";

type Props = Pick<
  MuseModalsProps,
  "showDeleteConfirm" | "setShowDeleteConfirm" | "deleteConfirmTrap" | "authFetch" | "setAuthUser" | "setScreen" | "showToast"
>;

export function DeleteAccountModal({
  showDeleteConfirm,
  setShowDeleteConfirm,
  deleteConfirmTrap,
  authFetch,
  setAuthUser,
  setScreen,
  showToast,
}: Props) {
  if (!showDeleteConfirm) return null;
  return (
    <div className="modal-overlay lighter" ref={deleteConfirmTrap} role="dialog" aria-modal="true" aria-label="Confirm account deletion">
      <div className="modal-header">
        <button className="modal-back" aria-label="Back" onClick={()=>setShowDeleteConfirm(false)}><FiArrowLeft size={20} /></button>
        <div className="modal-title">Delete Account</div>
        <button className="modal-close" onClick={()=>setShowDeleteConfirm(false)} aria-label="Close"><FiX size={18} /></button>
      </div>
      <div className="modal-body" style={{textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:16}}>⚠️</div>
        <div style={{fontSize:18,fontWeight:700,color:"var(--text)",marginBottom:8}}>Are you sure?</div>
        <div style={{fontSize:14,color:"var(--text2)",marginBottom:24,lineHeight:1.6}}>Your access is removed immediately. Your account data is scheduled for permanent deletion after 30 days, except records we must retain for legal, safety, fraud, dispute, or recordkeeping obligations. See the Privacy Policy for details.</div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
           <button className="btn btn-gold" style={{width:"100%",borderColor:"var(--coral)",background:"linear-gradient(135deg,var(--coral),#ff4444)"}} onClick={async()=>{try{const res=await authFetch("/api/muse/auth",{method:"POST",body:JSON.stringify({action:"delete-account"})});if(!res.ok) throw new Error("failed");safeRemoveItem("muse_user");safeRemoveItem("muse_v1");safeRemoveItem("muse_geo");safeRemoveItem("muse_boost");safeRemoveItem("muse_last_reset");safeRemoveItem("muse_local");safeRemoveItem("muse_premium");safeRemoveItem("muse_referral_code");safeRemoveItem("muse_open_count");safeRemoveItem("muse_hide_premium");setAuthUser(null);setShowDeleteConfirm(false);setScreen("auth");showToast("Account deletion is scheduled. Access is removed now; data is purged after 30 days.");return}catch{showToast("Delete failed. Try again")}}}>Schedule Account Deletion</button>
          <button className="btn btn-outline" style={{width:"100%"}} onClick={()=>setShowDeleteConfirm(false)}>{STRINGS.cancel}</button>
        </div>
      </div>
    </div>
  );
}
