"use client";

import Image from "next/image";
import { getMuseRole } from "@/lib/role";
import type { MuseModalsProps } from "./types";

type Props = Pick<
  MuseModalsProps,
  | "showIntentPicker"
  | "setShowIntentPicker"
  | "intentProfile"
  | "setIntentProfile"
  | "intentSelection"
  | "setIntentSelection"
  | "intentPickerTrap"
  | "currentUser"
  | "obData"
  | "handleImgError"
  | "setUserDefaultIntent"
  | "doSwipe"
>;

export function IntentPickerModal({
  showIntentPicker,
  setShowIntentPicker,
  intentProfile,
  setIntentProfile,
  intentSelection,
  setIntentSelection,
  intentPickerTrap,
  currentUser,
  obData,
  handleImgError,
  setUserDefaultIntent,
  doSwipe,
}: Props) {
  if (!showIntentPicker || !intentProfile) return null;
  return (
    <div className="intent-overlay" ref={intentPickerTrap} role="dialog" aria-modal="true" aria-label="Intent picker" onPointerDown={(e) => { if (e.target === e.currentTarget) { setShowIntentPicker(false); setIntentProfile(null); setIntentSelection([]); } }}>
      <div className="intent-modal">
        <div style={{textAlign:"center",marginBottom:16}}>
          <Image loading="lazy" src={intentProfile.img} alt="Avatar" width={60} height={60} style={{borderRadius:"50%",objectFit:"cover",marginBottom:8}} onError={handleImgError} />
          <div style={{fontSize:16,fontWeight:700,color:"var(--text)"}}>{intentProfile.name}</div>
          <div style={{fontSize:12,color:"var(--muted)"}}>{intentProfile.type}</div>
        </div>
        <div style={{fontSize:13,color:"var(--text2)",textAlign:"center",marginBottom:16}}>What's your intent with {intentProfile.name.split(" ")[0]}? <span style={{opacity:0.7}}>(up to 2)</span></div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {(getMuseRole({ audience: currentUser.audience, type: currentUser.type || obData.type }) === "muse" ? [
            {icon:"📌",label:"Book / Hire",desc:"Bring them onto a project you're casting or producing",intent:"hire"},
            {icon:"🤝",label:"Collaborate",desc:"Work together on a project",intent:"collab"},
            {icon:"📁",label:"Scout for Future Work",desc:"Keep them in mind for upcoming briefs",intent:"scout"},
            {icon:"🔗",label:"Connect",desc:"Grow your industry network",intent:"connect"},
          ] : [
            {icon:"🤝",label:"Collaborate",desc:"Work together on a project",intent:"collab"},
            {icon:"💼",label:"Hire / Commission",desc:"Professional paid work",intent:"hire"},
            {icon:"🔗",label:"Connect",desc:"Grow your creative network",intent:"connect"},
            {icon:"👁️",label:"Inspired By",desc:"Your work inspires me",intent:"inspire"},
          ]).map(({icon,label,desc,intent})=>(
            <button key={intent} className={`intent-btn ${intentSelection.includes(intent) ? "selected" : ""}`} onClick={(e)=>{
              e.stopPropagation();
              // Round 46: two-tap flow — first tap highlights option 1,
              // second tap highlights option 2 (and vice-versa). No
              // other outline, no ripple, no hover state — just the
              // selected background swap. If a third tap lands on an
              // already-selected item, it deselects; if it lands on a
              // third option while two are already chosen, it's ignored.
              if (intentSelection.length >= 2 && !intentSelection.includes(intent)) return;
              setIntentSelection(prev => prev.includes(intent) ? prev.filter(i => i !== intent) : [...prev, intent]);
            }} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,background:intentSelection.includes(intent) ? "var(--gold)" : "var(--glass)",cursor:"pointer",width:"100%",textAlign:"left",transition:"all .15s"}}
            >
              <span style={{fontSize:28}}>{icon}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:700,color:intentSelection.includes(intent) ? "#20180a" : "var(--text)"}}>{label}</div>
                <div style={{fontSize:11,color:intentSelection.includes(intent) ? "rgba(32,24,10,0.72)" : "var(--muted)"}}>{desc}</div>
              </div>
            </button>
          ))}
        </div>
        {intentSelection.length > 0 && (
          <button className="intent-submit" onClick={()=>{
            const chosenIntent = intentSelection.join("+");
            setUserDefaultIntent(chosenIntent);
            setShowIntentPicker(false);
            setIntentProfile(null);
            setIntentSelection([]);
            doSwipe("right", chosenIntent);
          }} style={{display:"block",width:"100%",marginTop:12,padding:8,border:"none",background:"var(--gold)",color:"#20180a",fontSize:12,cursor:"pointer",fontWeight:600}}>Submit {intentSelection.length} intent{(intentSelection.length > 1 ? "s" : "")}</button>
        )}
        <button className="intent-skip" onClick={()=>{setShowIntentPicker(false);setIntentProfile(null);setIntentSelection([]);setUserDefaultIntent("");doSwipe("left")}} style={{display:"block",width:"100%",marginTop:12,padding:8,border:"none",background:"none",color:"var(--muted)",fontSize:12,cursor:"pointer"}}>Skip this profile</button>
      </div>
    </div>
  );
}
