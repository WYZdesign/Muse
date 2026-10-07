"use client";

import { FiArrowLeft, FiX } from "react-icons/fi";
import type { MuseModalsProps } from "./types";

type Props = Pick<MuseModalsProps, "showTerms" | "setShowTerms" | "termsTrap">;

export function TermsModal({ showTerms, setShowTerms, termsTrap }: Props) {
  if (!showTerms) return null;
  return (
    <div className="modal-overlay lighter" ref={termsTrap} role="dialog" aria-modal="true" aria-label="Terms of Service">
      <div className="modal-header">
        <button className="modal-back" aria-label="Back" onClick={()=>setShowTerms(false)}><FiArrowLeft size={20} /></button>
        <div className="modal-title">Terms of Service</div>
        <button className="modal-close" onClick={()=>setShowTerms(false)} aria-label="Close"><FiX size={18} /></button>
      </div>
      <div className="modal-body" style={{maxHeight:"70vh",overflowY:"auto",lineHeight:1.7,fontSize:13,color:"var(--text2)"}}>
        <div style={{fontWeight:700,fontSize:16,color:"var(--text)",marginBottom:12}}>Musa by WYZ Terms of Service</div>
        <p><strong>1. Acceptance of Terms</strong>{"\n"}By accessing or using Musa, a creative networking platform operated by WYZ Design, you agree to be bound by these Terms of Service. If you do not agree, do not use the service.</p>
        <p><strong>2. Eligibility</strong>{"\n"}You must be at least 18 years old to use Musa. By using the service, you represent that you meet this age requirement.</p>
        <p><strong>3. User Accounts</strong>{"\n"}You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate and complete information during registration and to update it as necessary.</p>
        <p><strong>4. User Content</strong>{"\n"}You retain ownership of content you post on Musa. By posting content, you grant Musa a non-exclusive, worldwide license to use, display, and distribute your content in connection with the service.</p>
        <p><strong>5. Prohibited Conduct</strong>{"\n"}You may not: harass other users, post illegal or harmful content, attempt to circumvent security measures, use the service for commercial spam, or violate any applicable laws.</p>
        <p><strong>6. Intellectual Property</strong>{"\n"}All content, trademarks, and intellectual property on Musa (excluding user content) are owned by WYZ Design. You may not copy, modify, or distribute our intellectual property without written consent.</p>
        <p><strong>7. Privacy</strong>{"\n"}Your use of Musa is also governed by our Privacy Policy. Please review it to understand how we collect, use, and protect your information.</p>
        <p><strong>8. Termination</strong>{"\n"}We reserve the right to suspend or terminate your account at our discretion, with or without notice, for conduct that violates these Terms or is otherwise harmful to the service or its users.</p>
        <p><strong>9. Disclaimer</strong>{"\n"}Musa is provided {"\""}as is{"\""} without warranties of any kind. We are not liable for any damages arising from your use of the service.</p>
        <p><strong>10. Changes to Terms</strong>{"\n"}We may update these Terms at any time. Continued use of Musa after changes constitutes acceptance of the new Terms.</p>
        <div style={{textAlign:"center",padding:"16px 0",fontSize:11,color:"var(--muted)"}}>Last updated: July 2026 · WYZ Design LLC</div>
        <button className="btn btn-gold" style={{width:"100%",marginTop:8}} onClick={()=>setShowTerms(false)}>I Understand</button>
      </div>
    </div>
  );
}
