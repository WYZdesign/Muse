import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PROFILES = [
  { id:1,name:"Luna Martinez",type:"Photographer",img:"https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",loc:"Los Angeles, CA",bio:"Golden hour chaser. Capturing raw emotion through natural light.",styles:["Editorial","Fine Art","Fashion"],zodiac:"Leo",mbti:"ENFP",verified:true },
  { id:2,name:"Marcus Chen",type:"Director",img:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",loc:"San Francisco, CA",bio:"Visual storyteller. Currently working on a cyberpunk noir series.",styles:["Music Video","Commercial","Experimental"],zodiac:"Virgo",mbti:"INTJ",verified:true },
  { id:3,name:"Zoe Williams",type:"Editor",img:"https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop",loc:"Austin, TX",bio:"Color grading wizard. Every frame tells a story.",styles:["Editorial","Fashion","Branding"],zodiac:"Libra",mbti:"ISFJ",verified:true },
  { id:4,name:"James Reid",type:"Musician",img:"https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",loc:"Nashville, TN",bio:"Multi-instrumentalist. Looking to score visual projects.",styles:["Commercial","Experimental"],zodiac:"Pisces",mbti:"INFP",verified:false },
  { id:5,name:"Aria Patel",type:"Photographer",img:"https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop",loc:"Miami, FL",bio:"Boudoir and fine art photographer. Light and shadow play.",styles:["Fine Art","Portrait","Body Art"],zodiac:"Scorpio",mbti:"INFJ",verified:true },
  { id:6,name:"Tyler Brooks",type:"Videographer",img:"https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop",loc:"Denver, CO",bio:"Drone cinematography and landscape films.",styles:["Commercial","Documentary"],zodiac:"Sagittarius",mbti:"ESTP",verified:false },
  { id:7,name:"Maya Singh",type:"Director",img:"https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop",loc:"Portland, OR",bio:"Queer filmmaker crafting authentic narratives.",styles:["Editorial","Music Video","Experimental"],zodiac:"Gemini",mbti:"ENTJ",verified:true },
  { id:8,name:"Kai Yamamoto",type:"Editor",img:"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop",loc:"Seattle, WA",bio:"Post-production specialist. VFX and color.",styles:["Fashion","Commercial","Branding"],zodiac:"Aquarius",mbti:"ISTP",verified:true },
  { id:9,name:"Olivia Hart",type:"Photographer",img:"https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop",loc:"Chicago, IL",bio:"Street photography and urban exploration.",styles:["Documentary","Experimental","Portrait"],zodiac:"Cancer",mbti:"ESFP",verified:false },
  { id:10,name:"Noah Bennett",type:"Director",img:"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop",loc:"New York, NY",bio:"Commercial and music video director. Big ideas, bigger visions.",styles:["Music Video","Commercial","Fashion"],zodiac:"Aries",mbti:"ENTP",verified:true },
  { id:11,name:"Emma Frost",type:"Musician",img:"https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400&h=400&fit=crop",loc:"Los Angeles, CA",bio:"Electronic music producer. Synthwave vibes.",styles:["Experimental","Commercial"],zodiac:"Taurus",mbti:"INFP",verified:true },
  { id:12,name:"Sophie Turner",type:"Editor",img:"https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop",loc:"Atlanta, GA",bio:"Wedding and event editor. Making memories last.",styles:["Documentary","Branding","Portrait"],zodiac:"Capricorn",mbti:"ESFJ",verified:false },
  { id:13,name:"Dante Black",type:"Photographer",img:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",loc:"Las Vegas, NV",bio:"Fine art figure photographer. The body as living canvas.",styles:["Body Art","Fine Art","Fashion"],zodiac:"Scorpio",mbti:"ENTP",verified:true },
  { id:14,name:"Violet Storm",type:"Videographer",img:"https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop",loc:"Los Angeles, CA",bio:"Fine art figure film and expressive storytelling through form and light.",styles:["Body Art","Fine Art","Editorial"],zodiac:"Pisces",mbti:"ENFJ",verified:true },
  { id:15,name:"Jade Vixen",type:"Director",img:"https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop",loc:"Miami, FL",bio:"Fine art film director. Pushing boundaries through light, form, and the figure.",styles:["Body Art","Experimental","Commercial"],zodiac:"Leo",mbti:"ENTJ",verified:true },
  { id:16,name:"Blade Cruz",type:"Editor",img:"https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",loc:"New York, NY",bio:"Post-production for fine art figure and fashion.",styles:["Body Art","Fashion","Editorial"],zodiac:"Gemini",mbti:"ISTJ",verified:false },
];

export default async function ProfileDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = PROFILES.find(x => String(x.id) === String(id));
  if (!p) notFound();
  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#0a0612,#1a0a2e)",color:"#fff",fontFamily:"'Inter',system-ui,sans-serif",padding:24,maxWidth:640,margin:"0 auto"}}>
      <Link href="/muse" style={{color:"#FFD700",textDecoration:"none",fontSize:14}}>← Back to Muse</Link>
      <div style={{display:"flex",gap:18,alignItems:"center",marginTop:20}}>
        <img src={p.img} alt={p.name} style={{width:96,height:96,borderRadius:24,objectFit:"cover",border:"2px solid rgba(255,215,0,0.3)"}} />
        <div>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontSize:30,margin:0}}>{p.name} {p.verified && "✔"}</h1>
          <div style={{color:"#FFB5C2",fontWeight:600}}>{p.type}</div>
          <div style={{color:"#aaa",fontSize:13}}>📍 {p.loc}</div>
        </div>
      </div>
      <p style={{marginTop:18,lineHeight:1.6,color:"#ddd"}}>{p.bio}</p>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:14}}>
        {p.styles.map(s => <span key={s} style={{padding:"6px 14px",borderRadius:99,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.12)",fontSize:13}}>{s}</span>)}
      </div>
      <div style={{marginTop:20,display:"flex",gap:20,color:"#ccc",fontSize:14}}>
        <div>♈ {p.zodiac}</div>
        <div>🧠 {p.mbti}</div>
      </div>
      <a href="/muse" style={{display:"inline-block",marginTop:28,padding:"14px 28px",borderRadius:16,background:"linear-gradient(120deg,#FFD700,#FFBF00,#FFD700)",backgroundSize:"300% 300%",color:"#0a0612",fontWeight:800,textDecoration:"none"}}>Open Muse App</a>
    </div>
  );
}
