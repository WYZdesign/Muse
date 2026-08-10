"use client";

import { useEffect } from "react";

export default function OfflinePage() {
  useEffect(() => {
    navigator.serviceWorker?.getRegistration().then(reg => {
      if (!reg?.active) navigator.serviceWorker.register("/sw-muse.js");
    }).catch(() => {});
  }, []);

  return (
    <div style={{
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      minHeight:"100dvh",padding:32,background:"#0a0612",color:"#f5f0ff",textAlign:"center",
      fontFamily:"system-ui, sans-serif",
    }}>
      <div style={{fontSize:56,marginBottom:16}}>📡</div>
      <h1 style={{fontSize:22,fontWeight:700,marginBottom:8}}>You're offline</h1>
      <p style={{fontSize:14,color:"rgba(255,255,255,0.5)",maxWidth:340,marginBottom:24}}>
        Muse needs an internet connection to show content. Check your connection and try again.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{padding:"12px 32px",borderRadius:12,background:"#FFD700",color:"#0a0612",border:"none",fontSize:14,fontWeight:700,cursor:"pointer"}}
      >
        Try Again
      </button>
    </div>
  );
}
