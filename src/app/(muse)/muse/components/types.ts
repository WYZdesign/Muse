export type Profile = typeof PROFILES[number] & { photos?: string[]; badges?: {name:string;desc:string;icon:string;color:string}[] };
export type Brief = typeof BRIEFS[number];
export type Match = Partial<Profile> & {
  id: number; name: string; img: string; type: string;
  bio?: string; location?: string; distanceMi?: number; booked?: boolean;
  messages: { from: string; text: string; time: string; img?: string }[];
};
export type Screen = "auth"|"onboard"|"discover"|"connections"|"matches"|"chat"|"profile"|"briefs"|"portfolio"|"settings"|"subscription"|"community"|"events"|"sessions"|"forum";

export const PROFILES = [
  { id:1,name:"Luna Martinez",type:"Photographer",img:"https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=800&fit=crop",loc:"Los Angeles, CA",bio:"Golden hour chaser. Capturing raw emotion through natural light.",collabs:47,score:94,verified:true,styles:["Editorial","Fine Art","Fashion"],looking:["Photographer","Director"],connection:"friend",nsfw:false,online:true,zodiac:"Leo",chinese:"Dragon",mbti:"ENFP",lifePath:7,photos:["https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&h=800&fit=crop"] },
  { id:2,name:"Marcus Chen",type:"Director",img:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop",loc:"San Francisco, CA",bio:"Visual storyteller. Currently working on a cyberpunk noir series.",collabs:82,score:91,verified:true,styles:["Music Video","Commercial","Experimental"],looking:["Videographer","Editor"],connection:"collab",nsfw:false,online:true,zodiac:"Virgo",chinese:"Monkey",mbti:"INTJ",lifePath:3,photos:["https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=600&h=800&fit=crop"] },
  { id:3,name:"Zoe Williams",type:"Editor",img:"https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600&h=800&fit=crop",loc:"Austin, TX",bio:"Color grading wizard. Every frame tells a story.",collabs:31,score:87,verified:true,styles:["Editorial","Fashion","Branding"],looking:["Photographer","Director"],connection:"mentor",nsfw:false,online:false,zodiac:"Libra",chinese:"Dog",mbti:"ISFJ",lifePath:9,photos:["https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&h=800&fit=crop"] },
  { id:4,name:"James Reid",type:"Musician",img:"https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=600&h=800&fit=crop",loc:"Nashville, TN",bio:"Multi-instrumentalist. Looking to score visual projects.",collabs:23,score:82,verified:false,styles:["Commercial","Experimental"],looking:["Director","Editor"],connection:"collab",nsfw:false,online:false,zodiac:"Pisces",chinese:"Rat",mbti:"INFP",lifePath:5,photos:["https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&h=800&fit=crop"] },
  { id:5,name:"Aria Patel",type:"Photographer",img:"https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&h=800&fit=crop",loc:"Miami, FL",bio:"Boudoir and fine art photographer. Light and shadow play.",collabs:56,score:89,verified:true,styles:["Fine Art","Portrait","Body Art"],looking:["Photographer","Videographer"],connection:"friend",nsfw:false,online:true,zodiac:"Scorpio",chinese:"Rabbit",mbti:"INFJ",lifePath:11,photos:["https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=800&fit=crop"] },
  { id:6,name:"Tyler Brooks",type:"Videographer",img:"https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&h=800&fit=crop",loc:"Denver, CO",bio:"Drone cinematography and landscape films.",collabs:18,score:78,verified:false,styles:["Commercial","Documentary"],looking:["Director","Photographer"],connection:"mentor",nsfw:false,online:true,zodiac:"Sagittarius",chinese:"Horse",mbti:"ESTP",lifePath:6,photos:["https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=600&h=800&fit=crop"] },
  { id:7,name:"Maya Singh",type:"Director",img:"https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&h=800&fit=crop",loc:"Portland, OR",bio:"Queer filmmaker crafting authentic narratives.",collabs:64,score:92,verified:true,styles:["Editorial","Music Video","Experimental"],looking:["Videographer","Editor"],connection:"collab",nsfw:false,online:false,zodiac:"Gemini",chinese:"Snake",mbti:"ENTJ",lifePath:4,photos:["https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&h=800&fit=crop"] },
  { id:8,name:"Kai Yamamoto",type:"Editor",img:"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&h=800&fit=crop",loc:"Seattle, WA",bio:"Post-production specialist. VFX and color.",collabs:39,score:85,verified:true,styles:["Fashion","Commercial","Branding"],looking:["Photographer","Director"],connection:"friend",nsfw:false,online:true,zodiac:"Aquarius",chinese:"Tiger",mbti:"ISTP",lifePath:8,photos:["https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop"] },
  { id:9,name:"Olivia Hart",type:"Photographer",img:"https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&h=800&fit=crop",loc:"Chicago, IL",bio:"Street photography and urban exploration.",collabs:15,score:76,verified:false,styles:["Documentary","Experimental","Portrait"],looking:["Videographer","Editor"],connection:"mentor",nsfw:false,online:false,zodiac:"Cancer",chinese:"Goat",mbti:"ESFP",lifePath:2,photos:["https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=600&h=800&fit=crop"] },
  { id:10,name:"Noah Bennett",type:"Director",img:"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&h=800&fit=crop",loc:"New York, NY",bio:"Commercial and music video director. Big ideas, bigger visions.",collabs:73,score:88,verified:true,styles:["Music Video","Commercial","Fashion"],looking:["Photographer","Videographer","Editor"],connection:"collab",nsfw:false,online:true,zodiac:"Aries",chinese:"Monkey",mbti:"ENTP",lifePath:3,photos:["https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&h=800&fit=crop"] },
  { id:11,name:"Emma Frost",type:"Musician",img:"https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=600&h=800&fit=crop",loc:"Los Angeles, CA",bio:"Electronic music producer. Synthwave vibes.",collabs:12,score:71,verified:true,styles:["Experimental","Commercial"],looking:["Director","Videographer"],connection:"friend",nsfw:false,online:false,zodiac:"Taurus",chinese:"Rooster",mbti:"INFP",lifePath:1,photos:["https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&h=800&fit=crop"] },
  { id:12,name:"Sophie Turner",type:"Editor",img:"https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&h=800&fit=crop",loc:"Atlanta, GA",bio:"Wedding and event editor. Making memories last.",collabs:29,score:83,verified:false,styles:["Documentary","Branding","Portrait"],looking:["Photographer","Director"],connection:"mentor",nsfw:false,online:true,zodiac:"Capricorn",chinese:"Ox",mbti:"ESFJ",lifePath:7,photos:["https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&h=800&fit=crop"] },
  { id:13,name:"Dante Black",type:"Photographer",img:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop",loc:"Las Vegas, NV",bio:"Fine art figure photographer. The body as living canvas.",collabs:94,score:96,verified:true,styles:["Body Art","Fine Art","Fashion"],looking:["Photographer","Videographer"],connection:"collab",nsfw:true,online:true,zodiac:"Scorpio",chinese:"Dragon",mbti:"ENTP",lifePath:9,photos:["https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&h=800&fit=crop"] },
  { id:14,name:"Violet Storm",type:"Videographer",img:"https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&h=800&fit=crop",loc:"Los Angeles, CA",bio:"Fine art figure film and expressive storytelling through form and light.",collabs:61,score:90,verified:true,styles:["Body Art","Fine Art","Editorial"],looking:["Director","Photographer"],connection:"collab",nsfw:true,online:false,zodiac:"Pisces",chinese:"Rabbit",mbti:"ENFJ",lifePath:11,photos:["https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=800&fit=crop"] },
  { id:15,name:"Jade Vixen",type:"Director",img:"https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&h=800&fit=crop",loc:"Miami, FL",bio:"Fine art film director. Pushing boundaries through light, form, and the figure.",collabs:112,score:93,verified:true,styles:["Body Art","Experimental","Commercial"],looking:["Videographer","Editor","Photographer"],connection:"collab",nsfw:true,online:true,zodiac:"Leo",chinese:"Tiger",mbti:"ENTJ",lifePath:6,photos:["https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=600&h=800&fit=crop"] },
  { id:16,name:"Blade Cruz",type:"Editor",img:"https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=600&h=800&fit=crop",loc:"New York, NY",bio:"Post-production for fine art figure and fashion.",collabs:37,score:85,verified:false,styles:["Body Art","Fashion","Editorial"],looking:["Director","Photographer"],connection:"mentor",nsfw:true,online:false,zodiac:"Gemini",chinese:"Monkey",mbti:"ISTJ",lifePath:5,photos:["https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop","https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&h=800&fit=crop"] },
];

export const BRIEFS = [
  { id:1,title:"Album Artwork Collection",author:"Luna Martinez",authorImg:"https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop",budget:"$2,000-$3,000",deadline:"4 weeks",desc:"Need a series of 8 album covers for an electronic music EP. Dark, ethereal, neon-noir aesthetic.",tags:["Album Art","Digital Art","Dark"],applicants:12,urgent:true,cat:"paid" },
  { id:2,title:"Fashion Campaign Video",author:"Noah Bennett",authorImg:"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop",budget:"$5,000-$8,000",deadline:"6 weeks",desc:"Spring/summer campaign for an indie fashion label. Need a creative videographer with editorial experience.",tags:["Fashion","Video","Campaign"],applicants:8,urgent:false,cat:"paid" },
  { id:3,title:"Studio Space Mural",author:"Aria Patel",authorImg:"https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop",budget:"$1,500-$2,500",deadline:"2 weeks",desc:"Looking for a mural artist to transform our photography studio into a dreamscape.",tags:["Mural","Installation","Dream"],applicants:5,urgent:true,cat:"paid" },
  { id:4,title:"Figure Art Collaboration",author:"Dante Black",authorImg:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop",budget:"TFP",deadline:"Open",desc:"Seeking fine art photographers for a body-positive series exploring light and shadow on the human form.",tags:["Fine Art","Figure","Body"],applicants:7,urgent:false,nsfw:true,cat:"tfp" },
  { id:5,title:"Music Video Production",author:"Maya Singh",authorImg:"https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&h=80&fit=crop",budget:"$3,000-$5,000",deadline:"3 weeks",desc:"Indie artist needs a director and DP for a dream-pop music video. Story-driven, ethereal visuals.",tags:["Music Video","Story","Dream Pop"],applicants:3,urgent:false,cat:"paid" },
  { id:6,title:"Brand Photo Package",author:"Kai Yamamoto",authorImg:"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop",budget:"$800-$1,500",deadline:"1 week",desc:"Small business needs professional product and lifestyle photos for website and social media.",tags:["Product","Lifestyle","Brand"],applicants:4,urgent:false,cat:"paid" },
  { id:7,title:"Sunset Beach Shoot - TFP",author:"Zara Kim",authorImg:"https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=80&h=80&fit=crop",budget:"TFP",deadline:"This Saturday",desc:"Looking for a model and MUA for golden hour beach shoot. Editorial/fashion vibes. TFP - everyone gets shots.",tags:["TFP","Editorial","Beach"],applicants:6,urgent:false,cat:"tfp" },
  { id:8,title:"Documentary Short - Open Call",author:"Leo Torres",authorImg:"https://images.unsplash.com/photo-1463453091185-61582044d556?w=80&h=80&fit=crop",budget:"Volunteer",deadline:"Rolling",desc:"Looking for crew for a documentary about LA's underground art scene. Passion project, no budget but great exposure.",tags:["Documentary","Art","Community"],applicants:15,urgent:false,cat:"opencall" },
  { id:9,title:"Anyone want to shoot something this weekend?",author:"Mia Johnson",authorImg:"https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&h=80&fit=crop",budget:"—",deadline:"Weekend",desc:"Got a free weekend and want to create something. No plan yet, just vibes. DM if you're down to vision ideas.",tags:["Casual","Weekend","Ideas"],applicants:9,urgent:false,cat:"concept" },
  { id:10,title:"Collab idea: neon noir photo series",author:"Remy Zhang",authorImg:"https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop",budget:"—",deadline:"Flexible",desc:"Been thinking about a neon noir series - think Blade Runner meets Wong Kar-wai. Need a DP and stylist who's into it.",tags:["Concept","Neon Noir","Photo"],applicants:4,urgent:false,cat:"concept" },
];

export const COMMUNITIES = [
  {id:1,name:"LA Photographers",img:"https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",members:"12.4k",desc:"SoCal's biggest photo community",cat:"photo",nsfw:false},
  {id:2,name:"Queer Creatives United",img:"https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100",members:"8.2k",desc:"Safe space for LGBTQIA+ artists",cat:"social",nsfw:false},
  {id:3,name:"Figure Art Collective",img:"https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",members:"4.7k",desc:"Body-positive fine art & figure photography",cat:"nsfw",nsfw:true},
  {id:4,name:"Film & Video Directors",img:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",members:"6.1k",desc:"For directors and visual storytellers",cat:"photo",nsfw:false},
  {id:5,name:"MUA & Stylist Network",img:"https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100",members:"3.9k",desc:"Beauty & fashion industry pros",cat:"social",nsfw:false},
];

export const EVENTS = [
  {id:1,title:"Golden Hour Meetup",date:"Sat, Jul 20",loc:"Venice Beach",desc:"Group shoot at sunset. All levels welcome.",nsfw:false},
  {id:2,title:"Creative Portfolio Review",date:"Wed, Jul 24",loc:"Online (Zoom)",desc:"Get feedback from industry pros on your portfolio.",nsfw:false},
  {id:3,title:"Street Style Workshop",date:"Sat, Aug 3",loc:"Downtown LA",desc:"Learn candid street photography techniques.",nsfw:false},
  {id:4,title:"Figure Art Exhibition",date:"Fri, Aug 9",loc:"Arts District",desc:"Annual body-positive fine art show.",nsfw:false},
  {id:5,title:"Film Scoring 101",date:"Sun, Aug 18",loc:"Online (Zoom)",desc:"Compose for visual media.",nsfw:false},
];

export const SESSIONS = [
  {id:201,name:"Maya Chen",type:"Photographer",img:"https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",rate:"$75/hr",rating:4.9,sessions:128,available:true,skills:["Portrait","Fashion","Editorial"]},
  {id:202,name:"Jordan Rivera",type:"Director",img:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",rate:"$120/hr",rating:4.8,sessions:89,available:true,skills:["Music Video","Commercial","Short Film"]},
  {id:203,name:"Alex Kim",type:"Editor",img:"https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200",rate:"$60/hr",rating:4.7,sessions:201,available:false,skills:["Color Grading","VFX","Sound Design"]},
  {id:204,name:"Sam Taylor",type:"Composer",img:"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200",rate:"$90/hr",rating:4.9,sessions:156,available:true,skills:["Score","Production","Mixing"]},
  {id:205,name:"Riley Patel",type:"Designer",img:"https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",rate:"$85/hr",rating:4.6,sessions:94,available:true,skills:["Brand","UI/UX","Motion"]},
];

export const FORUM_POSTS = [
  {id:301,title:"Best lighting setup for outdoor portraits?",body:"I've been struggling with harsh shadows during midday shoots. What modifiers do you swear by?",author:"Maya Chen",avatar:"https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",votes:47,comments:[{author:"Jordan R.",text:"Reflector + fill flash combo. Game changer."},{author:"Alex K.",text:"Overcast days or golden hour."}],cat:"Photography",time:"2h ago",pinned:true},
  {id:302,title:"How do you price music video production?",body:"I'm getting more requests but have no idea what the market rate is in LA.",author:"Jordan Rivera",avatar:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",votes:32,comments:[{author:"Sam T.",text:"$5K-25K for indie."}],cat:"Business",time:"5h ago",pinned:false},
  {id:303,title:"DaVinci Resolve vs Premiere - 2026 edition",body:"Switched to Resolve last year. The color grading tools are unmatched.",author:"Alex Kim",avatar:"https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100",votes:89,comments:[{author:"Maya C.",text:"Resolve for color, Premiere for everything else."}],cat:"Editing",time:"1d ago",pinned:false},
  {id:304,title:"Looking for a videographer for short film",body:"Shooting a 15-min neo-noir short in August. Paid gig.",author:"Sam Taylor",avatar:"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100",votes:23,comments:[],cat:"Collab",time:"3h ago",pinned:false},
  {id:305,title:"Portfolio website: Squarespace vs custom Next.js?",body:"My Squarespace site feels generic. Is custom worth it?",author:"Riley Patel",avatar:"https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",votes:56,comments:[{author:"Alex K.",text:"Custom all the way."}],cat:"Career",time:"8h ago",pinned:false},
];

export const TIERS = [
  { name:"Free",price:"$0",period:"forever",features:["10 likes/day","Basic profile","Chat with matches","Standard discover"],current:true },
  { name:"Spark",price:"$9.99",period:"/month",features:["50 likes/day","See who likes you","Advanced filters","Read receipts","Profile boost (x1/week)"] },
  { name:"Muse",price:"$24.99",period:"/month",features:["Unlimited likes","Priority discover","Incognito mode","Super likes (x5/day)","Profile boost (x3/week)","AI match insights"] },
  { name:"Sovereign",price:"$49.99",period:"/month",features:["Everything in Muse","Private mode","AI match assistant","Featured profile","Early access features","Direct booking links","Dedicated support"] },
];

export const AESTHETICS = ["Portrait","Editorial","Commercial","Music Video","Documentary","Branding","Body Art","Fine Art","Fashion","Experimental","Dark","Dreamy","Bold","Vintage","Abstract","Film"];
export const CREATIVE_TYPES = ["Photographer","Model","Content Creator","Director","Editor","MUA","Stylist","Actor","Videographer","Writer","Producer","Designer"];
export const LOOKING_FOR = ["Photographer","Videographer","Director","Editor","Musician","Writer","Designer","Producer"];
export const CONN_TYPES = ["friend","collab","mentor","partner"];
export const ZODIAC = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
export const ZE:Record<string,string> = {"Aries":"🔥 Bold pioneer","Taurus":"🌍 Grounded sensualist","Gemini":"💨 Curious connector","Cancer":"💧 Empathetic soul","Leo":"🔥 Creative star","Virgo":"🌍 Meticulous artisan","Libra":"💨 Balanced visionary","Scorpio":"💧 Intense transformer","Sagittarius":"🔥 Adventurous spirit","Capricorn":"🌍 Ambitious builder","Aquarius":"💨 Future thinker","Pisces":"💧 Dreamy mystic"};
export const CHINESE = ["Rat","Ox","Tiger","Rabbit","Dragon","Snake","Horse","Goat","Monkey","Rooster","Dog","Pig"];
export const CE:Record<string,string> = {"Rat":"🐀 Quick-witted","Ox":"🐂 Steadfast","Tiger":"🐅 Courageous","Rabbit":"🐇 Graceful","Dragon":"🐉 Charismatic","Snake":"🐍 Wise","Horse":"🐴 Energetic","Goat":"🐐 Creative","Monkey":"🐒 Clever","Rooster":"🐓 Confident","Dog":"🐕 Loyal","Pig":"🐖 Generous"};
export const MBTI = ["INTJ","INTP","ENTJ","ENTP","INFJ","INFP","ENFJ","ENFP","ISTJ","ISFJ","ESTJ","ESFJ","ISTP","ISFP","ESTP","ESFP"];
export const LIFE_PATHS = [1,2,3,4,5,6,7,8,9,11,22,33];
export const PC = ["#FFD700","#FF6B6B","#D4A5FF","#98FB98","#FFDAB9","#87CEEB","#FF8A80","#FFD1A4","#FFB5C2","#FFE4B5","#FF9A56","#E6E6FA"];
export const PROFESSIONALS = [
  {id:1,name:"Elena Voss",type:"Casting Director",img:"https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",loc:"Los Angeles, CA",exp:"8 years",openings:3,skills:["Fashion","Commercial","Editorial"],nsfw:false},
  {id:2,name:"Marcus Webb",type:"Producer",img:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",loc:"New York, NY",exp:"12 years",openings:5,skills:["Music Video","Commercial","Film"],nsfw:false},
  {id:3,name:"Simone Hart",type:"Art Buyer",img:"https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200",loc:"San Francisco, CA",exp:"6 years",openings:2,skills:["Fine Art","Fashion","Editorial"],nsfw:false},
  {id:4,name:"Dante Cruz",type:"Fine Art Agent",img:"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200",loc:"Miami, FL",exp:"10 years",openings:7,skills:["Body Art","Fine Art","Fashion"],nsfw:true},
  {id:5,name:"Lena Park",type:"Creative Director",img:"https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",loc:"Austin, TX",exp:"15 years",openings:4,skills:["Branding","Commercial","Experimental"],nsfw:false},
];
export const CONNECTIONS = [
  { name:"Creative Mornings LA",type:"Community",cat:"community",img:"https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=200&h=120&fit=crop",desc:"Weekly creative networking events in LA",tag:"Events" },
  { name:"AFI Conservatory",type:"Film School",cat:"education",img:"https://images.unsplash.com/photo-1523050854058-8df90110c7f1?w=200&h=120&fit=crop",desc:"American Film Institute alumni network",tag:"Film" },
  { name:"LA Art Walk",type:"Community",cat:"community",img:"https://images.unsplash.com/photo-1531913764164-f85c3e03b2aa?w=200&h=120&fit=crop",desc:"Downtown LA monthly artwalk collective",tag:"Art" },
  { name:"The Muse Agency",type:"Talent",cat:"talent",img:"https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200&h=120&fit=crop",desc:"Creative talent matching platform",tag:"Matching" },
  { name:"Sundance Collab",type:"Workshop",cat:"education",img:"https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=200&h=120&fit=crop",desc:"Filmmaker workshops and labs",tag:"Education" },
  { name:"Figure Art Creatives United",type:"Community",cat:"nsfw",img:"https://images.unsplash.com/photo-1519741497674-611481863552?w=200&h=120&fit=crop",desc:"Safe space for fine art figure & body-positive creatives",tag:"Figure Art" },
  { name:"FotoFest",type:"Exhibition",cat:"community",img:"https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=200&h=120&fit=crop",desc:"Fine art photography biennial",tag:"Photo" },
  { name:"Stage 32",type:"Network",cat:"talent",img:"https://images.unsplash.com/photo-1516245834210-c4c142787335?w=200&h=120&fit=crop",desc:"Film & TV industry networking platform",tag:"Film" },
  { name:"Body Art Collective",type:"Community",cat:"nsfw",img:"https://images.unsplash.com/photo-1473186505569-9c61870c11f9?w=200&h=120&fit=crop",desc:"Fine art body photography collective",tag:"Figure Art" },
  { name:"Smashbox Studios",type:"Studio",cat:"talent",img:"https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200&h=120&fit=crop",desc:"Iconic LA photo and film studio",tag:"Studio" },
  { name:"Women in Film",type:"Community",cat:"community",img:"https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&h=120&fit=crop",desc:"Supporting women in the film industry",tag:"Film" },
  { name:"Prism Studio",type:"Studio",cat:"nsfw",img:"https://images.unsplash.com/photo-1520975916090-3105956dac38?w=200&h=120&fit=crop",desc:"Inclusive studio for body-positive fine art",tag:"Figure Art" },
];

export function calcMatch(a: { styles: string[]; looking: string[]; zodiac?: string; chinese?: string; mbti?: string; lifePath?: number }, b: typeof PROFILES[number]): number {
  let s = 40;
  const shared = a.styles.filter(x => b.styles.includes(x));
  s += Math.min(shared.length * 7, 21);
  if (a.looking.some(l => b.looking.some(bl => bl.toLowerCase().includes(l.toLowerCase()) || l.toLowerCase().includes(bl.toLowerCase())))) s += 15;
  if (a.looking.some(l => b.type.toLowerCase().includes(l.toLowerCase()))) s += 8;
  const zCompat: Record<string, string[]> = {"Aries":["Leo","Sagittarius","Gemini","Aquarius"],"Taurus":["Virgo","Capricorn","Cancer","Pisces"],"Gemini":["Libra","Aquarius","Aries","Leo"],"Cancer":["Scorpio","Pisces","Taurus","Virgo"],"Leo":["Aries","Sagittarius","Gemini","Libra"],"Virgo":["Taurus","Capricorn","Cancer","Scorpio"],"Libra":["Gemini","Aquarius","Aries","Sagittarius"],"Scorpio":["Cancer","Pisces","Taurus","Capricorn"],"Sagittarius":["Aries","Leo","Gemini","Libra"],"Capricorn":["Taurus","Virgo","Cancer","Scorpio"],"Aquarius":["Gemini","Libra","Aries","Sagittarius"],"Pisces":["Cancer","Scorpio","Taurus","Virgo"]};
  if (a.zodiac && b.zodiac) { if (a.zodiac === b.zodiac) s += 6; else if (zCompat[a.zodiac]?.includes(b.zodiac)) s += 4; }
  if (a.chinese && b.chinese && a.chinese === b.chinese) s += 6;
  const mCompat: Record<string, string[]> = {"INTJ":["ENTP","ENFP"],"INTP":["ENTJ","ENFJ"],"ENTJ":["INTP","INFP"],"ENTP":["INTJ","INFJ"],"INFJ":["ENFP","ENTP"],"INFP":["ENFJ","ENTJ"],"ENFJ":["INFP","INTP"],"ENFP":["INFJ","INTJ"],"ISTJ":["ESFP","ESTP"],"ISFJ":["ESFP","ESTP"],"ESTJ":["ISFP","ISTP"],"ESFJ":["ISFP","ISTP"],"ISTP":["ESFJ","ESTJ"],"ISFP":["ESFJ","ESTJ"],"ESTP":["ISTJ","ISFJ"],"ESFP":["ISTJ","ISFJ"]};
  if (a.mbti && b.mbti) { if (a.mbti === b.mbti) s += 5; else if (mCompat[a.mbti]?.includes(b.mbti)) s += 4; }
  if (a.lifePath && b.lifePath && a.lifePath === b.lifePath) s += 5;
  if (b.verified) s += 3;
  if (b.collabs > 50) s += 2;
  return Math.min(s, 99);
}

export function calcZodiac(month: number, day: number): string {
  const signs = ["Capricorn","Aquarius","Pisces","Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius"];
  const cutoffs = [20,19,21,20,21,21,23,23,23,23,22,22];
  return day < cutoffs[month - 1] ? signs[(month + 10) % 12] : signs[(month + 11) % 12];
}

export function calcChineseZodiac(year: number): string {
  const animals = ["Rat","Ox","Tiger","Rabbit","Dragon","Snake","Horse","Goat","Monkey","Rooster","Dog","Pig"];
  return animals[(year - 1900) % 12];
}

export function calcLifePath(month: number, day: number, year: number): number {
  const sum = (n: number): number => { let s = 0; while (n > 0) { s += n % 10; n = Math.floor(n / 10); } return s > 9 ? sum(s) : s; };
  const lp = sum(month) + sum(day) + sum(year);
  return lp > 9 && lp !== 11 && lp !== 22 && lp !== 33 ? sum(lp) : lp;
}

export function calcMbti(answers: Record<string, string>): string {
  const e = (answers.ei || "e") === "e" ? "E" : "I";
  const s = (answers.sn || "s") === "s" ? "S" : "N";
  const t = (answers.tf || "t") === "t" ? "T" : "F";
  const j = (answers.jp || "j") === "j" ? "J" : "P";
  return e + s + t + j;
}

export const ICEBREAKERS: Record<string, string[]> = {
  Photographer: ["What's your favorite golden hour spot?", "Film or digital, and why?", "What made you pick up a camera?"],
  Model: ["What's your favorite type of shoot?", "How do you prepare before a session?", "Editorial or commercial, where do you thrive?"],
  "Content Creator": ["What platform are you most active on?", "What's your content creation process?", "Collab or solo, what do you prefer?"],
  Director: ["What's your dream project?", "Who inspires your visual style?", "Short film or feature, what's the goal?"],
  Editor: ["What's your go-to color grading style?", "Premiere, DaVinci, or Final Cut?", "What's the hardest edit you've pulled off?"],
  MUA: ["What's your signature look?", "Skincare or glam, what do you love more?", "What products can you not live without?"],
  Stylist: ["Where do you source your pieces?", "Editorial or commercial, which do you prefer?", "What's your styling philosophy?"],
  Actor: ["What type of roles do you gravitate toward?", "Stage or screen, where do you thrive?", "What's your preparation process?"],
  Videographer: ["Drone or handheld, what's your style?", "What's the most cinematic thing you've filmed?", "Client work or passion projects?"],
  Writer: ["What genres do you write in?", "Have you written for screen?", "What's your creative process like?"],
  Producer: ["What's your production style?", "Indie or studio, where do you thrive?", "What's the key to a smooth shoot?"],
  Designer: ["What's your design philosophy?", "Typography or illustration, which do you love more?", "What tools define your workflow?"],
  default: ["What's inspiring you right now?", "What are you working on?", "What's your creative dream project?"],
};

export const CITY_GEO: Record<string, {lat:number;long:number}> = {
  "Los Angeles, CA":{lat:34.05,long:-118.24},"San Francisco, CA":{lat:37.77,long:-122.42},
  "Austin, TX":{lat:30.27,long:-97.74},"Nashville, TN":{lat:36.16,long:-86.78},
  "Miami, FL":{lat:25.76,long:-80.19},"Denver, CO":{lat:39.74,long:-104.99},
  "Portland, OR":{lat:45.52,long:-122.68},"Seattle, WA":{lat:47.61,long:-122.33},
  "Chicago, IL":{lat:41.88,long:-87.63},"New York, NY":{lat:40.71,long:-74.01},
  "Atlanta, GA":{lat:33.75,long:-84.39},"Las Vegas, NV":{lat:36.17,long:-115.14},
};
