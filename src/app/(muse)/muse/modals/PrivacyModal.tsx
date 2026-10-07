"use client";

import { FiArrowLeft, FiX } from "react-icons/fi";
import { SUPPORT_EMAIL } from "../page-constants";
import type { MuseModalsProps } from "./types";

type Props = Pick<MuseModalsProps, "showPrivacy" | "setShowPrivacy" | "privacyTrap">;

export function PrivacyModal({ showPrivacy, setShowPrivacy, privacyTrap }: Props) {
  if (!showPrivacy) return null;
  return (
    <div className="modal-overlay lighter" ref={privacyTrap} role="dialog" aria-modal="true" aria-label="Privacy Policy">
      <div className="modal-header">
        <button className="modal-back" aria-label="Back" onClick={()=>setShowPrivacy(false)}><FiArrowLeft size={20} /></button>
        <div className="modal-title">Privacy Policy</div>
        <button className="modal-close" onClick={()=>setShowPrivacy(false)} aria-label="Close"><FiX size={18} /></button>
      </div>
      <div className="modal-body" style={{maxHeight:"70vh",overflowY:"auto",lineHeight:1.7,fontSize:13,color:"var(--text2)"}}>
        <div style={{fontWeight:700,fontSize:16,color:"var(--text)",marginBottom:12}}>Musa by WYZ Privacy Policy</div>
        <p><strong>1. Information We Collect</strong>{"\n"}Account information (name, email, profile details you provide), content you post (photos, messages, briefs, forum posts), usage data (swipes, matches, interactions), device information (browser type, OS, IP address).</p>
        <p><strong>2. How We Use Your Information</strong>{"\n"}To provide and improve the Musa service, to match you with compatible creatives, to communicate with you about your account and the service, to detect and prevent fraud or abuse, and to comply with legal obligations.</p>
        <p><strong>3. Information Sharing</strong>{"\n"}We do not sell your personal information. We may share information with service providers who assist in operating the platform (hosting, analytics), when required by law, or with your explicit consent. Your profile is visible to other Musa users based on your privacy settings.</p>
        <p><strong>4. Data Storage & Security</strong>{"\n"}Your data is stored on secure servers provided by Supabase. We use industry-standard encryption for data in transit (TLS) and at rest. However, no method of transmission over the Internet is 100% secure.</p>
         <p><strong>5. Your Rights</strong>{"\n"}You can access, update, or delete your account data at any time through the app settings. You may request a copy of all data we hold about you by contacting {SUPPORT_EMAIL}. You may also request deletion of your account. Access is removed immediately; account data is permanently deleted after 30 days, except where safety, fraud-prevention, or legal obligations require retention.</p>
        <p><strong>6. Cookies & Tracking</strong>{"\n"}We use essential cookies for authentication and session management. We do not use third-party advertising cookies. Analytics data is collected anonymously to improve the service.</p>
        <p><strong>7. Children's Privacy</strong>{"\n"}Musa is not intended for users under 18. We do not knowingly collect information from children. If we become aware of such collection, we will delete the information immediately.</p>
        <p><strong>8. Changes to This Policy</strong>{"\n"}We may update this Privacy Policy from time to time. We will notify you of material changes through the app or by email.</p>
        <p><strong>9. Contact Us</strong>{"\n"}For questions about this Privacy Policy, contact us at {SUPPORT_EMAIL} or WYZ Design LLC.</p>
        <div style={{textAlign:"center",padding:"16px 0",fontSize:11,color:"var(--muted)"}}>Last updated: July 2026 · WYZ Design LLC</div>
        <button className="btn btn-gold" style={{width:"100%",marginTop:8}} onClick={()=>setShowPrivacy(false)}>I Understand</button>
      </div>
    </div>
  );
}
