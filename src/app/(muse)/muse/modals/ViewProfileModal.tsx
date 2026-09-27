"use client";

import Image from "next/image";
import { BadgeInfoModal, ZODIAC_FULL, MBTI_FULL, LIFE_PATH_FULL, STYLE_FULL } from "../components/badgeInfo";
import { ZODIAC_GLYPH, MbtiIcon, LifePathIcon } from "../components/traitIcons";
import type { MuseModalsProps } from "./types";

type Props = Pick<
  MuseModalsProps,
  | "viewProfile"
  | "setViewProfile"
  | "viewProfileTrap"
  | "viewProfilePhotoIdx"
  | "setViewProfilePhotoIdx"
  | "revealedNsfw"
  | "setRevealedNsfw"
  | "badgeInfo"
  | "setBadgeInfo"
  | "viewProfileReviews"
  | "setPublicProfileUser"
>;

export function ViewProfileModal({
  viewProfile,
  setViewProfile,
  viewProfileTrap,
  viewProfilePhotoIdx,
  setViewProfilePhotoIdx,
  revealedNsfw,
  setRevealedNsfw,
  badgeInfo,
  setBadgeInfo,
  viewProfileReviews,
  setPublicProfileUser,
}: Props) {
  if (!viewProfile) return null;
  return (
    <div className="modal-overlay" ref={viewProfileTrap} role="dialog" aria-modal="true" aria-label="View profile" onPointerDown={(e) => { if (e.target === e.currentTarget) setViewProfile(null); }}>
      <div className="modal-panel" style={{maxWidth:420,width:"90%",maxHeight:"88vh",overflowY:"auto",borderRadius:24,padding:0,background:"linear-gradient(180deg,#0f081e,#0a0612)"}}>
        <div style={{position:"relative",width:"100%",aspectRatio:"3/4",overflow:"hidden"}}>
          {(() => {
            const photos = (viewProfile.photos?.length ? viewProfile.photos : [viewProfile.img]).filter((photo): photo is string => Boolean(photo));
            const curPhoto = photos[viewProfilePhotoIdx] || photos[0] || viewProfile.img || "";
            return <>
              <Image loading="lazy" src={curPhoto} alt={viewProfile.name || "Profile"} fill sizes="(max-width: 600px) 100vw, 400px" style={{objectFit:"cover",filter:viewProfile.nsfw&&!revealedNsfw.has(String(viewProfile.id))?"blur(26px) brightness(0.7)":"none",transition:"filter .3s"}} />
              {viewProfile.nsfw&&!revealedNsfw.has(String(viewProfile.id))&&(
                <button onClick={(e)=>{e.stopPropagation();setRevealedNsfw(prev=>{const n=new Set(prev);n.add(String(viewProfile.id));return n;})}} style={{position:"absolute",inset:0,zIndex:5,background:"rgba(10,6,18,0.45)",border:"none",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,cursor:"pointer"}}>
                  <div style={{fontSize:30,fontWeight:800,color:"#ff8a80"}}>18+</div>
                  <div style={{fontSize:13,fontWeight:700,color:"#fff",letterSpacing:0.03}}>NSFW content</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.7)"}}>Tap to reveal</div>
                </button>
              )}
              {photos.length > 1 && (
                <div style={{position:"absolute",bottom:70,left:0,right:0,display:"flex",justifyContent:"center",gap:6,zIndex:4}}>
                  {photos.map((_:string,i:number)=>(
                    <div key={i} onClick={(e)=>{e.stopPropagation();setViewProfilePhotoIdx(i);}} role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();e.stopPropagation();setViewProfilePhotoIdx(i);}}} style={{width:7,height:7,borderRadius:"50%",background:i===viewProfilePhotoIdx?"#FFD700":"rgba(255,255,255,0.4)",cursor:"pointer",transition:"all .2s"}} />
                  ))}
                </div>
              )}
              {photos.length > 1 && <>
                <div role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();e.stopPropagation();setViewProfilePhotoIdx(p=>p>0?p-1:photos.length-1);}}} onClick={(e)=>{e.stopPropagation();setViewProfilePhotoIdx(p=>p>0?p-1:photos.length-1);}} style={{position:"absolute",left:0,top:0,bottom:0,width:"35%",zIndex:3,cursor:"pointer"}} />
                <div role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();e.stopPropagation();setViewProfilePhotoIdx(p=>p<photos.length-1?p+1:0);}}} onClick={(e)=>{e.stopPropagation();setViewProfilePhotoIdx(p=>p<photos.length-1?p+1:0);}} style={{position:"absolute",right:0,top:0,bottom:0,width:"35%",zIndex:3,cursor:"pointer"}} />
              </>}
            </>;
          })()}
          <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"20px",background:"linear-gradient(to top,rgba(10,6,18,0.95),transparent)"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <div style={{fontSize:24,fontWeight:800,fontFamily:"'Playfair Display',serif",fontStyle:"italic"}}>{viewProfile.name}</div>
              {viewProfile.verified && <span role="button" tabIndex={0} onClick={(e)=>{e.stopPropagation();setBadgeInfo({name:"Verified",desc:"Identity verified by Muses by WYZ — we confirmed this member's government ID and professional credentials.",icon:"✓",color:"#FFD700"});}} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();e.stopPropagation();setBadgeInfo({name:"Verified",desc:"Identity verified by Muses by WYZ — we confirmed this member's government ID and professional credentials.",icon:"✓",color:"#FFD700"});}}} style={{cursor:"pointer",fontSize:16,color:"#FFD700"}} title="Identity verified">✓</span>}
            </div>
            <div style={{fontSize:14,color:"var(--gold)",fontWeight:600}}>{viewProfile.type}</div>
            {viewProfile.tier && <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{viewProfile.tier}</div>}
          </div>
          <button onClick={()=>setViewProfile(null)} aria-label="Close profile" style={{position:"absolute",top:12,right:12,width:32,height:32,borderRadius:"50%",background:"rgba(0,0,0,0.6)",border:"none",color:"#fff",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",zIndex:5}}>✕</button>
        </div>
        <div style={{padding:20}}>
          <div style={{display:"flex",gap:12,marginBottom:16,justifyContent:"space-around"}}>
            {[
              {label:"Collabs",value:viewProfile.collabs ?? "—"},
              {label:"Score",value:viewProfile.score ?? "—"},
              {label:"Views",value:viewProfile.views ?? "—"},
            ].map(s => (
              <div key={s.label} style={{textAlign:"center"}}>
                <div style={{fontSize:18,fontWeight:800,color:"var(--gold)"}}>{s.value}</div>
                <div style={{fontSize:10,color:"var(--muted)"}}>{s.label}</div>
              </div>
            ))}
          </div>
          {viewProfile.badges && viewProfile.badges.length > 0 && (
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
              {viewProfile.badges.map((b, i) => (
                <span key={i} style={{padding:"3px 8px",borderRadius:99,background:b.bg||"rgba(255,215,0,0.1)",border:`1px solid ${b.bd||"rgba(255,215,0,0.2)"}`,fontSize:10,fontWeight:700,color:b.color||"var(--gold)",cursor:"pointer"}}>{b.icon} {b.name}</span>
              ))}
            </div>
          )}
          {viewProfile.bio && <p style={{color:"var(--text2)",lineHeight:1.6,fontSize:14,marginBottom:16}}>{viewProfile.bio}</p>}
          {viewProfile.location && <div style={{fontSize:13,color:"var(--text2)",marginBottom:12}}>📍 {viewProfile.location}{typeof viewProfile.distanceMi==="number"?` · ${viewProfile.distanceMi} mi`:""}</div>}
          {(viewProfile.styles || []).length > 0 && (
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
              {(viewProfile.styles || []).map((s:string)=><button key={s} onClick={(e)=>{e.stopPropagation();setBadgeInfo({name:s,desc:STYLE_FULL[s]||"A creative style this member works in.",icon:"🎨",color:"#FFD700"})}} style={{padding:"3px 8px",borderRadius:99,background:"rgba(255,215,0,0.1)",border:"1px solid rgba(255,215,0,0.2)",fontSize:10,fontWeight:600,color:"var(--gold)",cursor:"pointer"}}>{s}</button>)}
            </div>
          )}
          {(viewProfile.looking || []).length > 0 && (
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
              {(viewProfile.looking || []).map((l:string)=><span key={l} style={{padding:"3px 8px",borderRadius:99,background:"rgba(255,105,180,0.12)",border:"1px solid rgba(255,105,180,0.2)",fontSize:10,fontWeight:600,color:"#FF69B4"}}>looking for {l}</span>)}
            </div>
          )}
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
            {viewProfile.zodiac && <button onClick={(e)=>{e.stopPropagation();setBadgeInfo({name:`${viewProfile.zodiac} — ${ZODIAC_FULL[viewProfile.zodiac || ""]?.tag||""}`,desc:ZODIAC_FULL[viewProfile.zodiac || ""]?.desc||"",icon:ZODIAC_GLYPH[viewProfile.zodiac || ""]||"✦",color:"#D4A5FF"})}} style={{padding:"3px 8px",borderRadius:99,background:"rgba(212,165,255,0.12)",border:"1px solid rgba(212,165,255,0.2)",fontSize:10,fontWeight:600,color:"var(--lavender)",cursor:"pointer"}}>{ZODIAC_GLYPH[viewProfile.zodiac || ""]||"✦"} {viewProfile.zodiac}</button>}
            {viewProfile.mbti && <button onClick={(e)=>{e.stopPropagation();setBadgeInfo({name:`${viewProfile.mbti} — ${MBTI_FULL[viewProfile.mbti || ""]?.tag||""}`,desc:MBTI_FULL[viewProfile.mbti || ""]?.desc||"",icon:<MbtiIcon code={viewProfile.mbti || ""} size={16}/>,color:"#FFD700"})}} style={{padding:"3px 8px",borderRadius:99,background:"rgba(255,215,0,0.1)",border:"1px solid rgba(255,215,0,0.2)",fontSize:10,fontWeight:600,color:"var(--gold)",cursor:"pointer",display:"inline-flex",alignItems:"center",gap:4}}><MbtiIcon code={viewProfile.mbti || ""} size={10}/> {viewProfile.mbti}</button>}
            {viewProfile.lifePath && <button onClick={(e)=>{e.stopPropagation();setBadgeInfo({name:`Life Path ${viewProfile.lifePath}`,desc:LIFE_PATH_FULL[String(viewProfile.lifePath)]||"",icon:<LifePathIcon n={Number(viewProfile.lifePath)} size={16}/>,color:"#98FB98"})}} style={{padding:"3px 8px",borderRadius:99,background:"rgba(152,251,152,0.1)",border:"1px solid rgba(152,251,152,0.2)",fontSize:10,fontWeight:600,color:"var(--mint)",cursor:"pointer",display:"inline-flex",alignItems:"center",gap:4}}><LifePathIcon n={Number(viewProfile.lifePath)} size={10}/> LP {viewProfile.lifePath}</button>}
          </div>
          {typeof viewProfile.collabs === "number" && <div style={{fontSize:13,color:"var(--text2)",marginBottom:16}}>🤝 {viewProfile.collabs} collaborations</div>}
          {viewProfileReviews.length > 0 && (
            <div style={{marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:700,color:"var(--text)",marginBottom:8}}>Reviews</div>
              {viewProfileReviews.map((rv) => (
                <div key={rv.id} style={{padding:"10px 12px",borderRadius:12,background:"rgba(255,255,255,0.04)",marginBottom:8}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:12,fontWeight:700,color:"var(--text)"}}>{rv.reviewer_id?.name || "Anonymous"}</span>
                    <span style={{fontSize:12,color:"var(--gold)"}}>{"★".repeat(rv.rating)}{"☆".repeat(5 - rv.rating)}</span>
                  </div>
                  {rv.body && <div style={{fontSize:12,color:"var(--text2)",lineHeight:1.5}}>{rv.body}</div>}
                </div>
              ))}
            </div>
          )}
          <button className="btn btn-gold" style={{width:"100%"}} onClick={() => {const u=viewProfile;setViewProfile(null);setPublicProfileUser({ ...u, badges: u.badges?.map(b => b.name) });}}>View Full Profile</button>
        </div>
        <BadgeInfoModal info={badgeInfo} onClose={()=>setBadgeInfo(null)} />
      </div>
    </div>
  );
}
