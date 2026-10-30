/** DMCA takedown page at /muse/dmca, linked from Terms of Service. */
import type { Metadata } from "next";
import { getMuseUrl } from "@/lib/urls";

export const metadata: Metadata = {
  title: "DMCA & Copyright — Musa by WYZ",
  description: "How to submit a DMCA takedown notice for unauthorized use of your creative work on Musa by WYZ.",
  alternates: { canonical: getMuseUrl() + "/dmca" },
  openGraph: { title: "DMCA & Copyright — Musa by WYZ", description: "How to submit a DMCA takedown notice for unauthorized use of your creative work on Musa by WYZ.", url: getMuseUrl() + "/dmca", siteName: "Musa by WYZ", type: "website" },
  twitter: { card: "summary", title: "DMCA & Copyright — Musa by WYZ", description: "How to submit a DMCA takedown notice for unauthorized use of your creative work on Musa by WYZ." },
};

export default function DMCAPage() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "120px 24px 80px", fontFamily: "'Inter', sans-serif" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 24, color: "#ffd700" }}>DMCA & Copyright</h1>
      <p style={{ color: "rgba(255,255,255,0.6)", lineHeight: 1.7, marginBottom: 16 }}>Effective August 13, 2026 &middot; Musa by WYZ Design</p>
      <div style={{ color: "rgba(255,255,255,0.75)", lineHeight: 1.8, fontSize: 15 }}>
        <h2 style={{ fontSize: "1.2rem", marginTop: 32, marginBottom: 12, color: "#fff" }}>1. Respect for Intellectual Property</h2>
        <p style={{ marginBottom: 16 }}>Musa by WYZ respects the intellectual property rights of all creators. We expect our users to do the same. If you believe your copyrighted work has been used on Musa without authorization, we provide a clear process for reporting it.</p>

        <h2 style={{ fontSize: "1.2rem", marginTop: 32, marginBottom: 12, color: "#fff" }}>2. DMCA Designated Agent</h2>
        <p style={{ marginBottom: 16 }}>In compliance with the Digital Millennium Copyright Act (17 U.S.C. § 512), our designated agent for copyright takedown notices is:</p>
        <div style={{ marginBottom: 24, padding: 16, background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.2)", borderRadius: 8 }}>
          <p style={{ margin: 0, fontWeight: 600, color: "#fff" }}>WYZ Design LLC</p>
          <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.7)" }}>Attn: DMCA Agent</p>
          <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.7)" }}><a href="mailto:info@wyzdesign.com" style={{ color: "#ffd700" }}>info@wyzdesign.com</a></p>
        </div>

        <h2 style={{ fontSize: "1.2rem", marginTop: 32, marginBottom: 12, color: "#fff" }}>3. How to Submit a Takedown Notice</h2>
        <p style={{ marginBottom: 16 }}>To be effective under the DMCA, your notice must include all of the following:</p>
        <ul style={{ paddingLeft: 20, marginBottom: 24 }}>
          <li><strong>Signature</strong> — Physical or electronic signature of the copyright owner or authorized agent.</li>
          <li><strong>Identification of the copyrighted work</strong> — Describe the work you claim is infringed (e.g., title, URL, description).</li>
          <li><strong>Identification of the infringing material</strong> — Provide the specific URL(s) on Musa where the infringing material appears.</li>
          <li><strong>Contact information</strong> — Your name, address, phone number, and email address.</li>
          <li><strong>Good faith statement</strong> — A statement that you have a good faith belief that the use is not authorized by the copyright owner, its agent, or the law.</li>
          <li><strong>Accuracy statement</strong> — A statement that the information in your notice is accurate, and under penalty of perjury, that you are the copyright owner or authorized to act on their behalf.</li>
        </ul>
        <p style={{ marginBottom: 24 }}>Email your complete notice to <a href="mailto:info@wyzdesign.com" style={{ color: "#ffd700" }}>info@wyzdesign.com</a>. Incomplete notices may be ignored or delayed.</p>

        <h2 style={{ fontSize: "1.2rem", marginTop: 32, marginBottom: 12, color: "#fff" }}>4. What Happens After You Submit</h2>
        <ul style={{ paddingLeft: 20, marginBottom: 24 }}>
          <li>We will acknowledge receipt within 24 hours.</li>
          <li>If the notice is complete and valid, we will remove or disable access to the infringing material promptly.</li>
          <li>We will notify the user who posted the material that it has been removed.</li>
          <li>The user may submit a counter-notification if they believe the material was removed in error.</li>
        </ul>

        <h2 style={{ fontSize: "1.2rem", marginTop: 32, marginBottom: 12, color: "#fff" }}>5. Counter-Notification</h2>
        <p style={{ marginBottom: 16 }}>If your content was removed and you believe it was done in error, you may submit a counter-notification to <a href="mailto:info@wyzdesign.com" style={{ color: "#ffd700" }}>info@wyzdesign.com</a> including:</p>
        <ul style={{ paddingLeft: 20, marginBottom: 24 }}>
          <li>Your physical or electronic signature.</li>
          <li>Identification of the material that was removed and its location before removal.</li>
          <li>A statement under penalty of perjury that you have a good faith belief the material was removed by mistake or misidentification.</li>
          <li>Your name, address, phone number, email, and consent to jurisdiction of the federal court in your district (or Delaware if outside the US).</li>
        </ul>
        <p style={{ marginBottom: 24 }}>If we receive a valid counter-notification, we will forward it to the original complainant. Unless the complainant files a court action within 10 business days, we may restore the content.</p>

        <h2 style={{ fontSize: "1.2rem", marginTop: 32, marginBottom: 12, color: "#fff" }}>6. Repeat Infringers</h2>
        <p style={{ marginBottom: 16 }}>In accordance with 17 U.S.C. § 512(i), we maintain a policy of terminating accounts of users who are repeat infringers. Three valid DMCA takedowns against the same account will result in permanent account termination.</p>

        <h2 style={{ fontSize: "1.2rem", marginTop: 32, marginBottom: 12, color: "#fff" }}>7. Misrepresentation</h2>
        <p style={{ marginBottom: 16 }}>Under 17 U.S.C. § 512(f), any person who knowingly materially misrepresents that material is infringing, or that it was removed by mistake, may be liable for damages, including costs and attorneys' fees. Do not submit false notices.</p>

        <h2 style={{ fontSize: "1.2rem", marginTop: 32, marginBottom: 12, color: "#fff" }}>8. Contact</h2>
        <p>DMCA questions? Reach our agent at <a href="mailto:info@wyzdesign.com" style={{ color: "#ffd700" }}>info@wyzdesign.com</a></p>
      </div>
      <a href="/muse/landing" style={{ display: "inline-block", marginTop: 48, color: "#ffd700", fontSize: 14, textDecoration: "none" }}>&larr; Back to Musa by WYZ</a>
    </div>
  );
}