"use client";

/**
 * P2 extraction: the auth (log in / sign up) screen, moved verbatim out of page.tsx.
 * Pure presentational — all state and handlers are passed in as props.
 */
export type AuthScreenProps = {
  authMode: any;
  setAuthMode: React.Dispatch<React.SetStateAction<any>>;
  authEmail: any;
  setAuthEmail: React.Dispatch<React.SetStateAction<any>>;
  formErrors: any;
  setFormErrors: React.Dispatch<React.SetStateAction<any>>;
  authPass: any;
  setAuthPass: React.Dispatch<React.SetStateAction<any>>;
  showPass: any;
  setShowPass: React.Dispatch<React.SetStateAction<any>>;
  authRemember: any;
  setAuthRemember: React.Dispatch<React.SetStateAction<any>>;
  authLoading: any;
  setAuthLoading: React.Dispatch<React.SetStateAction<any>>;
  authFetch: any;
  showToast: any;
  handleAuthClick: any;
  handleOAuth: any;
  setShowTerms: React.Dispatch<React.SetStateAction<any>>;
  setShowPrivacy: React.Dispatch<React.SetStateAction<any>>;
  setShowGuidelines: React.Dispatch<React.SetStateAction<any>>;
};

export function AuthScreen({ authMode, setAuthMode, authEmail, setAuthEmail, formErrors, setFormErrors, authPass, setAuthPass, showPass, setShowPass, authRemember, setAuthRemember, authLoading, setAuthLoading, authFetch, showToast, handleAuthClick, handleOAuth, setShowTerms, setShowPrivacy, setShowGuidelines }: AuthScreenProps) {
  return (
        <div className="phone-wrap">
          <div className="phone" id="muse-app">
            <div className="notch" />
            <div className="screen-el active">
              <div className="onboard" role="main" id="muse-main" tabIndex={-1} style={{paddingTop:30}}>
                <div className="sparkle" style={{top:"8%",left:"6%",fontSize:24}}>✦</div>
                <div className="sparkle" style={{top:"15%",right:"10%",fontSize:18}}>✧</div>
                <div className="sparkle" style={{bottom:"35%",left:"12%",fontSize:20}}>✦</div>
                <div className="sparkle" style={{bottom:"12%",right:"6%",fontSize:16}}>✧</div>
                <div className="hero-text muse-brand-lockup" style={{marginBottom:14}}>Muses <span>by WYZ</span></div>
                <div className="hero-sub">Where creatives find <em>real connections</em></div>
                <div style={{width:"100%",maxWidth:320,margin:"0 auto"}}>
                  <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
                    <button className={"auth-tab"+(authMode==="login"?" active":"")} role="tab" aria-selected={authMode==="login"} onClick={()=>setAuthMode("login")}>Log In</button>
                    <button className={"auth-tab"+(authMode==="signup"?" active":"")} role="tab" aria-selected={authMode==="signup"} onClick={()=>setAuthMode("signup")}>Sign Up</button>
                  </div>
                  <input className={"inp"+(formErrors.email?" error":"")} placeholder="Email" type="email" aria-label="Email address" value={authEmail} onChange={(e: any) =>{setAuthEmail(e.target.value);setFormErrors((p: any) =>({...p,email:""}))}} style={authEmail.length>28?{textOverflow:"ellipsis"}:{}} title={authEmail} />
                  {formErrors.email && <div className="error-msg">{formErrors.email}</div>}
                  <div style={{position:"relative"}}>
                    <input className={"inp"+(formErrors.pass?" error":"")} placeholder="Password" type={showPass?"text":"password"} aria-label="Password" value={authPass} onChange={(e: any) =>{setAuthPass(e.target.value);setFormErrors((p: any) =>({...p,pass:""}))}} style={{paddingRight:44}} />
                    <button type="button" onClick={()=>setShowPass((p: any) =>!p)} style={{position:"absolute",right:4,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:18,padding:0,lineHeight:1,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center"}} aria-label={showPass?"Hide password":"Show password"}>{showPass?"🙈":"👁️"}</button>
                  </div>
                  {authMode==="signup" && authPass && (()=>{const l=authPass.length;const u=/[A-Z]/.test(authPass);const y=/[!@#$%^&*]/.test(authPass);const s=l>=8&&u&&y?l>=12?4:3:l>=6?2:1;const lbl=["","Weak","Fair","Strong","Very strong"][s];const col=["","var(--sunset)","var(--sunset-orange)","var(--amber)","var(--mint)"][s];const t=["","weak","fair","strong","vstrong"][s];return(<div><div className="pw-meter-label" style={{color:col}}>{lbl}</div><div className="pw-meter-wrap"><div className={"pw-meter-bar"+(s>=1?" "+t:"")}/><div className={"pw-meter-bar"+(s>=2?" "+t:"")}/><div className={"pw-meter-bar"+(s>=3?" "+t:"")}/><div className={"pw-meter-bar"+(s>=4?" "+t:"")}/></div></div>);})()}
                  {formErrors.pass && <div className="error-msg">{formErrors.pass}</div>}
                  <div style={{display:"flex",alignItems:"center",gap:8,marginTop:10,minHeight:44}}>
                    <input id="auth-remember" type="checkbox" checked={authRemember} onChange={(e: any) =>setAuthRemember(e.target.checked)} style={{width:18,height:18,accentColor:"#ffd700",flexShrink:0,cursor:"pointer"}} />
                    <label htmlFor="auth-remember" style={{fontSize:13,color:"rgba(255,255,255,0.7)",cursor:"pointer",display:"block",padding:"13px 0",flex:1}}>Remember me</label>
                  </div>
                  {authMode==="login" && <button type="button" onClick={async()=>{if(!authEmail.trim()){setFormErrors({email:"Enter your email first"});return;}setAuthLoading(true);try{const r=await authFetch("/api/muse/auth",{method:"POST",body:JSON.stringify({action:"forgot-password",email:authEmail.trim()})});const j=await r.json();showToast(j.message||j.error||"Check your email for a password reset link!");}catch{showToast("Network error");}setAuthLoading(false);}} style={{background:"none",border:"none",color:"var(--gold)",fontSize:12,cursor:"pointer",textAlign:"right",width:"100%",marginTop:4,padding:0}}>Forgot password?</button>}
                  <button className="btn btn-gold" style={{marginTop:10,opacity:authLoading?0.6:1}} disabled={authLoading} onClick={handleAuthClick}>{authLoading?"Loading...":authMode==="login"?"Log In":"Create Account"}</button>
                  <div className="auth-divider"><span>or continue with</span></div>
                  <div style={{display:"flex",gap:10}}>
                    <button className="auth-social-btn" style={{flex:1,width:"auto",minWidth:0,padding:"14px 8px",gap:6}} onClick={()=>handleOAuth("google")}><svg width="16" height="16" viewBox="0 0 48 48" style={{flexShrink:0}}><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5c10 0 19.5-7.3 19.5-19.5 0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12.5 24 12.5c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4.5 24 4.5 16.3 4.5 9.7 8.8 6.3 14.7z"/><path fill="#4CAF50" d="M24 43.5c5.4 0 10.3-2.1 14-5.4l-6.5-5.5C29.6 34 26.9 35 24 35c-5.3 0-9.7-2.6-11.3-7.5l-6.5 5C9.6 40.2 16.2 43.5 24 43.5z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.6l6.5 5.5C41.4 35.7 43.5 30.3 43.5 24c0-1.3-.1-2.3-.4-3.5z"/></svg><span>Google</span></button>
                    <button className="auth-social-btn" style={{flex:1,width:"auto",minWidth:0,padding:"14px 8px",gap:6}} onClick={()=>handleOAuth("facebook")}><svg width="16" height="16" viewBox="0 0 48 48" style={{flexShrink:0}}><path fill="#1877F2" d="M48 24C48 10.7 37.3 0 24 0S0 10.7 0 24c0 11.9 8.7 21.8 20 23.6V31h-6v-7h6v-5.3c0-5.9 3.5-9.2 8.9-9.2 2.6 0 5.3.5 5.3.5v5.8h-3c-2.9 0-3.8 1.8-3.8 3.7V24h6.5l-1 7h-5.5v16.6C39.3 45.8 48 35.9 48 24z"/></svg><span>Facebook</span></button>
                    <button className="auth-social-btn" style={{flex:1,width:"auto",minWidth:0,padding:"14px 8px",gap:6}} onClick={()=>handleOAuth("x")} aria-label="Continue with X"><svg width="16" height="16" viewBox="0 0 24 24" style={{flexShrink:0}}><path fill="#fff" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg><span>X</span></button>
                  </div>
                  <div className="auth-terms-wrap">
                    <span style={{fontSize:13,color:"rgba(255,255,255,0.65)"}}>By continuing you agree to our</span>
                    <button className="auth-terms" tabIndex={0} onKeyDown={(e: any) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setShowTerms(true); } }} onClick={()=>setShowTerms(true)}>Terms</button>
                    <button className="auth-terms" tabIndex={0} onKeyDown={(e: any) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setShowPrivacy(true); } }} onClick={()=>setShowPrivacy(true)}>Privacy</button>
                    <button className="auth-terms" tabIndex={0} onKeyDown={(e: any) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setShowGuidelines(true); } }} onClick={()=>setShowGuidelines(true)}>Guidelines</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
  );
}
