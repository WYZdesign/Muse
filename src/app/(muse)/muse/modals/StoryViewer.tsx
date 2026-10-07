"use client";

import Image from "next/image";
import type { MuseModalsProps } from "./types";

type Props = Pick<MuseModalsProps, "showStory" | "setShowStory" | "stories">;

export function StoryViewer({ showStory, setShowStory, stories }: Props) {
  if (showStory === null) return null;
  return (
    <div style={{position:"fixed",inset:0,zIndex:600,background:"rgba(0,0,0,0.96)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
      <div style={{position:"absolute",top:18,left:16,right:16,display:"flex",gap:5,zIndex:4}}>
        {stories.map((s,i)=>(
          <div key={s.id} style={{flex:1,height:3,borderRadius:2,background:"rgba(255,255,255,0.25)",overflow:"hidden"}}>
            <div key={showStory} style={{height:"100%",width:"100%",background:"var(--gold)",transformOrigin:"left",transform:i<showStory?"scaleX(1)":"scaleX(0)",animation:i===showStory?"storyProgress 5s linear forwards":"none"}} />
          </div>
        ))}
      </div>
      <button style={{position:"absolute",top:14,right:14,zIndex:5,background:"none",border:"none",color:"#fff",fontSize:26,cursor:"pointer",padding:6}} onClick={()=>setShowStory(null)} aria-label="Close story">✕</button>
      {stories[showStory] && (
        <div style={{textAlign:"center",pointerEvents:"none"}}>
          <Image loading="lazy" src={stories[showStory].img} alt="Photo" width={800} height={1200} style={{width:"auto",height:"auto",maxWidth:"90%",maxHeight:"70vh",borderRadius:16,objectFit:"contain",backgroundColor:"#1a0a2e"}} />
          <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"center",marginTop:16}}>
            <Image loading="lazy" src={stories[showStory].avatar} alt="Avatar" width={32} height={32} style={{borderRadius:"50%",objectFit:"cover",backgroundColor:"#1a0a2e"}} />
            <span style={{color:"#fff",fontWeight:700}}>{stories[showStory].author}</span>
            <span style={{color:"rgba(255,255,255,0.5)",fontSize:12}}>{stories[showStory].time}</span>
          </div>
        </div>
      )}
              <button type="button" aria-label="Previous story" style={{position:"absolute",left:0,top:0,bottom:0,width:"30%",zIndex:2,border:0,background:"transparent",padding:0,cursor:"pointer"}} onClick={(e)=>{e.stopPropagation();setShowStory(prev=>prev!==null&&prev>0?prev-1:prev)}} />
              <button type="button" aria-label="Next story" style={{position:"absolute",right:0,top:0,bottom:0,width:"30%",zIndex:2,border:0,background:"transparent",padding:0,cursor:"pointer"}} onClick={(e)=>{e.stopPropagation();setShowStory(prev=>prev!==null&&prev<stories.length-1?prev+1:null)}} />
      <div style={{position:"absolute",bottom:24,color:"rgba(255,255,255,0.5)",fontSize:12,zIndex:3,pointerEvents:"none"}}>Tap sides to navigate · tap ✕ to close</div>
    </div>
  );
}
