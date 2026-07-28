"use client";

import { useState, useEffect } from "react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [status, setStatus] = useState<"loading" | "form" | "success" | "error">("loading");
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.substring(1));
    const token = params.get("access_token") || params.get("token") || "";
    if (token) { setAccessToken(token); setStatus("form"); }
    else { setStatus("error"); setError("Invalid or expired reset link. Please request a new one."); }
  }, []);

  const handleSubmit = async () => {
    if (!password.trim()) { setError("Enter a new password"); return; }
    if (password.length < 6) { setError("Minimum 6 characters"); return; }
    if (!/[A-Z]/.test(password)) { setError("Needs a capital letter"); return; }
    if (!/[!@#$%^&*(),.?\":{}|<>]/.test(password)) { setError("Needs a symbol"); return; }
    if (password !== confirm) { setError("Passwords don't match"); return; }
    setError("");
    try {
      const r = await fetch("/api/muse/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update-password", access_token: accessToken, new_password: password }) });
      const j = await r.json();
      if (!r.ok) { setError(j.error || "Failed to update password"); return; }
      setStatus("success");
    } catch { setError("Network error"); }
  };

  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0a0612",padding:20}}>
      <div style={{width:"100%",maxWidth:380,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:32,textAlign:"center"}}>
        <div style={{fontSize:32,marginBottom:8}}>🔐</div>
        <h1 style={{fontFamily:"var(--font-heading,sans-serif)",fontSize:22,color:"var(--gold,#ffd700)",marginBottom:24}}>Reset Password</h1>
        {status==="loading"&&<p style={{color:"var(--muted,#888)",fontSize:14}}>Loading...</p>}
        {status==="error"&&<div><p style={{color:"#ff6b6b",fontSize:14,marginBottom:16}}>{error}</p><a href="/muse" style={{color:"var(--gold,#ffd700)",fontSize:14,textDecoration:"underline"}}>Back to Muse</a></div>}
        {status==="form"&&<div>
          <div style={{position:"relative",marginBottom:12}}>
            <input type={showPass?"text":"password"} placeholder="New password" value={password} onChange={e=>{setPassword(e.target.value);setError("")}} style={{width:"100%",padding:"12px 44px 12px 14px",borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.06)",color:"#fff",fontSize:14,outline:"none",boxSizing:"border-box"}} />
            <button type="button" onClick={()=>setShowPass(p=>!p)} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"var(--muted,#888)",cursor:"pointer",fontSize:18,padding:8,lineHeight:1}}>{showPass?"🙈":"👁️"}</button>
          </div>
          <input type="password" placeholder="Confirm password" value={confirm} onChange={e=>{setConfirm(e.target.value);setError("")}} style={{width:"100%",padding:12,marginBottom:8,borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.06)",color:"#fff",fontSize:14,outline:"none",boxSizing:"border-box"}} />
          {password&&(()=>{const u=/[A-Z]/.test(password);const y=/[!@#$%^&*]/.test(password);const s=password.length>=8&&u&&y?password.length>=12?4:3:password.length>=6?2:1;const col=["","#ff6b6b","#ff9f43","#ffd700","#2ed573"][s];return(<div style={{marginBottom:8}}><div style={{fontSize:12,color:col,marginBottom:2}}>{["","Weak","Fair","Strong","Very strong"][s]}</div><div style={{display:"flex",gap:4}}>{[1,2,3,4].map(i=><div key={i} style={{flex:1,height:4,borderRadius:2,background:i<=s?col:"rgba(255,255,255,0.1)"}}/>)}</div></div>);})()}
          {error&&<div style={{color:"#ff6b6b",fontSize:12,marginBottom:8}}>{error}</div>}
          <button onClick={handleSubmit} style={{width:"100%",padding:12,borderRadius:10,background:"linear-gradient(135deg,#ffd700,#ff6b6b)",color:"#000",fontWeight:700,fontSize:15,border:"none",cursor:"pointer",marginTop:8}}>Update Password</button>
        </div>}
        {status==="success"&&<div><p style={{color:"#2ed573",fontSize:14,marginBottom:16}}>Password updated successfully!</p><a href="/muse" style={{display:"inline-block",padding:"10px 24px",borderRadius:10,background:"linear-gradient(135deg,#ffd700,#ff6b6b)",color:"#000",fontWeight:700,fontSize:14,textDecoration:"none"}}>Back to Muse</a></div>}
      </div>
    </div>
  );
}
