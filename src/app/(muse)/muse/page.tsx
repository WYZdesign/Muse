"use client";

import "./muse.css";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { supabase } from "@/lib/supabase";
import { subscribeToMusePush, unsubscribeFromMusePush, ensureMusePushRegistered } from "@/app/muse-pwa";
import { persistMessage, subscribeToConversation, getGeolocation, distanceMiles } from "@/app/muse-realtime";
import { trackError } from "@/lib/errorTracker";
import { FiStar, FiHeart, FiCompass, FiFilter, FiZap, FiSend, FiArrowLeft, FiEdit2, FiPlus, FiSearch, FiUsers, FiUser, FiLink, FiTwitter, FiInstagram, FiX, FiFile, FiImage, FiEye, FiMoreHorizontal, FiSettings, FiChevronRight, FiMusic, FiHeadphones, FiMenu, FiCalendar, FiShare2, FiShield, FiGift, FiDollarSign } from "react-icons/fi";
import BackgroundScene from "./components/BackgroundScene";
import Nav from "./components/Nav";
import { PORTRAIT_IMG } from "./components/photoOrientation";
import MyAlbumsManager from "./components/MyAlbumsManager";
import Confetti from "./components/Confetti";
import SwipeParticles from "./components/SwipeParticles";
import ScreenSkeleton from "@/components/ScreenSkeleton";
import { safeSetItem, safeGetItem, safeRemoveItem, QUOTA_MSG } from "./lib/safe-storage";
import { getAccessToken, authFetch } from "./lib/api";
import { uid } from "./lib/uid";
import DisclosureModal from "./components/DisclosureModal";
import AgeVerificationModal from "./components/AgeVerificationModal";
import SupportChat from "./components/SupportChat";
import MatchCard from "./components/MatchCard";
import MuseMap from "./components/MuseMap";
import { CardPreloader } from "@/components/CardPreloader";
import SafetyCheckinModal from "./components/SafetyCheckinModal";
import PromptBankModal from "./components/PromptBankModal";
import ReferralPanel from "./components/ReferralPanel";
import ConnectPanel from "./components/ConnectPanel";
import PaymentHistory from "./components/PaymentHistory";
import { PROFILES, BRIEFS, COMMUNITIES, EVENTS, SESSIONS, FORUM_POSTS, TIERS, PROFESSIONALS, AESTHETICS, CREATIVE_TYPES, LOOKING_FOR, CITY_GEO, ZODIAC, ZE, CHINESE, CE, MBTI, LIFE_PATHS, EXCLUDED_PORTFOLIOS, calcMatch, calcZodiac, calcChineseZodiac, calcLifePath, calcMbti, type Profile, type Match, type Screen } from "./components/types";

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@wyzdesign.com";
const OWNER_EMAIL = process.env.NEXT_PUBLIC_OWNER_EMAIL || "torree.marcel@gmail.com";

