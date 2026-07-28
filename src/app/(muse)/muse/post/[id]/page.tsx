import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const POSTS = [
  { id:401,author:"Maya Chen",avatar:"https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",type:"photo",text:"Golden hour never gets old. Shot this at El Matador Beach last weekend.",likes:234,comments:18,shares:5,time:"2h ago",img:"https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600" },
  { id:402,author:"Jordan Rivera",avatar:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",type:"text",text:"Just wrapped principal photography on a 30-min short. 14-hour days for 12 days straight. The footage is incredible!",likes:189,comments:32,shares:12,time:"5h ago" },
  { id:403,author:"Sam Taylor",avatar:"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100",type:"photo",text:"New album art I designed. Surreal dreamlike aesthetic.",likes:312,comments:24,shares:8,time:"8h ago",img:"https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600" },
  { id:404,author:"Riley Patel",avatar:"https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",type:"photo",text:"Motion graphics reel. 6 months of work in 90 seconds.",likes:567,comments:45,shares:23,time:"1d ago",img:"https://images.unsplash.com/photo-1536240478700-b869070f9279?w=600" },
];

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = POSTS.find(x => String(x.id) === String(id));
  if (!post) notFound();
  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#0a0612,#1a0a2e)",color:"#fff",fontFamily:"'Inter',system-ui,sans-serif",padding:24,maxWidth:640,margin:"0 auto"}}>
      <Link href="/muse" style={{color:"#FFD700",textDecoration:"none",fontSize:14}}>← Back to Muse</Link>
      <div style={{display:"flex",gap:12,alignItems:"center",marginTop:20}}>
        <img src={post.avatar} alt={post.author} style={{width:48,height:48,borderRadius:14,objectFit:"cover"}} />
        <div>
          <div style={{fontWeight:700}}>{post.author}</div>
          <div style={{color:"#aaa",fontSize:12}}>{post.time}</div>
        </div>
      </div>
      <p style={{marginTop:16,lineHeight:1.6,color:"#ddd"}}>{post.text}</p>
      {post.img && <img src={post.img} alt="" style={{width:"100%",borderRadius:18,marginTop:12}} />}
      <div style={{marginTop:16,display:"flex",gap:20,color:"#ccc"}}>
        <span>❤️ {post.likes}</span><span>💬 {post.comments}</span><span>↗ {post.shares}</span>
      </div>
      <a href="/muse" style={{display:"inline-block",marginTop:28,padding:"14px 28px",borderRadius:16,background:"linear-gradient(120deg,#FFD700,#FFBF00,#FFD700)",backgroundSize:"300% 300%",color:"#0a0612",fontWeight:800,textDecoration:"none"}}>Open Muse App</a>
    </div>
  );
}
