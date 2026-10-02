"use client";

import { AESTHETICS, ZODIAC, CHINESE, CE, ZE, MBTI, LIFE_PATHS, lookingForOptions, BEHIND_CAMERA, IN_FRONT_CAMERA, calcZodiac, calcChineseZodiac, calcLifePath, calcMbti } from "../components/types";
import Image from "next/image";
import { getGeolocation } from "@/app/muse-realtime";
import { OnboardingBirthdateField } from "./OnboardingBirthdateField";

/**
 * P2 extraction: the multi-step onboarding flow, moved verbatim out of page.tsx.
 * Pure presentational component — every piece of state and every handler it
 * touches is passed in as a prop; page.tsx keeps ownership of the state.
 */
export type OnboardingFlowProps = {
  obStep: any;
  setObStep: React.Dispatch<React.SetStateAction<any>>;
  obData: any;
  setObData: React.Dispatch<React.SetStateAction<any>>;
  obConnectedSocials: any;
  obPortfolioItems: any;
  setObPortfolioItems: React.Dispatch<React.SetStateAction<any>>;
  obPortfolioSlot: any;
  setObPortfolioSlot: React.Dispatch<React.SetStateAction<any>>;
  obProfilePic: any;
  setObProfilePic: React.Dispatch<React.SetStateAction<any>>;
  testScreen: any;
  setTestScreen: React.Dispatch<React.SetStateAction<any>>;
  testBirthMonth: any;
  testBirthDay: any;
  testBirthYear: any;
  setTestBirthMonth: React.Dispatch<React.SetStateAction<any>>;
  setTestBirthDay: React.Dispatch<React.SetStateAction<any>>;
  setTestBirthYear: React.Dispatch<React.SetStateAction<any>>;
  testMbtiAnswers: any;
  setTestMbtiAnswers: React.Dispatch<React.SetStateAction<any>>;
  setCurrentUser: React.Dispatch<React.SetStateAction<any>>;
  setScreen: React.Dispatch<React.SetStateAction<any>>;
  uploadImage: any;
  toggleObMulti: any;
  toggleSocial: any;
  showToast: any;
  authFetch: any;
  authUser: any;
  photoInputRef: any;
  portfolioInputRef: any;
};