const DEMO_MOMENTS: any[] = [
  { id: 9001, author: "Maya Chen", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100", img: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800", time: "12m ago", text: "Golden hour setup for tonight's shoot. The light is unreal right now 🌅", likes: 87, comments: 12 },
  { id: 9002, author: "Jordan Rivera", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100", img: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800", time: "28m ago", text: "Lens test on the new 85mm. Creamy bokeh for days 📷", likes: 143, comments: 21 },
  { id: 9003, author: "Sam Taylor", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100", img: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800", time: "1h ago", text: "WIP color grade. Pulling shadows, pushing the teal-orange split.", likes: 56, comments: 8 },
  { id: 9004, author: "Riley Patel", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100", img: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800", time: "2h ago", text: "Studio setup build-out. T-minus 3 days to the big shoot 🎬", likes: 231, comments: 34 },
  { id: 9005, author: "Avery Brooks", avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100", img: "https://images.unsplash.com/photo-1493514789931-586cb221d7a7?w=800", time: "3h ago", text: "Location scouting found this gem. Natural diffusers everywhere.", likes: 98, comments: 15 },
  { id: 9006, author: "Kai Tanaka", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100", img: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800", time: "4h ago", text: "First edit pass on the campaign. Client's gonna love this one.", likes: 312, comments: 41 },
];





/* ═══ COMPONENT ═══ */

export default function MusePageWrapper() {
  return <ErrorBoundary><MusePage /></ErrorBoundary>;
}

function MusePage() {
  const [screen, setScreen] = useState<Screen>("auth");
  const [authMode, setAuthMode] = useState<"login"|"signup">("signup");
  const [authEmail, setAuthEmail] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authName, setAuthName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [authUser, setAuthUser] = useState<{id:string;email:string;profile?:{id:string;[key:string]:unknown}}|null>(null);
  const [obStep, setObStep] = useState(0);
   const [obData, setObData] = useState<{name?:string;loc?:string;bio?:string;type?:string;looking?:string[];conn?:string[];styles?:string[];zodiac?:string;chinese?:string;mbti?:string;lifePath?:number;referralCode?:string}>({});
   const [currentUser, setCurrentUser] = useState({ id:"you", name:"You", type:"Photographer", exp:"New here", avatar:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop", stats:{matches:0,likes:0,superLikes:0,passes:0,bookingsCompleted:0,matchesReceived:0,messagesSent:0}, createdAt:Date.now(), referrals:0, portfolios:[] as {img:string;title:string;type:string}[], foundingTier:"" as string, proExpiresAt:"" as string, tier:"free" });
   const [excludedPortfolios, setExcludedPortfolios] = useState<string[]>(EXCLUDED_PORTFOLIOS);
   const [portfolioAccess, setPortfolioAccess] = useState<{[key: string]: "public" | "private" | "invite"}>({});
   const [selectedPortfolio, setSelectedPortfolio] = useState<any>(null);
   const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [portfolioStats, setPortfolioStats] = useState<any>({});
  const [cardAlbums, setCardAlbums] = useState<{id:string;title:string;cover_url:string;access_level:string;photo_count:number}[]>([]);
  const [cardAlbumIdx, setCardAlbumIdx] = useState(0);
  const [cardAlbumPhotos, setCardAlbumPhotos] = useState<string[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
   const [matches, setMatches] = useState<Match[]>([]);
   const [chatTarget, setChatTarget] = useState<Match | null>(null);
   const [chatInput, setChatInput] = useState("");
   const [connFilter, setConnFilter] = useState("all");
  const [showNsfw, setShowNsfw] = useState(false);
  const [showMatchOverlay, setShowMatchOverlay] = useState<Match | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [swipeDir, setSwipeDir] = useState<"left"|"right"|null>(null);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  useEffect(() => { if (typeof window !== "undefined") (window as any).__exp = expandedMatchId; }, [expandedMatchId]);
  const [boostActive, setBoostActive] = useState(false);
  const [boostEnd, setBoostEnd] = useState(0);
  const [discoverSearch, setDiscoverSearch] = useState("");
  const [mapView, setMapView] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [dailyLikes, setDailyLikes] = useState(999);
  const [superLikes, setSuperLikes] = useState(999);
  const [screenFlash, setScreenFlash] = useState<string | null>(null);
  const [showUnlimitedBadge, setShowUnlimitedBadge] = useState(true);
  const [matchStreak, setMatchStreak] = useState(0);
  const [rewindStack, setRewindStack] = useState<number[]>([]);
  const [showLikeNote, setShowLikeNote] = useState(false);
  const [likeNoteText, setLikeNoteText] = useState("");
  const [noteTargetProfile, setNoteTargetProfile] = useState<any>(null);
  const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0);
  const [cardScrolled, setCardScrolled] = useState(false);
  const [showMatchMenu, setShowMatchMenu] = useState(false);
  const cardScrollRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const [galleryView, setGalleryView] = useState<{ profileId: string | number; name: string; photos: string[]; idx: number } | null>(null);
  const [lightboxPhotos, setLightboxPhotos] = useState<string[]>([]);
  const [lightboxIdx, setLightboxIdx] = useState<number>(0);
  const [portfolioPhotoIdx, setPortfolioPhotoIdx] = useState(0);
  const [promptIdx, setPromptIdx] = useState(0);
  const [discoverSearchOpen, setDiscoverSearchOpen] = useState(false);
  const [savedBriefs, setSavedBriefs] = useState<number[]>([]);
  const [appliedBriefs, setAppliedBriefs] = useState<number[]>([]);
  const [showAgeGate, setShowAgeGate] = useState(false);
  const [pendingNsfw, setPendingNsfw] = useState(false);
  const [userTier, setUserTier] = useState<string>("free");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterStyles, setFilterStyles] = useState<string[]>([]);
  const [filterScore, setFilterScore] = useState(50);
  const [showPostBrief, setShowPostBrief] = useState(false);
  const [briefTitle, setBriefTitle] = useState("");
  const [briefDesc, setBriefDesc] = useState("");
  const [briefBudget, setBriefBudget] = useState("");
  const [briefCat, setBriefCat] = useState<"tfp"|"paid"|"opencall"|"concept">("concept");
  const [userBriefs, setUserBriefs] = useState<{id:number;title:string;desc:string;budget:string;tags:string[];cat:string}[]>([]);
  // Live data overrides (fetched from the API; falls back to static arrays).
  const [liveProfiles, setLiveProfiles] = useState<typeof PROFILES | null>(null);
  const [liveBriefs, setLiveBriefs] = useState<typeof BRIEFS | null>(null);
  const [liveFeed, setLiveFeed] = useState<any[] | null>(null);
  const [liveForum, setLiveForum] = useState<any[] | null>(null);
  const [liveEvents, setLiveEvents] = useState<any[] | null>(null);
  const [liveCommunities, setLiveCommunities] = useState<typeof COMMUNITIES | null>(null);
  const [liveSessions, setLiveSessions] = useState<typeof SESSIONS | null>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editLoc, setEditLoc] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [showShareProfile, setShowShareProfile] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportTarget, setReportTarget] = useState<{id:number|string;type:string;name:string} | null>(null);
  const [showNotificationsSettings, setShowNotificationsSettings] = useState(false);
  const [showConnectedAccounts, setShowConnectedAccounts] = useState(false);
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({match:true,message:true,brief:true,like:true});
  const [pushEnabled, setPushEnabled] = useState<boolean>(false);
  const [connTab, setConnTab] = useState<"community"|"events"|"sessions"|"forum"|"feed"|"professional">("community");
  const [portfolioTab, setPortfolioTab] = useState<"all"|"portrait"|"landscape"|"sets">("all");
  const [forumPosts, setForumPosts] = useState<{id:number;title:string;body:string;author:string;avatar:string;votes:number;comments:{author:string;text:string}[];cat:string;time:string;pinned:boolean}[]>([]);
  const [commTab, setCommTab] = useState<"groups"|"events">("groups");
  const [sessTab, setSessTab] = useState<"sessions"|"bookings"|"requests">("sessions");
  const [netTab, setNetTab] = useState<"pros"|"forum">("pros");
  const [forumSort, setForumSort] = useState<"hot"|"new"|"top">("hot");
  const [forumCategory, setForumCategory] = useState<string>("all");
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostBody, setNewPostBody] = useState("");
  const [showNewPost, setShowNewPost] = useState(false);
  const [expandedPost, setExpandedPost] = useState<number|null>(null);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [eventsFilter, setEventsFilter] = useState<"all"|"upcoming"|"past">("all");
  const [rsvpdEvents, setRsvpdEvents] = useState<number[]>([]);
  const [feedPosts, setFeedPosts] = useState<{id:number;author:string;avatar:string;type:string;text:string;likes:number;comments:number;shares:number;time:string;liked:boolean;saved:boolean;img?:string;media?:string[];reactions?:Record<string,number>}[]>([]);
  const [feedText, setFeedText] = useState("");
  const [feedMedia, setFeedMedia] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [feedReactions, setFeedReactions] = useState<Record<number,string[]>>({});
  const [feedPostsStatic, setFeedPostsStatic] = useState<{id:number;author:string;avatar:string;type:string;text:string;likes:number;comments:number;shares:number;time:string;liked:boolean;saved:boolean;img?:string}[]>([{id:401,author:"Maya Chen",avatar:"https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",type:"photo",text:"Golden hour never gets old. Shot this at El Matador Beach last weekend.",likes:234,comments:18,shares:5,time:"2h ago",img:"https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600",liked:false,saved:false},{id:402,author:"Jordan Rivera",avatar:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",type:"text",text:"Just wrapped principal photography on a 30-min short. 14-hour days for 12 days straight. The footage is incredible!",likes:189,comments:32,shares:12,time:"5h ago",liked:false,saved:false},{id:403,author:"Sam Taylor",avatar:"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100",type:"photo",text:"New album art I designed. Surreal dreamlike aesthetic.",likes:312,comments:24,shares:8,time:"8h ago",img:"https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600",liked:false,saved:false},{id:404,author:"Riley Patel",avatar:"https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",type:"photo",text:"Motion graphics reel. 6 months of work in 90 seconds.",likes:567,comments:45,shares:23,time:"1d ago",liked:false,saved:false}]);
  const [feedFilter, setFeedFilter] = useState<"all"|"photos"|"videos"|"text">("all");
  const [museCat, setMuseCat] = useState<"all"|"tfp"|"paid"|"opencall"|"concept">("all");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const editAvatarInputRef = useRef<HTMLInputElement>(null);

  // Personality Discovery
  const [obStep10Known, setObStep10Known] = useState<"yes"|"no"|"test"|null>(null);
  const [testScreen, setTestScreen] = useState<"zodiac"|"mbti"|"chinese"|"lifepath"|"done"|null>(null);
  const [testBirthMonth, setTestBirthMonth] = useState("");
  const [testBirthDay, setTestBirthDay] = useState("");
  const [testBirthYear, setTestBirthYear] = useState("");
  const [testMbtiAnswers, setTestMbtiAnswers] = useState<Record<string,string>>({});
  const [formErrors, setFormErrors] = useState<Record<string,string>>({});
  const [testLevels, setTestLevels] = useState<{zodiac:number;mbti:number;chinese:number;lifePath:number}>({zodiac:1,mbti:1,chinese:1,lifePath:1});
  const [obSelects, setObSelects] = useState<string[]>([]);
  const [obTestKey, setObTestKey] = useState<string>("");
  const [obTestStep, setObTestStep] = useState(0);
  const [obProfilePic, setObProfilePic] = useState<string | null>(null);
  const [obConnectedSocials, setObConnectedSocials] = useState<Record<string, boolean>>({});
  const [obPortfolioItems, setObPortfolioItems] = useState<{img:string;title:string}[]>([]);
  const [likedBy, setLikedBy] = useState<Profile[]>([]);
  const [showLikesYou, setShowLikesYou] = useState(false);
  const [matchesView, setMatchesView] = useState<"list"|"grid">("list");
  const [profileViews, setProfileViews] = useState(0);
  const [profileViewers, setProfileViewers] = useState<{name:string;avatar:string;time:string}[]>([]);
  const [stories, setStories] = useState<any[]>([
    {id:501,author:"Maya Chen",avatar:"https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",type:"photo",text:"Behind the scenes of today's editorial shoot. The light was absolutely magical.",likes:87,comments:12,shares:3,time:"12m ago",img:"https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600"},
    {id:502,author:"Jordan Rivera",avatar:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",type:"photo",text:"Color grading session. Testing new LUTs for the indie film.",likes:45,comments:8,shares:2,time:"1h ago",img:"https://images.unsplash.com/photo-1535016120720-40c646be5580?w=600"},
    {id:503,author:"Sam Taylor",avatar:"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100",type:"photo",text:"Studio session vibes. New album art coming together.",likes:62,comments:9,shares:4,time:"3h ago",img:"https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=600"},
    {id:504,author:"Riley Patel",avatar:"https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",type:"photo",text:"Motion capture test for the music video. The visuals are insane.",likes:134,comments:21,shares:7,time:"5h ago",img:"https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600"},
    {id:505,author:"Avery Nguyen",avatar:"https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100",type:"photo",text:"Golden hour at the pier. Sometimes the best shots are the simplest.",likes:98,comments:15,shares:6,time:"8h ago",img:"https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600"},
  ]);
  const [showStory, setShowStory] = useState<number|null>(null);
  const [theme, setTheme] = useState<"lasunset"|"deepspace"|"nebula"|"villa"|"deepsea">("lasunset");
  const [activityFeed, setActivityFeed] = useState<{id:number;type:string;from:string;avatar:string;text:string;time:string;read:boolean}[]>([]);
  const [discoveryPrefs, setDiscoveryPrefs] = useState<{ageMin:number;ageMax:number;distance:number;gender:string}>({ageMin:18,ageMax:50,distance:50,gender:"all"});
  const [myGeo, setMyGeo] = useState<{lat:number;long:number;city:string;state:string;requiresIdVerification:boolean}|null>(null);
  const [showDiscoveryPrefs, setShowDiscoveryPrefs] = useState(false);
  const [showActivityFeed, setShowActivityFeed] = useState(false);
  const [showHamburger, setShowHamburger] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [showPremiumPopup, setShowPremiumPopup] = useState(() => {
    try {
      const hidden = safeGetItem("muse_hide_premium");
      if (hidden) return false;
      const seen = sessionStorage.getItem("muse_premium_seen");
      if (seen) return false;
      const c = safeGetItem("muse_open_count");
      const count = c ? parseInt(c) + 1 : 1;
      safeSetItem("muse_open_count", String(count));
      if (count % 3 === 0) {
        sessionStorage.setItem("muse_premium_seen", "1");
        return true;
      }
      return false;
    } catch { return false; }
  });
  const [premiumDismissed, setPremiumDismissed] = useState<boolean>(() => {
    try { return !!safeGetItem("muse_hide_premium"); } catch { return false; }
  });

  // ═══ TRUST & SAFETY STATE ═══
  const [showDisclosureModal, setShowDisclosureModal] = useState(false);
  const [disclosureTarget, setDisclosureTarget] = useState<{id:string;name:string} | null>(null);
  const [disclosureBookingId, setDisclosureBookingId] = useState<string | undefined>();
  const [existingDisclosure, setExistingDisclosure] = useState<Record<string, unknown> | null>(null);
  const [showAgeVerification, setShowAgeVerification] = useState(false);
  const [ageVerified, setAgeVerified] = useState(false);
  const [pendingDisclosureConfirm, setPendingDisclosureConfirm] = useState<string | null>(null);
  const [pendingDisclosureCreate, setPendingDisclosureCreate] = useState<Record<string, unknown> | null>(null);
  const [showSafetyCheckin, setShowSafetyCheckin] = useState(false);
  const [safetyCheckins, setSafetyCheckins] = useState<any[]>([]);
  const [safetyProfile, setSafetyProfile] = useState<any>(null);
  const [showPromptBank, setShowPromptBank] = useState(false);
  const [promptBankData, setPromptBankData] = useState<any[]>([]);
  const [promptResponses, setPromptResponses] = useState<any[]>([]);
  const [showReferral, setShowReferral] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);

  useEffect(() => {
    try {
      const c = safeGetItem("muse_open_count");
      const count = c ? parseInt(c) + 1 : 1;
      safeSetItem("muse_open_count", String(count));
    } catch {}
  }, []);

  useEffect(() => {
    if (!showPremiumPopup) return;
    const t = setTimeout(() => setShowPremiumPopup(false), 5000);
    return () => clearTimeout(t);
  }, [showPremiumPopup]);

  const [viewProfile, setViewProfile] = useState<any>(null);
  const [hamburgerScreen, setHamburgerScreen] = useState<string>("");
  const [showStories, setShowStories] = useState(false);
  const [unmatchTarget, setUnmatchTarget] = useState<string|null>(null);
  const [chatImages, setChatImages] = useState<Record<number,string[]>>({});
  const [typingTarget, setTypingTarget] = useState<number|null>(null);
  const [hydrated, setHydrated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadStateRef = useRef(false);
  const sessionAppliedRef = useRef(false);
  const shuffleSeed = useRef(Math.floor(Math.random() * 100000));
  const matchSwipeRef = useRef<{id:string;startX:number;el:HTMLElement|null}>({id:"",startX:0,el:null});
  const [matchSwiping, setMatchSwiping] = useState<{id:string;offset:number} | null>(null);
  const dragRef = useRef<{startX:number;startY:number;active:boolean;relY:number;startTime:number;el:HTMLElement|null;axis:"x"|"y"|null}>({startX:0,startY:0,active:false,relY:0,startTime:0,el:null,axis:null});
  const likeLabelRef = useRef<HTMLDivElement>(null);
  const nopeLabelRef = useRef<HTMLDivElement>(null);
  const superLabelRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const dragValuesRef = useRef({x:0,y:0,opacity:0});

  const handleImgError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const el = e.currentTarget;
    if (el.dataset.fallback) return;
    el.dataset.fallback = "1";
    el.style.background = "linear-gradient(135deg, #FF6B9D 0%, #C86BFF 50%, #FFB366 100%)";
    el.style.display = "flex";
    el.style.alignItems = "center";
    el.style.justifyContent = "center";
    el.style.color = "#fff";
    el.style.fontSize = "2em";
    el.alt = el.alt?.charAt(0) || "👤";
    el.removeAttribute("src");
  }, []);

  useEffect(() => {
    const onImgError = (e: Event) => {
      const img = e.target as HTMLImageElement;
      if (img.tagName !== "IMG" || img.dataset.fallback) return;
      img.dataset.fallback = "1";
      img.style.background = "linear-gradient(135deg, #FF6B9D 0%, #C86BFF 50%, #FFB366 100%)";
      img.style.display = "flex";
      img.style.alignItems = "center";
      img.style.justifyContent = "center";
      img.style.color = "#fff";
      img.style.fontSize = "2em";
      img.alt = img.alt?.charAt(0) || "👤";
      img.removeAttribute("src");
    };
    document.addEventListener("error", onImgError, true);
    return () => document.removeEventListener("error", onImgError, true);
  }, []);

  // Attaches the verified session token (from localStorage) to /api/muse
  // POST calls so the server can authenticate writes. Falls back to a plain
  // fetch for GET/other endpoints and for /api/muse/auth (which manages its own auth).
  const apiFetch = useCallback(async (url: string, opts: RequestInit = {}) => {
    try {
      const raw = safeGetItem("muse_user");
      const token = raw ? (JSON.parse(raw).access_token || "") : "";
      if (token) {
        opts.headers = { ...(opts.headers || {}), "Authorization": `Bearer ${token}` };
      }
    } catch {}
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res;
  }, []);

  // Pulls real data from the API on mount; silently keeps the static demo
  // arrays when the table is empty or the request fails (graceful fallback).
  const bootstrapData = useCallback(async () => {
    try {
      const [matchData, briefs, feed, forum, events] = await Promise.all([
        apiFetch("/api/muse/match?limit=50").then(r => r.ok ? r.json() : null).catch(() => null),
        apiFetch("/api/muse?type=briefs").then(r => r.ok ? r.json() : null).catch(() => null),
        apiFetch("/api/muse?type=feed").then(r => r.ok ? r.json() : null).catch(() => null),
        apiFetch("/api/muse?type=forum").then(r => r.ok ? r.json() : null).catch(() => null),
        apiFetch("/api/muse?type=events").then(r => r.ok ? r.json() : null).catch(() => null),
      ]);
      if (matchData?.profiles?.length) setLiveProfiles(matchData.profiles.map((p: any) => ({
        id: p.id, name: p.name || "Creative", img: p.avatar || "", type: p.type || "artist",
        bio: p.bio || "", loc: p.loc || "Unknown", styles: Array.isArray(p.styles) ? p.styles : [],
        score: p.matchScore || 70, nsfw: !!p.show_nsfw, looking: Array.isArray(p.looking) ? p.looking : [],
        zodiac: p.zodiac || "", chinese: p.chinese || "", mbti: p.mbti || "", lifePath: p.life_path || "",
        photos: Array.isArray(p.photos) ? p.photos : [], collabs: p.collabs || 0, verified: !!p.verified,
        matchScore: p.matchScore, rulesScore: p.rulesScore, cosineScore: p.cosineScore,
      })));
      if (briefs?.briefs?.length) setLiveBriefs(briefs.briefs);
      if (feed?.posts?.length) {
        setLiveFeed(feed.posts);
        setFeedPosts(feed.posts.map((p: any, i: number) => ({
          id: 100000 + i, author: p.author_id?.name || "Creative", avatar: p.author_id?.avatar || "",
          type: p.img ? "photo" : "text", text: p.text || "", likes: p.likes || 0, comments: p.comments || 0,
          shares: p.shares || 0, time: p.created_at ? new Date(p.created_at).toLocaleString() : "Just now",
          img: p.img || "", liked: false, saved: false
        })));
      }
      if (forum?.posts?.length) {
        setLiveForum(forum.posts);
        setForumPosts(forum.posts.map((p: any, i: number) => ({
          id: 100000 + i, title: p.title || "", body: p.body || "", author: p.author_id?.name || "Creative",
          avatar: p.author_id?.avatar || "", votes: p.votes || 0, comments: Array.isArray(p.comments) ? p.comments : [],
          cat: p.cat || "General", time: p.created_at ? new Date(p.created_at).toLocaleString() : "Just now", pinned: false
        })));
      }
      if (events?.events?.length) setLiveEvents(events.events);
    } catch {}
    setBootstrapped(true);
  }, [apiFetch]);

  // ─── PERSISTENCE ───
  const STORAGE_KEY = "muse_v1";
  const saveState = useCallback(() => {
    try {
      const MAX_ITEMS = 50;
      const data = {
        currentUser, obData, obStep, matches: matches.slice(-MAX_ITEMS), dailyLikes, superLikes,
        savedBriefs, appliedBriefs, userBriefs: userBriefs.slice(-MAX_ITEMS), blockedUsers, notifPrefs,
        obConnectedSocials, showNsfw, rsvpdEvents, forumPosts: forumPosts.slice(-MAX_ITEMS), feedPosts: feedPosts.slice(-MAX_ITEMS),
        testLevels, obSelects, obProfilePic, obPortfolioItems, likedBy: likedBy.slice(-MAX_ITEMS),
        profileViews, profileViewers: profileViewers.slice(-20), stories: stories.slice(-20), theme, activityFeed: activityFeed.slice(-MAX_ITEMS),
        discoveryPrefs, chatImages: Object.fromEntries(Object.entries(chatImages).slice(-20).map(([k,v]) => [k, v.slice(-20)])), screen, filterStyles, filterScore,
        searchQuery, connTab, museCat, connFilter, authUser, chatTarget
      };
      safeSetItem(STORAGE_KEY, JSON.stringify(data));
      try { apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "sync", matches, feedPosts, forumPosts, userBriefs }) }); } catch {}
    } catch(e) {}
  }, [currentUser,obData,obStep,matches,dailyLikes,superLikes,savedBriefs,appliedBriefs,userBriefs,blockedUsers,notifPrefs,obConnectedSocials,showNsfw,rsvpdEvents,forumPosts,feedPosts,testLevels,obSelects,obProfilePic,obPortfolioItems,likedBy,profileViews,profileViewers,stories,theme,activityFeed,discoveryPrefs,chatImages,screen,filterStyles,filterScore,searchQuery,connTab,museCat,connFilter,authUser,chatTarget]);

  const loadState = useCallback(() => {
    try {
      const raw = safeGetItem(STORAGE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.currentUser) setCurrentUser(prev => ({ ...prev, ...d.currentUser, stats: { ...prev.stats, ...(d.currentUser.stats || {}) }, portfolios: Array.isArray(d.currentUser.portfolios) ? d.currentUser.portfolios : (prev.portfolios || []) }));
      if (d.obData) setObData(d.obData);
      if (d.obStep) setObStep(d.obStep);
      if (d.matches) setMatches(d.matches);
      if (!d.matches || d.matches.length === 0) {
        const demoMatches = PROFILES.slice(0, 6).map((p: any) => ({
          id: p.id, name: p.name, img: p.img, type: p.type,
          bio: p.bio, location: p.loc, booked: false, online: Math.random() > 0.5,
          messages: []
        }));
        setMatches(demoMatches);
      }
      if (d.dailyLikes!=null) setDailyLikes(d.dailyLikes);
      if (d.superLikes!=null) setSuperLikes(d.superLikes);
      if (d.savedBriefs) setSavedBriefs(d.savedBriefs);
      if (d.appliedBriefs) setAppliedBriefs(d.appliedBriefs);
      if (d.userBriefs) setUserBriefs(d.userBriefs);
      if (d.blockedUsers) setBlockedUsers(d.blockedUsers);
      if (d.notifPrefs) setNotifPrefs(d.notifPrefs);
      if (d.obConnectedSocials) setObConnectedSocials(d.obConnectedSocials);
      if (d.showNsfw!=null) setShowNsfw(d.showNsfw);
      if (d.rsvpdEvents) setRsvpdEvents(d.rsvpdEvents);
      if (d.forumPosts) setForumPosts(d.forumPosts);
      if (d.feedPosts) setFeedPosts(d.feedPosts);
      if (d.testLevels) setTestLevels(d.testLevels);
      if (d.obSelects) setObSelects(d.obSelects);
      if (d.obProfilePic) setObProfilePic(d.obProfilePic);
      if (d.obPortfolioItems) setObPortfolioItems(d.obPortfolioItems);
      if (d.likedBy) setLikedBy(d.likedBy);
      if (d.profileViews) setProfileViews(d.profileViews);
      if (d.profileViewers) setProfileViewers(d.profileViewers);
      if (d.stories && d.stories.length) setStories(d.stories);
      else setStories(DEMO_MOMENTS);
      if (d.theme) setTheme((["lasunset","deepspace","nebula","villa","deepsea"].includes(d.theme) ? d.theme : "lasunset"));
      if (d.activityFeed) setActivityFeed(d.activityFeed);
      if (d.discoveryPrefs) setDiscoveryPrefs(d.discoveryPrefs);
      if (d.chatImages) setChatImages(d.chatImages);
      if (d.chatTarget) setChatTarget(d.chatTarget);
      const VALID_SCREENS = ["onboard","discover","connections","matches","chat","briefs","community","sessions","network","portfolio","moments","profile","settings","subscription"];
      if (d.screen && VALID_SCREENS.includes(d.screen)) {
        // Chat requires a chatTarget to render (screen-el guards on chatTarget);
        // chatTarget is now persisted, but fallback to matches if somehow missing.
        setScreen(d.screen === "chat" && !d.chatTarget ? "matches" : d.screen);
      }
      if (d.authUser) setAuthUser(d.authUser);
      if (d.authUser && !VALID_SCREENS.includes(d.screen||"")) setScreen("discover");
    } catch(e) {}
    try { const b=safeGetItem("muse_boost"); if(b){const e=parseInt(b);if(e>Date.now()){setBoostActive(true);setBoostEnd(e);}else{safeRemoveItem("muse_boost");}} } catch(e) {}
  }, []);

  useEffect(() => { if(!boostActive||!boostEnd)return;const iv=setInterval(()=>{if(Date.now()>=boostEnd){setBoostActive(false);try{safeRemoveItem("muse_boost");}catch{}}},5000);return()=>clearInterval(iv); }, [boostActive,boostEnd]);

  const applySession = useCallback((accessToken: string, refreshToken?: string, attempt = 0) => {
    if (accessToken) {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken || "" }).catch(() => {});
    }
    authFetch("/api/muse/auth", { method: "POST", body: JSON.stringify({ action: "session", access_token: accessToken }) })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.user) {
          const userObj = { id: d.user.id, email: d.user.email, profile: d.profile };
          setAuthUser(userObj);
          safeSetItem("muse_user", JSON.stringify({ access_token: accessToken, refresh_token: refreshToken || "", user: userObj }));
          ensureMusePushRegistered();
            if (d.profile) {
              const isOwner = d.user.email === OWNER_EMAIL;
              const effTier = isOwner ? "muse_pro" : (d.profile.tier || "free");
              setCurrentUser(prev => ({ ...prev, name: d.profile.name || prev.name, avatar: d.profile.avatar || prev.avatar, type: d.profile.type || prev.type, foundingTier: isOwner ? "founding" : (d.profile.founding_tier || ""), proExpiresAt: isOwner ? "" : (d.profile.pro_expires_at || ""), tier: effTier }));
              if (effTier) setUserTier(effTier);
              if (d.profile.age_verified) setAgeVerified(true);
              setScreen(prev => (prev === "auth" || prev === "onboard") ? (d.profile.name && d.profile.type ? "discover" : "onboard") : prev);
            } else {
              setScreen(prev => (prev === "auth") ? "onboard" : prev);
            }
        } else {
          // Retry once before giving up — network hiccup, not invalid token
          if (attempt < 1) {
            setTimeout(() => { try { applySession(accessToken, refreshToken, attempt + 1); } catch {} }, 1000);
            return;
          }
          setAuthUser(null);
          setScreen(prev => (prev === "discover" || prev === "matches" || prev === "connections") ? prev : "auth");
        }
        // Session resolved — splash can hide regardless of outcome
        try { window.dispatchEvent(new CustomEvent("muse:ready")); } catch {        }
        // Session resolved — splash can hide regardless of outcome
        try { window.dispatchEvent(new CustomEvent("muse:ready")); } catch {}
      })
      .catch(() => {
        if (attempt < 1) {
          setTimeout(() => { try { applySession(accessToken, refreshToken, attempt + 1); } catch {} }, 1000);
        } else {
          try { window.dispatchEvent(new CustomEvent("muse:ready")); } catch {}
        }
      });
  }, []);

  useEffect(() => {
    if (loadStateRef.current) return;
    loadStateRef.current = true;
    try { sessionStorage.setItem("muse_loaded", "1"); } catch {}
    loadState();
    setHydrated(true);
    try { window.dispatchEvent(new CustomEvent("muse:hydrated")); } catch {}

    // Capture geolocation for distance matching (best-effort, silent on denial).
    getGeolocation().then(g => { if (g) { setMyGeo(g); try { safeSetItem("muse_geo", JSON.stringify(g)); } catch {} } })
      .catch(() => { /* silently handled */ });

    // Handle post-checkout return: refresh tier from server
    const params = new URLSearchParams(window.location.search);
    const upgraded = params.get("upgraded");
    if (upgraded) showToast("Welcome to Muse " + (upgraded.charAt(0).toUpperCase() + upgraded.slice(1)) + "! ✨");

    // Handle Stripe Connect onboarding return
    const connected = params.get("connected");
    if (connected === "true") showToast("Stripe account connected! You can now receive payments. 💰");

    // Handle referral code from URL
    const refCode = params.get("ref");
    if (refCode) {
      setObData(prev => ({ ...prev, referralCode: refCode.toUpperCase() }));
      safeSetItem("muse_referral_code", refCode.toUpperCase());
    } else {
      // Load stored referral code from localStorage
      try {
        const stored = safeGetItem("muse_referral_code");
        if (stored) setObData(prev => ({ ...prev, referralCode: stored }));
      } catch {}
    }

    // Handle OAuth redirect: Supabase returns tokens in URL hash or via getSession
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          if (!sessionAppliedRef.current) { sessionAppliedRef.current = true; applySession(session.access_token, session.refresh_token); }
          // Clean OAuth params from URL
          if (window.location.hash.includes("access_token") || window.location.search.includes("code=")) {
            window.history.replaceState({}, document.title, "/muse");
          }
          return;
        }
      } catch {}

      const savedUser = safeGetItem("muse_user");
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed?.access_token && !sessionAppliedRef.current) { sessionAppliedRef.current = true; applySession(parsed.access_token, parsed.refresh_token); }
        } catch(e) {}
      } else {
        // No session and no saved user — new visitor, show auth after brief splash
        setTimeout(() => { try { window.dispatchEvent(new CustomEvent("muse:ready")); } catch {} }, 1500);
      }
    })();

    // Pull real catalog data (profiles/briefs/feed/forum/events) with static fallback.
    bootstrapData();

    // Listen for auth state changes (OAuth completion)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.access_token) {
        if (sessionAppliedRef.current) return;
        sessionAppliedRef.current = true;
        applySession(session.access_token, session.refresh_token);
      }
    });
    return () => { authListener?.subscription?.unsubscribe(); };
  }, []);
  useEffect(() => { const t = setTimeout(saveState, 2000); return () => clearTimeout(t); }, [saveState]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { const raw = safeGetItem("muse_v1"); const d = raw ? JSON.parse(raw) : {}; d.theme = theme; safeSetItem("muse_v1", JSON.stringify(d)); } catch {}
  }, [theme]);

  const showToast = useCallback((msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 3000); }, []);

  // Surface storage quota failures to the user instead of failing silently.
  useEffect(() => {
    const onQuota = () => showToast(QUOTA_MSG);
    window.addEventListener("muse:storage-quota", onQuota);
    return () => window.removeEventListener("muse:storage-quota", onQuota);
  }, [showToast]);

  const doLogout = useCallback(async () => {
    try { await authFetch("/api/muse/auth", { method: "POST", body: JSON.stringify({ action: "logout" }) }); } catch(e) {}
    const keys = ["muse_user","muse_state","muse_v1","muse_geo","muse_boost","muse_last_reset","muse_local","muse_premium","muse_referral_code","muse_open_count","muse_hide_premium"];
    keys.forEach(k => { try { safeRemoveItem(k); } catch {} });
    setAuthUser(null); setCurrentUser(prev => ({ ...prev, name:"", email:"", avatar:"", type:"", tier:"free" })); setScreen("auth"); showToast("Logged out");
  }, [showToast]);

  const doLogoutFull = useCallback(async () => {
    await doLogout(); setHamburgerScreen(""); setShowHamburger(false);
  }, [doLogout]);

  const uploadImage = useCallback(async (file: File, folder: string): Promise<string | null> => {
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);
      const r = await authFetch("/api/muse/upload", { method: "POST", body: fd });
      const j = await r.json();
      if (j.success && j.url) return j.url;
      showToast("Upload failed: " + (j.error || "Unknown"));
      return null;
    } catch { trackError("upload_image_failed", { folder }); showToast("Upload failed"); return null; }
  }, [showToast]);

  const ICEBREAKERS: Record<string, string[]> = {
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
  const getIcebreaker = useCallback((type: string, seed?: string) => {
    const pool = ICEBREAKERS[type] || ICEBREAKERS.default;
    const hash = seed ? seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0) : 0;
    return pool[hash % pool.length];
  }, []);

  const getReferralTier = (c:number) => c>=50?{tier:"Platinum",discount:20}:c>=20?{tier:"Gold",discount:20}:c>=5?{tier:"Silver",discount:10}:c>=1?{tier:"Bronze",discount:0}:{tier:"None",discount:0};
  const trackEvent = (event: string, data?: Record<string, unknown>) => {
    try {
      authFetch("/api/muse", { method: "POST", body: JSON.stringify({ action: "track-event", name: event, props: data || {} }), keepalive: true }).catch(() => {});
    } catch {}
  };
  const checkProfileBadges = (stats:any, createdAt:number):{name:string;desc:string;icon:string;color:string}[] => {
    const b:{name:string;desc:string;icon:string;color:string}[] = [];
    if (createdAt && Date.now()-createdAt > 31536000000) b.push({name:"Full Moon",icon:"🌕",color:"#C0C0FF",desc:"1 year on Muse"});
    if (stats?.bookingsCompleted >= 50) b.push({name:"Golden Hour",icon:"☀️",color:"#FFD700",desc:"50+ shoots completed"});
    else if (stats?.bookingsCompleted >= 10) b.push({name:"Collab King",icon:"👑",color:"#FFD700",desc:"10+ bookings completed"});
    if (stats?.matchesReceived >= 100) b.push({name:"Rising Star",icon:"⭐",color:"#FFBF00",desc:"100+ matches"});
    if (stats?.messagesSent >= 500) b.push({name:"Social Butterfly",icon:"🦋",color:"#FF69B4",desc:"500+ messages"});
    return b;
  };

  const unreadNotificationCount = useMemo(() => activityFeed.filter(n => !n.read).length, [activityFeed]);

  const filteredProfiles = useMemo(() => {
    const base = liveProfiles?.length ? [...PROFILES, ...liveProfiles.filter((lp:any) => !PROFILES.some((dp:any) => String(dp.id) === String(lp.id)))] : PROFILES;
    let list = showNsfw ? base : base.filter(p => !p.nsfw);
    if (filterStyles.length > 0) list = list.filter(p => p.styles.some(s => filterStyles.includes(s)));
    if (filterScore > 50) list = list.filter(p => p.score >= filterScore);
    if (discoverSearch.trim()) {
      const q = discoverSearch.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.type?.toLowerCase().includes(q) || p.loc?.toLowerCase().includes(q) || p.styles?.some(s => s.toLowerCase().includes(q)));
    }
    // Sort by distance if geolocation is available (closest first),
    // but never discard profiles far away — this is a global creative network.
    const enriched = list.map(p => {
      const geo = CITY_GEO[p.loc];
      const distMi = myGeo && geo ? distanceMiles(myGeo, geo) : null;
      let boosted = geo ? { ...p, lat: geo.lat, lng: geo.long } : { ...p };
      if (distMi !== null) (boosted as any).distanceMi = distMi;
      if (boosted.badges?.length) {
        const badgeBoost = boosted.badges.reduce((acc: number, b: any) => {
          if (b.name === "Verified Pro") return acc + 5;
          if (b.name === "Top Creator" || b.name === "Creative Sage") return acc + 3;
          if (b.name === "Super Collab") return acc + 4;
          if (b.name === "Quick Responder" || b.name === "Match Magnet") return acc + 2;
          if (b.name === "Style Icon" || b.name === "Local Legend") return acc + 1;
          return acc;
        }, 0);
        boosted.score = Math.min(99, boosted.score + badgeBoost);
      }
      return boosted;
    });
    // Sort: if geo available, closest profiles first, then by distance
    if (myGeo) enriched.sort((a: any, b: any) => {
      const da = a.distanceMi ?? 99999;
      const db = b.distanceMi ?? 99999;
      return da - db;
    });
    // Shuffle: true Fisher-Yates so order is random on every refresh/load
    for (let i = enriched.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [enriched[i], enriched[j]] = [enriched[j], enriched[i]];
    }
    return enriched;
  }, [liveProfiles, showNsfw, filterStyles, filterScore, myGeo, discoveryPrefs.distance, discoverSearch]);

  useEffect(() => {
    const profile = filteredProfiles[currentIdx];
    if (!profile?.id) { setCardAlbums([]); setCardAlbumPhotos([]); return; }
    let cancelled = false;
    apiFetch(`/api/muse?type=albums&profile_id=${encodeURIComponent(profile.id)}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        const albums = d.albums || [];
        setCardAlbums(albums);
        if (albums.length > 0) setCardAlbumIdx(0);
      })
      .catch((err) => { trackError("fetch_albums", { err: String(err) }); });
    return () => { cancelled = true; };
  }, [currentIdx, filteredProfiles, apiFetch]);

  useEffect(() => {
    if (cardAlbumIdx === 0) { setCardAlbumPhotos([]); return; }
    const album = cardAlbums[cardAlbumIdx - 1];
    if (!album?.id) return;
    let cancelled = false;
    apiFetch(`/api/muse?type=album-photos&album_id=${encodeURIComponent(album.id)}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        setCardAlbumPhotos((d.photos || []).map((p: any) => p.img_url));
      })
      .catch((err) => { trackError("fetch_album_photos", { err: String(err) }); });
    return () => { cancelled = true; };
  }, [cardAlbumIdx, cardAlbums, apiFetch]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const lastReset = safeGetItem("muse_last_reset");
      const now = Date.now();
      if (!lastReset || now - parseInt(lastReset) > 86400000) {
        setDailyLikes(10);
        setSuperLikes(3);
        safeSetItem("muse_last_reset", String(now));
      }
    }
  }, []);

  const flash = useCallback((color: string) => { setScreenFlash(color); setTimeout(() => setScreenFlash(null), 300); }, []);
  const showScreen = useCallback((s: typeof screen) => { setScreen(s); trackEvent("screen_view", { screen: s }); }, []);

  const matchActions = useMemo(() => ({
    setExpandedMatchId, setChatTarget, showScreen, setMatchSwiping,
    setReportTarget, setShowReport, setUnmatchTarget, handleImgError, getIcebreaker
  }), [setExpandedMatchId, setChatTarget, showScreen, setMatchSwiping, setReportTarget, setShowReport, setUnmatchTarget, handleImgError, getIcebreaker]);

  const navActive = useMemo(() => {
    const m: Record<string, string> = { discover: "discover", connections: "connections", matches: "matches", chat: "matches", briefs: "briefs", moments: "moments", profile: "profile", settings: "profile", subscription: "profile", portfolio: "profile" };
    return m[screen as string] || "discover";
  }, [screen]);


  const openHamburger = useCallback(() => { setHamburgerScreen(""); setShowHamburger(true); }, []);

  const handleOAuth = useCallback(async (provider: "google" | "facebook") => {
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/muse`,
        },
      });
      if (error) { showToast(error.message); setAuthLoading(false); }
    } catch { showToast("OAuth failed"); setAuthLoading(false); }
  }, [showToast]);

  const handleAuthClick = useCallback(async () => {
    if (authLoading) return;
    const e: Record<string,string> = {};
    if (!authEmail.trim()) e.email = "Email required";
    if (!authPass.trim()) e.pass = "Password required";
    if (authMode === "signup") {
      if (authPass.length < 6) e.pass = "Minimum 6 characters";
      else if (!/[A-Z]/.test(authPass)) e.pass = "Needs a capital letter";
      else if (!/[!@#$%^&*]/.test(authPass)) e.pass = "Needs a symbol";
    }
    if (Object.keys(e).length) { setFormErrors(e); return; }
    setAuthLoading(true);
    try {
      const r = await fetch("/api/muse/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: authMode === "login" ? "login" : "register",
          email: authEmail.trim(),
          password: authPass,
          name: authName || authEmail.split("@")[0],
        }),
      });
      const j = await r.json();
      if (!r.ok) { setFormErrors({ email: j.error || "Auth failed" }); setAuthLoading(false); return; }
      // The login endpoint now returns the session token directly — use it.
      const accessToken = j.session?.access_token || "";
      const refreshToken = j.session?.refresh_token || "";
      const userObj = { id: j.user.id, email: j.user.email, profile: j.profile || null };
      setAuthUser(userObj);
      safeSetItem("muse_user", JSON.stringify({ access_token: accessToken, refresh_token: refreshToken, user: userObj }));
      // Attach session to browser supabase client so realtime works under RLS.
      if (accessToken) {
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).catch(() => {});
      }
      if (j.profile) {
        setCurrentUser(prev => ({ ...prev, name: j.profile.name || prev.name, avatar: j.profile.avatar || prev.avatar, type: j.profile.type || prev.type }));
      }
      setScreen(authMode === "signup" ? "onboard" : "discover");
      if (authMode === "signup") setObStep(0);
      trackEvent(authMode === "signup" ? "muse_signup" : "muse_login", { email: authEmail?.slice(0,3) + "***" });
      flash("#FFD700");
    } catch { showToast("Upload failed"); setAuthLoading(false); }
    setAuthLoading(false);
  }, [authMode, authEmail, authPass, authName, authLoading, flash]);

  const swipeLocked = useRef(false);
  const [showIntentPicker, setShowIntentPicker] = useState(false);
  const [intentProfile, setIntentProfile] = useState<Profile|null>(null);
  const [userDefaultIntent, setUserDefaultIntent] = useState<string>("");
  const [showNoteTooltip, setShowNoteTooltip] = useState(() => !safeGetItem("muse_note_seen"));

  const isUnlimited = authUser?.email === OWNER_EMAIL;

  const doSwipe = useCallback((dir: "left" | "right" | "super") => {
    if (swipeLocked.current) return;
    swipeLocked.current = true;
    setTimeout(() => { swipeLocked.current = false; }, 500);
    setSwipeDir(dir === "left" ? "left" : "right");
    setTimeout(() => setSwipeDir(null), 800);
    if (!isUnlimited && dailyLikes <= 0 && dir !== "super") { showToast("No likes left today!"); return; }
    const p = filteredProfiles[currentIdx];
    if (!p) return;
    if (!isUnlimited && dir === "super" && superLikes <= 0) { showToast("No super likes left!"); return; }
    trackEvent("swipe", { direction: dir, target_type: p.type });
    if (dir === "right" || dir === "super") {
      if (!userDefaultIntent) { setIntentProfile(p); setShowIntentPicker(true); swipeLocked.current = false; return; }
      const intent = dir === "super" ? "super" : userDefaultIntent;
      const matchScore = (p as any).matchScore ?? calcMatch({ styles: obData.styles || [], looking: obData.looking || [], zodiac: obData.zodiac, chinese: obData.chinese, mbti: obData.mbti, lifePath: obData.lifePath }, p);
        const isMatch = matchScore > 55 || Math.random() < 0.3;
      if (isMatch) {
        const newMatch: Match = { ...p, messages: [] };
        setMatches(prev => [...prev, newMatch]);
        setMatchStreak(prev => prev + 1);
        // Delay match overlay so swipe animation completes first
        setTimeout(() => {
          setShowMatchOverlay(newMatch);
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 1500);
          setExpandedMatchId(String(newMatch.id));
          trackEvent("muse_match", { name: p.name, type: p.type });
          setActivityFeed(prev => [{id:uid(),type:"match",from:p.name,avatar:p.img,text:"You matched with "+p.name+"!",time:"Just now",read:false},...prev]);
          flash("#FFD700");
        }, 450);
        apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "match", target_id: p.id, intent }) }).catch(() => { /* silently handled */ });
      }
      if (Math.random() > 0.4 && !likedBy.find(l => l.id === p.id)) {
        setLikedBy(prev => [...prev, p]);
        setActivityFeed(prev => [{id:uid(),type:"like",from:p.name,avatar:p.img,text:p.name+" liked your profile!",time:"Just now",read:false},...prev]);
      }
      if (dir === "super") { if (!isUnlimited) { setSuperLikes(prev => Math.max(0, prev - 1)); } setCurrentUser(prev => ({ ...prev, stats: { ...prev.stats, superLikes: prev.stats.superLikes + 1 } })); flash("#D4A5FF"); }
      else { if (!isUnlimited) { setDailyLikes(prev => Math.max(0, prev - 1)); } }
      setCurrentUser(prev => ({ ...prev, stats: { ...prev.stats, likes: prev.stats.likes + 1 } }));
    } else {
      if (!isUnlimited) { setDailyLikes(prev => Math.max(0, prev - 1)); }
      setCurrentUser(prev => ({ ...prev, stats: { ...prev.stats, passes: prev.stats.passes + 1 } }));
    }
    setRewindStack(prev => [...prev, currentIdx]);
    setCurrentIdx(prev => prev + 1);
    setCurrentPhotoIdx(0);
    setPortfolioPhotoIdx(0);
    setPromptIdx(0);
    setCardScrolled(false);
  }, [currentIdx, dailyLikes, superLikes, filteredProfiles, isUnlimited, calcMatch, likedBy, flash, obData, userDefaultIntent]);

  useEffect(() => { if(screen!=="discover")return;const onKey=(e:KeyboardEvent)=>{if(e.key==="ArrowLeft"){e.preventDefault();doSwipe("left")}if(e.key==="ArrowRight"){e.preventDefault();doSwipe("right")}};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey)},[screen,doSwipe]);

  // Pause ambient animations when tab hidden (battery/thermal/cpu savings)
  useEffect(() => {
    const onVis = () => { document.body.classList.toggle("animations-paused", document.hidden); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const doRewind = useCallback(() => {
    if (rewindStack.length === 0) { showToast("Nothing to rewind!"); return; }
    const prev = rewindStack[rewindStack.length - 1];
    setRewindStack(stack => stack.slice(0, -1));
    setCurrentIdx(prev);
    setCurrentPhotoIdx(0);
    setPortfolioPhotoIdx(0);
    setPromptIdx(0);
    setCardScrolled(false);
    flash("#D4A5FF");
  }, [rewindStack, flash]);

  const doLikeWithNote = useCallback(() => {
    setShowNoteTooltip(false); safeSetItem("muse_note_seen","1");
    const p = filteredProfiles[currentIdx];
    if (!p || (!isUnlimited && dailyLikes <= 0)) { showToast("No likes left today!"); return; }
    setNoteTargetProfile(p);
    setLikeNoteText("");
    setShowLikeNote(true);
  }, [currentIdx, dailyLikes, filteredProfiles, isUnlimited]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest && target.closest('.card-info-scroll')) {
      const scroller = target.closest('.card-info-scroll') as HTMLElement;
      if (scroller && scroller.scrollTop > 5) return;
    }
    if (target.closest && (target.closest('.card-action-btn') || target.closest('.card-portfolio-btn') || target.closest('.card-photo-thumb') || target.closest('.card-photo-zone') || target.closest('button') || target.closest('a'))) return;
    const card = e.currentTarget as HTMLElement;
    const cardTop = card.getBoundingClientRect().top;
    const cardHeight = card.getBoundingClientRect().height;
    // Only bottom half of card scrolls — top half is swipe zone
    const relY = e.clientY - cardTop;
    dragRef.current = { startX: e.clientX, startY: e.clientY, active: true, relY, startTime: Date.now(), el: card, axis: null };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
      if (dragRef.current.axis === null) {
      if (absDx < 5 && absDy < 5) return;
      dragRef.current.axis = absDx > absDy ? "x" : "y";
    }
    dragValuesRef.current = { x: 0, y: 0, opacity: 0 };
    if (dragRef.current.axis === "x") {
      if (absDx > 5) {
        dragValuesRef.current.x = dx;
        dragValuesRef.current.opacity = Math.min(absDx / 100, 1);
      }
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const el = dragRef.current.el;
      if (!el) return;
      const v = dragValuesRef.current;
      const rot = dragRef.current.axis === "x" ? v.x * 0.06 : 0;
      el.style.transition = "none";
      el.style.transform = `translate(${v.x}px, ${v.y}px) rotate(${rot}deg)`;
      if (likeLabelRef.current) likeLabelRef.current.style.opacity = (dragRef.current.axis === "x" && v.x > 25) ? String(v.opacity) : "0";
      if (nopeLabelRef.current) nopeLabelRef.current.style.opacity = (dragRef.current.axis === "x" && v.x < -25) ? String(v.opacity) : "0";
    });
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const dt = Date.now() - dragRef.current.startTime;
    const speed = Math.sqrt(dx * dx + dy * dy) / (dt || 1);
    if (dragRef.current.axis === "x" && (Math.abs(dx) > 100 || (speed > 0.35 && Math.abs(dx) > 35))) {
      doSwipe(dx > 0 ? "right" : "left");
    }
    const el = dragRef.current.el;
    if (el) {
      el.style.transition = "transform .4s cubic-bezier(.4,0,.2,1)";
      el.style.transform = "";
    }
    if (likeLabelRef.current) likeLabelRef.current.style.opacity = "0";
    if (nopeLabelRef.current) nopeLabelRef.current.style.opacity = "0";
    if (superLabelRef.current) superLabelRef.current.style.opacity = "0";
  }, [doSwipe]);

  const onPointerCancel = useCallback(() => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    const el = dragRef.current.el;
    if (el) {
      el.style.transition = "transform .4s cubic-bezier(.4,0,.2,1)";
      el.style.transform = "";
    }
    if (likeLabelRef.current) likeLabelRef.current.style.opacity = "0";
    if (nopeLabelRef.current) nopeLabelRef.current.style.opacity = "0";
    if (superLabelRef.current) superLabelRef.current.style.opacity = "0";
  }, []);

  const openGallery = useCallback((profile: Profile) => {
    const photos = ((profile as any).photos?.length ? (profile as any).photos : [profile.img]) as string[];
    setGalleryView({ profileId: profile.id, name: profile.name, photos, idx: 0 });
  }, []);

  const openChat = useCallback((match: Match) => { setChatTarget(match); setScreen("chat"); }, []);

  const sanitizeInput = (text: string) => text.replace(/[<>]/g, '').slice(0, 500);
  const toggleSocial = (key: string) => { setObConnectedSocials(prev => { const nv = !prev[key]; showToast(nv ? "Connected!" : "Disconnected"); return {...prev, [key]: nv}; }); };

  const sendMsg = useCallback(async (overrideText?: string) => {
    const inputText = overrideText !== undefined ? overrideText : chatInput;
    if (!inputText.trim() || !chatTarget) return;
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const clean = sanitizeInput(inputText.trim());
    if (!clean) return;

    // ═══ DISCLOSURE TRIGGER ═══
    // Intercept messages containing payment + NSFW keywords → show disclosure form
    const lower = clean.toLowerCase();
    const hasPayment = /\$[\d]+|\bpay\b|\bcompensation\b|\brate\b|\bbudget\b|\bfee\b|\bcharged?\b/i.test(lower);
    const hasNsfw = /\bnude\b|\bnudity\b|\bnsfw\b|\bnsf[ww]\b|\bexplicit\b|\bboudoir\b|\bpenetrat\b|\bsexual\b|\berotic\b|\btopless\b|\bundressed\b|\bintimate\b|\bsensual\b|\badult\b/i.test(lower);
    if (hasPayment && hasNsfw) {
      setDisclosureTarget({ id: String(chatTarget.id), name: chatTarget.name || "Unknown" });
      setShowDisclosureModal(true);
      return; // Don't send the raw message — disclosure replaces it
    }

    const userMsg = { from: "me", text: clean, time: now };
    const targetId = String(chatTarget.id);
    setChatTarget(prev => prev ? { ...prev, messages: [...prev.messages, userMsg] } : prev);
    setMatches(prev => prev.map(m => String(m.id) === targetId ? { ...m, messages: [...m.messages, userMsg] } : m));
    setChatInput("");
    setTimeout(() => messagesEndRef.current?.scrollIntoView({behavior:"smooth"}), 50);
    const myId = authUser?.profile?.id || authUser?.id || "local";
    await persistMessage({ myId, theirId: targetId, text: clean });
    trackEvent("message_sent", { has_match: true });
    // Show typing + simulated reply only when no real remote partner is present.
    setTypingTarget(Number(chatTarget.id));
    setTimeout(() => {
      setTypingTarget(null);
      const replies = ["That resonates with me ✨","I'd love to collaborate on that","Let's make it happen, when are you free?","This is exactly what I've been wanting","The energy is right, let's create","Real connections make the best art","You get it. Most people don't.","I've been thinking about this for months","Say less, I'm already visualizing it","This is the spark. Let's not waste it."];
      const reply = { from: "them" as const, text: replies[~~(Math.random() * replies.length)], time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
      setChatTarget(prev => prev ? { ...prev, messages: [...prev.messages, reply] } : prev);
      setMatches(prev => prev.map(m => String(m.id) === targetId ? { ...m, messages: [...m.messages, reply] } : m));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({behavior:"smooth"}), 50);
    }, 1200 + Math.random() * 2000);
  }, [chatInput, chatTarget, authUser]);

  // Real-time incoming messages for the active conversation.
  useEffect(() => {
    if (!chatTarget || !authUser?.profile?.id) return;
    const myId = authUser.profile.id;
    const theirId = String(chatTarget.id);
    const unsub = subscribeToConversation({
      myId,
      theirId,
      onMessage: (senderId, text) => {
        const msg = { from: "them" as const, text, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
        setChatTarget(prev => prev ? { ...prev, messages: [...prev.messages, msg] } : prev);
        setMatches(prev => prev.map(m => String(m.id) === theirId ? { ...m, messages: [...m.messages, msg] } : m));
        setTimeout(() => messagesEndRef.current?.scrollIntoView({behavior:"smooth"}), 50);
      },
    });
    return unsub;
  }, [chatTarget?.id, authUser?.id]);

  // ═══ SAFETY: fetch check-ins and safety profile on mount ═══
  useEffect(() => {
    if (!authUser?.profile?.id) return;
    authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "get-checkins" }) })
      .then(r => r.json()).then(d => { if (d.checkins) setSafetyCheckins(d.checkins); }).catch(() => {});
    authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "get-safety-profile" }) })
      .then(r => r.json()).then(d => { if (d.safety) setSafetyProfile(d.safety); }).catch(() => {});
  }, [authUser?.profile?.id]);

  // ═══ PROMPTS: fetch prompt bank and user responses ═══
  useEffect(() => {
    if (!authUser?.profile?.id) return;
    authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "get-prompts" }) })
      .then(r => r.json()).then(d => { if (d.prompts) setPromptBankData(d.prompts); }).catch(() => {});
    authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "get-prompt-responses" }) })
      .then(r => r.json()).then(d => { if (d.responses) setPromptResponses(d.responses); }).catch(() => {});
  }, [authUser?.profile?.id]);

  // ═══ DISCOVER: fetch real profiles from API ═══
  useEffect(() => {
    if (!authUser?.profile?.id) return;
    let cancelled = false;
    authFetch("/api/muse?type=profiles")
      .then(r => r.json())
      .then(d => { if (!cancelled && d.profiles) setLiveProfiles(d.profiles); })
      .catch((err) => { trackError("fetch_profiles", { err: String(err) }); });
    return () => { cancelled = true; };
  }, [authUser?.profile?.id]);

  // ═══ FEED: fetch real feed posts from API ═══
  useEffect(() => {
    if (!authUser?.profile?.id) return;
    let cancelled = false;
    authFetch("/api/muse?type=feed")
      .then(r => r.json())
      .then(d => { if (!cancelled && d.posts) setLiveFeed(d.posts); })
      .catch((err) => { trackError("fetch_feed", { err: String(err) }); });
    return () => { cancelled = true; };
  }, [authUser?.profile?.id]);

  // ═══ BRIEFS: fetch real briefs from API ═══
  useEffect(() => {
    if (!authUser?.profile?.id) return;
    let cancelled = false;
    authFetch("/api/muse?type=briefs")
      .then(r => r.json())
      .then(d => { if (!cancelled && d.briefs) setLiveBriefs(d.briefs); })
      .catch((err) => { trackError("fetch_briefs", { err: String(err) }); });
    return () => { cancelled = true; };
  }, [authUser?.profile?.id]);

  // ═══ FORUM: fetch real forum posts from API ═══
  useEffect(() => {
    if (!authUser?.profile?.id) return;
    let cancelled = false;
    authFetch("/api/muse?type=forum")
      .then(r => r.json())
      .then(d => { if (!cancelled && d.posts) setLiveForum(d.posts); })
      .catch((err) => { trackError("fetch_forum", { err: String(err) }); });
    return () => { cancelled = true; };
  }, [authUser?.profile?.id]);

  // ═══ EVENTS: fetch real events from API ═══
  useEffect(() => {
    if (!authUser?.profile?.id) return;
    let cancelled = false;
    authFetch("/api/muse?type=events")
      .then(r => r.json())
      .then(d => { if (!cancelled && d.events) setLiveEvents(d.events); })
      .catch((err) => { trackError("fetch_events", { err: String(err) }); });
    return () => { cancelled = true; };
  }, [authUser?.profile?.id]);

  // ═══ COMMUNITIES: fetch real communities from API ═══
  useEffect(() => {
    if (!authUser?.profile?.id) return;
    let cancelled = false;
    authFetch("/api/muse?type=communities")
      .then(r => r.json())
      .then(d => { if (!cancelled && d.communities) setLiveCommunities(d.communities); })
      .catch((err) => { trackError("fetch_communities", { err: String(err) }); });
    return () => { cancelled = true; };
  }, [authUser?.profile?.id]);

  // ═══ SESSIONS: fetch real sessions from API ═══
  useEffect(() => {
    if (!authUser?.profile?.id) return;
    let cancelled = false;
    authFetch("/api/muse?type=sessions")
      .then(r => r.json())
      .then(d => { if (!cancelled && d.sessions) setLiveSessions(d.sessions); })
      .catch((err) => { trackError("fetch_sessions", { err: String(err) }); });
    return () => { cancelled = true; };
  }, [authUser?.profile?.id]);

  const saveProfileEdits = useCallback(async () => {
    setCurrentUser(prev => ({ ...prev, name: editName || prev.name, avatar: editAvatar || prev.avatar }));
    setObData(prev => ({ ...prev, bio: editBio, loc: editLoc }));
    const geo = await getGeolocation();
    setShowEditProfile(false);
    try {
      await authFetch("/api/muse/auth", {
        method: "POST",
        body: JSON.stringify({
          action: "update-profile",
          name: editName,
          bio: editBio,
          loc: editLoc,
          avatar: editAvatar,
          ...(geo ? { lat: geo.lat, long: geo.long, city: geo.city } : {}),
        }),
      });
    } catch {}
    showToast("Saved!");
  }, [editName, editBio, editLoc, editAvatar, showToast]);

  const toggleObSelect = (key: string, val: string | number) => {
    setObData(prev => ({ ...prev, [key]: val }));
    setObSelects(prev => {
      const existing = prev.findIndex(s => s.startsWith(key+"-"));
      const entry = key+"-"+val;
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = entry;
        return updated;
      }
      return [...prev, entry];
    });
  };
  const toggleObArray = (key: string, val: string) => {
    setObData(prev => {
      const arr = (prev[key as keyof typeof prev] as string[] | undefined) || [];
      const i = arr.indexOf(val);
      return { ...prev, [key]: i >= 0 ? arr.filter((_, idx) => idx !== i) : [...arr, val] };
    });
  };

  const stats = { matches: matches.length, likes: currentUser.stats.likes, superLikes: currentUser.stats.superLikes, passes: currentUser.stats.passes, rate: currentUser.stats.likes ? Math.round(matches.length / currentUser.stats.likes * 100) : 0 };

  return !hydrated ? (
    <div style={{"display":"contents"}}>
      <div className="scene"><div className="scene-wash" /><div className="scene-glow" /><div className="splash-sun" /><div className="splash-sun-glow" /></div>
      <div className="app" data-theme={theme}>
        <div className="skeleton-container">
          {[1,2,3].map(i => (
            <div key={i} className="skeleton-block">
              <div className="skeleton-pulse" style={{width:"76px",height:"76px",borderRadius:"50%"}} />
              <div className="skeleton-pulse" style={{width:"60%",height:"16px",marginTop:12}} />
              <div className="skeleton-pulse" style={{width:"40%",height:"12px",marginTop:8}} />
            </div>
          ))}
            </div>
            <div className="hamburger-waves">
              <div className="wave wave-1" /><div className="wave wave-2" /><div className="wave wave-3" /><div className="wave wave-4" /><div className="wave wave-5" /><div className="wave wave-6" /><div className="wave wave-7" /><div className="wave wave-8" />
            </div>
          </div>
    </div>
  ) : (
    <div style={{"display":"contents"}}>
      <a href="#muse-main" className="sr-only" style={{zIndex:99999}} onFocus={(e)=>{e.currentTarget.style.cssText="position:fixed;top:0;left:0;padding:8px 16px;background:var(--gold);color:#0a0612;fontWeight:700;borderRadius:0 0 8px 0;width:auto;height:auto;clip:auto;overflow:visible;margin:0"}} onBlur={(e)=>{e.currentTarget.removeAttribute("style")}}>Skip to main content</a>
      <CardPreloader currentIdx={currentIdx} profiles={filteredProfiles} />
      <Confetti active={showConfetti} />
      {swipeDir && <SwipeParticles active dir={swipeDir} />}
      <BackgroundScene flash={screenFlash} />
      {showMatchOverlay && (
        <div
          className="match-overlay"
          role="dialog" aria-modal="true" aria-label="It's a Match!"
          onClick={() => setShowMatchOverlay(null)}
        >
          <button className="match-overlay-close" onClick={(e)=>{e.stopPropagation();setShowMatchOverlay(null)}} aria-label="Close match overlay"><FiX size={22} /></button>
          {Array.from({length:40}).map((_,i)=><div key={i} className="confetti-piece" style={{
            left:Math.random()*100+"%",
            width:(Math.random()*6+4)+"px",
            height:(Math.random()*8+6)+"px",
            background:["var(--gold)","var(--amber)","var(--pink)","var(--lavender)","var(--coral)","var(--mint)","#fff"][i%7],
            animationDuration:(Math.random()*2+2)+"s",
            animationDelay:Math.random()*1.5+"s",
            "--drift":(Math.random()*120-60)+"px",
            "--rot":(Math.random()*720)+"deg"
          } as React.CSSProperties} />)}
          <div
            className="match-title"
          >
            Its a Match!
          </div>
          <div className="match-subtitle">You and <strong style={{color:"var(--gold)"}}>{showMatchOverlay.name}</strong> both felt the spark.</div>
          <div className="match-avatars"
          >
            <img loading="lazy" className="match-av" src={currentUser.avatar} alt="You" />
            <img loading="lazy" className="match-av" src={showMatchOverlay.img} alt={showMatchOverlay.name} onError={handleImgError} />
          </div>
          <button className="match-btn" onClick={() => { setShowMatchOverlay(null); openChat(showMatchOverlay); }}
          >
            Send a Message
          </button>
        </div>
      )}
      {showIntentPicker && intentProfile && (
        <div className="intent-overlay" onClick={()=>{setShowIntentPicker(false);setIntentProfile(null)}}>
          <div className="intent-modal" onClick={e=>e.stopPropagation()}>
            <div style={{textAlign:"center",marginBottom:16}}>
              <img loading="lazy" src={intentProfile.img} alt="" style={{width:60,height:60,borderRadius:"50%",objectFit:"cover",marginBottom:8}} onError={handleImgError} />
              <div style={{fontSize:16,fontWeight:700,color:"var(--text)"}}>{intentProfile.name}</div>
              <div style={{fontSize:12,color:"var(--muted)"}}>{intentProfile.type}</div>
            </div>
            <div style={{fontSize:13,color:"var(--text2)",textAlign:"center",marginBottom:16}}>What's your intent with {intentProfile.name.split(" ")[0]}?</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {[
                {icon:"🤝",label:"Collaborate",desc:"Work together on a project",intent:"collab"},
                {icon:"💼",label:"Hire / Commission",desc:"Professional paid work",intent:"hire"},
                {icon:"🔗",label:"Connect",desc:"Grow your creative network",intent:"connect"},
                {icon:"👁️",label:"Inspired By",desc:"Your work inspires me",intent:"inspire"},
              ].map(({icon,label,desc,intent})=>(
                <button key={intent} className="intent-btn" onClick={()=>{
                  setUserDefaultIntent(intent);
                  setShowIntentPicker(false);
                  const p = intentProfile;
                  setIntentProfile(null);
                  if(!p) return;
                  const matchScore = (p as any).matchScore ?? calcMatch({styles:obData.styles||[],looking:obData.looking||[],zodiac:obData.zodiac,chinese:obData.chinese,mbti:obData.mbti,lifePath:obData.lifePath},p);
const isMatch=matchScore>55||Math.random()>0.5;
                   if(isMatch){
                     const newMatch:Match={...p,messages:[],intent};
                     setMatches(prev=>[...prev,newMatch]);
                     setMatchStreak(prev=>prev+1);
                     // Delay match overlay so swipe animation completes first
                     setTimeout(() => {
                       setShowMatchOverlay(newMatch);
                       setShowConfetti(true);
                       setTimeout(()=>setShowConfetti(false),1500);
                       setExpandedMatchId(String(newMatch.id));
                       trackEvent("muse_match",{name:p.name,type:p.type,intent});
                       setActivityFeed(prev=>[{id:uid(),type:"match",from:p.name,avatar:p.img,text:"You matched with "+p.name+"! · "+icon+" "+label,time:"Just now",read:false},...prev]);
                       flash("#FFD700");
                     }, 450);
                     apiFetch("/api/muse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"match",target_id:p.id,intent})}).catch(()=>{});
                   }
                  if(Math.random()>0.4&&!likedBy.find(l=>l.id===p.id)){
                    setLikedBy(prev=>[...prev,p]);
                    setActivityFeed(prev=>[{id:uid(),type:"like",from:p.name,avatar:p.img,text:p.name+" liked your profile!",time:"Just now",read:false},...prev]);
                  }
                  setDailyLikes(prev=>Math.max(0,prev-1));
                  setCurrentUser(prev=>({...prev,stats:{...prev.stats,likes:prev.stats.likes+1}}));
                  setRewindStack(prev=>[...prev,currentIdx]);
                   setCurrentIdx(prev=>prev+1);
                   setCurrentPhotoIdx(0);
    setPortfolioPhotoIdx(0);
    setPromptIdx(0);
                  setCardScrolled(false);
                }} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,background:"var(--glass)",cursor:"pointer",width:"100%",textAlign:"left",transition:"all .15s"}}
                onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.06)";e.currentTarget.style.borderColor="var(--gold)"}}
                onMouseLeave={e=>{e.currentTarget.style.background="var(--glass)";e.currentTarget.style.borderColor="rgba(255,255,255,0.06)"}}
                >
                  <span style={{fontSize:28}}>{icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:700,color:"var(--text)"}}>{label}</div>
                    <div style={{fontSize:11,color:"var(--muted)"}}>{desc}</div>
                  </div>
                </button>
              ))}
            </div>
            <button className="intent-skip" onClick={()=>{setShowIntentPicker(false);setIntentProfile(null);doSwipe("left")}} style={{display:"block",width:"100%",marginTop:12,padding:8,border:"none",background:"none",color:"var(--muted)",fontSize:12,cursor:"pointer"}}>Skip this profile</button>
          </div>
        </div>
      )}
      {showAgeGate && (
        <div className="age-gate">
          <div className="age-gate-icon">18+</div>
          <div className="age-gate-title">Age Verification</div>
          <div className="age-gate-text">You must be 18+ to access NSFW content.</div>
          <div className="age-gate-btns">
            <button className="btn btn-gold" onClick={() => { setShowAgeGate(false); if (pendingNsfw) setShowNsfw(true); setPendingNsfw(false); }}>I am 18+</button>
            <button className="btn btn-gold age-gate-deny" onClick={() => { setShowAgeGate(false); setPendingNsfw(false); }}>Under 18</button>
          </div>
        </div>
      )}
      {showHamburger && (
        <div className="hamburger-overlay" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="hamburger-backdrop" onClick={() => setShowHamburger(false)} />
          <div className="hamburger-panel">
            <div className="hamburger-close" onClick={() => setShowHamburger(false)} role="button" aria-label="Close menu" tabIndex={0} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setShowHamburger(false); }}><FiX size={18} /></div>
            {!hamburgerScreen ? (
              <>
                <div className="hamburger-title">Menu</div>
                {[
                  {key:"community",icon:<FiUsers size={20} />,label:"Community",desc:"Channels, groups & events",grad:"linear-gradient(135deg,#FF8A80,#FF4757,#FFD700)"},
                  {key:"sessions",icon:<FiCalendar size={20} />,label:"Sessions",desc:"Bookings & one-on-ones",grad:"linear-gradient(135deg,#E1BEE7,#9C27B0,#FF4081)"},
                  {key:"network",icon:<FiShare2 size={20} />,label:"Network",desc:"Professionals & forum",grad:"linear-gradient(135deg,#B3E5FC,#64B5F6,#00BCD4)"},
                  {key:"profile",icon:<FiUser size={20} />,label:"Profile",desc:"Edit profile & premium",grad:"linear-gradient(135deg,#FFD700,#FFB5C2,#B388FF)"},
                  {key:"settings",icon:<FiSettings size={20} />,label:"Settings",desc:"Preferences, safety & help",grad:"linear-gradient(135deg,#CE93D8,#B388FF,#A5D6A7)"},
                  {key:"musepro",icon:<FiStar size={20} />,label:"Muse Pro",desc:"Subscription & premium features",grad:"linear-gradient(135deg,#FFD700,#FFA000,#FF6F00)"},
                ].map(item => (
                  <div key={item.key} className="hamburger-item" onClick={() => {
                    if (item.key === "community" || item.key === "sessions" || item.key === "network" || item.key === "musepro") {
                      setShowHamburger(false); showScreen(item.key === "musepro" ? "subscription" : item.key as any);
                    } else {
                      setHamburgerScreen(item.key);
                    }
                  }}>
                    <div className="hamburger-item-icon" style={{background:item.grad}}>{item.icon}</div>
                    <div><div className="hamburger-item-label">{item.label}</div><div className="hamburger-item-desc">{item.desc}</div></div>
                  </div>
                ))}
                <div style={{borderTop:"1px solid rgba(255,255,255,0.06)",margin:"12px 0 8px",paddingTop:8}}>
                  <div style={{fontSize:11,fontWeight:600,color:"var(--muted)",marginBottom:8}}>Legal</div>
                  {[{label:"Terms of Service",href:"/terms"},{label:"Privacy Policy",href:"/privacy"},{label:"DMCA / Copyright",href:"/dmca"},{label:"Community Guidelines",href:"/safety"}].map(l => (
                    <a key={l.href} href={l.href} onClick={()=>setShowHamburger(false)} style={{display:"block",padding:"8px 0",fontSize:13,color:"var(--text2)",textDecoration:"none",transition:"color .15s"}} onMouseEnter={e=>e.currentTarget.style.color="#FFD700"} onMouseLeave={e=>e.currentTarget.style.color="var(--text2)"}>{l.label}</a>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="hamburger-back" onClick={() => setHamburgerScreen("")}><FiArrowLeft size={16} /> Back</div>
                {hamburgerScreen === "community" && (
                  <div className="conn-scroll">
                    <div className="hamburger-title">Community</div>
                    <div style={{fontSize:14,fontWeight:700,color:"var(--text)",margin:"0 0 10px"}}>Channels & Groups</div>
                    {(liveCommunities?.length ? liveCommunities : COMMUNITIES).filter(c => showNsfw || !c.nsfw).map(c => (
                      <div key={c.id} className="conn-card" style={{margin:"0 0 10px"}}>
                        <img loading="lazy" src={c.img} alt={c.name} className="conn-avatar" onError={handleImgError} />
                        <div className="conn-content">
                          <div className="conn-name">{c.name}</div>
                          <div className="conn-meta">{c.members} members · {c.desc}</div>
                            <div className="conn-actions" style={{marginTop:8,display:"flex",gap:8,flexDirection:"column"}}>
                               <button className="btn btn-gold" style={{width:"100%",padding:"12px 0",fontSize:13,fontWeight:700,borderRadius:12}} onClick={async()=>{try{const r=await apiFetch("/api/muse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"join-community",communityId:c.id})});if(!r.ok)throw new Error("failed");showToast("Joined "+c.name+"!")}catch{showToast("Failed to join")}}}>{c.cat==="nsfw"?"Join (18+)":"Join"}</button>
                              <button className="btn btn-outline" style={{width:"100%",padding:"12px 0",fontSize:13,fontWeight:600,borderRadius:12}} onClick={()=>showToast(c.name+" community opened!")}>Learn</button>
                              <button className="btn btn-outline" style={{width:"100%",padding:"12px 0",fontSize:13,fontWeight:600,borderRadius:12}} onClick={()=>{navigator.clipboard?.writeText("https://wyzdesign.com/muse/community/"+c.id);showToast("Link copied!")}}>Share</button>
                            </div>
                        </div>
                      </div>
                    ))}
                    <div style={{fontSize:14,fontWeight:700,color:"var(--text)",margin:"20px 0 10px"}}>Events</div>
                    {((liveEvents?.length ? liveEvents : EVENTS)).filter(e => showNsfw || !e.nsfw).map(ev => (
                      <div key={ev.id} className="conn-card" style={{flexDirection:"column",margin:"0 0 10px"}}>
                        <div className="conn-name">{ev.title}</div>
                        <div className="conn-meta">{ev.date} · {ev.loc}</div>
                        <div style={{fontSize:13,color:"var(--text2)",margin:"4px 0 8px",lineHeight:1.5}}>{ev.desc}</div>
                         <div style={{display:"flex",gap:8,width:"100%",flexDirection:"column"}}>
                           <button className={"btn "+(rsvpdEvents.includes(ev.id)?"btn-outline":"btn-gold")} style={{width:"100%",padding:"14px 0",fontSize:14,fontWeight:700,borderRadius:12}} onClick={()=>{setRsvpdEvents(prev=>prev.includes(ev.id)?prev.filter(x=>x!==ev.id):[...prev,ev.id]);showToast(rsvpdEvents.includes(ev.id)?"RSVP cancelled":"RSVP confirmed!")}}>{rsvpdEvents.includes(ev.id)?"Going":"RSVP"}</button>
                           <button className="btn btn-outline" style={{width:"100%",padding:"14px 0",fontSize:14,fontWeight:600,borderRadius:12}} onClick={()=>{navigator.clipboard?.writeText("https://wyzdesign.com/muse/event/"+ev.id);showToast("Event link copied!")}}>Share</button>
                         </div>
                      </div>
                    ))}
                  </div>
                )}
                {hamburgerScreen === "sessions" && (
                  <div className="conn-scroll">
                    <div className="hamburger-title">Sessions</div>
                    <div style={{fontSize:14,fontWeight:700,color:"var(--text)",margin:"0 0 10px"}}>One-on-One Sessions</div>
                    {SESSIONS.map(s => (
                      <div key={s.id} className="conn-card" style={{margin:"0 0 10px"}}>
                        <img loading="lazy" src={s.img} alt={s.name} className="conn-avatar" style={{borderRadius:"50%"}} onError={handleImgError} />
                        <div className="conn-content">
                          <div className="conn-name">{s.name}</div>
                          <div className="conn-meta">{s.type} · {s.rate} · ★ {s.rating}</div>
                          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:6}}>
                            {(s.skills||[]).map(sk=><span key={sk} className="conn-tag" style={{fontSize:10,padding:"3px 8px"}}>{sk}</span>)}
                          </div>
                            <div className="conn-actions" style={{marginTop:8,display:"flex",gap:8,flexDirection:"column"}}>
                              <button className="btn btn-gold" style={{width:"100%",padding:"12px 0",fontSize:13,fontWeight:700,borderRadius:12}} onClick={async()=>{try{const r=await apiFetch("/api/muse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"book-session",sessionId:s.id,hostId:s.id})});if(r.status===403){const d=await r.json().catch(()=>({}));if(d.code==="VERIFICATION_REQUIRED"){setShowAgeVerification(true);showToast("Verify your identity to book paid sessions");return;}}if(!r.ok)throw new Error("failed");showToast("Session request sent to "+s.name+"!")}catch{showToast("Failed to book session")}}}>{s.available?"Book Session":"Waitlist"}</button>
                              <button className="btn btn-outline" style={{width:"100%",padding:"12px 0",fontSize:13,fontWeight:600,borderRadius:12}} onClick={()=>showToast(s.name+"'s full profile coming soon!")}>View Profile</button>
                            </div>
                        </div>
                      </div>
                    ))}
                    <div style={{fontSize:14,fontWeight:700,color:"var(--text)",margin:"20px 0 10px"}}>Your Bookings</div>
                    {matches.filter(m => m.booked).length === 0 ? (
                      <div style={{textAlign:"center",padding:30,color:"var(--muted)",fontSize:13}}>
                        <div style={{fontSize:32,marginBottom:10}}>📋</div>
                        No bookings yet.<br/>Swipe right and book sessions with your matches!
                      </div>
                    ) : (
                      matches.filter(m => m.booked).map(m => (
                        <div key={m.id} className="conn-card" style={{margin:"0 0 10px"}}>
                          <img loading="lazy" src={m.img} alt={m.name} className="conn-avatar" onError={handleImgError} />
                          <div className="conn-content">
                            <div className="conn-name">{m.name}</div>
                            <div className="conn-meta">{m.type} · Booked Session</div>
                              <div className="conn-actions" style={{marginTop:8,display:"flex",gap:8,flexDirection:"column"}}>
                                <button className="btn btn-gold" style={{width:"100%",padding:"12px 0",fontSize:13,fontWeight:700,borderRadius:12}} onClick={() => { setHamburgerScreen(""); setShowHamburger(false); openChat(m); }}>Message</button>
                                <button className="btn btn-outline" style={{width:"100%",padding:"12px 0",fontSize:13,fontWeight:600,borderRadius:12}} onClick={()=>{setChatTarget(m);showScreen("chat")}}>Details</button>
                              </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
                {hamburgerScreen === "network" && (
                  <div className="conn-scroll">
                    <div className="hamburger-title">Network</div>
                    <div style={{fontSize:14,fontWeight:700,color:"var(--text)",margin:"0 0 10px"}}>Creative Professionals</div>
                    {PROFESSIONALS.filter(p => showNsfw || !p.nsfw).map(p => (
                      <div key={p.id} className="conn-card" style={{margin:"0 0 10px",flexDirection:"column",alignItems:"center",textAlign:"center",padding:"0 0 16px 0",gap:0}}>
                        <img loading="lazy" src={p.img} alt={p.name} style={{width:"100%",height:150,objectFit:"fill",borderRadius:"16px 16px 0 0"}} onError={handleImgError} />
                        <div className="conn-content" style={{padding:"12px 16px 0",display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",width:"100%"}}>
                          <div className="conn-name">{p.name}</div>
                          <div className="conn-meta">{p.type} · {p.loc} · {p.exp}</div>
                          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:6,justifyContent:"center"}}>
                            {(p.skills||[]).slice(0,3).map(s=><span key={s} className="conn-tag" style={{fontSize:10,padding:"3px 8px"}}>{s}</span>)}
                            {(p.skills||[]).length>3 && <span className="conn-tag" style={{fontSize:10,padding:"3px 8px"}}>+{(p.skills||[]).length-3}</span>}
                          </div>
                           <div className="conn-actions" style={{marginTop:8,display:"flex",gap:8,flexDirection:"column"}}>
                             <button className="btn btn-gold" style={{width:"100%",padding:"12px 0",fontSize:13,fontWeight:700,borderRadius:12}} onClick={async()=>{try{const r=await apiFetch("/api/muse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"connect",targetId:p.id})});if(!r.ok)throw new Error("failed");showToast("Connection request sent to "+p.name+"!")}catch{showToast("Failed to send connection")}}}>Connect</button>
                             <button className="btn btn-outline" style={{width:"100%",padding:"12px 0",fontSize:13,fontWeight:600,borderRadius:12}} onClick={()=>{setViewProfile(p);showToast("Viewing "+p.name+"'s profile")}}>View Profile</button>
                             <button className="btn btn-outline" style={{width:"100%",padding:"12px 0",fontSize:13,fontWeight:600,borderRadius:12}} onClick={()=>{navigator.clipboard?.writeText("https://wyzdesign.com/muse/pro/"+p.id+"?ref="+currentUser.name.replace(/\s+/g,"-").toLowerCase());showToast("Shared "+p.name+"'s profile!")}}>Share Your Profile</button>
                           </div>
                        </div>
                      </div>
                    ))}
                    <div style={{fontSize:14,fontWeight:700,color:"var(--text)",margin:"20px 0 10px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span>Forum</span>
                      <button className="conn-btn conn-btn-primary" style={{fontSize:11,padding:"6px 14px"}} onClick={()=>setShowNewPost(!showNewPost)}>+ Post</button>
                    </div>
                    {showNewPost && (
                      <div className="conn-card" style={{flexDirection:"column",margin:"0 0 14px"}}>
                        <input className="inp" placeholder="Title" value={newPostTitle} onChange={e=>setNewPostTitle(e.target.value)} style={{marginBottom:8}} />
                        <textarea className="inp" placeholder="What's on your mind?" rows={3} value={newPostBody} onChange={e=>setNewPostBody(e.target.value)} style={{marginBottom:10,resize:"none"}} />
                         <div style={{display:"flex",gap:8,flexDirection:"column"}}>
                            <button className="btn btn-gold" style={{width:"100%",padding:"12px 0",fontSize:13,fontWeight:700,borderRadius:12}} onClick={async()=>{if(newPostTitle.trim()){const title=newPostTitle.trim();const body=newPostBody.trim();setForumPosts(prev=>[{id:uid(),title,body,author:currentUser.name,avatar:currentUser.avatar,votes:1,comments:[],cat:"General",time:"Just now",pinned:false},...prev]);setNewPostTitle("");setNewPostBody("");setShowNewPost(false);try{await apiFetch("/api/muse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"forum",title,body,userId:currentUser.id})});showToast("Posted!")}catch{showToast("Failed to post")}}}}>Post</button>
                           <button className="btn btn-outline" style={{width:"100%",padding:"12px 0",fontSize:13,fontWeight:600,borderRadius:12}} onClick={()=>setShowNewPost(false)}>Cancel</button>
                         </div>
                      </div>
                    )}
                    <div style={{display:"flex",gap:6,marginBottom:12}}>{(["hot","new","top"] as const).map(s=>(<div key={s} className={"conn-tab-sub"+(forumSort===s?" active":"")} onClick={()=>setForumSort(s)}>{s.charAt(0).toUpperCase()+s.slice(1)}</div>))}</div>
                     {[...(liveForum?.length ? liveForum : FORUM_POSTS)].sort((a,b)=>forumSort==="top"?(b.votes+b.comments.length*2)-(a.votes+a.comments.length*2):forumSort==="new"?(b.id-a.id):(b.votes*2+b.comments.length)-(a.votes*2+a.comments.length)).map(post=>(
                      <div key={post.id} className="conn-card" style={{flexDirection:"column",margin:"0 0 10px",padding:"14px 18px"}}>
                        {post.pinned && <div style={{fontSize:10,color:"var(--gold)",fontWeight:700,marginBottom:4}}>📌 Pinned</div>}
                        <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,minWidth:36}}>
                            <button style={{background:"none",border:"none",color:post.votes>0?"var(--gold)":"var(--muted)",cursor:"pointer",fontSize:18,padding:0}} onClick={()=>setForumPosts(prev=>prev.map(p=>p.id===post.id?{...p,votes:p.votes+1}:p))}>▲</button>
                            <span style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>{post.votes}</span>
                            <button style={{background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:18,padding:0}} onClick={()=>setForumPosts(prev=>prev.map(p=>p.id===post.id?{...p,votes:p.votes-1}:p))}>▼</button>
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:15,fontWeight:700,color:"var(--text)",marginBottom:4}}>{post.title}</div>
                            <div style={{fontSize:13,color:"var(--text2)",lineHeight:1.5,marginBottom:8}}>{post.body}</div>
                            <div style={{display:"flex",alignItems:"center",gap:8,fontSize:11,color:"var(--muted)",flexWrap:"wrap"}}>
                              <img loading="lazy" src={post.avatar} alt="" style={{width:18,height:18,borderRadius:"50%",objectFit:"cover"}} /> <span style={{fontWeight:600,color:"var(--text)"}}>{post.author}</span>
                              <span>·</span><span>{post.time}</span><span>·</span><span>{post.cat}</span><span>·</span><span>{post.comments.length} replies</span>
                            </div>
                            {expandedPost===post.id && (
                              <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid rgba(255,255,255,0.06)"}}>
                                {post.comments.map((c: {author: string; text: string}, i: number)=><div key={i} style={{fontSize:13,color:"var(--text2)",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}><strong style={{color:"var(--text)"}}>{c.author}</strong>: {c.text}</div>)}
                                <div style={{display:"flex",gap:8,marginTop:8}}>
                                  <input className="inp" placeholder="Reply..." value={commentText} onChange={e=>setCommentText(e.target.value)} onKeyDown={async e=>{if(e.key==="Enter"&&commentText.trim()){const txt=commentText.trim();setForumPosts(prev=>prev.map(p=>p.id===post.id?{...p,comments:[...p.comments,{author:currentUser.name,text:txt}]}:p));setCommentText("");try{await apiFetch("/api/muse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"forum",type:"reply",postId:post.id,text:txt,userId:currentUser.id})});showToast("Reply posted!")}catch{showToast("Failed to post reply")}}}} style={{flex:1,fontSize:12,padding:"8px 12px"}} />
                          </div>
                               </div>
                            )}
                            {post.comments.length>0 && expandedPost!==post.id && <button className="conn-btn conn-btn-ghost" style={{fontSize:11,padding:"4px 8px",marginTop:6}} onClick={()=>{setExpandedPost(post.id===expandedPost?null:post.id)}}>{post.comments.length} replies</button>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {hamburgerScreen === "profile" && (
                  <div className="conn-scroll">
                    <div className="hamburger-title" style={{textAlign:"center"}}>Your Profile</div>
                    <div style={{textAlign:"center",marginBottom:20}}>
                      <img loading="lazy" src={currentUser.avatar} alt="You" style={{width:80,height:80,borderRadius:"50%",objectFit:"cover",border:"3px solid var(--gold)",marginBottom:10}} onError={handleImgError} />
                      <div style={{fontSize:18,fontWeight:700,color:"var(--text)"}}>{currentUser.name}</div>
                      <div style={{fontSize:13,color:"var(--muted)"}}>{currentUser.type} · {currentUser.exp}</div>
                    </div>
                    <button className="hamburger-item" style={{width:"100%",marginBottom:6}} onClick={() => { setHamburgerScreen(""); setShowHamburger(false); setScreen("profile"); }}>
                      <div className="hamburger-item-icon" style={{background:"linear-gradient(135deg,#FFD700,#FFBF00,#FF8A80)"}}><FiUser size={20} /></div>
                      <div><div className="hamburger-item-label">Edit Profile</div><div className="hamburger-item-desc">Update your bio, skills, portfolio</div></div>
                    </button>
                    <div style={{fontSize:14,fontWeight:700,color:"var(--text)",margin:"20px 0 10px"}}>Muse Premium</div>
                    <div style={{textAlign:"center",padding:12,marginBottom:10,background:"linear-gradient(135deg,rgba(255,215,0,0.08),rgba(255,138,128,0.06))",borderRadius:16,border:"1px solid rgba(255,215,0,0.15)"}}>
                      <div style={{fontSize:24,marginBottom:6}}>✨</div>
                      <div style={{fontSize:16,fontWeight:700,color:"var(--gold)"}}>$9.99/month</div>
                      <div style={{fontSize:12,color:"var(--text2)",marginBottom:10}}>Unlimited likes, superlikes, boosts & more</div>
                      <button className="btn btn-gold" style={{fontSize:12,padding:"8px 20px"}} onClick={()=>{showToast("Coming soon! Premium features are being built.")}}>Upgrade</button>
                    </div>
                    <div style={{fontSize:14,fontWeight:700,color:"var(--text)",margin:"20px 0 10px"}}>Statistics</div>
                    <div className="stats-row" style={{marginTop:8}}>
                      <div className="stat"><div className="stat-num">{currentUser.stats?.matches||0}</div><div className="stat-label">Matches</div></div>
                      <div className="stat"><div className="stat-num">{currentUser.stats?.likes||0}</div><div className="stat-label">Likes</div></div>
                      <div className="stat"><div className="stat-num">{currentUser.stats?.bookingsCompleted||0}</div><div className="stat-label">Bookings</div></div>
                    </div>
                    <button className="hamburger-item" style={{width:"100%",marginBottom:6,marginTop:20}} onClick={() => { setShowHamburger(false); setSupportOpen(true); }}>
                      <div className="hamburger-item-icon" style={{background:"linear-gradient(135deg,#FFD700,#FFBF00,#FF8A80)"}}><FiHeadphones size={20} /></div>
                      <div><div className="hamburger-item-label">Help & Support</div><div className="hamburger-item-desc">Chat with the Muse assistant</div></div>
                    </button>
                    <button className="btn btn-gold" style={{width:"100%",marginTop:24,fontSize:12,padding:"12px 0"}} onClick={doLogoutFull}>Log Out</button>
                  </div>
                )}
                {hamburgerScreen === "settings" && (
                  <div className="conn-scroll">
                    <div className="hamburger-title">Settings</div>
                    <div style={{fontSize:14,fontWeight:700,color:"var(--text)",margin:"0 0 10px"}}>Discovery Preferences</div>
                    <div style={{marginBottom:16}}>
                      <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:8}}>Age Range</div>
                      <div style={{display:"flex",gap:6,alignItems:"center",overflow:"hidden"}}>
                        <span style={{fontSize:11,color:"var(--muted)",flexShrink:0}}>{discoveryPrefs.ageMin}</span>
                        <input type="range" min={18} max={65} value={discoveryPrefs.ageMin} onChange={e=>setDiscoveryPrefs(p=>({...p,ageMin:Number(e.target.value)}))} style={{flex:1,minWidth:0,accentColor:"var(--gold)"}} />
                        <span style={{fontSize:11,color:"var(--muted)",flexShrink:0}}>to</span>
                        <input type="range" min={18} max={65} value={discoveryPrefs.ageMax} onChange={e=>setDiscoveryPrefs(p=>({...p,ageMax:Number(e.target.value)}))} style={{flex:1,minWidth:0,accentColor:"var(--gold)"}} />
                        <span style={{fontSize:11,color:"var(--muted)",flexShrink:0}}>{discoveryPrefs.ageMax}</span>
                      </div>
                    </div>
                    <div style={{marginBottom:16}}>
                      <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:8}}>Max Distance: {discoveryPrefs.distance} mi</div>
                      <input type="range" min={1} max={100} value={discoveryPrefs.distance} onChange={e=>setDiscoveryPrefs(p=>({...p,distance:Number(e.target.value)}))} style={{width:"100%",accentColor:"var(--gold)"}} />
                    </div>
                    <div style={{marginBottom:16}}>
                      <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:8}}>Show Me</div>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                        {["all","women","men","non-binary"].map(g=>(
                          <div key={g} onClick={()=>setDiscoveryPrefs(p=>({...p,gender:g}))} style={{padding:"8px 16px",borderRadius:99,cursor:"pointer",fontSize:12,fontWeight:600,transition:"all .25s",background:discoveryPrefs.gender===g?"rgba(255,215,0,0.12)":"rgba(255,255,255,0.04)",border:"1px solid "+(discoveryPrefs.gender===g?"rgba(255,215,0,0.3)":"rgba(255,255,255,0.06)"),color:discoveryPrefs.gender===g?"var(--gold)":"var(--muted)"}}>{g.charAt(0).toUpperCase()+g.slice(1)}</div>
                        ))}
                      </div>
                    </div>
                    <div style={{marginBottom:16}}>
                      <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:8}}>Notification Preferences</div>
                      {[{k:"match",l:"New Matches"},{k:"message",l:"Messages"},{k:"brief",l:"Brief Updates"},{k:"like",l:"Likes"}].map(n=>(
                        <div key={n.k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                          <span style={{fontSize:13,color:"var(--text)"}}>{n.l}</span>
                          <div onClick={()=>setNotifPrefs(p=>({...p,[n.k]:!p[n.k]}))} style={{width:44,height:24,borderRadius:12,background:notifPrefs[n.k]?"rgba(255,215,0,0.3)":"rgba(255,255,255,0.1)",cursor:"pointer",position:"relative",transition:"all .25s"}}>
                            <div style={{width:20,height:20,borderRadius:"50%",background:notifPrefs[n.k]?"var(--gold)":"var(--muted)",position:"absolute",top:2,left:notifPrefs[n.k]?22:2,transition:"all .25s"}} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <button className="btn btn-gold" style={{width:"100%",fontSize:12}} onClick={async()=>{try{await apiFetch("/api/muse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"save-preferences",preferences:discoveryPrefs})});showToast("Preferences saved!")}catch{showToast("Failed to save")}}}>Save Preferences</button>
                    <div style={{fontSize:14,fontWeight:700,color:"var(--text)",margin:"24px 0 10px"}}>Safety & Privacy</div>
                    <div style={{padding:"12px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div><div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>Show Distance</div><div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>Display your approximate location</div></div>
                      <div onClick={()=>setShowNsfw(p=>!p)} style={{width:44,height:24,borderRadius:12,background:showNsfw?"rgba(255,215,0,0.3)":"rgba(255,255,255,0.1)",cursor:"pointer",position:"relative",transition:"all .25s"}}>
                        <div style={{width:20,height:20,borderRadius:"50%",background:showNsfw?"var(--gold)":"var(--muted)",position:"absolute",top:2,left:showNsfw?22:2,transition:"all .25s"}} />
                      </div>
                    </div>
                    <div style={{padding:"12px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div><div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>Online Status</div><div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>Show when you're active</div></div>
                      <div style={{width:44,height:24,borderRadius:12,background:"rgba(255,215,0,0.3)",cursor:"pointer",position:"relative"}}>
                        <div style={{width:20,height:20,borderRadius:"50%",background:"var(--gold)",position:"absolute",top:2,left:22,transition:"all .25s"}} />
                      </div>
                    </div>
                    <div style={{padding:"12px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div><div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>Blocked Users</div><div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{blockedUsers.length} blocked</div></div>
                    </div>
                    <button className="btn" style={{width:"100%",marginTop:12,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",color:"var(--text)",fontSize:13}} onClick={async()=>{try{const res=await authFetch("/api/muse",{method:"POST",body:JSON.stringify({action:"export"})});if(!res.ok){showToast("Export failed");return;}const j=await res.json();const blob=new Blob([JSON.stringify(j,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="muse-my-data.json";a.click();URL.revokeObjectURL(url);showToast("Data exported");}catch(e){showToast("Export failed");}}}>Export My Data</button>
                    <div style={{fontSize:14,fontWeight:700,color:"var(--text)",margin:"24px 0 10px"}}>Help & Support</div>
                    {[
                      {q:"How does matching work?",a:"Swipe right on creators you'd like to connect with. If they swipe right back, it's a match! You can then message each other."},
                      {q:"What are Briefs?",a:"Briefs are creative opportunities posted by brands and clients. You can browse open briefs, apply to paid ones, or respond to vision briefs."},
                      {q:"How do I upgrade to Premium?",a:"Go to Settings → Muse Premium to see plan options."},
                      {q:"How do I report someone?",a:"Tap the ••• menu on any profile or post, then select Report. Choose a reason and we'll review it within 24 hours."},
                      {q:"How do I delete my account?",a:"Go to Settings → Safety & Privacy → Delete Account. This permanently removes all your data."},
                    ].map((faq,i) => (
                      <div key={i} style={{marginBottom:10,padding:"12px 14px",borderRadius:12,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)"}}>
                        <div style={{fontSize:13,fontWeight:700,color:"var(--text)",marginBottom:6}}>{faq.q}</div>
                        <div style={{fontSize:12,color:"var(--text2)",lineHeight:1.5}}>{faq.a}</div>
                      </div>
                    ))}
                    <div style={{marginTop:12}}>
                       <button className="btn btn-outline" style={{width:"100%",fontSize:13}} onClick={()=>window.open("mailto:"+SUPPORT_EMAIL+"?subject=Muse%20Support%20Request")}>Email Support</button>
                    </div>
                    <div style={{marginTop:20}}>
                      <div style={{fontSize:15,fontWeight:700,color:"var(--coral)",marginBottom:12}}>Danger Zone</div>
                       <button className="btn" style={{width:"100%",background:"rgba(255,107,107,0.1)",border:"1px solid rgba(255,107,107,0.3)",color:"var(--coral)",fontSize:13}} onClick={async()=>{if(confirm("Delete your account? This cannot be undone.")){try{const r=await authFetch("/api/muse/auth",{method:"POST",body:JSON.stringify({action:"delete-account"})});if(!r.ok){showToast("Failed to delete account");return}showToast("Account deleted");setTimeout(()=>window.location.reload(),1500)}catch{showToast("Failed to delete account")}}}}>Delete Account</button>
                    </div>
                    <button className="btn btn-gold" style={{width:"100%",marginTop:16,fontSize:12,padding:"12px 0"}} onClick={doLogoutFull}>Log Out</button>
                  </div>
                )}
                {hamburgerScreen === "moments" && (
                  <div className="conn-scroll">
                    <div className="hamburger-title">BTS</div>
                    <div style={{textAlign:"center",padding:8,fontSize:13,color:"var(--gold)",fontWeight:700,marginBottom:12}}>Snapshots from creatives near you</div>
                    {[...Array(6)].map((_,i)=><div key={i} className="conn-card" style={{flexDirection:"column",margin:"0 0 10px",padding:0,overflow:"hidden"}}>
                      <div style={{position:"relative",height:160,background:`linear-gradient(135deg,${["#FF6B6B","#4ECDC4","#FFD93D","#A78BFA","#FF8A80","#6BCB77"][i]},#0a0612)`}}>
                        <div style={{position:"absolute",top:10,left:10,display:"flex",alignItems:"center",gap:8,background:"rgba(0,0,0,0.5)",borderRadius:99,padding:"4px 10px"}}>
                          <div style={{width:28,height:28,borderRadius:"50%",background:"var(--gold)",border:"2px solid #fff"}} />
                          <span style={{fontSize:12,color:"#fff",fontWeight:600}}>creative_{100+i}</span>
                        </div>
                        <div style={{position:"absolute",bottom:10,right:10,fontSize:10,color:"#fff",background:"rgba(0,0,0,0.5)",borderRadius:8,padding:"3px 10px"}}>{["5m","12m","28m","1h","2h","3h"][i]} ago</div>
                      </div>
                      <div style={{padding:"8px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{fontSize:12,color:"var(--text2)"}}>📍 {["Los Angeles","Miami","NYC","Chicago","Austin","Portland"][i]}</span>
                        <button className="conn-btn conn-btn-primary" style={{fontSize:10,padding:"4px 10px"}} onClick={()=>showToast("Story viewed!")}>View</button>
                      </div>
                    </div>)}
</div>
                )}
              </>
            )}
