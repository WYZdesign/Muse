import { notFound } from "next/navigation";
import Link from "next/link";
import { getServiceClient } from "@/lib/supabase";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

async function fetchProfile(id: string) {
  const sb = getServiceClient();
  const { data } = await sb
    .from("muse_profiles")
    .select("id, name, type, avatar, bio, loc, styles, zodiac, mbti, verified")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = (await fetchProfile(id)) as any;
  if (!p) return { title: "Profile not found — Muse" };
  const title = `${p.name} — ${p.type || "Creative"} on Muse`;
  const description = p.bio || `${p.name} is a ${p.type || "creative"} on Muse${p.loc ? `, based in ${p.loc}` : ""}. Discover and collaborate.`;
  return {
    title,
    description,
    alternates: { canonical: `https://muse.wyzdesign.com/muse/profile/${p.id}` },
    openGraph: { title, description, type: "profile", url: `https://muse.wyzdesign.com/muse/profile/${p.id}`, images: p.avatar ? [{ url: p.avatar, alt: p.name }] : undefined },
    twitter: { card: "summary_large_image", title, description, images: p.avatar ? [p.avatar] : undefined },
  };
}

export default async function ProfileDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = (await fetchProfile(id)) as any;
  if (!p) notFound();

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#0a0612,#1a0a2e)",color:"#fff",fontFamily:"'Inter',system-ui,sans-serif",padding:24,maxWidth:640,margin:"0 auto"}}>
      <Link href="/muse" style={{color:"#FFD700",textDecoration:"none",fontSize:14}}>← Back to Muse</Link>
      <div style={{display:"flex",gap:18,alignItems:"center",marginTop:20}}>
        {p.avatar ? <img src={p.avatar} alt={p.name} style={{width:96,height:96,borderRadius:24,objectFit:"cover",border:"2px solid rgba(255,215,0,0.3)"}} /> : null}
        <div>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontSize:30,margin:0}}>
            {p.name} {p.verified ? "✔" : ""}
          </h1>
          <div style={{color:"#FFB5C2",fontWeight:600}}>{p.type}</div>
          {p.loc ? <div style={{color:"#aaa",fontSize:13}}>📍 {p.loc}</div> : null}
        </div>
      </div>
      {p.bio ? <p style={{marginTop:18,lineHeight:1.6,color:"#ddd"}}>{p.bio}</p> : null}
      {p.styles?.length ? (
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:14}}>
          {p.styles.map((s: string) => <span key={s} style={{padding:"6px 14px",borderRadius:99,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.12)",fontSize:13}}>{s}</span>)}
        </div>
      ) : null}
      {(p.zodiac || p.mbti) ? (
        <div style={{marginTop:20,display:"flex",gap:20,color:"#ccc",fontSize:14}}>
          {p.zodiac ? <div>♈ {p.zodiac}</div> : null}
          {p.mbti ? <div>🧠 {p.mbti}</div> : null}
        </div>
      ) : null}
      <a href="/muse" style={{display:"inline-block",marginTop:28,padding:"14px 28px",borderRadius:16,background:"linear-gradient(120deg,#FFD700,#FFBF00,#FFD700)",backgroundSize:"300% 300%",color:"#0a0612",fontWeight:800,textDecoration:"none"}}>Open Muse App</a>
    </div>
  );
}
