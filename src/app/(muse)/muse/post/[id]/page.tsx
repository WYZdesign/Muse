import { notFound } from "next/navigation";
import Link from "next/link";
import { getServiceClient } from "@/lib/supabase";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

async function fetchPost(id: string) {
  const sb = getServiceClient();
  const { data } = await sb
    .from("muse_feed_posts")
    .select("id, text, img, type, created_at, author_id(id, name, avatar)")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const post = await fetchPost(id);
  if (!post) return { title: "Post not found — Muse" };
  const author = (post as any).author_id as { name?: string } | null;
  const authorName = author?.name || "Muse Creative";
  const title = `${authorName} on Muse`;
  const description = (post.text || "").slice(0, 160);
  return {
    title,
    description,
    alternates: { canonical: `https://muse.wyzdesign.com/muse/post/${post.id}` },
    openGraph: { title, description, type: "article", url: `https://muse.wyzdesign.com/muse/post/${post.id}`, images: post.img ? [{ url: post.img, alt: description }] : undefined },
    twitter: { card: "summary_large_image", title, description, images: post.img ? [post.img] : undefined },
  };
}

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await fetchPost(id);
  if (!post) notFound();

  const author = (post as any).author_id as { name?: string; avatar?: string } | null;
  const authorName = author?.name || "Muse Creative";
  const authorAvatar = author?.avatar || "";
  const time = post.created_at ? new Date(post.created_at).toLocaleDateString() : "recently";

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#0a0612,#1a0a2e)",color:"#fff",fontFamily:"'Inter',system-ui,sans-serif",padding:24,maxWidth:640,margin:"0 auto"}}>
      <Link href="/muse" style={{color:"#FFD700",textDecoration:"none",fontSize:14}}>← Back to Muse</Link>
      {authorAvatar ? (
        <div style={{display:"flex",gap:12,alignItems:"center",marginTop:20}}>
          <img src={authorAvatar} alt={authorName} style={{width:48,height:48,borderRadius:14,objectFit:"cover"}} />
          <div>
            <div style={{fontWeight:700}}>{authorName}</div>
            <div style={{color:"#aaa",fontSize:12}}>{time}</div>
          </div>
        </div>
      ) : null}
      <p style={{marginTop:16,lineHeight:1.6,color:"#ddd"}}>{post.text}</p>
      {post.img ? <img src={post.img} alt="Photo" style={{width:"100%",borderRadius:18,marginTop:12}} /> : null}
      <a href="/muse" style={{display:"inline-block",marginTop:28,padding:"14px 28px",borderRadius:16,background:"linear-gradient(120deg,#FFD700,#FFBF00,#FFD700)",backgroundSize:"300% 300%",color:"#0a0612",fontWeight:800,textDecoration:"none"}}>Open Muse App</a>
    </div>
  );
}