export function OnboardingFlow({ obStep, setObStep, obData, setObData, obConnectedSocials, obPortfolioItems, setObPortfolioItems, obPortfolioSlot, setObPortfolioSlot, obProfilePic, setObProfilePic, testScreen, setTestScreen, testBirthMonth, testBirthDay, testBirthYear, setTestBirthMonth, setTestBirthDay, setTestBirthYear, testMbtiAnswers, setTestMbtiAnswers, setCurrentUser, setScreen, uploadImage, toggleObMulti, toggleSocial, showToast, authFetch, authUser, photoInputRef, portfolioInputRef }: OnboardingFlowProps) {
  return (
  <div className="onboard">
    {obStep === 0 && (
                  <div className="onboard-content">
                    <div className="sparkle" style={{top:"10%",left:"6%",fontSize:24}}>✦</div>
                    <div className="sparkle" style={{top:"20%",right:"10%",fontSize:18}}>✧</div>
                    <div className="sparkle" style={{bottom:"30%",left:"15%",fontSize:20}}>✦</div>
                    <div className="sparkle" style={{bottom:"15%",right:"6%",fontSize:16}}>✧</div>
                    <div className="hero-text" style={{textAlign:"center"}}>Find your Muse</div>
                    <div className="hero-sub">Where creatives find <em>real connections</em> for professional collaboration</div>
                    <button className="btn btn-gold" onClick={()=>setObStep(1)}>Get Started</button>
                  </div>
                )}
                {obStep === 1 && (
                  <div className="onboard-content">
                    <div className="step-title">Your Info</div>
                    <div className="step-sub">Tell us about yourself</div>
                    <input className="inp" aria-label="Display name" placeholder="Display Name" value={obData.name||""} onChange={(e: any) =>setObData((d: any) =>({...d,name:e.target.value}))} />
                    <input className="inp" aria-label="Location" placeholder="Location (City, State)" value={obData.loc||""} onChange={(e: any) =>setObData((d: any) =>({...d,loc:e.target.value}))} />
                    <textarea className="inp" aria-label="Bio" placeholder="Who are you as a creative?" rows={3} value={obData.bio||""} onChange={(e: any) =>setObData((d: any) =>({...d,bio:e.target.value}))} />
                    <OnboardingBirthdateField value={obData.birthdate} onChange={(v: any) => setObData((d: any) => ({ ...d, birthdate: v }))} />
                    <button className="btn btn-gold" disabled={!(obData.name||"").trim()} style={!(obData.name||"").trim()?{opacity:0.5}:undefined} onClick={()=>setObStep(2)}>Next</button>
                    <button className="back-link" onClick={()=>setObStep(0)}>Back</button>
                  </div>
                )}
                {obStep === 2 && (
                  <div className="onboard-content">
                    <div className="step-title">Creative Type</div>
                    <div className="step-sub">Where do you work — behind the camera or in front of it?</div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                      {([["creative", "I'm here to work & collaborate"], ["industry", "I'm here to hire & book"]] as const).map(([val, label]) => (
                        <button key={val} tabIndex={0} onKeyDown={(e: any) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setObData((d: any) => ({ ...d, audience: val })); } }} onClick={() => setObData((d: any) => ({ ...d, audience: val }))} style={{ flex: 1, padding: "10px 8px", borderRadius: 12, cursor: "pointer", textAlign: "center", fontSize: 12, fontWeight: 700, transition: "all .25s", background: obData.audience === val ? "rgba(255,215,0,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${obData.audience === val ? "rgba(255,215,0,0.3)" : "rgba(255,255,255,0.06)"}`, color: obData.audience === val ? "var(--gold)" : "var(--muted)" }}>{label}</button>
                      ))}
                    </div>
                    <div className="side-group">
                      <div className="side-label">🎬 Behind the Camera</div>
                      <div className="side-sub">You make the work — crew, direction, craft.</div>
                      <div className="chips">
                        {BEHIND_CAMERA.map((t: any) => (
                          <button key={t} className={"chip"+(obData.type===t?" sel":"")} tabIndex={0} onKeyDown={(e: any) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setObData((d: any) =>({...d,type:t,customTypePending:false})); } }} onClick={()=>setObData((d: any) =>({...d,type:t,customTypePending:false}))}><span>{t}</span></button>
                        ))}
                      </div>
                    </div>
                    <div className="side-group" style={{ marginTop: 16 }}>
                      <div className="side-label">📸 In Front of the Camera</div>
                      <div className="side-sub">You're the talent — on-camera, performing, audience-facing.</div>
                      <div className="chips">
                        {IN_FRONT_CAMERA.map((t: any) => (
                          <button key={t} className={"chip"+(obData.type===t?" sel":"")} tabIndex={0} onKeyDown={(e: any) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setObData((d: any) =>({...d,type:t,customTypePending:false})); } }} onClick={()=>setObData((d: any) =>({...d,type:t,customTypePending:false}))}><span>{t}</span></button>
                        ))}
                        {/* Torreé audit item 6: not every creative role fits the
                            preset list — "Other" lets someone type their own,
                            saved as a real `type` value immediately and flagged
                            custom_type_pending for admin review. */}
                        <button key="other" className={"chip"+(obData.customTypePending?" sel":"")} tabIndex={0} onKeyDown={(e: any) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setObData((d: any) =>({...d,type:"",customTypePending:true})); } }} onClick={()=>setObData((d: any) =>({...d,type:"",customTypePending:true}))}><span>Add New +</span></button>
                      </div>
                    </div>
                    {obData.customTypePending && (
                      <input className="inp" aria-label="Creative role" placeholder="Type your creative role..." value={obData.type||""} onChange={(e: any) =>setObData((d: any) =>({...d,type:e.target.value}))} style={{ marginTop: 10 }} autoFocus />
                    )}
                    {!obData.type && <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", margin: "6px 0 2px" }}>Select one to continue</div>}
                    <button className="btn btn-gold" disabled={!obData.type} style={!obData.type?{opacity:0.5}:undefined} onClick={()=>setObStep(3)}>Next</button>
                    <button className="back-link" onClick={()=>setObStep(1)}>Back</button>
                  </div>
                )}
                {obStep === 3 && (
                  <div className="onboard-content">
                    <div className="step-title">Looking For</div>
                    <div className="step-sub">What kind of connections interest you?</div>
                    <div className="chips">
                      {lookingForOptions(obData.type || "").map((l: any) => (
                        <button key={l} className={"chip"+((obData.looking||[]).includes(l)?" sel":"")} tabIndex={0} onKeyDown={(e: any) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleObMulti("looking", l, 4); } }} onClick={()=>toggleObMulti("looking", l, 4)}><span>{l}</span></button>
                      ))}
                    </div>
                    {!(obData.looking||[]).length && <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", margin: "6px 0 2px" }}>Select at least one to continue</div>}
                    <button className="btn btn-gold" disabled={!(obData.looking||[]).length} style={!(obData.looking||[]).length?{opacity:0.5}:undefined} onClick={()=>setObStep(4)}>Next</button>
                    <button className="back-link" onClick={()=>setObStep(2)}>Back</button>
                  </div>
                )}
                {obStep === 4 && (
                  <div className="onboard-content">
                    <div className="step-title">Aesthetic Style</div>
                    <div className="step-sub">What's your creative aesthetic?</div>
                    <div className="chips">
                      {AESTHETICS.map((s: any) => (
                        <button key={s} className={"chip"+((obData.styles||[]).includes(s)?" sel":"")} tabIndex={0} onKeyDown={(e: any) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleObMulti("styles", s, 5); } }} onClick={()=>toggleObMulti("styles", s, 5)}><span>{s}</span></button>
                      ))}
                      {/* Torreé audit item 6: aesthetic "Other" — typed values are
                          appended to `styles` immediately and flagged
                          custom_style_pending for admin review. */}
                      <button key="other" className={"chip"+(obData.showCustomStyleInput?" sel":"")} tabIndex={0} onKeyDown={(e: any) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setObData((d: any) =>({...d,showCustomStyleInput:!d.showCustomStyleInput})); } }} onClick={()=>setObData((d: any) =>({...d,showCustomStyleInput:!d.showCustomStyleInput}))}><span>Add New +</span></button>
                    </div>
                    {obData.showCustomStyleInput && (
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <input className="inp" aria-label="Custom aesthetic" placeholder="Type your own aesthetic..." value={obData.customStyleDraft||""} onChange={(e: any) =>setObData((d: any) =>({...d,customStyleDraft:e.target.value}))} style={{ margin: 0, flex: 1 }} autoFocus />
                        <button className="btn btn-outline" style={{ padding: "0 16px" }} onClick={() => {
                          const v = (obData.customStyleDraft || "").trim();
                          if (!v) return;
                          const cur = obData.styles || [];
                          if (cur.includes(v)) return;
                          if (cur.length >= 5) { showToast("Max 5 selected"); return; }
                          setObData((d: any) => ({ ...d, styles: [...(d.styles||[]), v], customStylePending: true, customStyleDraft: "" }));
                        }}>Add</button>
                      </div>
                    )}
                    {(obData.styles||[]).filter((s: any) => !AESTHETICS.includes(s)).length > 0 && (
                      <div className="chips" style={{ marginTop: 8 }}>
                        {(obData.styles||[]).filter((s: any) => !AESTHETICS.includes(s)).map((s: any) => (
                          <button key={s} className="chip sel" tabIndex={0} title="Tap to remove" onKeyDown={(e: any) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setObData((d: any) => ({ ...d, styles: (d.styles||[]).filter((x: any) => x !== s) })); } }} onClick={() => setObData((d: any) => ({ ...d, styles: (d.styles||[]).filter((x: any) => x !== s) }))}><span>✎ {s} ✕</span></button>
                        ))}
                      </div>
                    )}
                    {!(obData.styles||[]).length && <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", margin: "6px 0 2px" }}>Select at least one style to continue</div>}
                    <button className="btn btn-gold" disabled={!(obData.styles||[]).length} style={!(obData.styles||[]).length?{opacity:0.5}:undefined} onClick={()=>setObStep(5)}>Next</button>
                    <button className="back-link" onClick={()=>setObStep(3)}>Back</button>
                  </div>
                )}
                {obStep === 5 && (
                  <div className="onboard-content">
                    <div className="ob-progress"><div className="ob-dot filled"/><div className="ob-dot filled"/><div className="ob-dot filled"/><div className="ob-dot filled"/><div className="ob-dot active"/><div className="ob-dot"/><div className="ob-dot"/><div className="ob-dot"/></div>
                    <div className="step-title">Know Yourself?</div>
                    <div className="step-sub">Do you know your zodiac, MBTI, or life path?</div>
                    <div style={{display:"flex",flexDirection:"column",gap:12,width:"100%",maxWidth:320}}>
                      <button className="btn btn-gold" onClick={()=>setObStep(14)} style={{background:"linear-gradient(135deg,var(--gold),var(--amber))"}}>Skip, Set Up Later</button>
                      <div style={{fontSize:11,color:"var(--muted)",textAlign:"center",margin:"4px 0"}}>You can always add these in your profile settings</div>
                      <div style={{display:"flex",gap:10}}>
                        <button className="btn btn-outline" style={{flex:1}} onClick={()=>setObStep(6)}>Set Now</button>
                        <button className="btn btn-outline" style={{flex:1}} onClick={()=>setObStep(10)}>Help Me Discover</button>
                      </div>
                      <button className="back-link" onClick={()=>setObStep(4)}>Back</button>
                    </div>
                  </div>
                )}
                {obStep === 6 && (
                  <div className="onboard-content">
                    <div className="step-title">Your Zodiac</div>
                    <div className="step-sub">Select your sun sign</div>
                    <div className="chips">
                      {ZODIAC.map((z: any) => (
                        <button key={z} className={"chip"+(obData.zodiac===z?" sel":"")} tabIndex={0} onKeyDown={(e: any) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setObData((d: any) =>({...d,zodiac:z})); } }} onClick={()=>setObData((d: any) =>({...d,zodiac:z}))}><span>{ZE[z]} {z}</span></button>
                      ))}
                    </div>
                    <button className="btn btn-gold" disabled={!obData.zodiac} onClick={()=>setObStep(7)}>Next</button>
                    <button className="ob-skip" onClick={()=>setObStep(7)}>Skip</button>
                    <button className="back-link" onClick={()=>setObStep(5)}>Back</button>
                  </div>
                )}
                {obStep === 7 && (
                  <div className="onboard-content">
                    <div className="step-title">Chinese Zodiac</div>
                    <div className="step-sub">Your year animal</div>
                    <div className="chips">
                      {CHINESE.map((c: any) => (
                        <button key={c} className={"chip"+(obData.chinese===c?" sel":"")} tabIndex={0} onKeyDown={(e: any) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setObData((d: any) =>({...d,chinese:c})); } }} onClick={()=>setObData((d: any) =>({...d,chinese:c}))}><span>{CE[c]} {c}</span></button>
                      ))}
                    </div>
                    <button className="btn btn-gold" disabled={!obData.chinese} onClick={()=>setObStep(8)}>Next</button>
                    <button className="ob-skip" onClick={()=>setObStep(8)}>Skip</button>
                    <button className="back-link" onClick={()=>setObStep(6)}>Back</button>
                  </div>
                )}
                {obStep === 8 && (
                  <div className="onboard-content">
                    <div className="step-title">MBTI Personality</div>
                    <div className="step-sub">Your Myers-Briggs type</div>
                    <div className="chips">
                      {MBTI.map((m: any) => (
                        <button key={m} className={"chip"+(obData.mbti===m?" sel":"")} tabIndex={0} onKeyDown={(e: any) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setObData((d: any) =>({...d,mbti:m})); } }} onClick={()=>setObData((d: any) =>({...d,mbti:m}))}><span>{m}</span></button>
                      ))}
                    </div>
                    <button className="btn btn-gold" disabled={!obData.mbti} onClick={()=>setObStep(9)}>Next</button>
                    <button className="ob-skip" onClick={()=>setObStep(9)}>Skip</button>
                    <button className="back-link" onClick={()=>setObStep(7)}>Back</button>
                  </div>
                )}
                {obStep === 9 && (
                  <div className="onboard-content">
                    <div className="step-title">Life Path Number</div>
                    <div className="step-sub">Your numerology life path</div>
                    <div className="chips">
                      {LIFE_PATHS.map((lp: any) => (
                        <button key={lp} className={"chip"+(obData.lifePath===lp?" sel":"")} tabIndex={0} onKeyDown={(e: any) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setObData((d: any) =>({...d,lifePath:lp})); } }} onClick={()=>setObData((d: any) =>({...d,lifePath:lp}))}><span>{lp}</span></button>
                      ))}
                    </div>
                    <button className="btn btn-gold" disabled={!obData.lifePath} onClick={()=>setObStep(14)}>Next</button>
                    <button className="ob-skip" onClick={()=>setObStep(14)}>Skip</button>
                    <button className="back-link" onClick={()=>setObStep(8)}>Back</button>
                  </div>
                )}
                {obStep === 10 && (
                  <div className="onboard-content">
                    <div className="step-title">Discover Yourself</div>
                    <div className="step-sub">Take quick tests to learn about your personality</div>
                    <div style={{display:"flex",flexDirection:"column",gap:12,width:"100%",maxWidth:320}}>
                      <button className="btn btn-outline" onClick={()=>{setTestScreen("zodiac");setObStep(13)}}>Zodiac Calculator</button>
                      <button className="btn btn-outline" onClick={()=>{setTestScreen("chinese");setObStep(13)}}>Chinese Zodiac</button>
                      <button className="btn btn-outline" onClick={()=>{setTestScreen("mbti");setObStep(13)}}>MBTI Test</button>
                      <button className="btn btn-outline" onClick={()=>{setTestScreen("lifepath");setObStep(13)}}>Life Path Calculator</button>
                      <button className="ob-skip" onClick={()=>setObStep(14)}>Skip for now</button>
                      <button className="back-link" onClick={()=>setObStep(5)}>Back</button>
                    </div>
                  </div>
                )}
                {obStep === 13 && testScreen && (
                  <div className="onboard-content">
                    {testScreen === "zodiac" && (
                      <div>
                        <div className="step-title">Zodiac Calculator</div>
                        <div className="step-sub">Enter your birth date</div>
                        <select className="inp" aria-label="Birth month" value={testBirthMonth} onChange={(e: any) =>setTestBirthMonth(e.target.value)}>
                          <option value="">Month</option>
                          {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m,i)=><option key={i} value={String(i+1)}>{m}</option>)}
                        </select>
                        <input className="inp" aria-label="Birth day" placeholder="Day" type="number" min={1} max={31} value={testBirthDay} onChange={(e: any) =>setTestBirthDay(e.target.value)} />
                        <button className="btn btn-gold" onClick={()=>{if(testBirthMonth&&testBirthDay){const z=calcZodiac(parseInt(testBirthMonth),parseInt(testBirthDay));setObData((d: any) =>({...d,zodiac:z}));showToast("You are a "+z+"! "+ZE[z]);setObStep(14)}}}>Calculate</button>
                        <button className="back-link" onClick={()=>setObStep(10)}>Back</button>
                      </div>
                    )}
                    {testScreen === "chinese" && (
                      <div>
                        <div className="step-title">Chinese Zodiac</div>
                        <div className="step-sub">Enter your birth year</div>
                        <input className="inp" aria-label="Birth year" placeholder="Year (e.g. 1995)" type="number" min={1900} max={2026} value={testBirthYear} onChange={(e: any) =>setTestBirthYear(e.target.value)} />
                        <button className="btn btn-gold" onClick={()=>{if(testBirthYear){const c=calcChineseZodiac(parseInt(testBirthYear));setObData((d: any) =>({...d,chinese:c}));showToast("You are the "+c+"! "+CE[c]);setObStep(14)}}}>Calculate</button>
                        <button className="back-link" onClick={()=>setObStep(10)}>Back</button>
                      </div>
                    )}
                    {testScreen === "mbti" && (
                      <div>
                        <div className="step-title">MBTI Personality</div>
                        <div className="step-sub">Pick what fits best</div>
                        <div style={{width:"100%",maxWidth:320}}>
                          <div style={{fontSize:14,fontWeight:700,color:"var(--gold)",marginBottom:8}}>At a party, you...</div>
                          <div className="chips" style={{marginBottom:16}}>
                            <button className={"chip"+(testMbtiAnswers.ei==="e"?" sel":"")} tabIndex={0} onKeyDown={(e: any) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTestMbtiAnswers((p: any) =>({...p,ei:"e"})); } }} onClick={()=>setTestMbtiAnswers((p: any) =>({...p,ei:"e"}))}><span>Talk to everyone</span></button>
                            <button className={"chip"+(testMbtiAnswers.ei==="i"?" sel":"")} tabIndex={0} onKeyDown={(e: any) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTestMbtiAnswers((p: any) =>({...p,ei:"i"})); } }} onClick={()=>setTestMbtiAnswers((p: any) =>({...p,ei:"i"}))}><span>Find one person</span></button>
                          </div>
                          <div style={{fontSize:14,fontWeight:700,color:"var(--gold)",marginBottom:8}}>You prefer...</div>
                          <div className="chips" style={{marginBottom:16}}>
                            <button className={"chip"+(testMbtiAnswers.sn==="s"?" sel":"")} tabIndex={0} onKeyDown={(e: any) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTestMbtiAnswers((p: any) =>({...p,sn:"s"})); } }} onClick={()=>setTestMbtiAnswers((p: any) =>({...p,sn:"s"}))}><span>Facts & details</span></button>
                            <button className={"chip"+(testMbtiAnswers.sn==="n"?" sel":"")} tabIndex={0} onKeyDown={(e: any) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTestMbtiAnswers((p: any) =>({...p,sn:"n"})); } }} onClick={()=>setTestMbtiAnswers((p: any) =>({...p,sn:"n"}))}><span>Big picture ideas</span></button>
                          </div>
                          <div style={{fontSize:14,fontWeight:700,color:"var(--gold)",marginBottom:8}}>Decisions come from...</div>
                          <div className="chips" style={{marginBottom:16}}>
                            <button className={"chip"+(testMbtiAnswers.tf==="t"?" sel":"")} tabIndex={0} onKeyDown={(e: any) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTestMbtiAnswers((p: any) =>({...p,tf:"t"})); } }} onClick={()=>setTestMbtiAnswers((p: any) =>({...p,tf:"t"}))}><span>Logic & analysis</span></button>
                            <button className={"chip"+(testMbtiAnswers.tf==="f"?" sel":"")} tabIndex={0} onKeyDown={(e: any) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTestMbtiAnswers((p: any) =>({...p,tf:"f"})); } }} onClick={()=>setTestMbtiAnswers((p: any) =>({...p,tf:"f"}))}><span>Values & impact</span></button>
                          </div>
                          <div style={{fontSize:14,fontWeight:700,color:"var(--gold)",marginBottom:8}}>You like things...</div>
                          <div className="chips" style={{marginBottom:16}}>
                            <button className={"chip"+(testMbtiAnswers.jp==="j"?" sel":"")} tabIndex={0} onKeyDown={(e: any) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTestMbtiAnswers((p: any) =>({...p,jp:"j"})); } }} onClick={()=>setTestMbtiAnswers((p: any) =>({...p,jp:"j"}))}><span>Planned & structured</span></button>
                            <button className={"chip"+(testMbtiAnswers.jp==="p"?" sel":"")} tabIndex={0} onKeyDown={(e: any) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTestMbtiAnswers((p: any) =>({...p,jp:"p"})); } }} onClick={()=>setTestMbtiAnswers((p: any) =>({...p,jp:"p"}))}><span>Flexible & open</span></button>
                          </div>
                          <button className="btn btn-gold" onClick={()=>{const mbti=calcMbti(testMbtiAnswers);setObData((d: any) =>({...d,mbti}));showToast("You are "+mbti+"!");setObStep(14)}}>Calculate</button>
                          <button className="back-link" onClick={()=>setObStep(10)}>Back</button>
                        </div>
                      </div>
                    )}
                    {testScreen === "lifepath" && (
                      <div>
                        <div className="step-title">Life Path Number</div>
                        <div className="step-sub">Enter your full birth date</div>
                        <select className="inp" aria-label="Birth month" value={testBirthMonth} onChange={(e: any) =>setTestBirthMonth(e.target.value)}>
                          <option value="">Month</option>
                          {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m,i)=><option key={i} value={String(i+1)}>{m}</option>)}
                        </select>
                        <input className="inp" aria-label="Birth day" placeholder="Day" type="number" min={1} max={31} value={testBirthDay} onChange={(e: any) =>setTestBirthDay(e.target.value)} />
                        <input className="inp" aria-label="Birth year" placeholder="Year" type="number" min={1900} max={2026} value={testBirthYear} onChange={(e: any) =>setTestBirthYear(e.target.value)} />
                        <button className="btn btn-gold" onClick={()=>{if(testBirthMonth&&testBirthDay&&testBirthYear){const lp=calcLifePath(parseInt(testBirthMonth),parseInt(testBirthDay),parseInt(testBirthYear));setObData((d: any) =>({...d,lifePath:lp}));showToast("Life Path "+lp+"!");setObStep(14)}}}>Calculate</button>
                        <button className="back-link" onClick={()=>setObStep(10)}>Back</button>
                      </div>
                    )}
                  </div>
                )}
                {obStep === 11 && (
                  <div className="onboard-content">
                    <div className="step-title">Great!</div>
                    <div className="step-sub">Want to take more tests?</div>
                    <div style={{display:"flex",flexDirection:"column",gap:12,width:"100%",maxWidth:320}}>
                      <button className="btn btn-outline" onClick={()=>setObStep(10)}>Take more tests</button>
                      <button className="btn btn-gold" onClick={()=>setObStep(14)}>Continue</button>
                    </div>
                  </div>
                )}
                {obStep === 14 && (
                  <div className="onboard-content">
                    <div className="step-title">Your Photo</div>
                    <div className="step-sub">Add a profile picture so people can see the real you</div>
                    <input ref={photoInputRef} type="file" accept="image/*" aria-label="Upload profile photo" style={{display:"none"}} onChange={async (e)=>{const f=e.target.files?.[0];if(f){showToast("Uploading...");const url=await uploadImage(f,"avatars");if(url){setObProfilePic(url);showToast("Photo added!")}}}} />
                    <div className="ob-upload-zone" role="button" tabIndex={0} onKeyDown={(e: any) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); photoInputRef.current?.click(); } }} onClick={() => photoInputRef.current?.click()}>
                      {obProfilePic ? <Image loading="lazy" src={obProfilePic} alt="Profile" fill sizes="130px" style={{ objectFit: "cover", borderRadius: "50%" }} /> : (
                        <>
                          <div className="ob-upload-icon">📸</div>
                          <div className="ob-upload-text">Tap to add photo</div>
                        </>
                      )}
                    </div>
                    <button className="btn btn-gold" onClick={()=>setObStep(15)}>Next</button>
                    <button className="ob-skip" onClick={()=>setObStep(15)}>Skip for now</button>
                    <button className="back-link" onClick={()=>setObStep(5)}>Back</button>
                  </div>
                )}
                {obStep === 15 && (
                  <div className="onboard-content">
                    <div className="step-title">Your Portfolio</div>
                    <div className="step-sub">Show off your best work</div>
                    <input ref={portfolioInputRef} type="file" accept="image/*" aria-label="Upload portfolio photo" style={{display:"none"}} onChange={async (e)=>{
                      const f=e.target.files?.[0];
                      const slot=obPortfolioSlot;
                      if(e.target) e.target.value="";
                      if(f && slot!=null){
                        showToast("Uploading...");
                        const url=await uploadImage(f,"portfolio");
                        if(url){
                          setObPortfolioItems((prev: any) => {
                            const next=[...prev];
                            next[slot]={img:url,title:"Work "+(slot+1)};
                            return next;
                          });
                          showToast("Work added!");
                        } else {
                          showToast("Upload failed — try again");
                        }
                      }
                    }} />
<div className="ob-portfolio-grid">
                      {[0,1,2,3,4,5].map((i: any) => (
                        <div key={i} className="ob-portfolio-slot" role="button" tabIndex={0} onKeyDown={(e: any) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setObPortfolioSlot(i); portfolioInputRef.current?.click(); } }} onClick={() => {
                           setObPortfolioSlot(i);
                           portfolioInputRef.current?.click();
                         }}>
                           {obPortfolioItems[i] ? <Image loading="lazy" src={obPortfolioItems[i].img} alt="Work" fill sizes="(max-width: 600px) 33vw, 200px" style={{ objectFit: "cover", borderRadius: 10 }} /> : <div className="ob-portfolio-plus">+</div>}
                         </div>
                       ))}
                     </div>
                    <button className="btn btn-gold" onClick={()=>setObStep(16)}>Next</button>
                    <button className="ob-skip" onClick={()=>setObStep(16)}>Skip for now</button>
                    <button className="back-link" onClick={()=>setObStep(14)}>Back</button>
                  </div>
                )}
                {obStep === 16 && (
                  <div className="onboard-content">
                    <div className="step-title">Connect Your World</div>
                    <div className="step-sub">Link your creative platforms</div>
                    <div className="ob-social-grid">
                      {[
                        {key:"instagram",icon:"📷",label:"Instagram"},
                        {key:"facebook",icon:"👤",label:"Facebook"},
                        {key:"spotify",icon:"🎵",label:"Spotify"},
                        {key:"soundcloud",icon:"🔊",label:"SoundCloud"},
                      ].map((s: any) => (
                        <button key={s.key} className={"ob-social-btn"+(obConnectedSocials[s.key]?" connected":"")} onClick={() => toggleSocial(s.key)}>
                          <span className="ob-social-icon">{s.icon}</span>
                          <span>{s.label}</span>
                          <span className="ob-social-check">{obConnectedSocials[s.key] ? "✓" : "→"}</span>
                        </button>
                      ))}
                    </div>
                    <button className="btn btn-gold" onClick={()=>setObStep(17)} style={{marginTop:16}}>Next</button>
                    <button className="ob-skip" onClick={()=>setObStep(17)}>Skip for now</button>
                    <button className="back-link" onClick={()=>setObStep(15)}>Back</button>
                  </div>
                )}
                {obStep === 17 && (
                  <div className="onboard-content">
                    <div className="sparkle" style={{top:"10%",left:"6%",fontSize:24}}>✦</div>
                    <div className="sparkle" style={{top:"20%",right:"10%",fontSize:18}}>✧</div>
                    <div className="sparkle" style={{bottom:"30%",left:"15%",fontSize:20}}>✦</div>
                    <div className="sparkle" style={{bottom:"15%",right:"6%",fontSize:16}}>✧</div>
                    <div className="step-title" style={{fontSize:32}}>You're All Set!</div>
                    <div className="step-sub">Ready to find your creative connections?</div>
                    <div style={{width:"100%",maxWidth:360,marginBottom:20,padding:"16px 18px",borderRadius:16,border:"1px solid rgba(255,215,0,0.28)",background:"rgba(255,215,0,0.05)",boxShadow:"0 2px 14px rgba(255,215,0,0.06)"}}>
                      <div style={{fontSize:12,fontWeight:700,color:"var(--gold)",letterSpacing:0.4,textTransform:"uppercase",marginBottom:4}}>Have a referral code?</div>
                      <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",marginBottom:10}}>Optional — you and a friend both get a free month.</div>
                      <div style={{display:"flex",gap:8}}>
                        <input className="inp" aria-label="Referral code" placeholder="MUSE-XXXXXX" value={obData.referralCode || ""} onChange={(e: any) =>setObData((prev: any) =>({...prev,referralCode:e.target.value}))} style={{margin:0,flex:1,textTransform:"uppercase",letterSpacing:1,fontFamily:"monospace"}} />
                      </div>
                      {obData.referralCode && obData.referralCode.length >= 6 && (
                        <div style={{fontSize:11,color:"#4ecdc4",marginTop:8}}>🎉 You and your friend will both get a free month when you subscribe!</div>
                      )}
                    </div>
                    <button className="btn btn-gold" style={{padding:"18px 24px",fontSize:17,fontWeight:800,letterSpacing:0.3,marginTop:4}} onClick={async ()=>{
                      setCurrentUser((prev: any) =>({...prev,name:obData.name||prev.name,type:obData.type||prev.type,avatar:obProfilePic||prev.avatar}));
                      const geo = await getGeolocation();
                      if(authUser?.id){
                        try{
                          const r = await authFetch("/api/muse/auth",{method:"POST",body:JSON.stringify({action:"update-profile",
                            name:obData.name,loc:obData.loc,bio:obData.bio,audience:obData.audience||"creative",type:obData.type,
                            looking:obData.looking,styles:obData.styles,
                            zodiac:obData.zodiac,chinese:obData.chinese,mbti:obData.mbti,life_path:obData.lifePath,birthdate:obData.birthdate,
                            avatar:obProfilePic,
                            // Torreé audit item 6: carry the "Other" custom-value
                            // review flags through to the saved profile.
                            ...(obData.customTypePending ? { custom_type_pending: true } : {}),
                            ...(obData.customStylePending ? { custom_style_pending: true } : {}),
                            ...(geo ? { lat: geo.lat, long: geo.long, city: geo.city } : {})
                          })});
                          if (!r.ok) showToast("Profile saved locally — sync will retry");
                        }catch{ showToast("Profile saved locally — sync will retry"); }
                        // Apply referral code if entered
                        if (obData.referralCode) {
                          try {
                            const rr = await authFetch("/api/muse/referral", { method: "POST", body: JSON.stringify({ action: "apply", referralCode: obData.referralCode.trim().toUpperCase() }) });
                            if (!rr.ok) showToast("Referral code couldn't be applied");
                          } catch { showToast("Referral code couldn't be applied"); }
                        }
                        // Turn the onboarding portfolio step's uploads into a real
                        // album so they actually show up in Portfolio afterward.
                        const realPortfolioPhotos = obPortfolioItems.filter(Boolean);
                        if (realPortfolioPhotos.length) {
                          try {
                            const ar = await authFetch("/api/muse", { method: "POST", body: JSON.stringify({ action: "create-album", title: "My Portfolio", access_level: "public" }) });
                            const ad = await ar.json();
                            if (ad?.success && ad?.album?.id) {
                              for (const item of realPortfolioPhotos) {
                                try { await authFetch("/api/muse", { method: "POST", body: JSON.stringify({ action: "add-album-photo", albumId: ad.album.id, img_url: item.img }) }); } catch { console.debug("[muse] portfolio photo could not be added to album"); }
                              }
                            }
                          } catch { console.debug("[muse] album photo import failed"); }
                        }
                      }
                      setScreen("discover");showToast("Welcome to Muses!")
                    }}>Enter Muses →</button>
                    <button className="back-link" onClick={()=>setObStep(16)}>Back</button>
                  </div>
                )}
              </div>
  );
}
