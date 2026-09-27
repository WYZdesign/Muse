"use client";

import { FiArrowLeft, FiX } from "react-icons/fi";
import type { MuseModalsProps } from "./types";

type Props = Pick<MuseModalsProps, "showGuidelines" | "setShowGuidelines" | "guidelinesTrap">;

export function GuidelinesModal({ showGuidelines, setShowGuidelines, guidelinesTrap }: Props) {
  if (!showGuidelines) return null;
  return (
    <div className="modal-overlay lighter" ref={guidelinesTrap} role="dialog" aria-modal="true" aria-label="Community Guidelines">
      <div className="modal-header">
        <button className="modal-back" aria-label="Back" onClick={()=>setShowGuidelines(false)}><FiArrowLeft size={20} /></button>
        <div className="modal-title">Community Guidelines</div>
        <button className="modal-close" onClick={()=>setShowGuidelines(false)} aria-label="Close"><FiX size={18} /></button>
      </div>
      <div className="modal-body" style={{maxHeight:"70vh",overflowY:"auto",lineHeight:1.7,fontSize:13,color:"var(--text2)"}}>
        <div style={{fontWeight:700,fontSize:16,color:"var(--text)",marginBottom:12}}>Muses by WYZ Community Guidelines</div>
        <p><strong>Be Respectful</strong>{"\n"}Treat every member with dignity. Harassment, hate speech, bullying, discrimination, or personal attacks of any kind will result in immediate account suspension.</p>
        <p><strong>Be Authentic</strong>{"\n"}Use your real name, real photos, and honest descriptions of your work. Fake profiles, impersonation, and catfishing are strictly prohibited and will be removed without warning.</p>
        <p><strong>Be Professional</strong>{"\n"}Muse is a creative networking platform. Keep conversations professional and collaborative. Sexual content, explicit material, and solicitation are not permitted in public spaces. NSFW-tagged content is restricted to age-verified users only.</p>
        <p><strong>Protect Privacy</strong>{"\n"}Do not share others' personal information without consent. Do not screenshot private conversations. Respect the boundaries other members set.</p>
        <p><strong>No Spam or Scams</strong>{"\n"}Do not post unsolicited advertisements, pyramid schemes, phishing links, or fraudulent opportunities. Legitimate collaborations should be transparent about terms and compensation.</p>
        <p><strong>Report Problems</strong>{"\n"}If you encounter behavior that violates these guidelines, please use the report feature. Reports are reviewed promptly and taken seriously. All reports are confidential.</p>
        <p><strong>Content Standards</strong>{"\n"}All content must be original or properly credited. Do not post copyrighted material without permission. Content depicting violence, illegal activities, or harm to others is prohibited.</p>
        <p><strong>Consequences</strong>{"\n"}Violations may result in content removal, temporary suspension, or permanent ban depending on severity. Repeat offenders will be permanently removed. We reserve the right to take immediate action for serious violations.</p>
        <div style={{textAlign:"center",padding:"16px 0",fontSize:11,color:"var(--muted)"}}>Last updated: July 2026 · WYZ Design LLC</div>
        <button className="btn btn-gold" style={{width:"100%",marginTop:8}} onClick={()=>setShowGuidelines(false)}>I Understand</button>
      </div>
    </div>
  );
}