</div>
        </div>
      )}
      {screen === "auth" ? (
        <div className="phone-wrap">
          <div className="phone" id="muse-app">
            <div className="notch" />
            <div className="screen-el active">
              <div className="onboard" style={{paddingTop:30}}>
                <div className="sparkle" style={{top:"8%",left:"6%",fontSize:24}}>✦</div>
                <div className="sparkle" style={{top:"15%",right:"10%",fontSize:18}}>✧</div>
                <div className="sparkle" style={{bottom:"35%",left:"12%",fontSize:20}}>✦</div>
                <div className="sparkle" style={{bottom:"12%",right:"6%",fontSize:16}}>✧</div>
                <div className="hero-text" style={{marginBottom:14}}>muse</div>
                <div className="hero-sub">Where creatives find <em>real connections</em></div>
                <div className="social-proof">Join thousands of creatives already finding their muse</div>
                <div style={{width:"100%",maxWidth:320}}>
                  <div className="auth-tabs">
                    <button className={"auth-tab"+(authMode==="login"?" active":"")} onClick={()=>setAuthMode("login")}>Log In</button>
                    <button className={"auth-tab"+(authMode==="signup"?" active":"")} onClick={()=>setAuthMode("signup")}>Sign Up</button>
                  </div>
                  <input className={"inp"+(formErrors.email?" error":"")} placeholder="Email" type="email" value={authEmail} onChange={e=>{setAuthEmail(e.target.value);setFormErrors(p=>({...p,email:""}))}} style={authEmail.length>28?{textOverflow:"ellipsis"}:{}} title={authEmail} />
                  {formErrors.email && <div className="error-msg">{formErrors.email}</div>}
                  <div style={{position:"relative"}}>
                    <input className={"inp"+(formErrors.pass?" error":"")} placeholder="Password" type={showPass?"text":"password"} value={authPass} onChange={e=>{setAuthPass(e.target.value);setFormErrors(p=>({...p,pass:""}))}} style={{paddingRight:44}} />
                    <button type="button" onClick={()=>setShowPass(p=>!p)} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:18,padding:8,lineHeight:1,minWidth:44,minHeight:44,display:"flex",alignItems:"center",justifyContent:"center"}} aria-label={showPass?"Hide password":"Show password"}>{showPass?"🙈":"👁️"}</button>
                  </div>
                  {authMode==="signup" && authPass && (()=>{const l=authPass.length;const u=/[A-Z]/.test(authPass);const y=/[!@#$%^&*]/.test(authPass);const s=l>=8&&u&&y?l>=12?4:3:l>=6?2:1;const lbl=["","Weak","Fair","Strong","Very strong"][s];const col=["","var(--sunset)","var(--sunset-orange)","var(--amber)","var(--mint)"][s];const t=["","weak","fair","strong","vstrong"][s];return(<div><div className="pw-meter-label" style={{color:col}}>{lbl}</div><div className="pw-meter-wrap"><div className={"pw-meter-bar"+(s>=1?" "+t:"")}/><div className={"pw-meter-bar"+(s>=2?" "+t:"")}/><div className={"pw-meter-bar"+(s>=3?" "+t:"")}/><div className={"pw-meter-bar"+(s>=4?" "+t:"")}/></div></div>);})()}
                  {formErrors.pass && <div className="error-msg">{formErrors.pass}</div>}
                  {authMode==="login" && <button type="button" onClick={async()=>{if(!authEmail.trim()){setFormErrors({email:"Enter your email first"});return;}setAuthLoading(true);try{const r=await authFetch("/api/muse/auth",{method:"POST",body:JSON.stringify({action:"forgot-password",email:authEmail.trim()})});const j=await r.json();showToast(j.message||j.error||"Check your email for a password reset link!");}catch{showToast("Network error");}setAuthLoading(false);}} style={{background:"none",border:"none",color:"var(--gold)",fontSize:12,cursor:"pointer",textAlign:"right",width:"100%",marginTop:4,padding:0}}>Forgot password?</button>}
                  <button className="btn btn-gold" style={{marginTop:10,opacity:authLoading?0.6:1}} disabled={authLoading} onClick={handleAuthClick}>{authLoading?"Loading...":authMode==="login"?"Log In":"Create Account"}</button>
                  <div className="auth-divider"><span>or continue with</span></div>
                  <div style={{display:"flex",gap:10}}>
                    <button className="auth-social-btn" style={{flex:1}} onClick={()=>handleOAuth("google")}><svg width="16" height="16" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5c10 0 19.5-7.3 19.5-19.5 0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12.5 24 12.5c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4.5 24 4.5 16.3 4.5 9.7 8.8 6.3 14.7z"/><path fill="#4CAF50" d="M24 43.5c5.4 0 10.3-2.1 14-5.4l-6.5-5.5C29.6 34 26.9 35 24 35c-5.3 0-9.7-2.6-11.3-7.5l-6.5 5C9.6 40.2 16.2 43.5 24 43.5z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.6l6.5 5.5C41.4 35.7 43.5 30.3 43.5 24c0-1.3-.1-2.3-.4-3.5z"/></svg>Google</button>
                    <button className="auth-social-btn" style={{flex:1}} onClick={()=>handleOAuth("facebook")}><svg width="16" height="16" viewBox="0 0 48 48"><path fill="#1877F2" d="M48 24C48 10.7 37.3 0 24 0S0 10.7 0 24c0 11.9 8.7 21.8 20 23.6V31h-6v-7h6v-5.3c0-5.9 3.5-9.2 8.9-9.2 2.6 0 5.3.5 5.3.5v5.8h-3c-2.9 0-3.8 1.8-3.8 3.7V24h6.5l-1 7h-5.5v16.6C39.3 45.8 48 35.9 48 24z"/></svg>Facebook</button>
                  </div>
                  <div className="auth-terms-wrap">
                    <span style={{fontSize:12,color:"var(--muted)"}}>By continuing you agree to our</span><span className="auth-terms" onClick={()=>setShowTerms(true)}>Terms</span><span className="auth-terms" onClick={()=>setShowPrivacy(true)}>Privacy</span><span className="auth-terms" onClick={()=>setShowGuidelines(true)}>Guidelines</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
<div className="phone-wrap">
<div className="phone" id="muse-app">
<div className="notch" />
            <div className={"screen-el"+(screen==="onboard"?" active":"")}>
              <div className="onboard">
                {obStep === 0 && (
                  <div className="onboard-content">
                    <div className="sparkle" style={{top:"10%",left:"6%",fontSize:24}}>✦</div>
                    <div className="sparkle" style={{top:"20%",right:"10%",fontSize:18}}>✧</div>
                    <div className="sparkle" style={{bottom:"30%",left:"15%",fontSize:20}}>✦</div>
                    <div className="sparkle" style={{bottom:"15%",right:"6%",fontSize:16}}>✧</div>
                    <div className="hero-text">Find your Muse</div>
                    <div className="hero-sub">Where creatives find <em>real connections</em></div>
                    <div className="hero-quote">"Creativity craves connection"</div>
                    <button className="btn btn-gold" onClick={()=>setObStep(1)}>Get Started</button>
                  </div>
                )}
                {obStep === 1 && (
                  <div className="onboard-content">
                    <div className="step-title">Your Info</div>
                    <div className="step-sub">Tell us about yourself</div>
                    <input className="inp" placeholder="Display Name" value={obData.name||""} onChange={e=>setObData(d=>({...d,name:e.target.value}))} />
                    <input className="inp" placeholder="Location (City, State)" value={obData.loc||""} onChange={e=>setObData(d=>({...d,loc:e.target.value}))} />
                    <textarea className="inp" placeholder="Who are you as a creative?" rows={3} value={obData.bio||""} onChange={e=>setObData(d=>({...d,bio:e.target.value}))} />
                    <button className="btn btn-gold" onClick={()=>setObStep(2)}>Next</button>
                    <button className="ob-skip" onClick={()=>setObStep(2)}>Skip for now</button>
                  </div>
                )}
                {obStep === 2 && (
                  <div className="onboard-content">
                    <div className="step-title">Creative Type</div>
                    <div className="step-sub">What's your primary craft?</div>
                    <div className="chips">
                      {CREATIVE_TYPES.map(t => (
                        <div key={t} className={"chip"+(obData.type===t?" sel":"")} onClick={()=>setObData(d=>({...d,type:t}))}><span>{t}</span></div>
                      ))}
                    </div>
                    <button className="btn btn-gold" onClick={()=>setObStep(3)}>Next</button>
                    <button className="ob-skip" onClick={()=>setObStep(3)}>Skip for now</button>
                  </div>
                )}
                {obStep === 3 && (
                  <div className="onboard-content">
                    <div className="step-title">Looking For</div>
                    <div className="step-sub">What kind of connections interest you?</div>
                    <div className="chips">
                      {LOOKING_FOR.map(l => (
                        <div key={l} className={"chip"+((obData.looking||[]).includes(l)?" sel":"")} onClick={()=>{const arr=obData.looking||[];setObData(d=>({...d,looking:arr.includes(l)?arr.filter(x=>x!==l):[...arr,l]}))}}><span>{l}</span></div>
                      ))}
                    </div>
                    <button className="btn btn-gold" onClick={()=>setObStep(4)}>Next</button>
                    <button className="ob-skip" onClick={()=>setObStep(4)}>Skip for now</button>
                  </div>
                )}
                {obStep === 4 && (
                  <div className="onboard-content">
                    <div className="step-title">Aesthetic Style</div>
                    <div className="step-sub">What's your creative aesthetic?</div>
                    <div className="chips">
                      {AESTHETICS.map(s => (
                        <div key={s} className={"chip"+((obData.styles||[]).includes(s)?" sel":"")} onClick={()=>{const arr=obData.styles||[];setObData(d=>({...d,styles:arr.includes(s)?arr.filter(x=>x!==s):[...arr,s]}))}}><span>{s}</span></div>
                      ))}
                    </div>
                    <button className="btn btn-gold" onClick={()=>setObStep(5)}>Next</button>
                    <button className="ob-skip" onClick={()=>setObStep(5)}>Skip for now</button>
                  </div>
                )}
                {obStep === 5 && (
                  <div className="onboard-content">
                    <div className="ob-progress"><div className="ob-dot filled"/><div className="ob-dot filled"/><div className="ob-dot filled"/><div className="ob-dot filled"/><div className="ob-dot active"/><div className="ob-dot"/><div className="ob-dot"/><div className="ob-dot"/></div>
                    <div className="step-title">Know Yourself?</div>
                    <div className="step-sub">Do you know your zodiac, MBTI, or life path?</div>
                    <div style={{display:"flex",flexDirection:"column",gap:12,width:"100%",maxWidth:320}}>
                      <button className="btn btn-gold" onClick={()=>setObStep(14)} style={{background:"linear-gradient(135deg,var(--gold),var(--amber))"}}>Skip — Set Up Later</button>
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
                      {ZODIAC.map(z => (
                        <div key={z} className={"chip"+(obData.zodiac===z?" sel":"")} onClick={()=>setObData(d=>({...d,zodiac:z}))}><span>{ZE[z]} {z}</span></div>
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
                      {CHINESE.map(c => (
                        <div key={c} className={"chip"+(obData.chinese===c?" sel":"")} onClick={()=>setObData(d=>({...d,chinese:c}))}><span>{CE[c]} {c}</span></div>
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
                      {MBTI.map(m => (
                        <div key={m} className={"chip"+(obData.mbti===m?" sel":"")} onClick={()=>setObData(d=>({...d,mbti:m}))}><span>{m}</span></div>
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
                      {LIFE_PATHS.map(lp => (
                        <div key={lp} className={"chip"+(obData.lifePath===lp?" sel":"")} onClick={()=>setObData(d=>({...d,lifePath:lp}))}><span>{lp}</span></div>
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
                        <select className="inp" value={testBirthMonth} onChange={e=>setTestBirthMonth(e.target.value)}>
                          <option value="">Month</option>
                          {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m,i)=><option key={i} value={String(i+1)}>{m}</option>)}
                        </select>
                        <input className="inp" placeholder="Day" type="number" min={1} max={31} value={testBirthDay} onChange={e=>setTestBirthDay(e.target.value)} />
                        <button className="btn btn-gold" onClick={()=>{if(testBirthMonth&&testBirthDay){const z=calcZodiac(parseInt(testBirthMonth),parseInt(testBirthDay));setObData(d=>({...d,zodiac:z}));showToast("You are a "+z+"! "+ZE[z]);setObStep(14)}}}>Calculate</button>
                        <button className="back-link" onClick={()=>setObStep(10)}>Back</button>
                      </div>
                    )}
                    {testScreen === "chinese" && (
                      <div>
                        <div className="step-title">Chinese Zodiac</div>
                        <div className="step-sub">Enter your birth year</div>
                        <input className="inp" placeholder="Year (e.g. 1995)" type="number" min={1900} max={2026} value={testBirthYear} onChange={e=>setTestBirthYear(e.target.value)} />
                        <button className="btn btn-gold" onClick={()=>{if(testBirthYear){const c=calcChineseZodiac(parseInt(testBirthYear));setObData(d=>({...d,chinese:c}));showToast("You are the "+c+"! "+CE[c]);setObStep(14)}}}>Calculate</button>
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
                            <div className={"chip"+(testMbtiAnswers.ei==="e"?" sel":"")} onClick={()=>setTestMbtiAnswers(p=>({...p,ei:"e"}))}><span>Talk to everyone</span></div>
                            <div className={"chip"+(testMbtiAnswers.ei==="i"?" sel":"")} onClick={()=>setTestMbtiAnswers(p=>({...p,ei:"i"}))}><span>Find one person</span></div>
                          </div>
                          <div style={{fontSize:14,fontWeight:700,color:"var(--gold)",marginBottom:8}}>You prefer...</div>
                          <div className="chips" style={{marginBottom:16}}>
                            <div className={"chip"+(testMbtiAnswers.sn==="s"?" sel":"")} onClick={()=>setTestMbtiAnswers(p=>({...p,sn:"s"}))}><span>Facts & details</span></div>
                            <div className={"chip"+(testMbtiAnswers.sn==="n"?" sel":"")} onClick={()=>setTestMbtiAnswers(p=>({...p,sn:"n"}))}><span>Big picture ideas</span></div>
                          </div>
                          <div style={{fontSize:14,fontWeight:700,color:"var(--gold)",marginBottom:8}}>Decisions come from...</div>
                          <div className="chips" style={{marginBottom:16}}>
                            <div className={"chip"+(testMbtiAnswers.tf==="t"?" sel":"")} onClick={()=>setTestMbtiAnswers(p=>({...p,tf:"t"}))}><span>Logic & analysis</span></div>
                            <div className={"chip"+(testMbtiAnswers.tf==="f"?" sel":"")} onClick={()=>setTestMbtiAnswers(p=>({...p,tf:"f"}))}><span>Values & impact</span></div>
                          </div>
                          <div style={{fontSize:14,fontWeight:700,color:"var(--gold)",marginBottom:8}}>You like things...</div>
                          <div className="chips" style={{marginBottom:16}}>
                            <div className={"chip"+(testMbtiAnswers.jp==="j"?" sel":"")} onClick={()=>setTestMbtiAnswers(p=>({...p,jp:"j"}))}><span>Planned & structured</span></div>
                            <div className={"chip"+(testMbtiAnswers.jp==="p"?" sel":"")} onClick={()=>setTestMbtiAnswers(p=>({...p,jp:"p"}))}><span>Flexible & open</span></div>
                          </div>
                          <button className="btn btn-gold" onClick={()=>{const mbti=calcMbti(testMbtiAnswers);setObData(d=>({...d,mbti}));showToast("You are "+mbti+"!");setObStep(14)}}>Calculate</button>
                          <button className="back-link" onClick={()=>setObStep(10)}>Back</button>
                        </div>
                      </div>
                    )}
                    {testScreen === "lifepath" && (
                      <div>
                        <div className="step-title">Life Path Number</div>
                        <div className="step-sub">Enter your full birth date</div>
                        <select className="inp" value={testBirthMonth} onChange={e=>setTestBirthMonth(e.target.value)}>
                          <option value="">Month</option>
                          {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m,i)=><option key={i} value={String(i+1)}>{m}</option>)}
                        </select>
                        <input className="inp" placeholder="Day" type="number" min={1} max={31} value={testBirthDay} onChange={e=>setTestBirthDay(e.target.value)} />
                        <input className="inp" placeholder="Year" type="number" min={1900} max={2026} value={testBirthYear} onChange={e=>setTestBirthYear(e.target.value)} />
                        <button className="btn btn-gold" onClick={()=>{if(testBirthMonth&&testBirthDay&&testBirthYear){const lp=calcLifePath(parseInt(testBirthMonth),parseInt(testBirthDay),parseInt(testBirthYear));setObData(d=>({...d,lifePath:lp}));showToast("Life Path "+lp+"!");setObStep(14)}}}>Calculate</button>
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
                    <input ref={photoInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={async (e)=>{const f=e.target.files?.[0];if(f){showToast("Uploading...");const url=await uploadImage(f,"avatars");if(url){setObProfilePic(url);showToast("Photo added!")}}}} />
                    <div className="ob-upload-zone" onClick={() => photoInputRef.current?.click()}>
                      {obProfilePic ? <img loading="lazy" src={obProfilePic} alt="Profile" /> : (
                        <>
                          <div className="ob-upload-icon">📸</div>
                          <div className="ob-upload-text">Tap to add photo</div>
                        </>
                      )}
                    </div>
                    <button className="btn btn-gold" onClick={()=>setObStep(15)}>Next</button>
                    <button className="ob-skip" onClick={()=>setObStep(15)}>Skip for now</button>
                    <button className="back-link" onClick={()=>setObStep(9)}>Back</button>
                  </div>
                )}
                {obStep === 15 && (
                  <div className="onboard-content">
                    <div className="step-title">Your Portfolio</div>
                    <div className="step-sub">Show off your best work</div>
                    <div className="ob-portfolio-grid">
                      {[0,1,2,3,4,5].map(i => (
                        <div key={i} className="ob-portfolio-slot" onClick={() => {
                          const sampleImgs = ["https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=400&fit=crop","https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=300&h=400&fit=crop","https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=300&h=400&fit=crop","https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=400&fit=crop","https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=300&h=400&fit=crop","https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=300&h=400&fit=crop"];
                          if (obPortfolioItems.length <= i) {
                            setObPortfolioItems(prev => [...prev, {img: sampleImgs[i % sampleImgs.length], title:"Work "+(i+1)}]);
                            showToast("Work added!");
                          }
                        }}>
                          {obPortfolioItems[i] ? <img loading="lazy" src={obPortfolioItems[i].img} alt="Work" /> : <div className="ob-portfolio-plus">+</div>}
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
                      ].map(s => (
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
                    <div style={{width:"100%",maxWidth:360,marginBottom:16}}>
                      <div style={{fontSize:12,color:"rgba(255,255,255,0.5)",marginBottom:6}}>Have a referral code? (optional)</div>
                      <div style={{display:"flex",gap:8}}>
                        <input className="inp" placeholder="MUSE-XXXXXX" value={obData.referralCode || ""} onChange={e=>setObData(prev=>({...prev,referralCode:e.target.value}))} style={{margin:0,flex:1,textTransform:"uppercase",letterSpacing:1,fontFamily:"monospace"}} />
                      </div>
                      {obData.referralCode && obData.referralCode.length >= 6 && (
                        <div style={{fontSize:11,color:"#4ecdc4",marginTop:6}}>🎉 You and your friend will both get a free month when you subscribe!</div>
                      )}
                    </div>
                    <button className="btn btn-gold" onClick={async ()=>{
                      setCurrentUser(prev=>({...prev,name:obData.name||prev.name,type:obData.type||prev.type,avatar:obProfilePic||prev.avatar}));
                      const geo = await getGeolocation();
                      if(authUser?.id){
                        try{await authFetch("/api/muse/auth",{method:"POST",body:JSON.stringify({action:"update-profile",auth_id:authUser.id,updates:{
                          name:obData.name,loc:obData.loc,bio:obData.bio,type:obData.type,
                          looking:obData.looking,styles:obData.styles,
                          zodiac:obData.zodiac,chinese:obData.chinese,mbti:obData.mbti,life_path:obData.lifePath,
                          avatar:obProfilePic,
                          ...(geo ? { lat: geo.lat, long: geo.long, city: geo.city } : {})
                        }})});}catch(e){}
                        // Apply referral code if entered
                        if (obData.referralCode) {
                          try { await authFetch("/api/muse/referral", { method: "POST", body: JSON.stringify({ action: "apply", referralCode: obData.referralCode.trim().toUpperCase() }) }); } catch {}
                        }
                      }
                      setScreen("discover");showToast("Welcome to Muse!")
                    }}>Enter Muse</button>
                    <button className="back-link" onClick={()=>setObStep(16)}>Back</button>
                  </div>
                )}
              </div>
            </div>
            <div className={"screen-el"+(screen==="discover"?" active":"")}>
              <div className="discover-wrap">
                <div className="hdr">
                  <div className="logo-link" style={{fontSize:28}}>Discover</div>
                  <div style={{flex:1}} />
                  <div style={{display:"flex",gap:4}}>
                    {!discoverSearchOpen ? (
                      <button className="hdr-btn" style={{width:34,height:34}} onClick={()=>setDiscoverSearchOpen(true)}><FiSearch size={16} /></button>
                    ) : (
                      <div style={{display:"flex",alignItems:"center",gap:6,animation:"fadeIn .2s ease"}}>
                        <input className="inp" placeholder="Search..." value={discoverSearch} onChange={e=>setDiscoverSearch(e.target.value)} autoFocus style={{margin:0,padding:"6px 10px",fontSize:12,width:120,borderRadius:99}} />
                        <button className="hdr-btn" style={{width:30,height:30,borderRadius:"50%",fontSize:12}} onClick={()=>{setDiscoverSearchOpen(false);setDiscoverSearch("")}}>✕</button>
                      </div>
                    )}
                    {!discoverSearchOpen && (<>
<button className="hdr-btn" onClick={()=>setShowDiscoveryPrefs(true)} style={{width:34,height:34}}><FiSettings size={16} /></button>
<button className="hdr-btn" onClick={()=>setShowFilterModal(true)} style={{width:34,height:34}}><FiFilter size={16} /></button>
<button className="hdr-btn" onClick={()=>setMapView(v=>!v)} title="Map View" style={{width:34,height:34}}><FiCompass size={16} /></button>
<button className={"hdr-btn"+(boostActive?" hdr-btn-glow":"")} onClick={()=>{if(!boostActive){const end=Date.now()+1800000;setBoostActive(true);setBoostEnd(end);try{safeSetItem("muse_boost",""+end);}catch{}showToast("Boost on for 30 min!");}else{setBoostActive(false);setBoostEnd(0);try{safeRemoveItem("muse_boost");}catch{}showToast("Boost off");}}} style={{width:34,height:34}}><FiZap size={16} /></button>
</>)}
</div>
                </div>
                {mapView && <div ref={mapContainerRef} style={{position:"absolute",inset:0,zIndex:50,background:"#0a0612",borderRadius:0}} />}
                {mapView && <MuseMap filteredProfiles={filteredProfiles} myGeo={myGeo ? {lat:myGeo.lat, lng:myGeo.long} : undefined} containerRef={mapContainerRef} show={mapView} />}
                {!mapView && (<><div className="card-stack" role="application" aria-label="Swipe cards to discover creatives" aria-roledescription="card carousel">
                  {filteredProfiles.slice(currentIdx, currentIdx+3).map((profile, idx) => {
                    const isTop = idx === 0;
                    return (
                       <div
                         key={profile.id}
                         className={"swipe-card"+(isTop?" top-card":"")}
                         style={{zIndex:3-idx,transform:"scale("+(Math.max(0.92, 1 - idx * 0.04))+")"}}
                         onPointerDown={isTop ? onPointerDown : undefined}
                         onPointerMove={isTop ? onPointerMove : undefined}
                         onPointerUp={isTop ? onPointerUp : undefined}
                         onPointerCancel={isTop ? onPointerCancel : undefined}
                       >
                           {(() => {
                              const allPhotos: string[] = (profile as any).photos?.length ? (profile as any).photos : [profile.img];
                              const portraitPics = allPhotos.filter((p:string) => !!PORTRAIT_IMG[p]);
                              const landscapePics = allPhotos.filter((p:string) => !PORTRAIT_IMG[p]);
                              const photos: string[] = [...portraitPics, ...landscapePics].slice(0, 6);
                              if (photos.length < 4) photos.push(...allPhotos.slice(0, Math.max(0, 4 - photos.length)));
                              const heroSrc = photos[currentPhotoIdx] || profile.img;
                              const heroPortrait = !!PORTRAIT_IMG[heroSrc];
                               return (
                                 <>
                                  <div className="card-hero" ref={heroRef} onMouseMove={(e)=>{
                                    const rect=e.currentTarget.getBoundingClientRect();
                                    const x=(e.clientX-rect.left)/rect.width-0.5;
                                    const y=(e.clientY-rect.top)/rect.height-0.5;
                                    const img=e.currentTarget.querySelector('img') as HTMLImageElement;
                                    if(img) img.style.transform=`perspective(800px) rotateY(${x*8}deg) rotateX(${-y*8}deg) scale(1.02)`;
                                  }} onMouseLeave={(e)=>{const img=e.currentTarget.querySelector('img') as HTMLImageElement;if(img)img.style.transform='perspective(800px) rotateY(0deg) rotateX(0deg) scale(1)';}}>
                                   <img
                                     loading="lazy" src={heroSrc} alt={profile.name} draggable="false" onError={handleImgError}
                                     style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:heroPortrait?"center top":"center",background:"linear-gradient(160deg,#1a0a2e,#0a0612)",position:"absolute",top:0,left:0,transition:"transform 0.15s ease-out",transformStyle:"preserve-3d"}}
                                   />
                                  <div className="card-shine" />
                                  <div className="card-gradient" />
                                  <div className="card-border" />
                                </div>
                                <div className={"card-hero-info"+(cardScrolled?" hidden":"")}>
                                  <div className="card-hero-name">
                                    {profile.name}
                                    {profile.verified && <span className="card-verified-mark">✓</span>}
                                    {profile.online && <span className="card-online-dot" />}
                                  </div>
                                  <div className="card-hero-type">{profile.type} · {profile.loc?.split(",")[0]}</div>
                                </div>
                                {isTop && (
                                  <>
                                    <div className={"card-photo-zone card-photo-zone-left"+(cardScrolled?" hidden":"")} onClick={(e)=>{e.stopPropagation();setCurrentPhotoIdx(prev=>Math.max(0,prev-1))}}><span style={{position:"absolute",left:6,top:"50%",transform:"translateY(-50%)",width:28,height:28,borderRadius:"50%",background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:700,backgroundClip:"text",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundImage:"linear-gradient(120deg,#FFD700,#FF8A80,#D4A5FF,#FFD700)",backgroundSize:"300% 300%",animation:"dotLava 3s ease-in-out infinite",pointerEvents:"none",lineHeight:"28px"}}>‹</span></div>
                                    <div className={"card-photo-zone card-photo-zone-right"+(cardScrolled?" hidden":"")} onClick={(e)=>{e.stopPropagation();setCurrentPhotoIdx(prev=>Math.min(photos.length-1,prev+1))}}><span style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",width:28,height:28,borderRadius:"50%",background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:700,backgroundClip:"text",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundImage:"linear-gradient(120deg,#FFD700,#FF8A80,#D4A5FF,#FFD700)",backgroundSize:"300% 300%",animation:"dotLava 3s ease-in-out infinite",pointerEvents:"none",lineHeight:"28px"}}>›</span></div>
                                  </>
                                )}
                                <div className={"card-photo-dots"+(cardScrolled?" hidden":"")}>
                                  {photos.map((_:string,i:number)=><div key={i} className={"card-photo-dot"+(i===currentPhotoIdx?" active":"")} />)}
                                </div>
                                 {showNoteTooltip && (
                                   <div style={{textAlign:"center",padding:"4px 16px 0",animation:"tooltipIn .4s ease"}}>
                                     <div style={{display:"inline-block",background:"rgba(255,215,0,0.12)",border:"1px solid rgba(255,215,0,0.25)",borderRadius:10,padding:"8px 14px",fontSize:12,color:"var(--text2)",maxWidth:280}}>
                                       💬 <b>Send a note</b> with your like to stand out — introduce yourself or mention why you want to connect.
                                       <button onClick={()=>{setShowNoteTooltip(false);safeSetItem("muse_note_seen","1");}} style={{display:"block",width:"100%",marginTop:6,background:"none",border:"none",color:"var(--gold)",fontSize:11,cursor:"pointer",fontWeight:600}}>Got it</button>
                                     </div>
                                   </div>
                                 )}
                                 {isTop && (
                                  <>
                                    <div ref={likeLabelRef} className="label label-like">LIKE</div>
                                    <div ref={nopeLabelRef} className="label label-nope">NOPE</div>
                                  </>
                                )}
                                <div className="card-info-scroll" ref={cardScrollRef} onScroll={(e)=>{if(isTop){const scrollY=(e.target as HTMLElement)?.scrollTop||0;setCardScrolled(scrollY>60);}}}>
                                  <div className="card-details">
                                    {(profile as any).prompts?.length > 0 && (
                                      <div className="card-section">
                                        <div className="card-section-title">Prompts</div>
                                        <div className="card-prompts" onClick={(e)=>e.stopPropagation()} onPointerDown={(e)=>e.stopPropagation()}>
                                          <button className="card-prompt-arrow" onClick={(e)=>{e.stopPropagation();setPromptIdx(prev=>Math.max(0,prev-1))}} style={{opacity:promptIdx>0?1:0.3}}>‹</button>
                                          <div className="card-prompt-text">
                                            <div className="card-prompt-q">{(profile as any).prompts[promptIdx]?.q||""}</div>
                                            <div className="card-prompt-a">{(profile as any).prompts[promptIdx]?.a||""}</div>
                                          </div>
                                          <button className="card-prompt-arrow" onClick={(e)=>{e.stopPropagation();setPromptIdx(prev=>Math.min(((profile as any).prompts.length-1),prev+1))}} style={{opacity:promptIdx<((profile as any).prompts.length-1)?1:0.3}}>›</button>
                                        </div>
                                      </div>
                                    )}
                                    {profile.bio && <div className="card-section"><div className="card-section-title">About</div><div className="card-section-text">{profile.bio}</div></div>}
                                    {profile.looking.length>0 && <div className="card-section"><div className="card-section-title">Looking for</div><div className="card-section-text">{profile.looking.join(", ")}</div></div>}
                                    <div className="card-section"><div className="card-section-title">Creative Style</div>
                                      <div className="card-section-tags">{profile.styles.map(s=><span key={s} className="tag">{s}</span>)}</div>
                                    </div>
                                    <div className="card-section">
                                      <div className="card-section-title">Personality</div>
                                      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                                        {(profile as any).zodiac && <span className="tag" style={{background:"rgba(212,165,255,0.12)",border:"1px solid rgba(212,165,255,0.25)",color:"var(--lavender)"}}>{({Aries:"♈ Aries",Taurus:"♉ Taurus",Gemini:"♊ Gemini",Cancer:"♋ Cancer",Leo:"♌ Leo",Virgo:"♍ Virgo",Libra:"♎ Libra",Scorpio:"♏ Scorpio",Sagittarius:"♐ Sagittarius",Capricorn:"♑ Capricorn",Aquarius:"♒ Aquarius",Pisces:"♓ Pisces"} as any)[(profile as any).zodiac]||(profile as any).zodiac}</span>}
                                        {(profile as any).mbti && <span className="tag" style={{background:"rgba(255,215,0,0.1)",border:"1px solid rgba(255,215,0,0.2)",color:"var(--gold)"}}>{({INTJ:"Architect",INTP:"Logician",ENTJ:"Commander",ENTP:"Debater",INFJ:"Advocate",INFP:"Mediator",ENFJ:"Protagonist",ENFP:"Campaigner",ISTJ:"Logistician",ISFJ:"Defender",ESTJ:"Executive",ESFJ:"Consul",ISTP:"Virtuoso",ISFP:"Adventurer",ESTP:"Entrepreneur",ESFP:"Entertainer"} as any)[(profile as any).mbti]||(profile as any).mbti} · {(profile as any).mbti}</span>}
                                        {(profile as any).chinese && <span className="tag" style={{background:"rgba(255,138,128,0.1)",border:"1px solid rgba(255,138,128,0.2)",color:"var(--coral)"}}>🐉 {(profile as any).chinese}</span>}
                                        {(profile as any).lifePath && <span className="tag" style={{background:"rgba(152,251,152,0.1)",border:"1px solid rgba(152,251,152,0.2)",color:"var(--mint)"}}>🔢 Life Path {(profile as any).lifePath}</span>}
                                        {(profile as any).connection && <span className="tag" style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",color:"var(--text2)"}}>{({collab:"🤝 Collab",partner:"💼 Partner",friend:"👋 Friend",mentor:"🎓 Mentor"} as any)[(profile as any).connection]||(profile as any).connection}</span>}
                                      </div>
                                    </div>
                                    {(profile as any).zodiac && (
                                      <div className="card-section">
                                        <div className="card-section-title">Astrology</div>
                                        <div className="card-section-text" style={{lineHeight:1.6}}>
                                          <div style={{marginBottom:6}}><strong style={{color:"var(--lavender)"}}>{({Aries:"♈ Aries — The Pioneer",Taurus:"♉ Taurus — The Builder",Gemini:"♊ Gemini — The Communicator",Cancer:"♋ Cancer — The Nurturer",Leo:"♌ Leo — The Performer",Virgo:"♍ Virgo — The Analyst",Libra:"♎ Libra — The Diplomat",Scorpio:"♏ Scorpio — The Strategist",Sagittarius:"♐ Sagittarius — The Explorer",Capricorn:"♑ Capricorn — The Achiever",Aquarius:"♒ Aquarius — The Visionary",Pisces:"♓ Pisces — The Dreamer"} as any)[(profile as any).zodiac]||(profile as any).zodiac}</strong></div>
                                          <div style={{fontSize:12,color:"var(--text2)"}}>{({Aries:"Bold, ambitious, and always first to try something new. Natural leader energy.",Taurus:"Reliable, patient, and deeply creative. Values quality over quantity.",Gemini:"Versatile, expressive, and quick-witted. Thrives on variety.",Cancer:"Intuitive, emotional, and protective. Creates safe spaces for others.",Leo:"Creative, passionate, and generous. Natural performer and collaborator.",Virgo:"Analytical, practical, and detail-oriented. Brings precision to every project.",Libra:"Balanced, social, and artistic. Sees beauty in everything.",Scorpio:"Resourceful, brave, and passionate. Deep focus and intensity.",Sagittarius:"Generous, idealistic, and adventurous. Always exploring new horizons.",Capricorn:"Responsible, disciplined, and ambitious. Builds lasting things.",Aquarius:"Progressive, original, and independent. Thinks outside the box.",Pisces:"Compassionate, artistic, and intuitive. Feels deeply and creates freely."} as any)[(profile as any).zodiac]||""}</div>
                                        </div>
                                      </div>
                                    )}
                                    <div className="card-section">
                                      <div className="card-section-title">Portfolio</div>
                                      {(() => {
                                        const albumPhotos = cardAlbumIdx > 0 ? cardAlbumPhotos : allPhotos;
                                        const portIdx = Math.min(portfolioPhotoIdx, albumPhotos.length - 1);
                                        if (!albumPhotos.length) return <div style={{fontSize:12,color:"var(--muted)"}}>No portfolio photos</div>;
                                        return (
                                          <div>
                                            {cardAlbums.length > 0 && (
                                              <div style={{display:"flex",gap:4,overflowX:"auto",paddingBottom:6,marginBottom:8,scrollbarWidth:"none"}}>
                                                <button onClick={(e)=>{e.stopPropagation();setCardAlbumIdx(0);setPortfolioPhotoIdx(0)}} style={{flexShrink:0,padding:"5px 12px",borderRadius:99,border:"1px solid",borderColor:cardAlbumIdx===0?"var(--gold)":"rgba(255,255,255,0.08)",background:cardAlbumIdx===0?"rgba(255,215,0,0.12)":"transparent",color:cardAlbumIdx===0?"var(--gold)":"var(--text2)",fontSize:11,fontWeight:600,cursor:"pointer"}}>All</button>
                                                {cardAlbums.map((a,i)=><button key={a.id} onClick={(e)=>{e.stopPropagation();setCardAlbumIdx(i+1);setPortfolioPhotoIdx(0)}} style={{flexShrink:0,padding:"5px 12px",borderRadius:99,border:"1px solid",borderColor:cardAlbumIdx===i+1?"var(--gold)":"rgba(255,255,255,0.08)",background:cardAlbumIdx===i+1?"rgba(255,215,0,0.12)":"transparent",color:cardAlbumIdx===i+1?"var(--gold)":"var(--text2)",fontSize:11,fontWeight:600,cursor:"pointer"}}>{a.title}</button>)}
                                              </div>
                                            )}
                                            <div
                                              style={{position:"relative",borderRadius:14,overflow:"hidden",aspectRatio:"3/4",background:"rgba(255,255,255,0.03)",cursor:"pointer"}}
                                              onClick={()=>{setLightboxPhotos(albumPhotos);setLightboxIdx(portIdx)}}
                                            >
                                              <img loading="lazy" src={albumPhotos[portIdx]} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={handleImgError} />
                                              {/* Tap zones */}
                                              {albumPhotos.length > 1 && (
                                                <>
                                                  <div onClick={(e)=>{e.stopPropagation();setPortfolioPhotoIdx(p=>Math.max(0,p-1))}} style={{position:"absolute",left:0,top:0,width:"30%",height:"100%",zIndex:2}} />
                                                  <div onClick={(e)=>{e.stopPropagation();setPortfolioPhotoIdx(p=>Math.min(albumPhotos.length-1,p+1))}} style={{position:"absolute",right:0,top:0,width:"30%",height:"100%",zIndex:2}} />
                                                </>
                                              )}
                                              {/* Left/Right arrows */}
                                              {albumPhotos.length > 1 && (
                                                <>
                                                  <button onClick={(e)=>{e.stopPropagation();setPortfolioPhotoIdx(p=>Math.max(0,p-1))}} style={{position:"absolute",left:6,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.5)",border:"none",borderRadius:"50%",width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:800,cursor:"pointer",zIndex:3,backgroundImage:"linear-gradient(120deg,#FFD700,#FF8A80,#D4A5FF,#FFD700)",backgroundSize:"300% 300%",WebkitBackgroundClip:"text",backgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:"34px",filter:"drop-shadow(0 1px 3px rgba(0,0,0,0.8))"}}>‹</button>
                                                  <button onClick={(e)=>{e.stopPropagation();setPortfolioPhotoIdx(p=>Math.min(albumPhotos.length-1,p+1))}} style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.5)",border:"none",borderRadius:"50%",width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:800,cursor:"pointer",zIndex:3,backgroundImage:"linear-gradient(120deg,#FFD700,#FF8A80,#D4A5FF,#FFD700)",backgroundSize:"300% 300%",WebkitBackgroundClip:"text",backgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:"34px",filter:"drop-shadow(0 1px 3px rgba(0,0,0,0.8))"}}>›</button>
                                                </>
                                              )}
                                            </div>
                                            {/* Dot indicators */}
                                            {albumPhotos.length > 1 && (
                                              <div style={{display:"flex",justifyContent:"center",gap:5,marginTop:8}}>
                                                {albumPhotos.map((_:string,i:number)=>(
                                                  <div key={i} onClick={(e)=>{e.stopPropagation();setPortfolioPhotoIdx(i)}} style={{width:6,height:6,borderRadius:"50%",background:i===portIdx?"var(--gold)":"rgba(255,255,255,0.15)",cursor:"pointer",transition:"all .2s"}} />
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                    <div className="match-score" style={{marginBottom:16}}><div className="score-bar"><div className="score-fill" style={{width:profile.score+"%"}} /></div><span className="score-text">{profile.score}%</span></div>
                                    {(profile as any).badges?.length > 0 && <div className="card-section"><div className="card-section-title">Badges</div><div className="card-section-tags">{(profile as any).badges.map((b:any,i:number)=><span key={i} className="tag" style={{background:`${b.color}20`,border:`1px solid ${b.color}40`,color:b.color}}>{b.icon} {b.name}</span>)}</div></div>}
                                    <div className="card-section" style={{fontSize:12,color:"var(--muted)"}}>📍 {profile.loc}</div>
                                 </div>
                                 </div>
                                 {isTop && (
                                   <div className={"match-fab"+(cardScrolled?" hidden":"")}>
                                    <button className={"match-fab-btn"+(showMatchMenu?" open":"")} onClick={()=>setShowMatchMenu(v=>!v)} aria-label="Match actions">✦</button>
                                    <div className={"match-radial"+(showMatchMenu?" open":"")}>
                                      <button className="match-radial-btn btn-rewind" style={{left:-100,top:0}} onClick={doRewind} aria-label="Rewind">↺</button>
                                      <button className="match-radial-btn btn-nope" style={{left:-92,top:-38}} onClick={()=>doSwipe("left")} aria-label="Pass">✕</button>
                                      <button className="match-radial-btn btn-super" style={{left:-71,top:-71}} onClick={()=>doSwipe("super")} aria-label="Super Like">★</button>
                                      <button className="match-radial-btn btn-like" style={{left:-38,top:-92}} onClick={()=>doSwipe("right")} aria-label="Like">♥</button>
                                      <button className="match-radial-btn btn-note" style={{left:0,top:-100}} onClick={doLikeWithNote} aria-label="Like + Note">✎</button>
                                    </div>
                                  </div>
                                 )}
                                 </>
                              );
                            })()}
                       </div>
                      );
                    })}
                   {currentIdx >= filteredProfiles.length && (
                    <div className="empty-state">
                      <div className="empty-icon"><FiCompass size={48} /></div>
                      <div className="empty-title">All caught up!</div>
                      <div className="empty-sub">Check back later for more creatives</div>
                      <button className="btn btn-gold" onClick={()=>{setCurrentIdx(0);setDailyLikes(10);setSuperLikes(3)}}>Reset</button>
                    </div>
                  )}
                 </div>
                 {!isUnlimited && dailyLikes < 10 && <div className="limit-bar"><div className="limit-dots">{Array.from({length:10},(_,i)=><div key={i} className={"limit-dot"+(i<dailyLikes?" filled":"")} />)}</div><div className="limit-text">{dailyLikes} likes left</div></div>}
                 {!isUnlimited && superLikes < 3 && <div className="limit-bar"><div className="limit-dots">{Array.from({length:3},(_,i)=><div key={i} className={"limit-dot"+(i<superLikes?" super-filled":"")} />)}</div><div className="limit-text">{superLikes} super likes left</div></div>}
                  {isUnlimited && <div className="limit-bar" style={{background:"rgba(10,6,18,0.55)",border:"1px solid rgba(255,215,0,0.15)",borderRadius:99,padding:"6px 16px",marginTop:0,position:"absolute",top:8,left:"50%",transform:"translateX(-50%)",zIndex:20,backdropFilter:"blur(12px)",boxShadow:"0 4px 20px rgba(0,0,0,0.4)"}}><div style={{fontSize:12,fontWeight:700,color:"var(--gold)",letterSpacing:0.5}}>∞ Unlimited</div></div>}
                 </>)}
               </div>
               {galleryView && (
                 <div className="gallery-view" onClick={()=>setGalleryView(null)}>
                   <button className="gallery-view-close" onClick={(e)=>{e.stopPropagation();setGalleryView(null)}} aria-label="Close"><FiX size={22} /></button>
                   {galleryView.photos.length > 1 && (
                     <>
                       <button className="gallery-view-nav gallery-view-prev" onClick={(e)=>{e.stopPropagation();setGalleryView(v=>v?{...v,idx:(v.idx-1+v.photos.length)%v.photos.length}:v)}} aria-label="Previous"><FiChevronRight size={26} style={{transform:"rotate(180deg)"}} /></button>
                       <button className="gallery-view-nav gallery-view-next" onClick={(e)=>{e.stopPropagation();setGalleryView(v=>v?{...v,idx:(v.idx+1)%v.photos.length}:v)}} aria-label="Next"><FiChevronRight size={26} /></button>
                     </>
                   )}
                   <div className="gallery-view-img-wrap" onClick={(e)=>{e.stopPropagation()}}>
                     <img loading="lazy" src={galleryView.photos[galleryView.idx]} alt={galleryView.name} onError={handleImgError} />
                   </div>
                   <div className="gallery-view-meta">
                     <div className="gallery-view-name">{galleryView.name}</div>
                     <div className="gallery-view-count">{galleryView.idx+1} / {galleryView.photos.length}</div>
                   </div>
                 </div>
               )}
               {/* Lightbox: slide gallery with full-dimension fill */}
               {lightboxPhotos.length > 0 && (
                 <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.95)",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>{setLightboxPhotos([]);setLightboxIdx(0)}}>
                   <button onClick={(e)=>{e.stopPropagation();setLightboxPhotos([]);setLightboxIdx(0)}} style={{position:"absolute",top:16,right:16,zIndex:2,background:"rgba(255,255,255,0.1)",border:"none",borderRadius:"50%",width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#fff",fontSize:18}}>✕</button>
                   {lightboxPhotos.length > 1 && (
                     <>
                       <button onClick={(e)=>{e.stopPropagation();setLightboxIdx(i=>(i-1+lightboxPhotos.length)%lightboxPhotos.length)}} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",zIndex:2,background:"rgba(255,255,255,0.1)",border:"none",borderRadius:"50%",width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#fff",fontSize:22}}>‹</button>
                       <button onClick={(e)=>{e.stopPropagation();setLightboxIdx(i=>(i+1)%lightboxPhotos.length)}} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",zIndex:2,background:"rgba(255,255,255,0.1)",border:"none",borderRadius:"50%",width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#fff",fontSize:22}}>›</button>
                     </>
                   )}
                   <img src={lightboxPhotos[lightboxIdx] || lightboxPhotos[0]} alt="" style={{maxWidth:"100vw",maxHeight:"100vh",objectFit:"contain"}} onClick={(e)=>e.stopPropagation()} onError={handleImgError} />
                   <div style={{position:"absolute",bottom:20,color:"rgba(255,255,255,0.5)",fontSize:13}}>{lightboxIdx+1} / {lightboxPhotos.length}</div>
                 </div>
               )}
               <Nav active="discover" onNavigate={showScreen} onHamburgerToggle={openHamburger} />
            </div>
            <div className={"screen-el"+(screen==="connections"?" active":"")}>
              <div className="hdr">
                <button className="chat-back" onClick={()=>showScreen("discover")}><FiArrowLeft size={20} /></button>
                <div className="logo-link" style={{fontSize:28,background:"linear-gradient(90deg,#1E90FF,#87CEEE,#B0C4DE,#1E90FF,#ADD8E6,#1E90FF)",backgroundSize:"300% 100%"}}>Feed</div>
                <div style={{display:"flex",gap:4,marginRight:44}}>
                  {(["all","photos","text"] as const).map(f=>(
                    <div key={f} className={"conn-tab-sub"+(feedFilter===f?" active":"")} onClick={()=>setFeedFilter(f)} style={{fontSize:11,padding:"5px 10px",borderRadius:99}}>{f==="all"?"All":f==="photos"?"Photos":"Text"}</div>
                  ))}
                </div>
              </div>
              <div className="conn-scroll" style={{padding:"0 0 80px"}}>
                <div style={{padding:"12px 20px",display:"flex",gap:10,alignItems:"flex-start"}}>
                  <img loading="lazy" src={currentUser.avatar} alt="" style={{width:40,height:40,borderRadius:"50%",objectFit:"cover",flexShrink:0}} onError={handleImgError} />
                  <div style={{flex:1,display:"flex",flexDirection:"column",gap:8}}>
                    <textarea className="inp" placeholder="Share your work, ideas, or find collaborators..." rows={2} value={feedText} onChange={e=>setFeedText(e.target.value)} style={{resize:"none",fontSize:13,padding:"10px 14px",borderRadius:14,background:"var(--glass)",border:"1px solid rgba(255,255,255,0.06)"}} />
                    <div style={{display:"flex",gap:8,alignItems:"center",width:"100%"}}>
                      <label style={{width:36,height:36,borderRadius:10,background:"var(--glass)",border:"1px solid rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:16,color:"var(--text2)",flexShrink:0}}>
                        <FiImage size={16} />
                        <input type="file" accept="image/*,video/*" multiple style={{display:"none"}} onChange={async e=>{const files=Array.from(e.target.files||[]);if(!files.length)return;showToast("Uploading "+files.length+" file(s)...");const urls:string[]=[];for(const f of files){const url=await uploadImage(f,"feed");if(url)urls.push(url)}setFeedMedia(prev=>[...prev,...urls]);}} />
                      </label>
                      <button style={{width:36,height:36,borderRadius:10,background:"var(--glass)",border:"1px solid rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:16,color:"var(--text2)",flexShrink:0}} onClick={() => setShowEmojiPicker(!showEmojiPicker)}>😊</button>
                      {feedMedia.slice(0,2).map((url,i)=><div key={i} style={{position:"relative",width:36,height:36}}>{url.endsWith(".mp4")||url.includes("video")?<video src={url} style={{width:36,height:36,borderRadius:8,objectFit:"cover"}} />:<img loading="lazy" src={url} alt="" style={{width:36,height:36,borderRadius:8,objectFit:"cover"}} />}<button onClick={()=>setFeedMedia(prev=>prev.filter((_,j)=>j!==i))} style={{position:"absolute",top:-4,right:-4,width:16,height:16,borderRadius:"50%",background:"var(--coral)",border:"none",color:"#fff",fontSize:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><FiX size={10} /></button></div>)}
                    </div>
                    <div style={{display:"flex",gap:8,width:"100%"}}>
                      <button className="btn btn-gold" style={{flex:1,padding:"10px 0",fontSize:13,fontWeight:700,borderRadius:12}} onClick={async()=>{if(feedText.trim()||feedMedia.length){const txt=feedText.trim();const hasVideo=feedMedia.some(u=>u.endsWith(".mp4")||u.includes("video"));const type=feedMedia.length?hasVideo?"video":"photo":"text";setFeedText("");setFeedMedia([]);setFeedPosts(prev=>[{id:uid(),author:currentUser.name,avatar:currentUser.avatar,type,text:txt,likes:0,comments:0,shares:0,time:"Just now",img:feedMedia[0]||undefined,media:feedMedia,liked:false,saved:false,reactions:{}},...prev]);try{await apiFetch("/api/muse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"feed",text:txt,media:feedMedia,userId:currentUser.id})});showToast("Posted!")}catch{showToast("Failed to post")}}}}>Post</button>
                      <button className="btn btn-outline" style={{flex:1,padding:"10px 0",fontSize:13,fontWeight:600,borderRadius:12}} onClick={async()=>{if(feedText.trim()||feedMedia.length){const txt=feedText.trim();setFeedText("");setFeedMedia([]);const moment={id:uid(),author:currentUser.name,avatar:currentUser.avatar,type:feedMedia.length?"photo":"text",text:txt,img:feedMedia[0]||undefined,media:[...feedMedia],time:"Just now"};setStories(prev=>[moment,...prev]);showToast("Moment posted!");}}}>⚡ Moment</button>
                    </div>
                    {showEmojiPicker && <div style={{display:"flex",gap:6,flexWrap:"wrap",padding:"8px 0"}}>{["😍","🔥","❤️","😂","😢","😡","👍","🎉","✨","💯","👏","🙌"].map(e=><span key={e} style={{fontSize:22,cursor:"pointer",transition:"transform .15s"}} onClick={()=>{setFeedText(prev=>prev+" "+e);setShowEmojiPicker(false)}} onMouseEnter={e=>e.currentTarget.style.transform="scale(1.3)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>{e}</span>)}</div>}
                  </div>
                </div>
                {!bootstrapped ? (
                  <ScreenSkeleton rows={4} image />
                ) : feedPosts.length === 0 && feedPostsStatic.length === 0 ? (
                  <div className="empty-state" style={{paddingTop:60}}>
                    <div className="empty-icon" style={{fontSize:48}}>📝</div>
                    <div className="empty-title">No posts yet</div>
                    <div className="empty-sub">Be the first to share your creative work!</div>
                  </div>
                ) : (
                [...feedPostsStatic,...feedPosts].sort((a,b)=>b.id-a.id).filter(p=>feedFilter==="all"||p.type===feedFilter).map(post=>{
                  const feedReactionArr = feedReactions[post.id]||[];
                  const totalReactions = ["❤️","🔥","😍","😂","😢","😡"].reduce((s,r)=>s+(feedReactionArr.filter(x=>x===r).length||0),(post.liked?1:0));
                  return (
                    <div key={post.id} className="conn-card" style={{flexDirection:"column",margin:"0 20px 14px",padding:0,overflow:"hidden"}}>
                      <div style={{padding:"14px 18px 0",display:"flex",alignItems:"center",gap:10}}>
                        <img loading="lazy" src={post.avatar} alt="" style={{width:40,height:40,borderRadius:"50%",objectFit:"cover"}} onError={handleImgError} />
                        <div>
                          <div style={{fontSize:15,fontWeight:700}}>{post.author}</div>
                          <div style={{fontSize:11,color:"var(--muted)"}}>{post.time}</div>
                        </div>
                        <button style={{marginLeft:"auto",background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:16}} onClick={()=>{setShowReport(true);setReportTarget({id:post.id,type:"feed_post",name:post.author})}}><FiMoreHorizontal size={16} /></button>
                      </div>
                      <div style={{padding:"10px 18px",fontSize:14,color:"var(--text)",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{post.text}</div>
                      {post.img && (
                        <div style={{position:"relative"}}>
                          <img loading="lazy" src={post.img} alt="" style={{width:"100%",maxHeight:360,objectFit:"cover",display:"block"}} onError={handleImgError} />
                        </div>
                      )}
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 18px",borderTop:"1px solid rgba(255,255,255,0.04)"}}>
                        <div style={{display:"flex",gap:4,alignItems:"center"}}>
                          {totalReactions > 0 && <span style={{fontSize:13,color:"var(--text2)"}}>{totalReactions}</span>}
                          {(["❤️","🔥","😍","😂","😢","😡"] as const).map(r=>{
                            const rc = feedReactionArr.filter(x=>x===r).length;
                            return rc > 0 ? <span key={r} style={{fontSize:15}} title={rc+" reactions"}>{r}</span> : null;
                          })}
                        </div>
                        <div style={{display:"flex",gap:4}}>
                          {post.comments > 0 && <span style={{fontSize:12,color:"var(--muted)"}}>{post.comments} comments</span>}
                          {post.shares > 0 && <span style={{fontSize:12,color:"var(--muted)"}}>{post.shares} shares</span>}
                        </div>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-around",padding:"10px 18px",borderTop:"1px solid rgba(255,255,255,0.04)"}}>
                        <button style={{background:post.liked?"rgba(239,68,68,0.15)":"rgba(255,255,255,0.06)",border:post.liked?"1px solid rgba(239,68,68,0.3)":"1px solid rgba(255,255,255,0.08)",color:post.liked?"var(--coral)":"var(--text2)",cursor:"pointer",fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:6,padding:"6px 16px",borderRadius:99,transition:"all .2s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(239,68,68,0.15)"} onMouseLeave={e=>e.currentTarget.style.background=post.liked?"rgba(239,68,68,0.15)":"rgba(255,255,255,0.06)"} onClick={()=>{setFeedPosts(prev=>prev.map(p=>p.id===post.id?({...p,liked:!p.liked}):p));if(feedPostsStatic.some(p=>p.id===post.id))setFeedPostsStatic(prev=>prev.map(p=>p.id===post.id?({...p,liked:!p.liked}):p));}}
>♥ {post.likes+(post.liked?1:0)}</button>
                        <button style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)",color:"var(--text2)",cursor:"pointer",fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:6,padding:"6px 16px",borderRadius:99,transition:"all .2s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.12)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.06)"} onClick={()=>setReplyingTo(replyingTo===post.id?null:post.id)}>💬 {post.comments}</button>
                        <button style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)",color:"var(--text2)",cursor:"pointer",fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:6,padding:"6px 16px",borderRadius:99,transition:"all .2s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.12)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.06)"} onClick={()=>{navigator.clipboard?.writeText("https://wyzdesign.com/muse/post/"+post.id);showToast("Link copied!")}}>↗ {post.shares}</button>
                      </div>
                      {replyingTo === post.id && (
                        <div style={{display:"flex",gap:8,padding:"10px 18px",borderTop:"1px solid rgba(255,255,255,0.04)"}}>
                          <input className="inp" placeholder="Write a reply..." value={commentText} onChange={e=>setCommentText(e.target.value)} onKeyDown={async e=>{if(e.key==="Enter"&&commentText.trim()){const txt=commentText.trim();setFeedPosts(prev=>prev.map(p=>p.id===post.id?{...p,comments:p.comments+1}:p));setCommentText("");setReplyingTo(null);try{await apiFetch("/api/muse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"forum",type:"reply",postId:post.id,text:txt})});showToast("Reply posted!")}catch{showToast("Failed to post reply")}}}} style={{flex:1,fontSize:13,padding:"8px 12px",borderRadius:10,background:"var(--glass)",border:"1px solid rgba(255,255,255,0.06)",color:"var(--text)"}} />
                           <button className="btn btn-gold" style={{width:"100%",padding:"10px 0",fontSize:13,fontWeight:700,borderRadius:12}} onClick={async()=>{if(commentText.trim()){const txt=commentText.trim();setFeedPosts(prev=>prev.map(p=>p.id===post.id?{...p,comments:p.comments+1}:p));setCommentText("");setReplyingTo(null);try{await apiFetch("/api/muse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"forum",type:"reply",postId:post.id,text:txt})});showToast("Reply posted!")}catch{showToast("Failed to post reply")}}}}>Send</button>
                        </div>
                      )}
                    </div>
                  );
                }))}
              </div>
              <Nav active="connections" onNavigate={showScreen} onHamburgerToggle={openHamburger} />
            </div>
              <div className={"screen-el"+(screen==="matches"?" active":"")}>
              <div className="hdr">
                <button className="chat-back" onClick={()=>showScreen("discover")}><FiArrowLeft size={20} /></button>
                <div className="logo-link" style={{fontSize:28,background:"linear-gradient(90deg,#FF4500,#FFD700,#FFAA00,#FF4500,#FF8C00,#FF4500)",backgroundSize:"300% 100%"}}>Matches</div>
<div style={{display:"flex",gap:10}}>
{!searchOpen && !showLikesYou && (<button className="hdr-btn" style={{position:"relative",width:34,height:34,overflow:"visible"}} onClick={()=>setShowLikesYou(!showLikesYou)}><FiHeart size={16} />{likedBy.length > 0 && <span style={{position:"absolute",top:-4,right:-4,width:16,height:16,borderRadius:"50%",background:"linear-gradient(135deg,var(--coral),var(--pink))",fontSize:9,fontWeight:800,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1,boxShadow:"0 1px 4px rgba(0,0,0,0.5)"}}>{likedBy.length}</span>}</button>)}
{!searchOpen && !showLikesYou && (<button className="hdr-btn" style={{width:"auto",padding:"0 12px",fontSize:12,fontWeight:700}} onClick={()=>setMatchesView(v=>v==="list"?"grid":"list")}>{matchesView==="list"?"Grid":"List"}</button>)}
{!searchOpen ? (<button className="hdr-btn" style={{width:34,height:34}} onClick={()=>setSearchOpen(true)}><FiSearch size={16} /></button>) : (
                    <div style={{display:"flex",alignItems:"center",gap:6,animation:"fadeIn .2s ease"}}>
                      <input className="inp" placeholder="Search..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} autoFocus style={{margin:0,padding:"6px 10px",fontSize:12,width:120,borderRadius:99}} />
                      <button className="hdr-btn" style={{width:30,height:30,borderRadius:"50%",fontSize:12}} onClick={()=>{setSearchOpen(false);setSearchQuery("")}}>✕</button>
                    </div>
                  )}
                </div>
              </div>
              {!showLikesYou && searchOpen && <div className="overlay-bg" onClick={()=>{setSearchOpen(false);setSearchQuery("")}} style={{position:"absolute",inset:0,zIndex:5}} />}
              {showLikesYou ? (
                <div style={{flex:1,overflowY:"auto",padding:"0 20px 80px"}}>
                  <button className="chat-back" onClick={()=>setShowLikesYou(false)} style={{marginLeft:-8,marginBottom:8}}><FiArrowLeft size={20} /></button>
                  <div style={{fontSize:18,fontWeight:800,marginBottom:4}}>Likes You</div>
                  <div style={{fontSize:13,color:"var(--text2)",marginBottom:16}}>People who swiped right on you</div>
                  {likedBy.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon"><FiHeart size={48} /></div>
                      <div className="empty-title">No likes yet</div>
                      <div className="empty-sub">Keep swiping, people will start noticing you</div>
                    </div>
                  ) : (
                    <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12}}>
                      {likedBy.map(p => (
                        <div key={p.id} style={{position:"relative",borderRadius:16,overflow:"hidden",aspectRatio:"3/4",cursor:"pointer"}} onClick={()=>{if(currentUser.tier!=="muse_pro"){showToast("Upgrade to Muse Pro to view profiles");setShowPremiumPopup(true);}else{setViewProfile(p);}}}>
                          <img loading="lazy" src={p.img} alt={p.name} style={{width:"100%",height:"100%",objectFit:"cover",filter:currentUser.tier!=="muse_pro"?"blur(3px)":undefined}} />
                          <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"12px",background:"linear-gradient(to top,rgba(10,6,18,0.9),transparent)"}}>
                            <div style={{fontSize:15,fontWeight:700}}>{p.name}</div>
                            <div style={{fontSize:12,background:"linear-gradient(90deg,var(--gold),var(--amber))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontWeight:600}}>{p.type}</div>
                          </div>
                          <div style={{position:"absolute",top:8,right:8,padding:"4px 10px",borderRadius:99,background:"linear-gradient(135deg,var(--coral),var(--pink))",fontSize:10,fontWeight:700,color:"#fff"}}>♥ Liked You</div>
                          {currentUser.tier!=="muse_pro" && (<div style={{position:"absolute",top:8,left:8,padding:"2px 8px",borderRadius:99,background:"rgba(0,0,0,0.6)",fontSize:10,fontWeight:600,color:"#fff"}}>PRO</div>)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
              <>
              <div className="match-list" style={matchesView==="grid" ? {flex:1,display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12,alignContent:"flex-start",overflowY:"auto",padding:"12px 16px 80px"} : {flex:1,display:"flex",flexDirection:"column",alignItems:"stretch",justifyContent:"flex-start",overflowY:"auto",padding:"0 0 80px"}}>
                {matches.length === 0 && (
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:40}}>
                    <div className="empty-icon"><FiHeart size={64} /></div>
                    <div style={{fontSize:20,fontWeight:800,color:"var(--text)",whiteSpace:"nowrap"}}>No sparks yet</div>
                    <div style={{fontSize:13,color:"var(--text2)",maxWidth:240,marginTop:6}}>Start swiping to find your creative connections</div>
                  </div>
                )}
                {matches.filter(m => searchQuery === "" || m.name.toLowerCase().includes(searchQuery.toLowerCase())).map(m => (
                  <MatchCard key={m.id} m={m} expanded={expandedMatchId === String(m.id)} swiping={matchSwiping?.id === String(m.id) ? matchSwiping : null} view={matchesView} actions={matchActions} />
                ))}
              </div>
              </>
              )}
              <Nav active="matches" onNavigate={showScreen} onHamburgerToggle={openHamburger} />
            </div>
            <div className={"screen-el"+(screen==="chat"&&chatTarget?" active":"")}>
              {chatTarget && (
                <div className="chat-wrap">
                  <div className="chat-header">
                    <button className="chat-back" onClick={()=>showScreen("matches")}><FiArrowLeft size={20} /></button>
                     <img loading="lazy" src={chatTarget.img} alt={chatTarget.name} className="chat-avatar" onError={handleImgError} onClick={()=>setViewProfile(chatTarget)} style={{cursor:"pointer"}} />
                    <div className="chat-info">
                      <div className="chat-name">{chatTarget.name}</div>
                      <div className="chat-type">{chatTarget.type}</div>
                    </div>
                  </div>
                  <div className="messages" ref={messagesEndRef}>
                    {(chatTarget.messages || []).map((msg, i) => (
                      <div key={i} className={"msg "+(msg.from==="me"?"msg-me":"msg-them")}>
                        {msg.img && <img loading="lazy" src={msg.img} alt="" style={{maxWidth:200,borderRadius:12,marginBottom:6,display:"block"}} />}
                        {msg.text && <div>{msg.text}</div>}
                        <div className="msg-time" style={{textAlign:msg.from==="me"?"right":"left",marginTop:4,fontSize:10,color:msg.from==="me"?"rgba(10,6,18,0.4)":"var(--muted)"}}>
                          {msg.time}{msg.from==="me" && <span style={{marginLeft:4}}>{i===(chatTarget.messages||[]).length-1?"✓✓":"✓"}</span>}
                        </div>
                      </div>
                    ))}
                    {typingTarget===chatTarget.id && (
                      <div className="msg msg-them" style={{padding:"10px 16px"}}>
                        <div style={{display:"flex",gap:4}}>
                          <span style={{width:6,height:6,borderRadius:3,background:"var(--muted)",animation:"typingDot 1.4s infinite"}} />
                          <span style={{width:6,height:6,borderRadius:3,background:"var(--muted)",animation:"typingDot 1.4s infinite .2s"}} />
                          <span style={{width:6,height:6,borderRadius:3,background:"var(--muted)",animation:"typingDot 1.4s infinite .4s"}} />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  <div className="quick-replies">
                    {[getIcebreaker(chatTarget.type),"Hey! Love your work","Let's collab","What's your vision?","Love your portfolio"].map(q => (
                      <button key={q} className="quick-reply" onClick={()=>sendMsg(q)}>{q}</button>
                    ))}
                  </div>
                  <div className="chat-input-wrap">
                    <label style={{cursor:"pointer",color:"var(--muted)",fontSize:18,display:"flex",alignItems:"center"}}>
                      <FiImage size={18} />
                      <input type="file" accept="image/*" style={{display:"none"}} onChange={async (e)=>{
                        const f=e.target.files?.[0];
                        if(f&&chatTarget){
                          showToast("Uploading photo...");
                          const url=await uploadImage(f,"chat");
                          if(url){
                            const now=new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
                            const imgMsg={from:"me",text:"",img:url,time:now};
                            setChatTarget(prev=>prev?{...prev,messages:[...prev.messages,imgMsg]}:prev);
                            setMatches(prev=>prev.map(m=>m.id===chatTarget.id?{...m,messages:[...m.messages,imgMsg]}:m));
                            const myId=authUser?.profile?.id||authUser?.id||"local";
                            await persistMessage({myId,theirId:String(chatTarget.id),text:"",img:url});
                            showToast("Photo sent!");
                          }
                        }
                      }} />
                    </label>
                    <input className="chat-inp" placeholder="Type a message..." value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&chatInput.trim()){sendMsg()}}} />
                    <button className="send-btn" onClick={()=>sendMsg()}><FiSend size={18} /></button>
                  </div>
                </div>
              )}
              <Nav active="matches" onNavigate={showScreen} onHamburgerToggle={openHamburger} />
            </div>
            <div className={"screen-el"+(screen==="briefs"?" active":"")}>
              <div className="hdr">
                <button className="chat-back" onClick={()=>showScreen("discover")}><FiArrowLeft size={20} /></button>
                <div className="logo-link" style={{fontSize:28,background:"linear-gradient(90deg,#20B2AA,#9ACD32,#00CED1,#20B2AA,#7CFC00,#20B2AA)",backgroundSize:"300% 100%"}}>Collab</div>
                <button className="hdr-btn" onClick={()=>setShowPostBrief(true)}><FiPlus size={18} /></button>
              </div>
              <div className="conn-tabs" style={{padding:"0 12px"}}>
                {([["all","All"],["tfp","TFP"],["paid","Paid"],["opencall","Open Call"],["vision","Concept"]] as const).map(([k,l])=>(
                  <div key={k} className={"conn-tab"+(museCat===k?" active":"")} onClick={()=>setMuseCat(k as any)}>{l}</div>
                ))}
              </div>
              <div className="briefs-scroll">
                {(() => {
                  const allBriefs = [...userBriefs.map(b=>({...b,author:currentUser.name,authorImg:currentUser.avatar,deadline:"Flexible",urgent:false,nsfw:false,cat:b.cat||"vision"})),...((liveBriefs?.length ? liveBriefs : BRIEFS))];
                  const filtered = museCat==="all"?allBriefs:allBriefs.filter(b=>b.cat===museCat);
                  if(filtered.length===0) return (
                    <div className="empty-state">
                      <div className="empty-icon"><FiPlus size={48} /></div>
                      <div className="empty-title">No posts yet</div>
                      <div className="empty-sub">{museCat==="all"?"Post a project, collab, or idea":"No "+museCat+" posts yet, be the first!"}</div>
                    </div>
                  );
                  return filtered.map(brief => (
                    <div key={brief.id} className="brief-card">
                      <div className="brief-header" style={{flexWrap:"wrap",gap:6}}>
                        <img loading="lazy" src={brief.authorImg} alt={brief.author} className="brief-avatar" />
                        <div className="brief-info" style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center"}}>
                          <div className="brief-author"><strong>{brief.author}</strong></div>
                          <div className="brief-meta">{brief.budget} · {brief.deadline}</div>
                        </div>
                        <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:4,width:"100%",justifyContent:"center"}}>
                          {brief.cat==="tfp" && <span className="brief-tag" style={{background:"rgba(152,251,152,0.15)",borderColor:"rgba(152,251,152,0.3)",color:"var(--mint)"}}>TFP</span>}
                          {brief.cat==="paid" && <span className="brief-tag" style={{background:"rgba(255,215,0,0.12)",borderColor:"rgba(255,215,0,0.2)",color:"var(--gold)"}}>Paid</span>}
                          {brief.cat==="opencall" && <span className="brief-tag" style={{background:"rgba(135,206,235,0.12)",borderColor:"rgba(135,206,235,0.25)",color:"#87CEEB"}}>Open Call</span>}
                          {brief.cat==="vision" && <span className="brief-tag" style={{background:"rgba(212,165,255,0.12)",borderColor:"rgba(212,165,255,0.25)",color:"var(--lavender)"}}>Ideas</span>}
                          {brief.urgent && <span className="brief-tag" style={{background:"rgba(255,107,107,0.15)",borderColor:"rgba(255,107,107,0.3)",color:"var(--coral)"}}>Urgent</span>}
                          {brief.nsfw && <span className="brief-tag" style={{background:"rgba(255,107,107,0.15)",borderColor:"rgba(255,107,107,0.3)",color:"var(--sunset)"}}>18+</span>}
                        </div>
                      </div>
                      <div className="brief-title">{brief.title}</div>
                      <div className="brief-desc">{brief.desc}</div>
                      <div className="brief-tags">{brief.tags.map(t=><span key={t} className="brief-tag">{t}</span>)}</div>
                      <div className="brief-actions">
                        {brief.cat==="vision" ? (
                          <button className="brief-btn-apply" style={{padding:"8px 14px",fontSize:12}} onClick={()=>{setChatTarget({id:brief.id,name:brief.author,type:"Creative",img:brief.authorImg,messages:[]});showScreen("chat")}}>Respond</button>
                        ) : (
                          <button className={"brief-btn-apply"+(appliedBriefs.includes(brief.id)?" applied":"")} style={{padding:"8px 14px",fontSize:12}} onClick={async()=>{if(!appliedBriefs.includes(brief.id)){setAppliedBriefs([...appliedBriefs,brief.id]);try{await apiFetch("/api/muse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"brief-apply",briefId:brief.id})});showToast("Applied!")}catch{showToast("Failed to apply");setAppliedBriefs(prev=>prev.filter(x=>x!==brief.id))}}}}>
                            {appliedBriefs.includes(brief.id)?"Applied":"Apply"}
                          </button>
                        )}
                        {brief.cat==="paid" && (
                          <button className="brief-btn-apply" style={{background:"rgba(212,165,255,0.1)",borderColor:"rgba(212,165,255,0.2)",color:"var(--lavender)",padding:"8px 14px",fontSize:12}} onClick={()=>{showToast("Sent to Sessions!");}}>Book</button>
                        )}
                        <button className={"brief-btn-save"+(savedBriefs.includes(brief.id)?" saved":"")} style={{padding:"8px 14px",fontSize:12}} onClick={()=>{if(savedBriefs.includes(brief.id)){setSavedBriefs(savedBriefs.filter(x=>x!==brief.id));showToast("Unsaved")}else{setSavedBriefs([...savedBriefs,brief.id]);showToast("Saved!")}}}>
                          {savedBriefs.includes(brief.id)?"Saved":"Save"}
                        </button>
                      </div>
                    </div>
                  ));
                })()}
              </div>
              <Nav active="briefs" onNavigate={showScreen} onHamburgerToggle={openHamburger} />
            </div>

            <div className={"screen-el"+(screen==="community"?" active":"")}>
              <div className="hdr">
                <button className="chat-back" onClick={()=>showScreen("discover")}><FiArrowLeft size={20} /></button>
                <span style={{fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontSize:18,fontWeight:800,color:"var(--gold)"}}>Community</span>
                <div style={{width:36}} />
              </div>
              <div className="conn-tabs" style={{padding:"0 16px"}}>
                {(["groups","events"] as const).map(t => (
                  <div key={t} className={"conn-tab"+(commTab===t?" active":"")} onClick={()=>setCommTab(t)}>{t==="groups"?"Groups":"Events"}</div>
                ))}
              </div>
              <div style={{flex:1,overflowY:"auto",padding:"0 16px 80px"}}>
                {commTab === "groups" && (liveCommunities?.length ? liveCommunities : COMMUNITIES).filter(c => showNsfw || !c.nsfw).map(c => (
                  <div key={c.id} className="conn-card" style={{marginBottom:10,padding:14}}>
                    <img loading="lazy" src={c.img} alt={c.name} className="conn-avatar" onError={handleImgError} />
                    <div className="conn-content" style={{flex:1}}>
                      <div className="conn-name" style={{fontSize:15}}>{c.name}</div>
                      <div className="conn-meta" style={{fontSize:12}}>{c.members} members · {c.desc}</div>
                      <div style={{display:"flex",gap:8,marginTop:8}}>
                        <button className={"btn "+(c.cat==="nsfw"?"btn-gold":"btn-primary")} style={{flex:1,fontSize:12,padding:"12px 0",fontWeight:700,borderRadius:12}} onClick={async()=>{try{const r=await apiFetch("/api/muse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"join-community",communityId:c.id})});if(!r.ok)throw new Error("failed");showToast("Joined "+c.name+"!")}catch{showToast("Failed to join")}}}>{c.cat==="nsfw"?"Join (18+)":"Join"}</button>
                        <button className="btn btn-outline" style={{flex:1,fontSize:12,padding:"12px 0",fontWeight:600,borderRadius:12}} onClick={()=>showToast(c.name+" community info opened!")}>Learn</button>
                        <button className="btn btn-outline" style={{flex:1,fontSize:12,padding:"12px 0",fontWeight:600,borderRadius:12}} onClick={()=>{navigator.clipboard?.writeText("https://wyzdesign.com/muse/community/"+c.id);showToast("Link copied!")}}>Share</button>
                      </div>
                    </div>
                  </div>
                ))}
 {commTab === "events" && (liveEvents?.length ? liveEvents : EVENTS).filter((e:any) => showNsfw || !e.nsfw).map((ev:any) => (
                    <div key={ev.id} className="conn-card" style={{flexDirection:"column",marginBottom:10,padding:0,overflow:"hidden",borderRadius:16}}>
                      {ev.img && <img loading="lazy" src={ev.img} alt={ev.title} style={{width:"100%",height:160,objectFit:"cover",display:"block"}} onError={handleImgError} />}
                      <div style={{padding:16}}>
                        <div className="conn-name" style={{fontSize:15}}>{ev.title}</div>
                        <div className="conn-meta" style={{fontSize:12,marginBottom:6}}>{ev.date} · {ev.loc}</div>
                        <div style={{fontSize:13,color:"var(--text2)",lineHeight:1.5,marginBottom:10}}>{ev.desc}</div>
                      </div>
                      <div style={{display:"flex",gap:8,padding:"0 16px 16px",width:"100%"}}>
                        <button className={"btn "+(rsvpdEvents.includes(ev.id)?"btn-outline":"btn-gold")} style={{flex:1,padding:"14px 0",fontSize:14,fontWeight:700,borderRadius:12}} onClick={()=>{setRsvpdEvents(prev=>prev.includes(ev.id)?prev.filter((x:number)=>x!==ev.id):[...prev,ev.id]);showToast(rsvpdEvents.includes(ev.id)?"RSVP cancelled":"RSVP confirmed!")}}>{rsvpdEvents.includes(ev.id)?"Going":"RSVP"}</button>
                        <button className="btn btn-outline" style={{flex:1,padding:"14px 0",fontSize:14,fontWeight:600,borderRadius:12}} onClick={()=>{navigator.clipboard?.writeText("https://wyzdesign.com/muse/event/"+ev.id);showToast("Event link copied!")}}>Share</button>
                      </div>
                    </div>
                  ))}
                {commTab === "events" && EVENTS.length===0 && (
                  <div style={{textAlign:"center",padding:40,color:"var(--muted)",fontSize:13}}>No upcoming events</div>
                )}
              </div>
              <Nav active="discover" onNavigate={showScreen} onHamburgerToggle={openHamburger} />
            </div>

            <div className={"screen-el"+(screen==="sessions"?" active":"")}>
              <div className="hdr">
                <button className="chat-back" onClick={()=>showScreen("discover")}><FiArrowLeft size={20} /></button>
                <span style={{fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontSize:18,fontWeight:800,color:"var(--gold)"}}>Sessions</span>
                <div style={{width:36}} />
              </div>
              <div className="conn-tabs" style={{padding:"0 16px"}}>
                {(["sessions","requests"] as const).map(t => (
                  <div key={t} className={"conn-tab"+(sessTab===t?" active":"")} onClick={()=>setSessTab(t)}>{t==="sessions"?"My Bookings":"Requests"}</div>
                ))}
              </div>
              <div style={{flex:1,overflowY:"auto",padding:"0 16px 80px"}}>
                {sessTab === "sessions" && (<>
                {/* My Bookings */}
                {matches.filter(m => m.booked).length > 0 && (
                  <>
                    <div style={{fontSize:13,fontWeight:700,color:"var(--gold)",margin:"4px 0 10px"}}>My Bookings</div>
                    {matches.filter(m => m.booked).map(m => (
                      <div key={m.id} className="conn-card" style={{marginBottom:10,padding:0,overflow:"hidden",flexDirection:"row",alignItems:"stretch"}}>
                        <img loading="lazy" src={m.img} alt={m.name} style={{width:"25%",alignSelf:"stretch",minHeight:120,objectFit:"cover",flexShrink:0}} onError={handleImgError} />
                        <div className="conn-content" style={{flex:1,padding:14,display:"flex",flexDirection:"column",justifyContent:"center"}}>
                          <div className="conn-name" style={{fontSize:15}}>{m.name}</div>
                          <div className="conn-meta" style={{fontSize:12}}>{m.type} · Booked Session</div>
                          <div style={{display:"flex",gap:8,marginTop:8}}>
                            <button className="btn btn-gold" style={{flex:1,padding:"12px 0",fontSize:12,fontWeight:700,borderRadius:12,whiteSpace:"nowrap"}} onClick={()=>{openChat(m)}}>Message</button>
                            <button className="btn btn-outline" style={{flex:1,padding:"12px 0",fontSize:12,fontWeight:600,borderRadius:12,whiteSpace:"nowrap"}} onClick={()=>{setChatTarget(m);showScreen("chat")}}>Details</button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div style={{height:16}} />
                  </>
                )}
                {/* Sample bookings placeholder */}
                {matches.filter(m => m.booked).length === 0 && (
                  <>
                    <div style={{fontSize:13,fontWeight:700,color:"var(--gold)",margin:"4px 0 10px"}}>My Bookings</div>
                    <div style={{fontSize:12,color:"var(--text2)",marginBottom:16}}>No bookings yet — book a session below to get started</div>
                    {[
                      {name:"ARCANA",type:"Photographer",date:"Fri · 2:00 PM",status:"Confirmed",img:"/models/ARCANA/Bodypaint-2.webp"},
                      {name:"MITRI",type:"Producer",date:"Sat · 11:30 AM",status:"Pending",img:"/models/MITRI/Mitri-10.webp"},
                      {name:"NAKIA",type:"Videographer",date:"Mon · 4:00 PM",status:"Confirmed",img:"/models/NAKIA/Nakia-10.webp"}
                    ].map((b,i)=>(
                      <div key={i} className="conn-card" style={{marginBottom:10,padding:0,overflow:"hidden",flexDirection:"row",alignItems:"stretch"}}>
                        <img loading="lazy" src={b.img} alt={b.name} style={{width:"28%",alignSelf:"stretch",minHeight:110,objectFit:"cover",flexShrink:0}} onError={handleImgError} />
                        <div className="conn-content" style={{flex:1,padding:12,display:"flex",flexDirection:"column",justifyContent:"center"}}>
                          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                            <div className="conn-name" style={{fontSize:15}}>{b.name}</div>
                            <span style={{fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:99,background:b.status==="Confirmed"?"rgba(0,230,118,0.15)":"rgba(255,215,0,0.15)",color:b.status==="Confirmed"?"var(--mint)":"var(--gold)"}}>{b.status}</span>
                          </div>
                          <div className="conn-meta" style={{fontSize:12}}>{b.type}</div>
                          <div className="conn-meta" style={{fontSize:12,color:"var(--gold)",fontWeight:600}}>{b.date}</div>
                          <div style={{display:"flex",gap:8,marginTop:8}}>
                            <button className="btn btn-gold" style={{flex:1,padding:"10px 0",fontSize:12,fontWeight:700,borderRadius:10}} onClick={()=>showToast("Messaging "+b.name+"…")}>Message</button>
                            <button className="btn btn-outline" style={{flex:1,padding:"10px 0",fontSize:12,fontWeight:600,borderRadius:10}} onClick={()=>showToast("Session details coming soon")}>Details</button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div style={{height:16}} />
                  </>
                )}
                {/* Available Sessions */}
                <div style={{fontSize:13,fontWeight:700,color:"var(--text)",margin:"4px 0 10px"}}>Available Sessions</div>
                {(liveSessions || SESSIONS).map(s => (
                  <div key={s.id} className="conn-card" style={{marginBottom:10,padding:0,overflow:"hidden",flexDirection:"row",alignItems:"stretch"}}>
                    <img loading="lazy" src={s.img} alt={s.name} style={{width:"25%",alignSelf:"stretch",minHeight:120,objectFit:"cover",flexShrink:0}} onError={handleImgError} />
                    <div className="conn-content" style={{flex:1,padding:14,display:"flex",flexDirection:"column",justifyContent:"center"}}>
                      <div className="conn-name" style={{fontSize:15}}>{s.name}</div>
                      <div className="conn-meta" style={{fontSize:12}}>{s.type} · {s.rate} · ★ {s.rating}</div>
                      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:6}}>
                        {(s.skills||[]).map(sk=><span key={sk} className="conn-tag" style={{fontSize:10,padding:"3px 8px"}}>{sk}</span>)}
                      </div>
                       <div style={{display:"flex",gap:8,marginTop:8}}>
                         <button className="btn btn-gold" style={{flex:1,padding:"12px 0",fontSize:12,fontWeight:700,borderRadius:12,whiteSpace:"nowrap"}} onClick={async()=>{try{const r=await apiFetch("/api/muse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"book-session",sessionId:s.id,hostId:s.id})});if(r.status===403){const d=await r.json().catch(()=>({}));if(d.code==="VERIFICATION_REQUIRED"){setShowAgeVerification(true);showToast("Verify your identity to book paid sessions");return;}}if(!r.ok)throw new Error("failed");showToast("Session request sent to "+s.name+"!")}catch{showToast("Failed to book session")}}}>{s.available?"Book Session":"Waitlist"}</button>
                         <button className="btn btn-outline" style={{flex:1,padding:"12px 0",fontSize:12,fontWeight:600,borderRadius:12,whiteSpace:"nowrap"}} onClick={()=>{setViewProfile(s);showToast(s.name+"'s profile")}}>View Profile</button>
                       </div>
                    </div>
                  </div>
                ))}
                </>)}
                {sessTab === "requests" && (
                  <div style={{padding:"0 20px 20px"}}>
                    <div style={{fontSize:13,fontWeight:700,color:"var(--gold)",margin:"4px 0 10px"}}>Incoming Requests</div>
                    {[
                      {name:"SIMONE",type:"Model",type2:"Photography Session",img:"/models/SIMONE/Simone-107.webp",note:"Would love to do a golden hour editorial shoot"},
                      {name:"KAYLEN",type:"Stylist",type2:"Styling Consultation",img:"/models/KAYLEN/kaylen (retouched)-10.webp",note:"Need help with wardrobe for my next campaign"},
                      {name:"JERMAINE",type:"Director",type2:"Creative Direction",img:"/models/JERMAINE/Jermaine-20.webp",note:"Looking for a creative director for a music video"},
                    ].map((r,i)=>(
                      <div key={i} className="conn-card" style={{marginBottom:10,padding:0,overflow:"hidden",flexDirection:"row",alignItems:"stretch"}}>
                        <img loading="lazy" src={r.img} alt={r.name} style={{width:"25%",alignSelf:"stretch",minHeight:110,objectFit:"cover",flexShrink:0}} onError={handleImgError} />
                        <div className="conn-content" style={{flex:1,padding:12,display:"flex",flexDirection:"column",justifyContent:"center"}}>
                          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                            <div className="conn-name" style={{fontSize:15}}>{r.name}</div>
                            <span style={{fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:99,background:"rgba(212,165,255,0.15)",color:"var(--lavender)"}}>{r.type2}</span>
                          </div>
                          <div className="conn-meta" style={{fontSize:12}}>{r.type}</div>
                          <div style={{fontSize:12,color:"var(--text2)",marginTop:4,lineHeight:1.4}}>{r.note}</div>
                          <div style={{display:"flex",gap:8,marginTop:8}}>
                            <button className="btn btn-gold" style={{flex:1,padding:"10px 0",fontSize:12,fontWeight:700,borderRadius:10}} onClick={()=>showToast("Request accepted!")}>Accept</button>
                            <button className="btn btn-outline" style={{flex:1,padding:"10px 0",fontSize:12,fontWeight:600,borderRadius:10}} onClick={()=>showToast("Request declined")}>Decline</button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div style={{height:16}} />
                    <div style={{fontSize:13,fontWeight:700,color:"var(--text)",margin:"4px 0 10px"}}>Sent Requests</div>
                    {[
                      {name:"DARRYL",type:"Videographer",status:"Pending",img:"/models/DARRYL/Darryl-2.webp",note:"Music video production"},
                      {name:"ANGEL",type:"Makeup Artist",status:"Accepted",img:"/models/ANGEL/Angel-2.webp",note:"Editorial makeup session"},
                    ].map((r,i)=>(
                      <div key={i} className="conn-card" style={{marginBottom:10,padding:0,overflow:"hidden",flexDirection:"row",alignItems:"stretch"}}>
                        <img loading="lazy" src={r.img} alt={r.name} style={{width:"25%",alignSelf:"stretch",minHeight:110,objectFit:"cover",flexShrink:0}} onError={handleImgError} />
                        <div className="conn-content" style={{flex:1,padding:12,display:"flex",flexDirection:"column",justifyContent:"center"}}>
                          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                            <div className="conn-name" style={{fontSize:15}}>{r.name}</div>
                            <span style={{fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:99,background:r.status==="Accepted"?"rgba(0,230,118,0.15)":"rgba(255,215,0,0.15)",color:r.status==="Accepted"?"var(--mint)":"var(--gold)"}}>{r.status}</span>
                          </div>
                          <div className="conn-meta" style={{fontSize:12}}>{r.type}</div>
                          <div style={{fontSize:12,color:"var(--text2)",marginTop:4}}>{r.note}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Nav active="discover" onNavigate={showScreen} onHamburgerToggle={openHamburger} />
            </div>

            <div className={"screen-el"+(screen==="network"?" active":"")}>
              <div className="hdr">
                <button className="chat-back" onClick={()=>showScreen("discover")}><FiArrowLeft size={20} /></button>
                <span style={{fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontSize:18,fontWeight:800,color:"var(--gold)"}}>Network</span>
                <div style={{width:36}} />
              </div>
              <div className="conn-tabs" style={{padding:"0 16px"}}>
                {(["pros","forum"] as const).map(t => (
                  <div key={t} className={"conn-tab"+(netTab===t?" active":"")} onClick={()=>setNetTab(t)}>{t==="pros"?"Professionals":"Forum"}</div>
                ))}
              </div>
              <div style={{flex:1,overflowY:"auto",padding:"0 16px 80px"}}>
                {netTab === "pros" && PROFESSIONALS.filter(p => showNsfw || !p.nsfw).map(p => (
                  <div key={p.id} className="conn-card" style={{position:"relative",flexDirection:"column",marginBottom:14,padding:0,overflow:"hidden",borderRadius:16,minHeight:200}}>
                    <img loading="lazy" src={p.img} alt={p.name} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}} onError={handleImgError} />
                    <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(10,6,18,0.85) 0%,rgba(10,6,18,0.2) 60%,rgba(10,6,18,0.1) 100%)"}} />
                    <div style={{position:"relative",zIndex:1,padding:"120px 20px 20px",display:"flex",flexDirection:"column",justifyContent:"flex-end",minHeight:200}}>
                      <div style={{fontSize:20,fontWeight:800,color:"#fff",textShadow:"0 2px 8px rgba(0,0,0,0.8)"}}>{p.name}</div>
                      <div style={{fontSize:14,fontWeight:600,color:"var(--gold)",marginBottom:4,textShadow:"0 1px 4px rgba(0,0,0,0.8)"}}>{p.type} · {p.loc}</div>
                      <div style={{fontSize:13,color:"rgba(255,255,255,0.7)",marginBottom:6}}>{p.exp}</div>
                      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:10}}>
                        {(p.skills||[]).map(s=><span key={s} style={{fontSize:10,padding:"3px 8px",borderRadius:6,background:"rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.8)"}}>{s}</span>)}
                      </div>
                      <div style={{display:"flex",gap:8,width:"100%"}}>
                        <button className="btn btn-gold" style={{flex:1,padding:"10px 0",fontSize:13,fontWeight:700,borderRadius:10}} onClick={async()=>{try{const r=await apiFetch("/api/muse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"connect",targetId:p.id})});if(!r.ok)throw new Error("failed");showToast("Connection request sent to "+p.name+"!")}catch{showToast("Failed to send connection")}}}>Connect</button>
                        <button style={{flex:1,padding:"10px 0",fontSize:13,fontWeight:600,borderRadius:10,border:"1px solid rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.05)",color:"#fff",cursor:"pointer"}} onClick={()=>{setViewProfile(p);showToast("Viewing "+p.name+"'s profile")}}>View Profile</button>
                      </div>
                    </div>
                  </div>
                ))}
                {netTab === "forum" && (
                  <>
                    {showNewPost && (
                      <div className="conn-card" style={{flexDirection:"column",padding:14,marginBottom:10}}>
                        <input className="inp" placeholder="Title" value={newPostTitle} onChange={e=>setNewPostTitle(e.target.value)} style={{marginBottom:8}} />
                        <textarea className="inp" placeholder="What's on your mind?" rows={3} value={newPostBody} onChange={e=>setNewPostBody(e.target.value)} style={{marginBottom:10,resize:"none"}} />
                        <div style={{display:"flex",gap:8}}>
                        <button className="btn btn-gold" style={{width:"100%",padding:"12px 0",fontSize:13,fontWeight:700,borderRadius:12}} onClick={async()=>{if(newPostTitle.trim()){const title=newPostTitle.trim();const body=newPostBody.trim();setForumPosts(prev=>[{id:uid(),title,body,author:currentUser.name,avatar:currentUser.avatar,votes:1,comments:[],cat:"General",time:"Just now",pinned:false},...prev]);setNewPostTitle("");setNewPostBody("");setShowNewPost(false);try{await apiFetch("/api/muse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"forum",title,body,userId:currentUser.id})});showToast("Posted!")}catch{showToast("Failed to post")}}}}>Post</button>
                        <button className="btn btn-outline" style={{width:"100%",padding:"12px 0",fontSize:13,fontWeight:600,borderRadius:12}} onClick={()=>setShowNewPost(false)}>Cancel</button>
                        </div>
                      </div>
                    )}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <div style={{display:"flex",gap:6}}>{(["hot","new","top"] as const).map(s=>(<div key={s} className={"conn-tab-sub"+(forumSort===s?" active":"")} onClick={()=>setForumSort(s)}>{s.charAt(0).toUpperCase()+s.slice(1)}</div>))}</div>
                      <button className="conn-btn conn-btn-primary" style={{fontSize:12,padding:"6px 14px"}} onClick={()=>setShowNewPost(!showNewPost)}>+ Post</button>
                    </div>
                     {[...(liveForum?.length ? liveForum : FORUM_POSTS)].filter(p => forumCategory==="all"||p.cat===forumCategory).sort((a,b)=>forumSort==="top"?(b.votes+b.comments.length*2)-(a.votes+a.comments.length*2):forumSort==="new"?(b.id-a.id):(b.votes*2+b.comments.length)-(a.votes*2+a.comments.length)).map(post=>(
                      <div key={post.id} className="conn-card" style={{flexDirection:"column",marginBottom:8,padding:14}}>
                        {post.pinned && <div style={{fontSize:10,color:"var(--gold)",fontWeight:700,marginBottom:4}}>📌 Pinned</div>}
                        <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,minWidth:36}}>
                            <button style={{background:"none",border:"none",color:post.votes>0?"var(--gold)":"var(--muted)",cursor:"pointer",fontSize:18,padding:0}} onClick={()=>setForumPosts(prev=>prev.map(p=>p.id===post.id?{...p,votes:p.votes+1}:p))}>▲</button>
                            <span style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>{post.votes}</span>
                            <button style={{background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:18,padding:0}} onClick={()=>setForumPosts(prev=>prev.map(p=>p.id===post.id?{...p,votes:p.votes-1}:p))}>▼</button>
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:14,fontWeight:700,color:"var(--text)",marginBottom:4}}>{post.title}</div>
                            <div style={{fontSize:12,color:"var(--text2)",marginBottom:6}}>{post.author}</div>
                            <div style={{fontSize:11,color:"var(--muted)",lineHeight:1.4}}>{post.body.slice(0,120)}{post.body.length>120?"...":""}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
              <Nav active="discover" onNavigate={showScreen} onHamburgerToggle={openHamburger} />
            </div>
            <div className={"screen-el"+(screen==="portfolio"?" active":"")}>
              <div className="hdr">
                <button className="chat-back" onClick={()=>showScreen("discover")}><FiArrowLeft size={20} /></button>
                <div className="logo-link" style={{fontSize:28}}>Portfolio</div>
              </div>
              <div className="portfolio-scroll">
                <MyAlbumsManager
                  authToken={getAccessToken()}
                  uploadImage={uploadImage}
                  showToast={showToast}
                  matchOptions={matches.map((m: any) => ({ id: m.id, name: m.name, avatar: m.img || m.avatar }))}
                />
              </div>
              <Nav active="portfolio" onNavigate={showScreen} onHamburgerToggle={openHamburger} />
            </div>
             <div className={"screen-el"+(screen==="moments"?" active":"")}>
               <div className="hdr">
                 <button className="chat-back" onClick={()=>showScreen("discover")}><FiArrowLeft size={20} /></button>
                  <div className="logo-link" style={{fontSize:28,background:"linear-gradient(90deg,#FF1493,#FF0000,#DDA0DD,#FF1493,#FF69B4,#FF1493)",backgroundSize:"300% 100%"}}>BTS</div>
                  <div style={{width:40}} />
               </div>
               <div style={{flex:1,overflowY:"auto",padding:"0 0 80px"}}>
               <div className="moments-page">
                <div className="moments-hero">
                  <h2>Behind The Scenes</h2>
                  <p>Raw creative process. BTS, WIP, unpolished gold.</p>
                </div>
                <div className="moments-quick-capture" onClick={()=>{showToast("Capture a moment! Feature coming soon.")}}>
                  <div className="moments-quick-capture-icon">📸</div>
                  <span>What's happening? Snap a moment...</span>
                </div>
                <div className="moments-story-row">
                  {stories.slice(0, 8).map((s,i)=>(
                    <div key={s.id} className="moments-story-item" onClick={()=>setShowStory(i)}>
                      <div className="moments-story-ring">
                        <img loading="lazy" src={s.img||s.avatar} alt="" onError={handleImgError} />
                      </div>
                      <span className="moments-story-name">{s.author.split(" ")[0]}</span>
                    </div>
                  ))}
                  {stories.length===0 && [1,2,3,4,5].map(i=>(
                    <div key={i} className="moments-story-item" style={{opacity:0.5}}>
                      <div className="moments-story-ring" style={{background:"rgba(255,255,255,0.08)"}}>
                        <div style={{width:"100%",height:"100%",borderRadius:"50%",background:"rgba(255,255,255,0.04)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>👤</div>
                      </div>
                      <span className="moments-story-name">...</span>
                    </div>
                  ))}
                </div>
                <div className="moments-tab-row">
                  {["All","Photos","Videos","Trending"].map(t=>(
                    <span key={t} className={"moments-tab"+(t==="All"?" active":"")}>{t}</span>
                  ))}
                </div>
                {stories.map(s=>(
                  <div key={s.id} className="moments-card">
                    <img loading="lazy" src={s.img||s.avatar} alt="" className="moments-card-img" onError={handleImgError} />
                    <div className="moments-card-body">
                      <div className="moments-card-user">
                        <img loading="lazy" src={s.avatar} alt="" className="moments-card-avatar" onError={handleImgError} />
                        <div>
                          <div className="moments-card-username">{s.author}</div>
                          <div className="moments-card-loc">📍 {s.time}</div>
                        </div>
                      </div>
                      <div className="moments-card-caption">{s.text || "A creative moment captured."}</div>
                      <div className="moments-card-stats">
                        <span>♥ {s.likes||0}</span><span>💬 {s.comments||0}</span><span>↗ Share</span>
                      </div>
                    </div>
                  </div>
                ))}
                {stories.length===0 && [1,2,3].map(i=>(
                  <div key={i} className="moments-card" style={{opacity:0.7}}>
                    <div className="moments-card-img" style={{background:"linear-gradient(135deg,rgba(255,107,107,0.15),rgba(255,217,61,0.1))",height:220}} />
                    <div className="moments-card-body">
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                        <div style={{width:32,height:32,borderRadius:"50%",background:"rgba(255,255,255,0.06)"}} />
                        <div>
                          <div style={{fontSize:14,fontWeight:700,color:"var(--text)"}}>Coming Soon</div>
                          <div style={{fontSize:11,color:"var(--muted)"}}>Moments are being created...</div>
                        </div>
                      </div>
                      <div style={{fontSize:13,color:"var(--text2)"}}>Be the first to post a Moment and light up this feed!</div>
                    </div>
                  </div>
                ))}
               </div>
               </div>
               <Nav active="moments" onNavigate={showScreen} onHamburgerToggle={openHamburger} />
            </div>
            <div className={"screen-el"+(screen==="profile"?" active":"")}>
              <div className="hdr" style={{justifyContent:"space-between"}}>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <button className="chat-back" onClick={()=>showScreen("discover")}><FiArrowLeft size={20} /></button>
                  <button className="hdr-btn" onClick={openHamburger}><FiMenu size={18} /></button>
                </div>
                <div style={{position:"absolute",left:"50%",transform:"translateX(-50%)",fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontSize:18,fontWeight:800,color:"var(--gold)"}}>Your Profile</div>
                <div style={{display:"flex",gap:10}}>
                  <button className="hdr-btn" onClick={()=>{setEditName(currentUser.name);setEditBio(obData.bio||"");setEditLoc(obData.loc||"");setEditAvatar(currentUser.avatar||"");setShowEditProfile(true)}}><FiEdit2 size={18} /></button>
                  <button className="hdr-btn" onClick={()=>setScreen("settings")}><FiSettings size={18} /></button>
                </div>
              </div>
              <div className="profile-scroll">
                {isUnlimited && showUnlimitedBadge && (
                  <div style={{position:"fixed",top:80,right:20,zIndex:9998,padding:"8px 14px",borderRadius:12,background:"linear-gradient(135deg,rgba(255,215,0,0.15),rgba(255,191,0,0.1))",border:"1px solid rgba(255,215,0,0.2)",fontSize:11,fontWeight:700,color:"var(--gold)",boxShadow:"0 4px 16px rgba(255,215,0,0.2)",display:"flex",alignItems:"center",gap:6}}>
                    <span>⚡</span>∞ Unlimited Likes & Super Likes
                    <button onClick={()=>setShowUnlimitedBadge(false)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:14,padding:0,lineHeight:1}}>✕</button>
                  </div>
                )}
                <div className="completeness">
                  <div className="completeness-text">
                    <span>Profile Completeness</span>
                    <span>{Math.min(100, (currentUser.name !== "You" ? 15 : 0) + (obData.bio ? 15 : 0) + (obData.type ? 15 : 0) + ((obData.looking||[]).length ? 10 : 0) + ((obData.styles||[]).length ? 10 : 0) + (obData.zodiac ? 8 : 0) + (obData.mbti ? 7 : 0) + (obData.lifePath ? 5 : 0) + (obData.chinese ? 5 : 0) + (obData.loc ? 10 : 0))}%</span>
                  </div>
                  <div className="completeness-bar"><div className="completeness-fill" style={{width:Math.min(100, (currentUser.name !== "You" ? 15 : 0) + (obData.bio ? 15 : 0) + (obData.type ? 15 : 0) + ((obData.looking||[]).length ? 10 : 0) + ((obData.styles||[]).length ? 10 : 0) + (obData.zodiac ? 8 : 0) + (obData.mbti ? 7 : 0) + (obData.lifePath ? 5 : 0) + (obData.chinese ? 5 : 0) + (obData.loc ? 10 : 0))+"%"}} /></div>
                </div>
                <div className="profile-top">
                  <div className="profile-avatar-wrap">
                     <img loading="lazy" src={currentUser.avatar} alt={currentUser.name} className="profile-avatar" onError={handleImgError} />
                    <div className="profile-ring" />
                  </div>
                  <div className="profile-name">{currentUser.name}</div>
                  <div className="profile-type">{obData.type || "Creative"}</div>
                  <div className="profile-loc">{obData.loc || "Set your location"}</div>
                  <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"center",marginTop:6,fontSize:12,color:"var(--muted)"}}>
                    <span>Member since {new Date(currentUser.createdAt).toLocaleDateString(undefined,{month:"short",year:"numeric"})}</span>
                  </div>
                </div>
                <div className="stats-row">
                  <div className="stat"><div className="stat-num">{matches.length}</div><div className="stat-label">Matches</div></div>
                  <div className="stat"><div className="stat-num">{matchStreak}</div><div className="stat-label">Streak</div></div>
                  <div className="stat"><div className="stat-num">{currentUser.stats.likes}</div><div className="stat-label">Likes</div></div>
                  <div className="stat"><div className="stat-num">{currentUser.stats.superLikes}</div><div className="stat-label">Superlikes</div></div>
                  <div className="stat"><div className="stat-num">{currentUser.stats.passes}</div><div className="stat-label">Passes</div></div>
                </div>
                <div className="section">
                  <div className="section-title">About</div>
                  <div className="section-text">{obData.bio || "No bio yet"}</div>
                </div>
                <div className="section">
                  <div className="section-title">Creative Type</div>
                  <div className="tag-row">{obData.type ? <span className="tag-pill">{obData.type}</span> : <span className="tag-pill">Set your type</span>}</div>
                </div>
                <div className="section">
                  <div className="section-title">Looking For</div>
                  <div className="tag-row">{(obData.looking||["Collaborators","Friends"]).map(s=><span key={s} className="tag-pill">{s}</span>)}</div>
                </div>
                <div className="section">
                  <div className="section-title">Aesthetic</div>
                  <div className="tag-row">{(obData.styles||["Minimalist","Dark"]).map(s=><span key={s} className="tag-pill">{s}</span>)}</div>
                </div>
                <div className="section">
                  <div className="section-title">Personality</div>
                  <div className="tag-row">
                    {obData.zodiac && <span className="tag-pill">♈ {obData.zodiac}</span>}
                    {obData.chinese && <span className="tag-pill">🐉 {obData.chinese}</span>}
                    {obData.mbti && <span className="tag-pill">🧠 {obData.mbti}</span>}
                    {obData.lifePath && <span className="tag-pill">🔮 Path {obData.lifePath}</span>}
                    {!obData.zodiac && !obData.chinese && !obData.mbti && !obData.lifePath && <span className="tag-pill" style={{opacity:0.5}}>Add personality traits</span>}
                  </div>
                </div>
                <div className="section">
                  <div className="avail-row">
                    <div><div className="section-title">Show NSFW</div><div className="avail-sub">Fine art, figure, body art</div></div>
                    <div className={"toggle"+(showNsfw?" on":"")} onClick={()=>setShowNsfw(!showNsfw)}><div className="toggle-dot" /></div>
                  </div>
                </div>
                <div className="section">
                  <div className="section-title">Subscription</div>
                  {currentUser.foundingTier && (
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                      <span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:12,fontWeight:700,padding:"6px 12px",borderRadius:99,background:currentUser.foundingTier==="founding"?"rgba(255,215,0,0.12)":"rgba(212,165,255,0.12)",border:`1px solid ${currentUser.foundingTier==="founding"?"rgba(255,215,0,0.35)":"rgba(212,165,255,0.35)"}`,color:currentUser.foundingTier==="founding"?"var(--gold)":"var(--lavender)"}}>
                        {currentUser.foundingTier==="founding"?"🏆 FOUNDING MEMBER":"⭐ EARLY MEMBER"}
                      </span>
                      {currentUser.proExpiresAt && currentUser.tier==="muse_pro" && (
                        <span style={{fontSize:11,color:"var(--muted)"}}>Pro until {new Date(currentUser.proExpiresAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  )}
                  <div style={{fontSize:13,color:"var(--text2)",marginBottom:10}}>Plan: <span style={{color:"var(--gold)",fontWeight:600}}>{userTier==="muse_pro"||currentUser.tier==="muse_pro"?"Muse Pro":"Free"}</span></div>
                  {currentUser.tier==="muse_pro" && !currentUser.foundingTier ? (
                    <button className="btn btn-outline" style={{fontSize:14,padding:"14px 0"}} onClick={()=>setScreen("subscription")}>Manage Plan</button>
                  ) : currentUser.tier==="muse_pro" && currentUser.foundingTier ? (
                    <button className="btn btn-outline" style={{fontSize:14,padding:"14px 0"}} onClick={()=>setScreen("subscription")}>View Plan</button>
                  ) : (
                    <button className="btn btn-gold" style={{fontSize:14,padding:"14px 0"}} onClick={()=>setScreen("subscription")}>Upgrade</button>
                  )}
                </div>
                <div className="section">
                  <div className="section-title">Badges</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                    {[...checkProfileBadges(currentUser.stats, currentUser.createdAt)].length===0 && <span style={{fontSize:13,color:"var(--muted)"}}>Complete bookings and matches to earn badges</span>}
                    {checkProfileBadges(currentUser.stats, currentUser.createdAt).map(b=><span key={b.name} title={b.desc} style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:12,fontWeight:600,padding:"6px 12px",borderRadius:99,background:`${b.color}20`,border:`1px solid ${b.color}40`,color:b.color}}>{b.icon} {b.name}</span>)}
                  </div>
                </div>
                <div className="section">
                  <div className="section-title">Referral</div>
                  <div className="section-text" style={{marginBottom:8}}>Invite creatives. Earn rewards.</div>
                  <div style={{fontSize:13,color:"var(--text2)",marginBottom:6}}>Tier: <span style={{color:"var(--gold)",fontWeight:700}}>{getReferralTier(currentUser.referrals||0).tier}</span> · {currentUser.referrals||0} joined</div>
                  <div style={{display:"flex",gap:8}}>
                    <button className="btn btn-gold" style={{flex:1,fontSize:12,padding:"10px 0"}} onClick={async()=>{try{const res=await apiFetch("/api/muse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"generate-referral"})});const j=await res.json();if(j.success){showToast("Code: "+j.referral_code);try{navigator.clipboard?.writeText(j.referral_link);showToast("Link copied!");}catch{}}}catch(e){showToast("Try again later")}}}>Copy Referral Link</button>
                  </div>
                  <div style={{marginTop:8,fontSize:11,color:"var(--muted)",lineHeight:1.5}}>Bronze: 5 free swipes · Silver: 1mo Spark free · Gold: 20% fee discount · Platinum: Pro tier</div>
                </div>
                <div className="section">
                  <div className="section-title">Self Discovery</div>
                  <div className="section-text" style={{marginBottom:10}}>Know yourself to find your creative match</div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {(["zodiac","mbti","chinese","lifePath"] as const).map(key => {
                      const done = obSelects.some(s => s.startsWith(key+"-"));
                      const result = obData[key];
                      return (
                        <button key={key} className="btn btn-outline" style={{textAlign:"left",padding:"14px 16px",display:"flex",alignItems:"center",gap:10,fontSize:14}} onClick={() => { setObTestKey(key as any); setTestScreen(key as any); setObStep(13); setObTestStep(0); setScreen("onboard"); }}>
                          <span style={{flex:1}}>{result ? String(result)+" (Lv."+(testLevels[key]||1)+")" : "Take "+key+" test"}</span>
                          <span style={{fontSize:12,color:"var(--gold)"}}>{result ? "Retake" : "Start"}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="section">
                  <div className="section-title">Portfolio</div>
                  <div className="section-text" style={{marginBottom:10}}>Your albums & showcased work</div>
                  <div style={{display:"flex",gap:8,marginBottom:12,overflowX:"auto",scrollbarWidth:"none"}}>
                    {(["all","portrait","landscape","sets"] as const).map(tab => (
                      <span key={tab} className={"conn-tab"+(portfolioTab===tab?" active":"")} onClick={()=>setPortfolioTab(tab)} style={{flexShrink:0,fontSize:12,padding:"6px 14px"}}>{tab==="all"?"All":tab==="portrait"?"Portrait":tab==="landscape"?"Landscape":"Sets"}</span>
                    ))}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                    {(() => {
                      const filtered = currentUser.portfolios.filter(p => {
                        if (portfolioTab === "all") return true;
                        if (portfolioTab === "portrait") return p.type === "portrait";
                        if (portfolioTab === "landscape") return p.type === "landscape";
                        return true;
                      });
                      if (filtered.length > 0) return filtered.slice(0,9).map((p,i) => (
                        <div key={i} style={{aspectRatio:"3/4",borderRadius:12,overflow:"hidden",background:"#1a0a2e",position:"relative",cursor:"pointer"}} onClick={()=>setSelectedPortfolio(p)}>
                          <img loading="lazy" src={p.img} alt={p.title} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={handleImgError} />
                          <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"8px",background:"linear-gradient(to top,rgba(10,6,18,0.9),transparent)"}}>
                            <div style={{fontSize:11,fontWeight:600,color:"var(--text)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.title}</div>
                            <div style={{fontSize:9,color:"var(--muted)"}}>{p.type}</div>
                          </div>
                        </div>
                      ));
                      return [1,2,3,4,5,6].map(i => (
                        <div key={i} style={{aspectRatio:"3/4",borderRadius:12,background:"rgba(255,255,255,0.03)",border:"2px dashed rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--muted)",fontSize:11,cursor:"pointer"}} onClick={()=>setScreen("portfolio")}>Add</div>
                      ));
                    })()}
                  </div>
                  <button className="btn btn-outline" style={{width:"100%",marginTop:12,fontSize:13,padding:"10px 0"}} onClick={()=>setScreen("portfolio")}>Manage Albums</button>
                </div>
                <div className="section">
                  <div className="section-title">Recent Matches</div>
                  <div className="section-text" style={{marginBottom:10}}>Your latest connections</div>
                  <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:8,scrollbarWidth:"none"}}>
                    {matches.length > 0 ? matches.slice(0,5).map(m=>(
                      <div key={m.id} style={{flexShrink:0,width:60,height:60,borderRadius:"50%",overflow:"hidden",background:"#1a0a2e",border:"2px solid rgba(255,215,0,0.2)"}} onClick={()=>{setChatTarget(m);showScreen("chat")}}>
                        <img loading="lazy" src={m.img} alt={m.name} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={handleImgError} />
                      </div>
                    )) : (
                      <div style={{flexShrink:0,width:60,height:60,borderRadius:"50%",background:"rgba(255,255,255,0.03)",border:"2px dashed rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--muted)",fontSize:11}}>No matches yet</div>
                    )}
                  </div>
                </div>
                <div className="section">
                  <div className="section-title">Activity</div>
                  <div className="section-text" style={{marginBottom:10}}>Recent interactions</div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {activityFeed.length > 0 ? activityFeed.slice(0,4).map(a=>(
                      <div key={a.id} style={{display:"flex",gap:10,padding:"10px",background:"rgba(255,255,255,0.02)",borderRadius:12,border:"1px solid rgba(255,255,255,0.04)"}}>
                        <img loading="lazy" src={a.avatar} alt="" style={{width:36,height:36,borderRadius:"50%",objectFit:"cover",background:"#1a0a2e"}} onError={handleImgError} />
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:600,color:"var(--text)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}><strong>{a.from}</strong> {a.text}</div>
                          <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{a.time}</div>
                        </div>
                      </div>
                    )) : (
                      <div style={{padding:"16px",textAlign:"center",color:"var(--muted)",fontSize:13}}>No recent activity. Start swiping to see your interactions here!</div>
                    )}
                  </div>
                </div>
                <div className="profile-btn"><button className="btn btn-outline" onClick={() => { setEditName(currentUser.name); setEditBio(obData.bio||""); setEditLoc(obData.loc||""); setEditAvatar(currentUser.avatar||""); setShowEditProfile(true); }}>Edit Profile</button></div>
                <div className="profile-btn"><button className="btn btn-outline" onClick={() => setShowShareProfile(true)}>Share Profile</button></div>
                <div className="profile-btn"><button className="btn btn-outline" style={{borderColor:"rgba(255,138,128,0.2)",color:"var(--coral)"}} onClick={doLogout}>Log Out</button></div>
              </div>
              <Nav active="profile" onNavigate={showScreen} onHamburgerToggle={openHamburger} />
            </div>
            {toastMsg && <div className="toast">{toastMsg}</div>}
          </div>
        </div>
      )}

      {/* FILTER MODAL */}
      {showFilterModal && (
        <div className="modal-overlay">
          <div className="modal-header">
            <button className="modal-back" onClick={()=>setShowFilterModal(false)}><FiArrowLeft size={20} /></button>
            <div className="modal-title">Filters</div>
            <button className="modal-close" onClick={()=>setShowFilterModal(false)}><FiX size={18} /></button>
          </div>
          <div className="modal-body">
            <div className="filter-section">
              <div className="filter-label">Aesthetic</div>
              <div className="filter-chips">{AESTHETICS.map(s=><div key={s} className={"filter-chip"+(filterStyles.includes(s)?" sel":"")} onClick={()=>setFilterStyles(prev=>prev.includes(s)?prev.filter(x=>x!==s):[...prev,s])}>{s}</div>)}</div>
            </div>
            <div className="filter-section">
              <div className="filter-label">Min Score: {filterScore}%</div>
              <div className="filter-range"><input type="range" min={50} max={99} value={filterScore} onChange={e=>setFilterScore(parseInt(e.target.value))} /></div>
            </div>
            <button className="btn btn-gold" onClick={()=>setShowFilterModal(false)}>Apply Filters</button>
          </div>
        </div>
      )}

      {/* POST BRIEF MODAL */}
      {showPostBrief && (
        <div className="modal-overlay">
          <div className="modal-header">
            <button className="modal-back" onClick={()=>setShowPostBrief(false)}><FiArrowLeft size={20} /></button>
            <div className="modal-title">New Post</div>
            <button className="modal-close" onClick={()=>setShowPostBrief(false)}><FiX size={18} /></button>
          </div>
          <div className="modal-body">
            <div style={{display:"flex",gap:6,marginBottom:12}}>
              {(["tfp","paid","opencall","concept"] as const).map(k=>{
                const l2=k==="tfp"?"TFP":k==="paid"?"Paid":k==="opencall"?"Open Call":"Ideas";
                const c2=k==="tfp"?"var(--mint)":k==="paid"?"var(--gold)":k==="opencall"?"#87CEEB":"var(--lavender)";
                const active=briefCat===k;
                return <div key={k} onClick={()=>setBriefCat(k)} style={{padding:"8px 14px",borderRadius:99,cursor:"pointer",fontSize:12,fontWeight:600,transition:"all .25s",background:active?c2+"22":"rgba(255,255,255,0.04)",border:"1px solid "+(active?c2+"55":"rgba(255,255,255,0.06)"),color:active?c2:"var(--muted)"}}>{l2}</div>;
              })}
            </div>
            <input className="inp" placeholder="Title" value={briefTitle} onChange={e=>setBriefTitle(e.target.value)} />
            <textarea className="inp" placeholder={briefCat==="concept"?"Share your idea...":briefCat==="tfp"?"Describe the TFP collaboration...":briefCat==="paid"?"Describe the project and deliverables...":"Describe the opportunity..."} rows={4} value={briefDesc} onChange={e=>setBriefDesc(e.target.value)} />
            {briefCat!=="concept" && <input className="inp" placeholder={briefCat==="tfp"?"Budget: TFP / Trade / Expenses covered":briefCat==="paid"?"Budget range (e.g. $1,000-$3,000)":"Budget / Stipend / Volunteer"} value={briefBudget} onChange={e=>setBriefBudget(e.target.value)} />}
            <button className="btn btn-gold" onClick={async()=>{if(briefTitle.trim()){setUserBriefs(prev=>[...prev,{id:uid(),title:briefTitle,desc:briefDesc,budget:briefCat==="concept"?"—":briefBudget||"Negotiable",tags:["New",briefCat],cat:briefCat}]);setShowPostBrief(false);setBriefTitle("");setBriefDesc("");setBriefBudget("");setBriefCat("concept");try{await apiFetch("/api/muse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"brief",title:briefTitle,desc:briefDesc,budget:briefCat==="concept"?"—":briefBudget||"Negotiable",cat:briefCat})});showToast("Posted!")}catch{showToast("Failed to post")}}else{showToast("Title required")}}}>Post</button>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {showEditProfile && (
        <div className="modal-overlay">
          <div className="modal-header">
            <button className="modal-back" onClick={()=>setShowEditProfile(false)}><FiArrowLeft size={20} /></button>
            <div className="modal-title">Edit Profile</div>
            <button className="modal-close" onClick={()=>setShowEditProfile(false)}><FiX size={18} /></button>
          </div>
          <div className="modal-body">
            <div style={{display:"flex",justifyContent:"center",marginBottom:16}}>
              <div style={{position:"relative"}}>
                <img loading="lazy" src={editAvatar || currentUser.avatar} alt="" style={{width:88,height:88,borderRadius:"50%",objectFit:"cover",border:"3px solid var(--gold)",background:"#1a0a2e"}} onError={handleImgError} />
                <button type="button" onClick={()=>editAvatarInputRef.current?.click()} style={{position:"absolute",bottom:0,right:0,width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,var(--gold),var(--amber))",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#0a0612"}} title="Upload profile photo" aria-label="Upload profile photo">+</button>
                <input ref={editAvatarInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={async (e)=>{const f=e.target.files?.[0];if(f){showToast("Uploading...");const url=await uploadImage(f,"avatars");if(url){setEditAvatar(url);showToast("Photo added!")}}}} />
              </div>
            </div>
            <input className="inp" placeholder="Display Name" value={editName} onChange={e=>setEditName(e.target.value)} />
            <textarea className="inp" placeholder="Bio" rows={3} value={editBio} onChange={e=>setEditBio(e.target.value)} />
            <input className="inp" placeholder="Location" value={editLoc} onChange={e=>setEditLoc(e.target.value)} />
            <button className="btn btn-gold" onClick={saveProfileEdits}>Save</button>
          </div>
        </div>
      )}

      {/* SHARE PROFILE SHEET */}
      {showShareProfile && (
        <div className="modal-overlay" onClick={()=>setShowShareProfile(false)}>
          <div className="share-sheet" onClick={e=>e.stopPropagation()}>
            <div className="share-title">Share Profile</div>
            <div className="share-options">
              <div className="share-opt" onClick={()=>{navigator.clipboard?.writeText("https://wyzdesign.com/muse/profile/"+(authUser?.id||currentUser.name.replace(/\s+/g,"-").toLowerCase())).then(()=>showToast("Link copied!")).catch(()=>showToast("Copied!"));setShowShareProfile(false)}}><span className="share-opt-icon"><FiLink size={24} /></span><span className="share-opt-label">Copy</span></div>
              <div className="share-opt" onClick={()=>{window.open("https://twitter.com/intent/tweet?text=Check%20out%20my%20Muse%20profile!&url="+encodeURIComponent("https://wyzdesign.com/muse"),"blank")}}><span className="share-opt-icon"><FiTwitter size={24} /></span><span className="share-opt-label">Twitter</span></div>
              <div className="share-opt" onClick={()=>{const url="https://wyzdesign.com/muse/profile/"+(authUser?.id||currentUser.name.replace(/\s+/g,"-").toLowerCase());if(navigator.share){navigator.share({title:"My Muse Profile",text:"Check out my Muse profile!",url}).catch(()=>{});}else{window.open("https://www.instagram.com/");}setShowShareProfile(false)}}><span className="share-opt-icon"><FiInstagram size={24} /></span><span className="share-opt-label">IG</span></div>
            </div>
            <div className="share-link"><span className="share-link-text">{"wyzdesign.com/muse/profile/"+(authUser?.id||currentUser.name.replace(/\s+/g,"-").toLowerCase())}</span><button className="share-link-copy" onClick={()=>{navigator.clipboard?.writeText("https://wyzdesign.com/muse/profile/"+(authUser?.id||currentUser.name.replace(/\s+/g,"-").toLowerCase())).then(()=>showToast("Link copied!")).catch(()=>showToast("Copied!"))}}>Copy</button></div>
            <button className="btn btn-outline" style={{marginTop:16}} onClick={()=>setShowShareProfile(false)}>Close</button>
          </div>
        </div>
      )}

      

      {/* SUBSCRIPTION SCREEN */}
      {screen === "subscription" && (
        <div className="phone-wrap">
          <div className="phone" id="muse-app">
            <div className="notch" />
            <div className="hdr">
              <div className="logo-link" style={{fontSize:28}}>Profile</div>
              <button className="hdr-btn" onClick={()=>showScreen("profile")}><FiArrowLeft size={18} /></button>
            </div>
            <div className="sub-scroll">
              <div className="sub-header">
                <div className="sub-title">Unlock Your Potential</div>
                <div className="sub-subtitle">Choose the plan for your creative journey</div>
              </div>
              {currentUser.foundingTier && (
                <div style={{padding:"12px 16px",borderRadius:16,marginBottom:14,background:currentUser.foundingTier==="founding"?"rgba(255,215,0,0.1)":"rgba(212,165,255,0.1)",border:`1px solid ${currentUser.foundingTier==="founding"?"rgba(255,215,0,0.3)":"rgba(212,165,255,0.3)"}`}}>
                  <div style={{fontSize:14,fontWeight:700,color:currentUser.foundingTier==="founding"?"var(--gold)":"var(--lavender)"}}>{currentUser.foundingTier==="founding"?"🏆 Founding Member — Lifetime Pro":"⭐ Early Member — Free Pro"}</div>
                  <div style={{fontSize:12,color:"var(--text2)",marginTop:4}}>
                    {currentUser.foundingTier==="founding"
                      ? "You're locked in for life. Thanks for believing in Muse."
                      : currentUser.proExpiresAt ? `Free Pro until ${new Date(currentUser.proExpiresAt).toLocaleDateString()}. Then $9.99/mo or earn it via referrals.` : "Free Pro as an early believer."}
                  </div>
                </div>
              )}
              {TIERS.map(tier => {
                const tierKey = tier.name.toLowerCase().replace(" ","_");
                const isCurrent = tierKey===userTier || (tierKey==="muse_pro" && currentUser.tier==="muse_pro");
                return (
                <div key={tier.name} className={"tier-card"+(isCurrent?" current":"")} style={{position:"relative"}}>
                  <div className="tier-header">
                    <div className="tier-name">{tier.name}</div>
                    <div><span className="tier-price">{tier.price}</span><span className="tier-period">{tier.period}</span></div>
                  </div>
                  <ul className="tier-features">{tier.features.map(f=><li key={f}>{f}</li>)}</ul>
                  <button className={"tier-btn"+(tier.name==="Muse Pro"?" tier-btn-primary":" tier-btn-outline")} onClick={async()=>{if(isCurrent)return;if(tier.name==="Free"){showToast("You're on the Free plan");return;}try{const r=await fetch("/api/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"subscription",plan:tierKey,email:authUser?.email,userId:authUser?.id})});const d=await r.json();if(d.url){window.location.href=d.url}else{showToast(d.error||"Checkout unavailable, try again later")}}catch{showToast("Checkout unavailable, try again later")}}}>
                    {isCurrent ? "Current Plan" : tier.name==="Free" ? "Free Plan" : "Select "+tier.name}
                  </button>
                </div>
                );
              })}
            </div>
            <Nav active="profile" onNavigate={showScreen} onHamburgerToggle={openHamburger} />
          </div>
        </div>
      )}
      {/* SETTINGS SCREEN */}
      {screen === "settings" && (
        <div className="phone-wrap">
          <div className="phone" id="muse-app">
            <div className="notch" />
            <div className="hdr">
              <div className="logo-link" style={{fontSize:28}}>Profile</div>
              <button className="hdr-btn" onClick={()=>showScreen("profile")}><FiArrowLeft size={18} /></button>
            </div>
            <div className="settings-scroll">
              <div className="settings-group">
                <div className="settings-group-title">Account</div>
                {[
                  {icon:<FiUser size={18}/>,label:"Edit Profile",desc:"Name, bio, photos",action:()=>{setEditName(currentUser.name);setEditBio(obData.bio||"");setEditLoc(obData.loc||"");setEditAvatar(currentUser.avatar||"");setShowEditProfile(true)}},
                  {icon:<FiSettings size={18}/>,label:"Notifications",desc:"Push and email alerts",action:()=>setShowNotificationsSettings(!showNotificationsSettings)},
                  {icon:<FiLink size={18}/>,label:"Connected Accounts",desc:"Instagram, Spotify, etc.",action:()=>setShowConnectedAccounts(!showConnectedAccounts)},
                  {icon:<FiStar size={18}/>,label:"Personality Profile",desc:"Zodiac, MBTI, Life Path",action:()=>{setScreen("onboard");setObStep(7)}},
                  {icon:<FiUsers size={18}/>,label:"Creative Profile",desc:"Type, styles, looking for",action:()=>{setScreen("onboard");setObStep(4)}},
                  ...(isUnlimited ? [{icon:<FiShield size={18}/>,label:"Admin Dashboard",desc:"Analytics & moderation",action:()=>{window.open("/muse/admin","_self")}}] : []),
                ].map(item=>(
                  <div key={item.label} className="settings-item" onClick={item.action}>
                    <div className="settings-item-left"><div className="settings-icon">{item.icon}</div><div><div className="settings-label">{item.label}</div><div className="settings-sublabel">{item.desc}</div></div></div>
                    <div className="settings-arrow">→</div>
                  </div>
                ))}
                {showNotificationsSettings && (
                  <div style={{padding:"12px 0 0",display:"flex",flexDirection:"column",gap:12}}>
                    {[{k:"match",l:"New Matches"},{k:"message",l:"Messages"},{k:"brief",l:"Brief Updates"},{k:"like",l:"Likes"}].map(n=>(
                      <div key={n.k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                        <span style={{fontSize:14,color:"var(--text)"}}>{n.l}</span>
                        <div onClick={()=>setNotifPrefs(prev=>({...prev,[n.k]:!prev[n.k]}))} className={"toggle-track"+(notifPrefs[n.k]?" active":"")} style={{width:44,height:24,borderRadius:12,cursor:"pointer",position:"relative",transition:"all .3s",background:notifPrefs[n.k]?"linear-gradient(135deg,var(--coral),var(--pink))":"rgba(255,255,255,0.1)"}}>
                          <div style={{width:20,height:20,borderRadius:10,background:"#fff",position:"absolute",top:2,left:notifPrefs[n.k]?22:2,transition:"all .3s"}} />
                        </div>
                      </div>
                    ))}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                      <span style={{fontSize:14,color:"var(--text)"}}>Lock-Screen Push</span>
                      <div onClick={async()=>{
                        if (!pushEnabled) {
                          const res = await subscribeToMusePush();
                          if (res.ok) { setPushEnabled(true); showToast("Push notifications on"); }
                          else showToast(res.error || "Could not enable push");
                        } else {
                          const res = await unsubscribeFromMusePush();
                          if (res.ok) { setPushEnabled(false); showToast("Push notifications off"); }
                          else showToast(res.error || "Could not disable push");
                        }
                      }} className={"toggle-track"+(pushEnabled?" active":"")} style={{width:44,height:24,borderRadius:12,cursor:"pointer",position:"relative",transition:"all .3s",background:pushEnabled?"linear-gradient(135deg,var(--coral),var(--pink))":"rgba(255,255,255,0.1)"}}>
                        <div style={{width:20,height:20,borderRadius:10,background:"#fff",position:"absolute",top:2,left:pushEnabled?22:2,transition:"all .3s"}} />
                      </div>
                    </div>
                  </div>
                )}
                {showConnectedAccounts && (
                  <div style={{padding:"12px 0 0",display:"flex",flexDirection:"column",gap:10}}>
                    {[{k:"instagram",l:"Instagram",icon:<FiInstagram size={18}/>},{k:"facebook",l:"Facebook",icon:<FiTwitter size={18}/>},{k:"spotify",l:"Spotify",icon:<FiMusic size={18}/>},{k:"soundcloud",l:"SoundCloud",icon:<FiHeadphones size={18}/>}].map(s=>(
                      <div key={s.k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                        <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{color:"var(--text2)"}}>{s.icon}</span><span style={{fontSize:14,color:"var(--text)"}}>{s.l}</span></div>
                        <div onClick={()=>toggleSocial(s.k)} className={"toggle-track"+(obConnectedSocials[s.k]?" active":"")} style={{width:44,height:24,borderRadius:12,cursor:"pointer",position:"relative",transition:"all .3s",background:obConnectedSocials[s.k]?"linear-gradient(135deg,var(--coral),var(--pink))":"rgba(255,255,255,0.1)"}}>
                          <div style={{width:20,height:20,borderRadius:10,background:"#fff",position:"absolute",top:2,left:obConnectedSocials[s.k]?22:2,transition:"all .3s"}} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="settings-group">
                <div className="settings-group-title">Appearance</div>
                <div className="theme-grid" style={{margin:"12px 0 4px"}}>
                  {(["lasunset","deepspace","nebula","villa","deepsea"] as const).map(t => (
                    <div key={t} className={"theme-swatch"+(theme===t?" active":"")} data-val={t} title={t} onClick={()=>setTheme(t)} style={{textTransform:"capitalize"}}>{theme===t?"✓":t.slice(0,3)}</div>
                  ))}
                </div>
              </div>
              <div className="settings-group">
                <div className="settings-group-title">Privacy</div>
                {[
                  {icon:<FiEye size={18}/>,label:"NSFW Content",desc:myGeo?.requiresIdVerification?"ID verification required in your state":"Show or hide 18+ content",action:()=>{if(!showNsfw){if(myGeo?.requiresIdVerification){setShowAgeVerification(true)}else{setShowAgeGate(true);setPendingNsfw(true)}}else{setShowNsfw(false)}}},
                  {icon:<FiMoreHorizontal size={18}/>,label:"Blocked Users",desc:"Manage blocked profiles",action:()=>setShowBlockedUsers(!showBlockedUsers)},
                ].map(item=>(
                  <div key={item.label} className="settings-item" onClick={item.action}>
                    <div className="settings-item-left"><div className="settings-icon">{item.icon}</div><div><div className="settings-label">{item.label}</div><div className="settings-sublabel">{item.desc}</div></div></div>
                    <div className="settings-arrow">→</div>
                  </div>
                ))}
                {showBlockedUsers && (
                  <div style={{padding:"12px 0 0"}}>
                    {blockedUsers.length === 0 ? (
                      <div style={{textAlign:"center",padding:20,color:"var(--text2)",fontSize:13}}>No blocked users</div>
                    ) : (
                      blockedUsers.map(uid => (
                        <div key={uid} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                          <span style={{fontSize:14,color:"var(--text)"}}>{uid}</span>
                          <button className="btn btn-outline" style={{padding:"4px 12px",fontSize:12}} onClick={()=>setBlockedUsers(blockedUsers.filter(b=>b!==uid))}>Unblock</button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              <div className="settings-group">
                <div className="settings-group-title">Support</div>
                {[
                  {icon:<FiZap size={18}/>,label:"Subscription",desc:"Manage your plan",action:()=>showScreen("subscription")},
                  {icon:<FiDollarSign size={18}/>,label:"Marketplace Payments",desc:"Connect Stripe to receive bookings",action:()=>setShowConnect(true)},
                  {icon:<FiDollarSign size={18}/>,label:"Payment History",desc:"View earnings and transactions",action:()=>setShowPaymentHistory(true)},
                  {icon:<FiGift size={18}/>,label:"Referral Program",desc:"Invite friends, earn free months",action:()=>setShowReferral(true)},
                  {icon:<FiShield size={18}/>,label:"Safety Center",desc:"Check-ins, emergency contacts, trusted friends",action:()=>setShowSafetyCheckin(true)},
                  {icon:<FiStar size={18}/>,label:"Profile Completion",desc:`${Math.round((promptResponses.length / Math.max(promptBankData.length, 1)) * 100)}% — answer prompts to improve matches`,action:()=>setShowPromptBank(true)},
                  {icon:<FiFile size={18}/>,label:"Terms of Service",desc:"Legal terms",action:()=>setShowTerms(true)},
                  {icon:<FiFile size={18}/>,label:"Privacy Policy",desc:"How we handle your data",action:()=>setShowPrivacy(true)},
                  {icon:<FiFile size={18}/>,label:"Community Guidelines",desc:"Standards & expectations",action:()=>setShowGuidelines(true)},
                  {icon:<FiX size={18}/>,label:"Delete Account",desc:"Permanently remove your data",action:()=>setShowDeleteConfirm(true)},
                ].map(item=>(
                  <div key={item.label} className="settings-item" onClick={item.action}>
                    <div className="settings-item-left"><div className="settings-icon">{item.icon}</div><div><div className="settings-label">{item.label}</div><div className="settings-sublabel">{item.desc}</div></div></div>
                    <div className="settings-arrow">→</div>
                  </div>
                ))}
              </div>
              <button className="btn btn-outline" style={{width:"100%",marginBottom:20}} onClick={doLogout}>Log Out</button>
            </div>
            <Nav active="profile" onNavigate={showScreen} onHamburgerToggle={openHamburger} />
          </div>
        </div>
      )}

      {/* REPORT MODAL */}
      {showReport && (
        <div className="modal-overlay">
          <div className="modal-header">
            <button className="modal-back" onClick={()=>setShowReport(false)}><FiArrowLeft size={20} /></button>
            <div className="modal-title">Report</div>
            <button className="modal-close" onClick={()=>setShowReport(false)}><FiX size={18} /></button>
          </div>
          <div className="modal-body">
            {[
              {icon:"🚫",label:"Inappropriate Content",desc:"Nudity, violence, or spam"},
              {icon:"🎭",label:"Fake Profile",desc:"Not a real person or catfish"},
              {icon:"⚡",label:"Harassment",desc:"Threats, bullying, or hate speech"},
              {icon:"🔞",label:"Underage",desc:"User appears to be under 18"},
              {icon:"💼",label:"Scam or Fraud",desc:"Selling, soliciting, or phishing"},
              {icon:"📋",label:"Other",desc:"Something else not listed above"},
            ].map(r=>(
               <div key={r.label} className="report-option" onClick={async()=>{if(reportTarget){let ok=false;try{const res=await apiFetch("/api/muse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"report",target_id:reportTarget.id,target_type:reportTarget.type,reason:r.label})});ok=res.ok}catch{}showToast(ok?"Reported: "+r.label:"Failed to report")}setShowReport(false);setReportTarget(null)}}>
                <div className="report-option-icon">{r.icon}</div>
                <div>
                  <div className="report-option-text">{r.label}</div>
                  <div className="report-option-desc">{r.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LIKE + NOTE MODAL */}
      {showLikeNote && noteTargetProfile && (
        <div className="modal-overlay" style={{zIndex:500}}>
          <div className="modal-header">
            <button className="modal-back" onClick={()=>setShowLikeNote(false)}><FiArrowLeft size={20} /></button>
            <div className="modal-title">Like + Note</div>
            <button className="modal-close" onClick={()=>setShowLikeNote(false)}><FiX size={18} /></button>
          </div>
          <div className="modal-body" style={{display:"flex",flexDirection:"column",gap:16,paddingTop:20}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <img loading="lazy" src={noteTargetProfile.img} alt={noteTargetProfile.name} style={{width:48,height:48,borderRadius:"50%",objectFit:"cover"}} onError={handleImgError} />
              <div>
                <div style={{fontWeight:700,fontSize:16,color:"var(--text)"}}>{noteTargetProfile.name}</div>
                <div style={{fontSize:13,color:"var(--muted)"}}>{noteTargetProfile.type}</div>
              </div>
            </div>
            <textarea className="inp" placeholder="Send a note with your like…" rows={4} value={likeNoteText} onChange={e=>setLikeNoteText(e.target.value)} style={{fontSize:14,resize:"none",borderRadius:12}} />
            <div style={{fontSize:12,color:"var(--muted)",textAlign:"right"}}>{likeNoteText.length}/200</div>
            <button className="btn btn-gold" onClick={()=>{
              if (!noteTargetProfile) return;
              doSwipe("right");
              if (likeNoteText.trim()) {
                const msg = likeNoteText.trim().slice(0,200);
                setMatches(prev => prev.map(m => m.id === noteTargetProfile.id ? { ...m, messages: [...(m.messages||[]), { from: currentUser.name, text: msg, time: "Just now" }] } : m));
                showToast("Liked + note sent!");
              }
              setShowLikeNote(false);
              setLikeNoteText("");
              setNoteTargetProfile(null);
            }} style={{width:"100%",padding:"14px"}}>
              ♥ Send Like & Note
            </button>
          </div>
        </div>
      )}

      {/* TERMS OF SERVICE MODAL */}
      {showTerms && (
        <div className="modal-overlay">
          <div className="modal-header">
            <button className="modal-back" onClick={()=>setShowTerms(false)}><FiArrowLeft size={20} /></button>
            <div className="modal-title">Terms of Service</div>
            <button className="modal-close" onClick={()=>setShowTerms(false)}><FiX size={18} /></button>
          </div>
          <div className="modal-body" style={{maxHeight:"70vh",overflowY:"auto",lineHeight:1.7,fontSize:13,color:"var(--text2)"}}>
            <div style={{fontWeight:700,fontSize:16,color:"var(--text)",marginBottom:12}}>Muse Terms of Service</div>
            <p><strong>1. Acceptance of Terms</strong>{"\n"}By accessing or using Muse, a creative networking platform operated by WYZ Design, you agree to be bound by these Terms of Service. If you do not agree, do not use the service.</p>
            <p><strong>2. Eligibility</strong>{"\n"}You must be at least 18 years old to use Muse. By using the service, you represent that you meet this age requirement.</p>
            <p><strong>3. User Accounts</strong>{"\n"}You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate and complete information during registration and to update it as necessary.</p>
            <p><strong>4. User Content</strong>{"\n"}You retain ownership of content you post on Muse. By posting content, you grant Muse a non-exclusive, worldwide license to use, display, and distribute your content in connection with the service.</p>
            <p><strong>5. Prohibited Conduct</strong>{"\n"}You may not: harass other users, post illegal or harmful content, attempt to circumvent security measures, use the service for commercial spam, or violate any applicable laws.</p>
            <p><strong>6. Intellectual Property</strong>{"\n"}All content, trademarks, and intellectual property on Muse (excluding user content) are owned by WYZ Design. You may not copy, modify, or distribute our intellectual property without written consent.</p>
            <p><strong>7. Privacy</strong>{"\n"}Your use of Muse is also governed by our Privacy Policy. Please review it to understand how we collect, use, and protect your information.</p>
            <p><strong>8. Termination</strong>{"\n"}We reserve the right to suspend or terminate your account at our discretion, with or without notice, for conduct that violates these Terms or is otherwise harmful to the service or its users.</p>
            <p><strong>9. Disclaimer</strong>{"\n"}Muse is provided {"\""}as is{"\""} without warranties of any kind. We are not liable for any damages arising from your use of the service.</p>
            <p><strong>10. Changes to Terms</strong>{"\n"}We may update these Terms at any material time. Continued use of Muse after changes constitutes acceptance of the new Terms.</p>
            <div style={{textAlign:"center",padding:"16px 0",fontSize:11,color:"var(--muted)"}}>Last updated: July 2026 · WYZ Design LLC</div>
            <button className="btn btn-gold" style={{width:"100%",marginTop:8}} onClick={()=>setShowTerms(false)}>I Understand</button>
          </div>
        </div>
      )}

      {showPrivacy && (
        <div className="modal-overlay">
          <div className="modal-header">
            <button className="modal-back" onClick={()=>setShowPrivacy(false)}><FiArrowLeft size={20} /></button>
            <div className="modal-title">Privacy Policy</div>
            <button className="modal-close" onClick={()=>setShowPrivacy(false)}><FiX size={18} /></button>
          </div>
          <div className="modal-body" style={{maxHeight:"70vh",overflowY:"auto",lineHeight:1.7,fontSize:13,color:"var(--text2)"}}>
            <div style={{fontWeight:700,fontSize:16,color:"var(--text)",marginBottom:12}}>Muse Privacy Policy</div>
            <p><strong>1. Information We Collect</strong>{"\n"}Account information (name, email, profile details you provide), content you post (photos, messages, briefs, forum posts), usage data (swipes, matches, interactions), device information (browser type, OS, IP address).</p>
            <p><strong>2. How We Use Your Information</strong>{"\n"}To provide and improve the Muse service, to match you with compatible creatives, to communicate with you about your account and the service, to detect and prevent fraud or abuse, and to comply with legal obligations.</p>
            <p><strong>3. Information Sharing</strong>{"\n"}We do not sell your personal information. We may share information with service providers who assist in operating the platform (hosting, analytics), when required by law, or with your explicit consent. Your profile is visible to other Muse users based on your privacy settings.</p>
            <p><strong>4. Data Storage & Security</strong>{"\n"}Your data is stored on secure servers provided by Supabase. We use industry-standard encryption for data in transit (TLS) and at rest. However, no method of transmission over the Internet is 100% secure.</p>
             <p><strong>5. Your Rights</strong>{"\n"}You can access, update, or delete your account data at any time through the app settings. You may request a copy of all data we hold about you by contacting {SUPPORT_EMAIL}. You may also request deletion of your account and all associated data.</p>
            <p><strong>6. Cookies & Tracking</strong>{"\n"}We use essential cookies for authentication and session management. We do not use third-party advertising cookies. Analytics data is collected anonymously to improve the service.</p>
            <p><strong>7. Children's Privacy</strong>{"\n"}Muse is not intended for users under 18. We do not knowingly collect information from children. If we become aware of such collection, we will delete the information immediately.</p>
            <p><strong>8. Changes to This Policy</strong>{"\n"}We may update this Privacy Policy from time to time. We will notify you of material changes through the app or by email.</p>
            <p><strong>9. Contact Us</strong>{"\n"}For questions about this Privacy Policy, contact us at {SUPPORT_EMAIL} or WYZ Design LLC.</p>
            <div style={{textAlign:"center",padding:"16px 0",fontSize:11,color:"var(--muted)"}}>Last updated: July 2026 · WYZ Design LLC</div>
            <button className="btn btn-gold" style={{width:"100%",marginTop:8}} onClick={()=>setShowPrivacy(false)}>I Understand</button>
          </div>
        </div>
      )}

      {showGuidelines && (
        <div className="modal-overlay">
          <div className="modal-header">
            <button className="modal-back" onClick={()=>setShowGuidelines(false)}><FiArrowLeft size={20} /></button>
            <div className="modal-title">Community Guidelines</div>
            <button className="modal-close" onClick={()=>setShowGuidelines(false)}><FiX size={18} /></button>
          </div>
          <div className="modal-body" style={{maxHeight:"70vh",overflowY:"auto",lineHeight:1.7,fontSize:13,color:"var(--text2)"}}>
            <div style={{fontWeight:700,fontSize:16,color:"var(--text)",marginBottom:12}}>Muse Community Guidelines</div>
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
      )}

      {/* DELETE ACCOUNT CONFIRMATION */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-header">
            <button className="modal-back" onClick={()=>setShowDeleteConfirm(false)}><FiArrowLeft size={20} /></button>
            <div className="modal-title">Delete Account</div>
            <button className="modal-close" onClick={()=>setShowDeleteConfirm(false)}><FiX size={18} /></button>
          </div>
          <div className="modal-body" style={{textAlign:"center"}}>
            <div style={{fontSize:48,marginBottom:16}}>⚠️</div>
            <div style={{fontSize:18,fontWeight:700,color:"var(--text)",marginBottom:8}}>Are you sure?</div>
            <div style={{fontSize:14,color:"var(--text2)",marginBottom:24,lineHeight:1.6}}>This action is permanent and cannot be undone. All your data, matches, messages, and portfolio will be permanently deleted.</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
               <button className="btn btn-gold" style={{width:"100%",borderColor:"var(--coral)",background:"linear-gradient(135deg,var(--coral),#ff4444)"}} onClick={async()=>{try{const res=await authFetch("/api/muse/auth",{method:"POST",body:JSON.stringify({action:"delete-account"})});if(!res.ok) throw new Error("failed");safeRemoveItem("muse_user");safeRemoveItem("muse_v1");safeRemoveItem("muse_geo");safeRemoveItem("muse_boost");safeRemoveItem("muse_last_reset");safeRemoveItem("muse_local");safeRemoveItem("muse_premium");safeRemoveItem("muse_referral_code");safeRemoveItem("muse_open_count");safeRemoveItem("muse_hide_premium");setAuthUser(null);setShowDeleteConfirm(false);setScreen("auth");showToast("Account deleted. We're sorry to see you go.");return}catch{showToast("Delete failed — try again")}}}>Yes, Delete My Account</button>
              <button className="btn btn-outline" style={{width:"100%"}} onClick={()=>setShowDeleteConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* DISCOVERY PREFERENCES MODAL */}
      {showDiscoveryPrefs && (
        <div className="modal-overlay">
          <div className="modal-header">
            <button className="modal-back" onClick={()=>setShowDiscoveryPrefs(false)}><FiArrowLeft size={20} /></button>
            <div className="modal-title">Discovery Preferences</div>
            <button className="modal-close" onClick={()=>setShowDiscoveryPrefs(false)}><FiX size={18} /></button>
          </div>
          <div className="modal-body">
            <div style={{marginBottom:20}}>
              <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:8}}>Age Range: {discoveryPrefs.ageMin} — {discoveryPrefs.ageMax}</div>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <input type="range" min={18} max={65} value={discoveryPrefs.ageMin} onChange={e=>setDiscoveryPrefs(p=>({...p,ageMin:Math.min(Number(e.target.value),p.ageMax-1)}))} style={{flex:1,accentColor:"var(--gold)"}} />
                <input type="range" min={18} max={65} value={discoveryPrefs.ageMax} onChange={e=>setDiscoveryPrefs(p=>({...p,ageMax:Math.max(Number(e.target.value),p.ageMin+1)}))} style={{flex:1,accentColor:"var(--gold)"}} />
              </div>
            </div>
            <div style={{marginBottom:20}}>
              <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:8}}>Max Distance: {discoveryPrefs.distance} mi</div>
              <input type="range" min={1} max={100} value={discoveryPrefs.distance} onChange={e=>setDiscoveryPrefs(p=>({...p,distance:Number(e.target.value)}))} style={{width:"100%",accentColor:"var(--gold)"}} />
            </div>
            <div style={{marginBottom:20}}>
              <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:8}}>Show Me</div>
              <div style={{display:"flex",gap:8}}>
                {["all","women","men","non-binary"].map(g=>(
                  <div key={g} onClick={()=>setDiscoveryPrefs(p=>({...p,gender:g}))} style={{padding:"8px 16px",borderRadius:99,cursor:"pointer",fontSize:12,fontWeight:600,transition:"all .25s",background:discoveryPrefs.gender===g?"rgba(255,215,0,0.12)":"rgba(255,255,255,0.04)",border:"1px solid "+(discoveryPrefs.gender===g?"rgba(255,215,0,0.3)":"rgba(255,255,255,0.06)"),color:discoveryPrefs.gender===g?"var(--gold)":"var(--muted)"}}>{g.charAt(0).toUpperCase()+g.slice(1)}</div>
                ))}
              </div>
            </div>
            <button className="btn btn-gold" style={{width:"100%"}} onClick={()=>{setShowDiscoveryPrefs(false);showToast("Preferences saved!")}}>Save</button>
          </div>
        </div>
      )}

      {/* UNMATCH CONFIRMATION */}
      {unmatchTarget && (
        <div className="modal-overlay">
          <div className="modal-header">
            <button className="modal-back" onClick={()=>setUnmatchTarget(null)}><FiArrowLeft size={20} /></button>
            <div className="modal-title">Unmatch</div>
            <button className="modal-close" onClick={()=>setUnmatchTarget(null)}><FiX size={18} /></button>
          </div>
          <div className="modal-body" style={{textAlign:"center"}}>
            <div style={{fontSize:48,marginBottom:16}}>💔</div>
            <div style={{fontSize:18,fontWeight:700,color:"var(--text)",marginBottom:8}}>Unmatch with {unmatchTarget}?</div>
            <div style={{fontSize:14,color:"var(--text2)",marginBottom:24,lineHeight:1.6}}>This will remove them from your matches and delete all messages. This cannot be undone.</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <button className="btn btn-gold" style={{width:"100%",background:"linear-gradient(135deg,var(--coral),#ff4444)",borderColor:"var(--coral)"}} onClick={()=>{setMatches(prev=>prev.filter(m=>m.name!==unmatchTarget));setUnmatchTarget(null);showScreen("matches");showToast("Unmatched")}}>Unmatch</button>
              <button className="btn btn-outline" style={{width:"100%"}} onClick={()=>setUnmatchTarget(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVITY FEED */}
      {showActivityFeed && (
        <div className="modal-overlay">
          <div className="modal-header">
            <button className="modal-back" onClick={()=>setShowActivityFeed(false)}><FiArrowLeft size={20} /></button>
            <div className="modal-title">Activity</div>
            <button className="modal-close" onClick={()=>setShowActivityFeed(false)}><FiX size={18} /></button>
          </div>
          <div className="modal-body" style={{maxHeight:"70vh",overflowY:"auto"}}>
            {activityFeed.length===0 ? (
              <div style={{textAlign:"center",padding:30,color:"var(--muted)",fontSize:14}}>No activity yet. Start swiping!</div>
            ) : activityFeed.map(a=>(
              <div key={a.id} style={{display:"flex",gap:12,padding:"12px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",opacity:a.read?0.6:1}}>
                <img loading="lazy" src={a.avatar} alt="" style={{width:40,height:40,borderRadius:"50%",objectFit:"cover",backgroundColor:"#1a0a2e"}} />
                <div style={{flex:1}}>
                  <div style={{fontSize:14,color:"var(--text)"}}><strong>{a.from}</strong> {a.text}</div>
                  <div style={{fontSize:11,color:"var(--muted)",marginTop:4}}>{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STORIES VIEWER */}
      {showStory!==null && (
        <div style={{position:"absolute",inset:0,zIndex:600,background:"rgba(0,0,0,0.95)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowStory(null)}>
          <div style={{position:"absolute",top:20,left:20,right:20,display:"flex",gap:4}}>
            {stories.map((s,i)=>(<div key={s.id} style={{flex:1,height:3,borderRadius:2,background:i===showStory?"var(--gold)":"rgba(255,255,255,0.2)"}} />))}
          </div>
          {stories[showStory] && (
            <div style={{textAlign:"center"}}>
              <img loading="lazy" src={stories[showStory].img} alt="" style={{maxWidth:"90%",maxHeight:"70vh",borderRadius:16,objectFit:"contain",backgroundColor:"#1a0a2e"}} />
              <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"center",marginTop:16}}>
                <img loading="lazy" src={stories[showStory].avatar} alt="" style={{width:32,height:32,borderRadius:"50%",objectFit:"cover",backgroundColor:"#1a0a2e"}} />
                <span style={{color:"#fff",fontWeight:700}}>{stories[showStory].author}</span>
                <span style={{color:"rgba(255,255,255,0.5)",fontSize:12}}>{stories[showStory].time}</span>
              </div>
            </div>
          )}
          <div style={{position:"absolute",bottom:30,color:"rgba(255,255,255,0.5)",fontSize:12}}>Tap anywhere to close</div>
        </div>
      )}
      {/* GLOBAL PREMIUM — popup centered in viewport, star tab pinned to right edge */}
      {!premiumDismissed && (
        <div className="premium-wrap">
          {showPremiumPopup ? (
            <div className="premium-popup">
              <button className="premium-popup-close" onClick={() => { try{safeSetItem("muse_hide_premium","1");}catch{}; setShowPremiumPopup(false); setPremiumDismissed(true); }} aria-label="Dismiss premium" title="Dismiss premium">✕</button>
              <div style={{fontSize:14,fontWeight:700,color:"var(--gold)",marginBottom:4}}>✨ Muse Premium</div>
              <div style={{fontSize:11,color:"var(--text2)",lineHeight:1.4,marginBottom:8}}>Unlimited likes, superlikes & boosts.</div>
              <button className="btn btn-gold" style={{fontSize:11,padding:"6px 14px",width:"100%"}} onClick={()=>{setShowPremiumPopup(false);setHamburgerScreen("profile");setShowHamburger(true)}}>Upgrade $9.99</button>
              <div style={{marginTop:8,fontSize:10,color:"var(--muted)",textAlign:"center"}} onClick={() => { try{safeSetItem("muse_hide_premium","1");}catch{}; setShowPremiumPopup(false); setPremiumDismissed(true); }}>Don&apos;t show again</div>
            </div>
          ) : (
            <button
              onClick={() => setShowPremiumPopup(true)}
              className="premium-star-tab"
              aria-label="Premium"
              title="Muse Premium"
            >
              <div className="premium-star-icon">✦</div>
            </button>
          )}
        </div>
      )}
      {viewProfile && (
        <div className="modal-overlay" onClick={()=>setViewProfile(null)}>
          <div className="modal-panel" onClick={e=>e.stopPropagation()} style={{maxWidth:400,width:"90%",maxHeight:"85vh",overflowY:"auto",borderRadius:24,padding:0,background:"linear-gradient(180deg,#0f081e,#0a0612)"}}>
            <div style={{position:"relative",width:"100%",aspectRatio:"3/4",overflow:"hidden"}}>
              <img loading="lazy" src={viewProfile.img} alt={viewProfile.name} style={{width:"100%",height:"100%",objectFit:"cover"}} />
              <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"20px",background:"linear-gradient(to top,rgba(10,6,18,0.95),transparent)"}}>
                <div style={{fontSize:24,fontWeight:800,fontFamily:"'Playfair Display',serif",fontStyle:"italic"}}>{viewProfile.name}</div>
                <div style={{fontSize:14,color:"var(--gold)",fontWeight:600}}>{viewProfile.type}</div>
              </div>
              <button onClick={()=>setViewProfile(null)} style={{position:"absolute",top:12,right:12,width:32,height:32,borderRadius:"50%",background:"rgba(0,0,0,0.6)",border:"none",color:"#fff",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>
            <div style={{padding:20}}>
              {viewProfile.bio && <p style={{color:"var(--text2)",lineHeight:1.6,fontSize:14,marginBottom:16}}>{viewProfile.bio}</p>}
              {viewProfile.location && <div style={{fontSize:13,color:"var(--text2)",marginBottom:12}}>📍 {viewProfile.location}{typeof viewProfile.distanceMi==="number"?` · ${viewProfile.distanceMi} mi`:""}</div>}
              {viewProfile.styles?.length > 0 && <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>{viewProfile.styles.map((s:string)=><span key={s} className="tag">{s}</span>)}</div>}
              {viewProfile.zodiac && <div style={{fontSize:13,color:"var(--text2)",marginBottom:4}}>♈ {viewProfile.zodiac}{viewProfile.mbti?` · 🧠 ${viewProfile.mbti}`:""}</div>}
              {typeof viewProfile.collabs === "number" && <div style={{fontSize:13,color:"var(--text2)",marginBottom:16}}>🤝 {viewProfile.collabs} collaborations</div>}
              <button className="btn btn-gold" style={{width:"100%"}} onClick={()=>{
                if(!matches.find((m:any)=>m.id===viewProfile.id)) setMatches((prev:any)=>[...prev,{...viewProfile,messages:[]}]);
                setChatTarget({...viewProfile,messages:[]});setViewProfile(null);showScreen("chat");
              }}>Message</button>
            </div>
          </div>
        </div>
      )}
      {/* ══════ DISCLOSURE MODAL ══════ */}
      {showDisclosureModal && disclosureTarget && (
        <DisclosureModal
          responderName={disclosureTarget.name}
          responderId={disclosureTarget.id}
          bookingId={disclosureBookingId}
          existingDisclosure={existingDisclosure}
          onSubmit={async (form) => {
            // Age gate: paid disclosures require verified 18+ identity before proposing
            const hasPayment = form.compensationAmount && form.compensationAmount !== "0" && form.compensationAmount !== "Free" && form.compensationAmount !== "TFP";
            if (hasPayment && !ageVerified) {
              setPendingDisclosureConfirm(null);
              setPendingDisclosureCreate(form as Record<string, unknown>);
              setShowDisclosureModal(false);
              setShowAgeVerification(true);
              return;
            }
            const r = await authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "create-disclosure", ...form, responderId: disclosureTarget.id, bookingId: disclosureBookingId }) });
            const d = await r.json();
            if (d.blocked) { setShowDisclosureModal(false); setToastMsg("Request blocked — violates Muse terms"); return; }
            if (d.success) { setShowDisclosureModal(false); setToastMsg("Disclosure sent for review"); }
          }}
          onCancel={() => { setShowDisclosureModal(false); setDisclosureTarget(null); }}
          onConfirm={existingDisclosure ? async (discId) => {
            // Age gate: paid disclosure confirmation requires verified 18+ identity
            const disc = existingDisclosure as Record<string, unknown>;
            const compAmount = String(disc.compensation_amount || "");
            const hasPayment = compAmount && compAmount !== "0" && compAmount !== "Free" && compAmount !== "TFP";
            if (hasPayment && !ageVerified) {
              setPendingDisclosureConfirm(discId);
              setShowDisclosureModal(false);
              setShowAgeVerification(true);
              return;
            }
            await authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "confirm-disclosure", disclosureId: discId }) });
            setShowDisclosureModal(false); setToastMsg("Disclosure confirmed ✓");
          } : undefined}
        />
      )}
      {/* ══════ AGE VERIFICATION MODAL ══════ */}
      {showAgeVerification && (
        <AgeVerificationModal
          purpose="age_gate"
          authFetch={authFetch}
          onVerified={async () => {
            setAgeVerified(true);
            setShowAgeVerification(false);
            // Resume the blocked action after verification
            if (pendingDisclosureConfirm) {
              const discId = pendingDisclosureConfirm;
              setPendingDisclosureConfirm(null);
              await authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "confirm-disclosure", disclosureId: discId }) });
              setToastMsg("Disclosure confirmed ✓");
            } else if (pendingDisclosureCreate) {
              const form = pendingDisclosureCreate;
              setPendingDisclosureCreate(null);
              const r = await authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "create-disclosure", ...form, responderId: disclosureTarget?.id, bookingId: disclosureBookingId }) });
              const d = await r.json();
              if (d.blocked) { setToastMsg("Request blocked — violates Muse terms"); return; }
              if (d.success) { setToastMsg("Disclosure sent for review"); }
            }
          }}
          onClose={() => {
            setShowAgeVerification(false);
            setPendingDisclosureConfirm(null);
            setPendingDisclosureCreate(null);
          }}
        />
      )}
      {/* ══════ SAFETY CHECK-IN MODAL ══════ */}
      {showSafetyCheckin && (
        <SafetyCheckinModal
          checkins={safetyCheckins}
          safetyProfile={safetyProfile}
          onRespond={async (id, response, shared, reason) => {
            await authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "respond-checkin", checkinId: id, response, sharedWithContact: shared, reason }) });
            setSafetyCheckins(prev => prev.map(c => c.id === id ? { ...c, status: response, responded_at: new Date().toISOString() } : c));
          }}
          onSaveSafetyProfile={async (profile) => {
            await authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "save-safety-profile", ...profile }) });
            setSafetyProfile(profile); setToastMsg("Safety profile saved");
          }}
          onShareDetails={async (bookingId, method) => {
            await authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "share-safety-details", bookingId, shareMethod: method }) });
            setToastMsg("Details shared with trusted contact");
          }}
          onClose={() => setShowSafetyCheckin(false)}
        />
      )}
      {/* ══════ PROMPT BANK MODAL ══════ */}
      {showPromptBank && (
        <PromptBankModal
          prompts={promptBankData}
          responses={promptResponses}
          onSaveResponse={async (promptId, text, choices) => {
            const r = await authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "save-prompt-response", promptId, responseText: text, responseChoices: choices }) });
            const d = await r.json();
            if (d.success) {
              setPromptResponses(prev => {
                const existing = prev.findIndex(r => r.prompt_id === promptId);
                const newResp = { id: "new", prompt_id: promptId, response_text: text, response_choices: choices };
                if (existing >= 0) { const copy = [...prev]; copy[existing] = newResp; return copy; }
                return [...prev, newResp];
              });
            }
          }}
          onClose={() => setShowPromptBank(false)}
        />
      )}
      {/* ══════ REFERRAL PANEL ══════ */}
      {showReferral && (
        <ReferralPanel onClose={() => setShowReferral(false)} />
      )}
      {/* ══════ STRIPE CONNECT PANEL ══════ */}
      {showConnect && (
        <ConnectPanel onClose={() => setShowConnect(false)} />
      )}
      {/* ══════ PAYMENT HISTORY ══════ */}
      {showPaymentHistory && (
        <PaymentHistory userId={authUser?.id || ""} onClose={() => setShowPaymentHistory(false)} />
      )}
      {boostActive && (
        <div style={{position:"fixed",top:80,right:20,zIndex:9999,padding:"8px 14px",borderRadius:99,background:"linear-gradient(135deg,var(--gold),var(--amber))",fontSize:11,fontWeight:700,color:"#0a0612",boxShadow:"0 4px 16px rgba(255,215,0,0.4)",display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={()=>{setBoostActive(false);setBoostEnd(0);try{safeRemoveItem("muse_boost");}catch{}showToast("Boost off")}}>
          <span>⚡ BOOST ACTIVE</span>
          <span style={{fontWeight:400}}>({Math.max(0,Math.ceil((boostEnd-Date.now())/60000))}m)</span>
        </div>
      )}
      <SupportChat open={supportOpen} onClose={()=>setSupportOpen(false)} />
    </div>
  );
}



