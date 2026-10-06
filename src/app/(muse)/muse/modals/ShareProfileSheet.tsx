"use client";

import { FiLink, FiTwitter, FiInstagram } from "react-icons/fi";
import { STRINGS } from "@/lib/strings";
import { getProfileShareUrl, getMuseUrl } from "@/lib/urls";
import type { MuseModalsProps } from "./types";

type Props = Pick<
  MuseModalsProps,
  "showShareProfile" | "setShowShareProfile" | "shareProfileTrap" | "authUser" | "currentUser" | "showToast"
>;

export function ShareProfileSheet({ showShareProfile, setShowShareProfile, shareProfileTrap, authUser, currentUser, showToast }: Props) {
  if (!showShareProfile) return null;
  return (
    <div className="modal-overlay" ref={shareProfileTrap} role="dialog" aria-modal="true" aria-label="Share profile" onPointerDown={(e) => { if (e.target === e.currentTarget) setShowShareProfile(false); }}>
      <div className="share-sheet">
        <div className="share-title">Share Profile</div>
        <div className="share-options">
          <button type="button" className="share-opt" onClick={()=>{navigator.clipboard?.writeText(getProfileShareUrl(authUser?.id||currentUser.name.replace(/\s+/g,"-").toLowerCase())).then(()=>showToast("Link copied!")).catch(()=>showToast("Copied!"));setShowShareProfile(false)}}><span className="share-opt-icon"><FiLink size={24} /></span><span className="share-opt-label">Copy</span></button>
          <button type="button" className="share-opt" onClick={()=>{window.open("https://twitter.com/intent/tweet?text=Check%20out%20my%20Muses%20by%20WYZ%20profile!&url="+encodeURIComponent(getMuseUrl()),"blank")}}><span className="share-opt-icon"><FiTwitter size={24} /></span><span className="share-opt-label">Twitter</span></button>
          <button type="button" className="share-opt" onClick={()=>{const url=getProfileShareUrl(authUser?.id||currentUser.name.replace(/\s+/g,"-").toLowerCase());if(navigator.share){navigator.share({title:"My Muses Profile",text:"Check out my Muses profile!",url}).catch(()=>{});}else{navigator.clipboard?.writeText(url).then(()=>showToast("Link copied! Paste it in your IG bio or story")).catch(()=>window.open("https://www.instagram.com/"));}setShowShareProfile(false)}}><span className="share-opt-icon"><FiInstagram size={24} /></span><span className="share-opt-label">IG</span></button>
        </div>
        <div className="share-link"><span className="share-link-text">{getProfileShareUrl(authUser?.id||currentUser.name.replace(/\s+/g,"-").toLowerCase()).replace(/^https?:\/\//, "")}</span><button className="share-link-copy" onClick={()=>{navigator.clipboard?.writeText(getProfileShareUrl(authUser?.id||currentUser.name.replace(/\s+/g,"-").toLowerCase())).then(()=>showToast("Link copied!")).catch(()=>showToast("Copied!"))}}>Copy</button></div>
        <button className="btn btn-outline" style={{marginTop:16,width:"100%"}} onClick={()=>setShowShareProfile(false)}>{STRINGS.close}</button>
      </div>
    </div>
  );
}
