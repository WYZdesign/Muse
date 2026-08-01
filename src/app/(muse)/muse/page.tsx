"use client";

import "./muse.css";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import ErrorBoundary from "./ErrorBoundary";
import { supabase } from "@/lib/supabase";
import { subscribeToMusePush, unsubscribeFromMusePush, ensureMusePushRegistered } from "@/app/muse-pwa";
import { persistMessage, subscribeToConversation, getGeolocation, distanceMiles } from "@/app/muse-realtime";
import { FiStar, FiHeart, FiCompass, FiFilter, FiZap, FiSend, FiArrowLeft, FiEdit2, FiPlus, FiSearch, FiUsers, FiUser, FiLink, FiTwitter, FiInstagram, FiX, FiFile, FiImage, FiEye, FiMoreHorizontal, FiSettings, FiCheck, FiChevronRight, FiMusic, FiHeadphones, FiMenu, FiCalendar, FiCamera, FiShare2 } from "react-icons/fi";
import BackgroundScene from "./components/BackgroundScene";
import Nav from "./components/Nav";
import Confetti from "./components/Confetti";
import SwipeParticles from "./components/SwipeParticles";
import { PROFILES, BRIEFS, COMMUNITIES, EVENTS, SESSIONS, FORUM_POSTS, TIERS, PROFESSIONALS, CONNECTIONS, PC, AESTHETICS, CREATIVE_TYPES, LOOKING_FOR, CONN_TYPES, ICEBREAKERS, CITY_GEO, ZODIAC, ZE, CHINESE, CE, MBTI, LIFE_PATHS, calcMatch, calcZodiac, calcChineseZodiac, calcLifePath, calcMbti, type Profile, type Brief, type Match, type Screen } from "./components/types";





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
  const [authUser, setAuthUser] = useState<{id:string;email:string;profile?:Record<string,unknown>}|null>(null);
  const [obStep, setObStep] = useState(0);
  const [obData, setObData] = useState<{name?:string;loc?:string;bio?:string;type?:string;looking?:string[];conn?:string[];styles?:string[];zodiac?:string;chinese?:string;mbti?:string;lifePath?:number}>({});
  const [currentUser, setCurrentUser] = useState({ id:"you", name:"You", type:"Photographer", exp:"New here", avatar:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop", stats:{matches:0,likes:0,superLikes:0,passes:0,bookingsCompleted:0,matchesReceived:0,messagesSent:0}, createdAt:Date.now(), referrals:0, portfolio:[] as {img:string;title:string;type:string}[] });
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
  if (typeof window !== "undefined") { (window as any).__exp = expandedMatchId; }
  const [boostActive, setBoostActive] = useState(false);
  const [boostEnd, setBoostEnd] = useState(0);
  const [discoverSearch, setDiscoverSearch] = useState("");
  const [mapView, setMapView] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [dailyLikes, setDailyLikes] = useState(10);
  const [superLikes, setSuperLikes] = useState(3);
  const [screenFlash, setScreenFlash] = useState<string | null>(null);
  const [matchStreak, setMatchStreak] = useState(0);
  const [rewindStack, setRewindStack] = useState<number[]>([]);
  const [showLikeNote, setShowLikeNote] = useState(false);
  const [likeNoteText, setLikeNoteText] = useState("");
  const [noteTargetProfile, setNoteTargetProfile] = useState<any>(null);
  const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0);
  const [expandedProfile, setExpandedProfile] = useState<any>(null);
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
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editLoc, setEditLoc] = useState("");
  const [showPortfolioUpload, setShowPortfolioUpload] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
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
  const [forumPosts, setForumPosts] = useState<{id:number;title:string;body:string;author:string;avatar:string;votes:number;comments:{author:string;text:string}[];cat:string;time:string;pinned:boolean}[]>([]);
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
  const portfolioInputRef = useRef<HTMLInputElement>(null);

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
  const [profileViews, setProfileViews] = useState(0);
  const [profileViewers, setProfileViewers] = useState<{name:string;avatar:string;time:string}[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [showStory, setShowStory] = useState<number|null>(null);
  const [theme, setTheme] = useState<"dark"|"light">("dark");
  const [activityFeed, setActivityFeed] = useState<{id:number;type:string;from:string;avatar:string;text:string;time:string;read:boolean}[]>([]);
  const [discoveryPrefs, setDiscoveryPrefs] = useState<{ageMin:number;ageMax:number;distance:number;gender:string}>({ageMin:18,ageMax:50,distance:50,gender:"all"});
  const [myGeo, setMyGeo] = useState<{lat:number;long:number;city:string}|null>(null);
  const [showDiscoveryPrefs, setShowDiscoveryPrefs] = useState(false);
  const [showActivityFeed, setShowActivityFeed] = useState(false);
  const [showHamburger, setShowHamburger] = useState(false);
  const [showPremiumPopup, setShowPremiumPopup] = useState(true);
  const [hamburgerScreen, setHamburgerScreen] = useState<string>("");
  const [showStories, setShowStories] = useState(false);
  const [unmatchTarget, setUnmatchTarget] = useState<string|null>(null);
  const [chatImages, setChatImages] = useState<Record<number,string[]>>({});
  const [typingTarget, setTypingTarget] = useState<number|null>(null);
  const [hydrated, setHydrated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{startX:number;startY:number;active:boolean}>({startX:0,startY:0,active:false});
  const [dragOffset, setDragOffset] = useState(0);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [dragOpacity, setDragOpacity] = useState(0);

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

  // Attaches the verified session token (from localStorage) to /api/muse
  // POST calls so the server can authenticate writes. Falls back to a plain
  // fetch for GET/other endpoints and for /api/muse/auth (which manages its own auth).
  const apiFetch = useCallback(async (url: string, opts: RequestInit = {}) => {
    try {
      const raw = localStorage.getItem("muse_user");
      const token = raw ? (JSON.parse(raw).access_token || "") : "";
      if (token) {
        opts.headers = { ...(opts.headers || {}), "Authorization": `Bearer ${token}` };
      }
    } catch {}
    return fetch(url, opts);
  }, []);

  // Pulls real data from the API on mount; silently keeps the static demo
  // arrays when the table is empty or the request fails (graceful fallback).
  const bootstrapData = useCallback(async () => {
    const mapProfile = (p: any) => ({
      id: p.id, name: p.name || "Creative", img: p.avatar || "", type: p.type || "artist",
      bio: p.bio || "", loc: p.loc || "Unknown", styles: Array.isArray(p.styles) ? p.styles : [],
      score: 70, nsfw: !!p.show_nsfw, looking: Array.isArray(p.looking) ? p.looking : [],
      zodiac: p.zodiac || "", chinese: p.chinese || "", mbti: p.mbti || "", lifePath: p.life_path || "",
      photos: Array.isArray(p.photos) ? p.photos : [], collabs: p.collabs || 0, verified: !!p.verified
    });
    try {
      const [profiles, briefs, feed, forum, events] = await Promise.all([
        fetch("/api/muse?type=profiles").then(r => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/muse?type=briefs").then(r => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/muse?type=feed").then(r => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/muse?type=forum").then(r => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/muse?type=events").then(r => r.ok ? r.json() : null).catch(() => null),
      ]);
      if (profiles?.profiles?.length) setLiveProfiles(profiles.profiles.map(mapProfile));
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
  }, []);

  // ─── PERSISTENCE ───
  const STORAGE_KEY = "muse_v1";
  const saveState = useCallback(() => {
    try {
      const data = {
        currentUser, obData, obStep, matches, dailyLikes, superLikes,
        savedBriefs, appliedBriefs, userBriefs, blockedUsers, notifPrefs,
        obConnectedSocials, showNsfw, rsvpdEvents, forumPosts, feedPosts,
        testLevels, obSelects, obProfilePic, obPortfolioItems, likedBy,
        profileViews, profileViewers, stories, theme, activityFeed,
        discoveryPrefs, chatImages, screen, filterStyles, filterScore,
        searchQuery, connTab, museCat, connFilter, authUser
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      try { apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "sync", matches, feedPosts, forumPosts, userBriefs }) }); } catch {}
    } catch(e) {}
  }, [currentUser,obData,obStep,matches,dailyLikes,superLikes,savedBriefs,appliedBriefs,userBriefs,blockedUsers,notifPrefs,obConnectedSocials,showNsfw,rsvpdEvents,forumPosts,feedPosts,testLevels,obSelects,obProfilePic,obPortfolioItems,likedBy,profileViews,profileViewers,stories,theme,activityFeed,discoveryPrefs,chatImages,screen,filterStyles,filterScore,searchQuery,connTab,museCat,connFilter,authUser]);

  const loadState = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.currentUser) setCurrentUser(d.currentUser);
      if (d.obData) setObData(d.obData);
      if (d.obStep) setObStep(d.obStep);
      if (d.matches) setMatches(d.matches);
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
      if (d.stories) setStories(d.stories);
      if (d.theme) setTheme(d.theme);
      if (d.activityFeed) setActivityFeed(d.activityFeed);
      if (d.discoveryPrefs) setDiscoveryPrefs(d.discoveryPrefs);
      if (d.chatImages) setChatImages(d.chatImages);
      if (d.screen && d.screen!=="auth") setScreen(d.screen);
      if (d.authUser) setAuthUser(d.authUser);
    } catch(e) {}
    try { const b=localStorage.getItem("muse_boost"); if(b){const e=parseInt(b);if(e>Date.now()){setBoostActive(true);setBoostEnd(e);}else{localStorage.removeItem("muse_boost");}} } catch(e) {}
  }, []);

  useEffect(() => { if(!boostActive||!boostEnd)return;const iv=setInterval(()=>{if(Date.now()>=boostEnd){setBoostActive(false);try{localStorage.removeItem("muse_boost");}catch{}}},5000);return()=>clearInterval(iv); }, [boostActive,boostEnd]);

  const applySession = useCallback((accessToken: string, refreshToken?: string) => {
    fetch("/api/muse/auth", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ action: "session", access_token: accessToken }) })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.user) {
          const userObj = { id: d.user.id, email: d.user.email, profile: d.profile };
          setAuthUser(userObj);
          localStorage.setItem("muse_user", JSON.stringify({ access_token: accessToken, refresh_token: refreshToken || "", user: userObj }));
          ensureMusePushRegistered();
          if (d.profile) {
            setCurrentUser(prev => ({ ...prev, name: d.profile.name || prev.name, avatar: d.profile.avatar || prev.avatar, type: d.profile.type || prev.type }));
            if (d.profile.tier) setUserTier(d.profile.tier);
            setScreen(d.profile.name && d.profile.type ? "discover" : "onboard");
          } else {
            setScreen("onboard");
          }
        } else {
          localStorage.removeItem("muse_user");
        }
      })
      .catch(() => { /* silently handled */ });
  }, []);

  useEffect(() => {
    loadState();
    setHydrated(true);

    // Capture geolocation for distance matching (best-effort, silent on denial).
    getGeolocation().then(g => { if (g) { setMyGeo(g); try { localStorage.setItem("muse_geo", JSON.stringify(g)); } catch {} } })
      .catch(() => { /* silently handled */ });

    // Handle post-checkout return: refresh tier from server
    const params = new URLSearchParams(window.location.search);
    const upgraded = params.get("upgraded");
    if (upgraded) showToast("Welcome to Muse " + (upgraded.charAt(0).toUpperCase() + upgraded.slice(1)) + "! ✨");

    // Handle OAuth redirect: Supabase returns tokens in URL hash or via getSession
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          applySession(session.access_token, session.refresh_token);
          // Clean OAuth params from URL
          if (window.location.hash.includes("access_token") || window.location.search.includes("code=")) {
            window.history.replaceState({}, document.title, "/muse");
          }
          return;
        }
      } catch {}

      const savedUser = localStorage.getItem("muse_user");
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed?.access_token) applySession(parsed.access_token, parsed.refresh_token);
        } catch(e) {}
      }
    })();

    // Pull real catalog data (profiles/briefs/feed/forum/events) with static fallback.
    bootstrapData();

    // Listen for auth state changes (OAuth completion)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.access_token) {
        applySession(session.access_token, session.refresh_token);
      }
    });
    return () => { authListener?.subscription?.unsubscribe(); };
  }, [loadState, applySession]);
  useEffect(() => { const t = setTimeout(saveState, 300); return () => clearTimeout(t); }, [saveState]);

  const showToast = useCallback((msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 3000); }, []);

  const doLogout = useCallback(async () => {
    try { await fetch("/api/muse/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"logout"})}); } catch(e) {}
    localStorage.removeItem("muse_user"); localStorage.removeItem("muse_state");
    setAuthUser(null); setScreen("auth"); showToast("Logged out");
  }, [showToast]);

  const doLogoutFull = useCallback(async () => {
    await doLogout(); setHamburgerScreen(""); setShowHamburger(false);
  }, [doLogout]);

  const uploadImage = useCallback(async (file: File, folder: string): Promise<string | null> => {
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);
      const r = await fetch("/api/muse/upload", { method: "POST", body: fd });
      const j = await r.json();
      if (j.success && j.url) return j.url;
      showToast("Upload failed: " + (j.error || "Unknown"));
      return null;
    } catch { showToast("Upload failed"); return null; }
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
  const getIcebreaker = useCallback((type: string) => {
    const pool = ICEBREAKERS[type] || ICEBREAKERS.default;
    return pool[~~(Math.random() * pool.length)];
  }, []);

  const getReferralTier = (c:number) => c>=50?{tier:"Platinum",discount:20}:c>=20?{tier:"Gold",discount:20}:c>=5?{tier:"Silver",discount:10}:c>=1?{tier:"Bronze",discount:0}:{tier:"None",discount:0};
  const trackEvent = (event: string, data?: Record<string, unknown>) => {
    try { if (typeof window !== "undefined" && (window as any).gtag) { (window as any).gtag("event", event, data); } } catch {}
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

  const filteredProfiles = useMemo(() => {
    const base = liveProfiles || PROFILES;
    let list = showNsfw ? base : base.filter(p => !p.nsfw);
    if (filterStyles.length > 0) list = list.filter(p => p.styles.some(s => filterStyles.includes(s)));
    if (filterScore > 50) list = list.filter(p => p.score >= filterScore);
    if (myGeo) {
      list = list.filter(p => {
        const g = CITY_GEO[p.loc];
        if (!g) return true;
        return distanceMiles(myGeo, g) <= discoveryPrefs.distance;
      });
    }
    if (discoverSearch.trim()) {
      const q = discoverSearch.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.type?.toLowerCase().includes(q) || p.loc?.toLowerCase().includes(q) || p.styles?.some(s => s.toLowerCase().includes(q)));
    }
    return list.map(p => { const geo = CITY_GEO[p.loc]; return geo ? { ...p, lat: geo.lat, lng: geo.long } : p; });
  }, [showNsfw, filterStyles, filterScore, myGeo, discoveryPrefs.distance, discoverSearch]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const lastReset = localStorage.getItem("muse_last_reset");
      const now = Date.now();
      if (!lastReset || now - parseInt(lastReset) > 86400000) {
        setDailyLikes(10);
        setSuperLikes(3);
        localStorage.setItem("muse_last_reset", String(now));
      }
    }
  }, []);

  const flash = useCallback((color: string) => { setScreenFlash(color); setTimeout(() => setScreenFlash(null), 300); }, []);
  const showScreen = useCallback((s: typeof screen) => { setScreen(s); }, []);
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
      const userObj = { id: j.user.id, email: j.user.email, profile: j.profile || null };
      setAuthUser(userObj);
      localStorage.setItem("muse_user", JSON.stringify({ access_token: j.user.access_token || "", refresh_token: j.user.refresh_token || "", user: userObj }));
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

  const doSwipe = useCallback((dir: "left" | "right" | "super") => {
    if (swipeLocked.current) return;
    swipeLocked.current = true;
    setTimeout(() => { swipeLocked.current = false; }, 500);
    setSwipeDir(dir === "left" ? "left" : "right");
    setTimeout(() => setSwipeDir(null), 800);
    if (dailyLikes <= 0 && dir !== "super") { showToast("No likes left today!"); return; }
    const p = filteredProfiles[currentIdx];
    if (!p) return;
    if (dir === "super" && superLikes <= 0) { showToast("No super likes left!"); return; }
    if (dir === "right" || dir === "super") {
      if (!userDefaultIntent) { setIntentProfile(p); setShowIntentPicker(true); swipeLocked.current = false; return; }
      const intent = dir === "super" ? "super" : userDefaultIntent;
      const matchScore = calcMatch({ styles: obData.styles || [], looking: obData.looking || [], zodiac: obData.zodiac, chinese: obData.chinese, mbti: obData.mbti, lifePath: obData.lifePath }, p);
        const isMatch = matchScore > 55 || Math.random() > 0.5;
      if (isMatch) {
        const newMatch: Match = { ...p, messages: [] };
        setMatches(prev => [...prev, newMatch]);
        setMatchStreak(prev => prev + 1);
        setShowMatchOverlay(newMatch);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
        setExpandedMatchId(String(newMatch.id));
        trackEvent("muse_match", { name: p.name, type: p.type });
        setActivityFeed(prev => [{id:Date.now(),type:"match",from:p.name,avatar:p.img,text:"You matched with "+p.name+"!",time:"Just now",read:false},...prev]);
        flash("#FFD700");
        apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "match", target_id: p.id, intent }) }).catch(() => { /* silently handled */ });
      }
      if (Math.random() > 0.4 && !likedBy.find(l => l.id === p.id)) {
        setLikedBy(prev => [...prev, p]);
        setActivityFeed(prev => [{id:Date.now(),type:"like",from:p.name,avatar:p.img,text:p.name+" liked your profile!",time:"Just now",read:false},...prev]);
      }
      if (dir === "super") { setSuperLikes(prev => Math.max(0, prev - 1)); setCurrentUser(prev => ({ ...prev, stats: { ...prev.stats, superLikes: prev.stats.superLikes + 1 } })); flash("#D4A5FF"); }
      else { setDailyLikes(prev => Math.max(0, prev - 1)); }
      setCurrentUser(prev => ({ ...prev, stats: { ...prev.stats, likes: prev.stats.likes + 1 } }));
    } else {
      setDailyLikes(prev => Math.max(0, prev - 1));
      setCurrentUser(prev => ({ ...prev, stats: { ...prev.stats, passes: prev.stats.passes + 1 } }));
    }
    setRewindStack(prev => [...prev, currentIdx]);
    setCurrentIdx(prev => prev + 1);
    setCurrentPhotoIdx(0);
  }, [currentIdx, dailyLikes, superLikes, filteredProfiles, flash, obData]);

  useEffect(() => { if(screen!=="discover")return;const onKey=(e:KeyboardEvent)=>{if(e.key==="ArrowLeft"){e.preventDefault();doSwipe("left")}if(e.key==="ArrowRight"){e.preventDefault();doSwipe("right")}};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey)},[screen,doSwipe]);

  const doRewind = useCallback(() => {
    if (rewindStack.length === 0) { showToast("Nothing to rewind!"); return; }
    const prev = rewindStack[rewindStack.length - 1];
    setRewindStack(stack => stack.slice(0, -1));
    setCurrentIdx(prev);
    setCurrentPhotoIdx(0);
    flash("#D4A5FF");
  }, [rewindStack, flash]);

  const doLikeWithNote = useCallback(() => {
    const p = filteredProfiles[currentIdx];
    if (!p || dailyLikes <= 0) { showToast("No likes left today!"); return; }
    setNoteTargetProfile(p);
    setLikeNoteText("");
    setShowLikeNote(true);
  }, [currentIdx, dailyLikes, filteredProfiles]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, active: true };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (absDx > absDy) {
      if (absDx > 5) { setDragOffset(dx); setDragOffsetY(0); setDragOpacity(Math.min(absDx / 100, 1)); }
    } else {
      if (absDy > 5) { setDragOffsetY(dy); setDragOffset(0); setDragOpacity(Math.min(absDy / 80, 1)); }
    }
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dy) > Math.abs(dx) && dy < -60) {
      doSwipe("super");
    } else if (Math.abs(dx) > 80) {
      doSwipe(dx > 0 ? "right" : "left");
    }
    setDragOffset(0);
    setDragOffsetY(0);
    setDragOpacity(0);
  }, [doSwipe]);

  const openChat = useCallback((match: Match) => { setChatTarget(match); setScreen("chat"); }, []);

  const sanitizeInput = (text: string) => text.replace(/[<>]/g, '').slice(0, 500);
  const toggleSocial = (key: string) => { setObConnectedSocials(prev => { const nv = !prev[key]; showToast(nv ? "Connected!" : "Disconnected"); return {...prev, [key]: nv}; }); };

  const sendMsg = useCallback(async () => {
    if (!chatInput.trim() || !chatTarget) return;
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const clean = sanitizeInput(chatInput.trim());
    if (!clean) return;
    const userMsg = { from: "me", text: clean, time: now };
    const targetId = String(chatTarget.id);
    setChatTarget(prev => prev ? { ...prev, messages: [...prev.messages, userMsg] } : prev);
    setMatches(prev => prev.map(m => String(m.id) === targetId ? { ...m, messages: [...m.messages, userMsg] } : m));
    setChatInput("");
    setTimeout(() => messagesEndRef.current?.scrollIntoView({behavior:"smooth"}), 50);
    const myId = authUser?.id || "local";
    await persistMessage({ myId, theirId: targetId, text: clean });
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
    if (!chatTarget || !authUser?.id) return;
    const myId = authUser.id;
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

  const saveProfileEdits = useCallback(async () => {
    setCurrentUser(prev => ({ ...prev, name: editName || prev.name }));
    setObData(prev => ({ ...prev, bio: editBio, loc: editLoc }));
    const geo = await getGeolocation();
    setShowEditProfile(false);
    try {
      await fetch("/api/muse/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-profile",
          name: editName,
          bio: editBio,
          loc: editLoc,
          ...(geo ? { lat: geo.lat, long: geo.long, city: geo.city } : {}),
        }),
      });
    } catch {}
    showToast("Saved!");
  }, [editName, editBio, editLoc, showToast]);

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
      <div className="scene"><div className="scene-wash" /><div className="scene-glow" /></div>
      <div className="app">
        <div className="skeleton-container">
          {[1,2,3].map(i => (
            <div key={i} className="skeleton-block">
              <div className="skeleton-pulse" style={{width:"76px",height:"76px",borderRadius:"50%"}} />
              <div className="skeleton-pulse" style={{width:"60%",height:"16px",marginTop:12}} />
              <div className="skeleton-pulse" style={{width:"40%",height:"12px",marginTop:8}} />
            </div>
          ))}
        </div>
      </div>
    </div>
  ) : (
    <div style={{"display":"contents"}}>
      <link rel="manifest" href="/muse/manifest.json" />
      <Confetti active={showConfetti} />
      {swipeDir && <SwipeParticles active dir={swipeDir} />}
      <BackgroundScene flash={screenFlash} />
      {showMatchOverlay && (
        <div className="match-overlay" onClick={() => setShowMatchOverlay(null)}>
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
          <div className="match-title">Its a Match!</div>
          <div className="match-subtitle">You and <strong style={{color:"var(--gold)"}}>{showMatchOverlay.name}</strong> both felt the spark.</div>
          <div className="match-avatars">
            <img className="match-av" src={currentUser.avatar} alt="You" />
            <img className="match-av" src={showMatchOverlay.img} alt={showMatchOverlay.name} onError={handleImgError} />
          </div>
          <button className="match-btn" onClick={() => { setShowMatchOverlay(null); openChat(showMatchOverlay); }}>Send a Message</button>
        </div>
      )}
      {showIntentPicker && intentProfile && (
        <div className="intent-overlay" onClick={()=>{setShowIntentPicker(false);setIntentProfile(null)}}>
          <div className="intent-modal" onClick={e=>e.stopPropagation()}>
            <div style={{textAlign:"center",marginBottom:16}}>
              <img src={intentProfile.img} alt="" style={{width:60,height:60,borderRadius:"50%",objectFit:"cover",marginBottom:8}} onError={handleImgError} />
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
                  const matchScore=calcMatch({styles:obData.styles||[],looking:obData.looking||[],zodiac:obData.zodiac,chinese:obData.chinese,mbti:obData.mbti,lifePath:obData.lifePath},p);
                  const isMatch=matchScore>55||Math.random()>0.5;
                  if(isMatch){
                    const newMatch:Match={...p,messages:[],intent};
                    setMatches(prev=>[...prev,newMatch]);
                    setMatchStreak(prev=>prev+1);
                    setShowMatchOverlay(newMatch);
                    setShowConfetti(true);
                    setTimeout(()=>setShowConfetti(false),3000);
                    setExpandedMatchId(String(newMatch.id));
                    trackEvent("muse_match",{name:p.name,type:p.type,intent});
                    setActivityFeed(prev=>[{id:Date.now(),type:"match",from:p.name,avatar:p.img,text:"You matched with "+p.name+"! · "+icon+" "+label,time:"Just now",read:false},...prev]);
                    flash("#FFD700");
                    apiFetch("/api/muse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"match",target_id:p.id,intent})}).catch(()=>{});
                  }
                  if(Math.random()>0.4&&!likedBy.find(l=>l.id===p.id)){
                    setLikedBy(prev=>[...prev,p]);
                    setActivityFeed(prev=>[{id:Date.now(),type:"like",from:p.name,avatar:p.img,text:p.name+" liked your profile!",time:"Just now",read:false},...prev]);
                  }
                  setDailyLikes(prev=>Math.max(0,prev-1));
                  setCurrentUser(prev=>({...prev,stats:{...prev.stats,likes:prev.stats.likes+1}}));
                  setRewindStack(prev=>[...prev,currentIdx]);
                  setCurrentIdx(prev=>prev+1);
                  setCurrentPhotoIdx(0);
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
        <div className="hamburger-overlay">
          <div className="hamburger-backdrop" onClick={() => setShowHamburger(false)} />
          <div className="hamburger-panel">
            <div className="hamburger-close" onClick={() => setShowHamburger(false)}><FiX size={18} /></div>
            {!hamburgerScreen ? (
              <>
                <div className="hamburger-title">Menu</div>
                {[
                  {key:"community",icon:<FiUsers size={20} />,label:"Community",desc:"Channels, groups & events",grad:"linear-gradient(135deg,#FF8A80,#FF4757,#FFD700)"},
                  {key:"sessions",icon:<FiCalendar size={20} />,label:"Sessions",desc:"Bookings & one-on-ones",grad:"linear-gradient(135deg,#E1BEE7,#9C27B0,#FF4081)"},
                  {key:"network",icon:<FiShare2 size={20} />,label:"Network",desc:"Professionals & forum",grad:"linear-gradient(135deg,#B3E5FC,#64B5F6,#00BCD4)"},
                  {key:"profile",icon:<FiUser size={20} />,label:"Profile",desc:"Edit profile & premium",grad:"linear-gradient(135deg,#FFD700,#FFB5C2,#B388FF)"},
                  {key:"settings",icon:<FiSettings size={20} />,label:"Settings",desc:"Preferences, safety & help",grad:"linear-gradient(135deg,#CE93D8,#B388FF,#A5D6A7)"},
                  {key:"moments",icon:<FiCamera size={20} />,label:"BTS",desc:"Behind the scenes — raw & real",grad:"linear-gradient(135deg,#FF6B6B,#FFD93D,#6BCB77)"},
                ].map(item => (
                  <div key={item.key} className="hamburger-item" onClick={() => setHamburgerScreen(item.key)}>
                    <div className="hamburger-item-icon" style={{background:item.grad}}>{item.icon}</div>
                    <div><div className="hamburger-item-label">{item.label}</div><div className="hamburger-item-desc">{item.desc}</div></div>
                  </div>
                ))}
              </>
            ) : (
              <>
                <div className="hamburger-back" onClick={() => setHamburgerScreen("")}><FiArrowLeft size={16} /> Back</div>
                {hamburgerScreen === "community" && (
                  <div className="conn-scroll">
                    <div className="hamburger-title">Community</div>
                    <div style={{fontSize:14,fontWeight:700,color:"var(--text)",margin:"0 0 10px"}}>Channels & Groups</div>
                    {COMMUNITIES.filter(c => showNsfw || !c.nsfw).map(c => (
                      <div key={c.id} className="conn-card" style={{margin:"0 0 10px"}}>
                        <img src={c.img} alt={c.name} className="conn-avatar" onError={handleImgError} />
                        <div className="conn-content">
                          <div className="conn-name">{c.name}</div>
                          <div className="conn-meta">{c.members} members · {c.desc}</div>
                           <div className="conn-actions" style={{marginTop:8,display:"flex",gap:6}}>
                             <button className={"conn-btn conn-btn-primary"+(c.cat==="nsfw"?" conn-nsfw-tag":"")} style={{flex:1}} onClick={()=>{showToast("Joined "+c.name+"!");apiFetch("/api/muse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"join-community",communityId:c.id,memberCount:c.members})})}}>{c.cat==="nsfw"?"Join (18+)":"Join"}</button>
                             <button className="conn-btn conn-btn-ghost" style={{flex:1}} onClick={()=>showToast(c.name+" community opened!")}>Learn</button>
                             <button className="conn-btn conn-btn-ghost" style={{flex:1}} onClick={()=>{navigator.clipboard?.writeText("https://wyzdesign.com/muse/community/"+c.id);showToast("Link copied!")}}>Share</button>
                           </div>
                        </div>
                      </div>
                    ))}
                    <div style={{fontSize:14,fontWeight:700,color:"var(--text)",margin:"20px 0 10px"}}>Events</div>
                    {EVENTS.filter(e => showNsfw || !e.nsfw).map(ev => (
                      <div key={ev.id} className="conn-card" style={{flexDirection:"column",margin:"0 0 10px"}}>
                        <div className="conn-name">{ev.title}</div>
                        <div className="conn-meta">{ev.date} · {ev.loc}</div>
                        <div style={{fontSize:13,color:"var(--text2)",margin:"4px 0 8px",lineHeight:1.5}}>{ev.desc}</div>
                        <button className={"conn-btn "+(rsvpdEvents.includes(ev.id)?"conn-btn-ghost":"conn-btn-primary")} onClick={()=>{setRsvpdEvents(prev=>prev.includes(ev.id)?prev.filter(x=>x!==ev.id):[...prev,ev.id]);showToast(rsvpdEvents.includes(ev.id)?"RSVP cancelled":"RSVP confirmed!")}}>{rsvpdEvents.includes(ev.id)?"Going":"RSVP"}</button>
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
                        <img src={s.img} alt={s.name} className="conn-avatar" style={{borderRadius:"50%"}} onError={handleImgError} />
                        <div className="conn-content">
                          <div className="conn-name">{s.name}</div>
                          <div className="conn-meta">{s.type} · {s.rate} · ★ {s.rating}</div>
                          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:6}}>
                            {s.skills.map(sk=><span key={sk} className="conn-tag" style={{fontSize:10,padding:"3px 8px"}}>{sk}</span>)}
                          </div>
                           <div className="conn-actions" style={{marginTop:8,display:"flex",gap:6}}>
                             <button className="conn-btn conn-btn-primary" style={{flex:1}} onClick={()=>{showToast("Session request sent to "+s.name+"!");apiFetch("/api/muse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"book-session",sessionId:s.id,hostId:s.id})})}}>{s.available?"Book Session":"Waitlist"}</button>
                             <button className="conn-btn conn-btn-ghost" style={{flex:1}} onClick={()=>showToast(s.name+"'s full profile coming soon!")}>View Profile</button>
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
                          <img src={m.img} alt={m.name} className="conn-avatar" onError={handleImgError} />
                          <div className="conn-content">
                            <div className="conn-name">{m.name}</div>
                            <div className="conn-meta">{m.type} · Booked Session</div>
                             <div className="conn-actions" style={{marginTop:8,display:"flex",gap:6}}>
                               <button className="conn-btn conn-btn-primary" style={{flex:1}} onClick={() => { setHamburgerScreen(""); setShowHamburger(false); openChat(m); }}>Message</button>
                               <button className="conn-btn conn-btn-ghost" style={{flex:1}} onClick={()=>{setChatTarget(m);showScreen("chat")}}>Details</button>
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
                        <img src={p.img} alt={p.name} style={{width:"100%",height:140,objectFit:"cover",borderRadius:"16px 16px 0 0"}} onError={handleImgError} />
                        <div className="conn-content" style={{padding:"12px 16px 0",display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",width:"100%"}}>
                          <div className="conn-name">{p.name}</div>
                          <div className="conn-meta">{p.type} · {p.loc} · {p.exp}</div>
                          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:6,justifyContent:"center"}}>
                            {p.skills.slice(0,3).map(s=><span key={s} className="conn-tag" style={{fontSize:10,padding:"3px 8px"}}>{s}</span>)}
                            {p.skills.length>3 && <span className="conn-tag" style={{fontSize:10,padding:"3px 8px"}}>+{p.skills.length-3}</span>}
                          </div>
                          <div className="conn-actions" style={{marginTop:8,justifyContent:"center",width:"100%"}}>
                            <button className="conn-btn conn-btn-primary" style={{flex:1,textAlign:"center"}} onClick={()=>{showToast("Connection request sent to "+p.name+"!");apiFetch("/api/muse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"connect",targetId:p.id})})}}>Connect</button>
                            <button className="conn-btn conn-btn-ghost" style={{flex:1,textAlign:"center"}} onClick={()=>showToast(p.openings+" open positions!")}>View ({p.openings})</button>
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
                        <div style={{display:"flex",gap:8}}>
                          <button className="conn-btn conn-btn-primary" onClick={async()=>{if(newPostTitle.trim()){const title=newPostTitle.trim();const body=newPostBody.trim();setForumPosts(prev=>[{id:Date.now(),title,body,author:currentUser.name,avatar:currentUser.avatar,votes:1,comments:[],cat:"General",time:"Just now",pinned:false},...prev]);setNewPostTitle("");setNewPostBody("");setShowNewPost(false);try{await apiFetch("/api/muse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"forum",title,body,userId:currentUser.id})});}catch{}showToast("Posted!")}}}>Post</button>
                          <button className="conn-btn conn-btn-ghost" onClick={()=>setShowNewPost(false)}>Cancel</button>
                        </div>
                      </div>
                    )}
                    <div style={{display:"flex",gap:6,marginBottom:12}}>{(["hot","new","top"] as const).map(s=>(<div key={s} className={"conn-tab-sub"+(forumSort===s?" active":"")} onClick={()=>setForumSort(s)}>{s.charAt(0).toUpperCase()+s.slice(1)}</div>))}</div>
                    {FORUM_POSTS.sort((a,b)=>forumSort==="top"?(b.votes+b.comments.length*2)-(a.votes+a.comments.length*2):forumSort==="new"?(b.id-a.id):(b.votes*2+b.comments.length)-(a.votes*2+a.comments.length)).map(post=>(
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
                              <img src={post.avatar} alt="" style={{width:18,height:18,borderRadius:"50%",objectFit:"cover"}} /> <span style={{fontWeight:600,color:"var(--text)"}}>{post.author}</span>
                              <span>·</span><span>{post.time}</span><span>·</span><span>{post.cat}</span><span>·</span><span>{post.comments.length} replies</span>
                            </div>
                            {expandedPost===post.id && (
                              <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid rgba(255,255,255,0.06)"}}>
                                {post.comments.map((c,i)=><div key={i} style={{fontSize:13,color:"var(--text2)",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}><strong style={{color:"var(--text)"}}>{c.author}</strong>: {c.text}</div>)}
                                <div style={{display:"flex",gap:8,marginTop:8}}>
                                  <input className="inp" placeholder="Reply..." value={commentText} onChange={e=>setCommentText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&commentText.trim()){const txt=commentText.trim();setForumPosts(prev=>prev.map(p=>p.id===post.id?{...p,comments:[...p.comments,{author:currentUser.name,text:txt}]}:p));setCommentText("");apiFetch("/api/muse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"forum",type:"reply",postId:post.id,text:txt,userId:currentUser.id})});showToast("Reply posted!")}}} style={{flex:1,fontSize:12,padding:"8px 12px"}} />
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
                    <div className="hamburger-title">Your Profile</div>
                    <div style={{textAlign:"center",marginBottom:20}}>
                      <img src={currentUser.avatar} alt="You" style={{width:80,height:80,borderRadius:"50%",objectFit:"cover",border:"3px solid var(--gold)",marginBottom:10}} />
                      <div style={{fontSize:18,fontWeight:700,color:"var(--text)"}}>{currentUser.name}</div>
                      <div style={{fontSize:13,color:"var(--muted)"}}>{currentUser.type} · {currentUser.exp}</div>
                    </div>
                    <button className="hamburger-item" style={{width:"100%",marginBottom:6}} onClick={() => { setHamburgerScreen(""); setShowHamburger(false); setScreen("profile"); }}>
                      <div className="hamburger-item-icon" style={{background:"linear-gradient(135deg,#FFD700,#FFBF00,#FF8A80)"}}>Ep</div>
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
                    <button className="btn btn-gold" style={{width:"100%",marginTop:24,fontSize:12,padding:"12px 0"}} onClick={doLogoutFull}>Log Out</button>
                  </div>
                )}
                {hamburgerScreen === "settings" && (
                  <div className="conn-scroll">
                    <div className="hamburger-title">Settings</div>
                    <div style={{fontSize:14,fontWeight:700,color:"var(--text)",margin:"0 0 10px"}}>Discovery Preferences</div>
                    <div style={{marginBottom:16}}>
                      <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:8}}>Age Range</div>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <span style={{fontSize:12,color:"var(--muted)"}}>{discoveryPrefs.ageMin}</span>
                        <input type="range" min={18} max={65} value={discoveryPrefs.ageMin} onChange={e=>setDiscoveryPrefs(p=>({...p,ageMin:Number(e.target.value)}))} style={{flex:1,accentColor:"var(--gold)"}} />
                        <span style={{fontSize:12,color:"var(--muted)"}}>to</span>
                        <input type="range" min={18} max={65} value={discoveryPrefs.ageMax} onChange={e=>setDiscoveryPrefs(p=>({...p,ageMax:Number(e.target.value)}))} style={{flex:1,accentColor:"var(--gold)"}} />
                        <span style={{fontSize:12,color:"var(--muted)"}}>{discoveryPrefs.ageMax}</span>
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
                    <button className="btn btn-gold" style={{width:"100%",fontSize:12}} onClick={()=>{apiFetch("/api/muse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"save-preferences",preferences:discoveryPrefs})});showToast("Preferences saved!")}}>Save Preferences</button>
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
                    <button className="btn" style={{width:"100%",marginTop:12,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",color:"var(--text)",fontSize:13}} onClick={async()=>{try{const raw=localStorage.getItem("muse_user");const t=raw?JSON.parse(raw).access_token:"";if(!t){showToast("Please sign in again");return;}const res=await fetch("/api/muse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"export",access_token:t})});if(!res.ok){showToast("Export failed");return;}const j=await res.json();const blob=new Blob([JSON.stringify(j,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="muse-my-data.json";a.click();URL.revokeObjectURL(url);showToast("Data exported");}catch(e){showToast("Export failed");}}}>Export My Data</button>
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
                      <button className="btn btn-outline" style={{width:"100%",fontSize:13}} onClick={()=>window.open("mailto:support@wyzdesign.com?subject=Muse%20Support%20Request")}>Email Support</button>
                    </div>
                    <div style={{marginTop:20}}>
                      <div style={{fontSize:15,fontWeight:700,color:"var(--coral)",marginBottom:12}}>Danger Zone</div>
                      <button className="btn" style={{width:"100%",background:"rgba(255,107,107,0.1)",border:"1px solid rgba(255,107,107,0.3)",color:"var(--coral)",fontSize:13}} onClick={()=>{if(confirm("Delete your account? This cannot be undone.")){fetch("/api/muse/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"delete-account"})});showToast("Account deleted");setTimeout(()=>window.location.reload(),1500)}}}>Delete Account</button>
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
                  {authMode==="login" && <button type="button" onClick={async()=>{if(!authEmail.trim()){setFormErrors({email:"Enter your email first"});return;}setAuthLoading(true);try{const r=await fetch("/api/muse/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"forgot-password",email:authEmail.trim()})});const j=await r.json();showToast(j.message||j.error||"Check your email for a password reset link!");}catch{showToast("Network error");}setAuthLoading(false);}} style={{background:"none",border:"none",color:"var(--gold)",fontSize:12,cursor:"pointer",textAlign:"right",width:"100%",marginTop:4,padding:0}}>Forgot password?</button>}
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
                      {obProfilePic ? <img src={obProfilePic} alt="Profile" /> : (
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
                          {obPortfolioItems[i] ? <img src={obPortfolioItems[i].img} alt="Work" /> : <div className="ob-portfolio-plus">+</div>}
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
                    <button className="btn btn-gold" onClick={async ()=>{
                      setCurrentUser(prev=>({...prev,name:obData.name||prev.name,type:obData.type||prev.type,avatar:obProfilePic||prev.avatar}));
                      const geo = await getGeolocation();
                      if(authUser?.id){
                        try{await fetch("/api/muse/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"update-profile",auth_id:authUser.id,updates:{
                          name:obData.name,loc:obData.loc,bio:obData.bio,type:obData.type,
                          looking:obData.looking,styles:obData.styles,
                          zodiac:obData.zodiac,chinese:obData.chinese,mbti:obData.mbti,life_path:obData.lifePath,
                          avatar:obProfilePic,
                          ...(geo ? { lat: geo.lat, long: geo.long, city: geo.city } : {})
                        }})});}catch(e){}
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
                  <div className="logo-link">muse</div>
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
<button className={"hdr-btn"+(boostActive?" hdr-btn-glow":"")} onClick={()=>{if(!boostActive){const end=Date.now()+1800000;setBoostActive(true);setBoostEnd(end);try{localStorage.setItem("muse_boost",""+end);}catch{}showToast("Boost on for 30 min!");}else{setBoostActive(false);setBoostEnd(0);try{localStorage.removeItem("muse_boost");}catch{}showToast("Boost off");}}} style={{width:34,height:34}}><FiZap size={16} /></button>
</>)}
</div>
                </div>
                {mapView && <MuseMap filteredProfiles={filteredProfiles} myGeo={myGeo ? {lat:myGeo.lat, lng:myGeo.long} : undefined} containerRef={mapContainerRef} />}
                {boostActive && <div className="boost-badge" style={{display:"flex",justifyContent:"center",gap:8}}>BOOST ACTIVE {(()=>{const mins=Math.max(0,Math.ceil((boostEnd-Date.now())/60000));if(mins<=0){setBoostActive(false);try{localStorage.removeItem("muse_boost");}catch{}return"";}return <span style={{fontWeight:400}}>({mins}m left)</span>;})()}</div>}
                {!mapView && (<><div className="card-stack">
                  {filteredProfiles.slice(currentIdx, currentIdx+3).map((profile, idx) => {
                    const isTop = idx === 0;
                    return (
                       <div key={profile.id} className={"swipe-card"+(isTop?" top-card":"")+(expandedProfile===profile.id?" expanded":"")} style={{zIndex:3-idx,transform:"translate("+(isTop?dragOffset:0)+"px, "+(isTop?dragOffsetY:0)+"px) scale("+(Math.max(0.92, 1 - idx * 0.04))+")",opacity:isTop?1-dragOpacity*0.3:1}} onPointerDown={isTop&&expandedProfile!==profile.id?onPointerDown:undefined} onPointerMove={isTop&&expandedProfile!==profile.id?onPointerMove:undefined} onPointerUp={isTop&&expandedProfile!==profile.id?onPointerUp:undefined} onPointerCancel={isTop&&expandedProfile!==profile.id?onPointerUp:undefined}>
                        <div style={{position:"relative",width:"100%",height:"100%",display:"flex",flexDirection:"column"}}>
                           <div style={{position:"relative",width:"100%",flex:expandedProfile===profile.id?"0 0 340px":"0 0 65%",minHeight:expandedProfile===profile.id?340:0,overflow:"hidden"}}>
                            <img src={((profile as any).photos?.length ? (profile as any).photos[currentPhotoIdx] : profile.img) || profile.img} alt={profile.name} draggable="false" onError={handleImgError} style={{width:"100%",height:"100%",objectFit:"cover",position:"absolute",top:0,left:0}} />
                            {isTop && expandedProfile!==profile.id && <>
                              <div style={{position:"absolute",left:0,top:0,bottom:0,width:"35%",zIndex:5,cursor:"pointer"}} onClick={(e)=>{e.stopPropagation();setCurrentPhotoIdx(prev=>Math.max(0,prev-1))}} />
                              <div style={{position:"absolute",right:0,top:0,bottom:0,width:"35%",zIndex:5,cursor:"pointer"}} onClick={(e)=>{e.stopPropagation();const max=(profile as any).photos?.length||1;setCurrentPhotoIdx(prev=>Math.min(max-1,prev+1))}} />
                            </>}
                            <div style={{position:"absolute",bottom:10,left:"50%",transform:"translateX(-50%)",display:"flex",gap:6,zIndex:6}}>
                              {((profile as any).photos?.length > 0 ? (profile as any).photos : [profile.img]).map((_:any,i:number)=><div key={i} style={{width:i===currentPhotoIdx?18:6,height:6,borderRadius:3,background:i===currentPhotoIdx?"var(--gold)":"rgba(255,255,255,0.3)",transition:"all .2s"}} />)}
                            </div>
                            <div className="card-shine" />
                            <div className="card-gradient" />
                            <div className="card-border" />
                            {isTop && dragOffset > 25 && <div style={{position:"absolute",top:40,left:20,fontSize:28,fontWeight:900,color:"#4ade80",border:"4px solid #4ade80",borderRadius:12,padding:"6px 16px",transform:"rotate(-15deg)",zIndex:10,textShadow:"0 2px 8px rgba(0,0,0,.5)",letterSpacing:3}}>LIKE</div>}
                            {isTop && dragOffset < -25 && <div style={{position:"absolute",top:40,right:20,fontSize:28,fontWeight:900,color:"#ef4444",border:"4px solid #ef4444",borderRadius:12,padding:"6px 16px",transform:"rotate(15deg)",zIndex:10,textShadow:"0 2px 8px rgba(0,0,0,.5)",letterSpacing:3}}>NOPE</div>}
                            {isTop && Math.abs(dragOffsetY) > 25 && <div style={{position:"absolute",top:"40%",left:"50%",transform:"translate(-50%,-50%) rotate(-5deg)",fontSize:26,fontWeight:900,color:"#818cf8",border:"4px solid #818cf8",borderRadius:12,padding:"6px 16px",zIndex:10,textShadow:"0 2px 8px rgba(0,0,0,.5)",letterSpacing:2,background:"rgba(129,140,248,0.15)"}}>SUPER</div>}
                            {isTop && Math.abs(dragOffset) > 130 && <span style={{display:"none"}} />}
                            {profile.online && (
                              <div className="card-online">
                                <div className="card-online-dot" />
                                <span className="card-online-text">Online</span>
                              </div>
                            )}
                          </div>
                           <div className="card-info" style={{position:"relative",zIndex:3,flex:1,overflowY:"auto",minHeight:0}}>
                            {profile.verified && <div className="card-verified">Verified</div>}
                            {profile.nsfw && <div className="card-nsfw-badge">18+</div>}
                            <div>
                              <span className="card-name">{profile.name}</span>
                              <span className="card-collabs">{profile.collabs} collabs</span>
                            </div>
                            <div className="card-type">{profile.type}</div>
                            <div className="card-bio">{profile.bio}</div>
                            <div className="card-looking">Looking for: <span>{profile.looking.join(", ")}</span></div>
                            <div className="tags">{profile.styles.map(s=><span key={s} className="tag">{s}</span>)}</div>
                            <div className="match-score"><div className="score-bar"><div className="score-fill" style={{width:profile.score+"%"}} /></div><span className="score-text">{profile.score}%</span></div>
                            <div className="card-section"><div className="card-section-title">All Photos</div><div className="card-photo-grid">{((profile as any).photos||[profile.img]).map((p:any,i:number)=><div key={i} className="card-photo-thumb" onClick={(e)=>{e.stopPropagation();setCurrentPhotoIdx(i)}} style={{opacity:i===currentPhotoIdx?1:0.6,border:i===currentPhotoIdx?"2px solid var(--gold)":"2px solid transparent"}}><img src={p} alt="" /></div>)}</div></div>
                            <div className="card-section"><div className="card-section-title">About</div><div className="card-section-text">{profile.bio}</div></div>
                            <div className="card-section"><div className="card-section-title">Creative Style</div><div className="card-section-tags">{profile.styles.map(s=><span key={s} className="tag">{s}</span>)}</div></div>
                            <div className="card-section"><div className="card-section-title">Personality</div><div className="card-section-tags">{(profile as any).zodiac && <span className="tag">♈ {(profile as any).zodiac}</span>}{(profile as any).chinese && <span className="tag">{(profile as any).chinese}</span>}{(profile as any).mbti && <span className="tag">🧠 {(profile as any).mbti}</span>}{(profile as any).lifePath && <span className="tag">🔮 Path {(profile as any).lifePath}</span>}</div></div>
                            <div className="card-section"><div className="card-section-title">Badges</div><div className="card-section-tags">{(profile as any).badges?.length ? (profile as any).badges.map((b:any,i:number)=><span key={i} className="tag" style={{background:`${b.color}20`,border:`1px solid ${b.color}40`,color:b.color}}>{b.icon} {b.name}</span>) : <span style={{fontSize:12,color:"var(--muted)"}}>No badges yet</span>}</div></div>
                            <div className="card-section" style={{paddingBottom:16}}><div className="card-section-title">Location</div><div className="card-section-text">📍 {profile.loc}</div></div>
                          </div>
                        </div>
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
                <div className="actions">
                  <button className="action-btn btn-rewind" onClick={doRewind} aria-label="Rewind">↺</button>
                  <button className="action-btn btn-nope" onClick={()=>doSwipe("left")} aria-label="Pass">✕</button>
                  <button className="action-btn btn-super" onClick={()=>doSwipe("super")} aria-label="Super Like">★</button>
                  <button className="action-btn btn-like" onClick={()=>doSwipe("right")} aria-label="Like">♥</button>
                  <button className="action-btn btn-note" onClick={doLikeWithNote} aria-label="Like + Note">✎♥</button>
                </div>
                {dailyLikes < 10 && <div className="limit-bar"><div className="limit-dots">{Array.from({length:10},(_,i)=><div key={i} className={"limit-dot"+(i<dailyLikes?" filled":"")} />)}</div><div className="limit-text">{dailyLikes} likes left</div></div>}
                {superLikes < 3 && <div className="limit-bar"><div className="limit-dots">{Array.from({length:3},(_,i)=><div key={i} className={"limit-dot"+(i<superLikes?" super-filled":"")} />)}</div><div className="limit-text">{superLikes} super likes left</div></div>}
                </>)}
              </div>
              <Nav active="discover" onNavigate={showScreen} onHamburgerToggle={openHamburger} />
            </div>
            <div className={"screen-el"+(screen==="connections"?" active":"")}>
              <div className="hdr">
                <div className="logo-link">Feed</div>
                <div style={{display:"flex",gap:4}}>
                  {(["all","photos","text"] as const).map(f=>(
                    <div key={f} className={"conn-tab-sub"+(feedFilter===f?" active":"")} onClick={()=>setFeedFilter(f)} style={{fontSize:11,padding:"5px 10px",borderRadius:99}}>{f==="all"?"All":f==="photos"?"Photos":"Text"}</div>
                  ))}
                </div>
              </div>
              <div className="conn-scroll" style={{padding:"0 0 80px"}}>
                <div style={{padding:"12px 20px",display:"flex",gap:10,alignItems:"flex-start"}}>
                  <img src={currentUser.avatar} alt="" style={{width:40,height:40,borderRadius:"50%",objectFit:"cover",flexShrink:0}} onError={handleImgError} />
                  <div style={{flex:1,display:"flex",flexDirection:"column",gap:8}}>
                    <textarea className="inp" placeholder="Share your work, ideas, or find collaborators..." rows={2} value={feedText} onChange={e=>setFeedText(e.target.value)} style={{resize:"none",fontSize:13,padding:"10px 14px",borderRadius:14,background:"var(--glass)",border:"1px solid rgba(255,255,255,0.06)"}} />
                    <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                      <label style={{width:32,height:32,borderRadius:8,background:"var(--glass)",border:"1px solid rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:14,color:"var(--text2)"}}>
                        <FiImage size={14} />
                        <input type="file" accept="image/*,video/*" multiple style={{display:"none"}} onChange={async e=>{const files=Array.from(e.target.files||[]);if(!files.length)return;showToast("Uploading "+files.length+" file(s)...");const urls:string[]=[];for(const f of files){const url=await uploadImage(f,"feed");if(url)urls.push(url)}setFeedMedia(prev=>[...prev,...urls]);}} />
                      </label>
                      <button style={{width:32,height:32,borderRadius:8,background:"var(--glass)",border:"1px solid rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:14,color:"var(--text2)"}} onClick={() => setShowEmojiPicker(!showEmojiPicker)}>😊</button>
                      {feedMedia.slice(0,4).map((url,i)=><div key={i} style={{position:"relative",width:32,height:32}}>{url.endsWith(".mp4")||url.includes("video")?<video src={url} style={{width:32,height:32,borderRadius:8,objectFit:"cover"}} />:<img src={url} alt="" style={{width:32,height:32,borderRadius:8,objectFit:"cover"}} />}<button onClick={()=>setFeedMedia(prev=>prev.filter((_,j)=>j!==i))} style={{position:"absolute",top:-4,right:-4,width:16,height:16,borderRadius:"50%",background:"var(--coral)",border:"none",color:"#fff",fontSize:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><FiX size={10} /></button></div>)}
                      {feedMedia.length>4&&<span style={{fontSize:11,color:"var(--muted)"}}>+{feedMedia.length-4}</span>}
                      <button className="conn-btn conn-btn-primary" style={{marginLeft:"auto",fontSize:12,padding:"7px 18px"}} onClick={async()=>{if(feedText.trim()||feedMedia.length){const txt=feedText.trim();const hasVideo=feedMedia.some(u=>u.endsWith(".mp4")||u.includes("video"));const type=feedMedia.length?hasVideo?"video":"photo":"text";setFeedText("");setFeedMedia([]);setFeedPosts(prev=>[{id:Date.now(),author:currentUser.name,avatar:currentUser.avatar,type,text:txt,likes:0,comments:0,shares:0,time:"Just now",img:feedMedia[0]||undefined,media:feedMedia,liked:false,saved:false,reactions:{}},...prev]);try{await apiFetch("/api/muse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"feed",text:txt,media:feedMedia,userId:currentUser.id})});}catch{}showToast("Posted!")}}}>Post</button>
                      <button className="conn-btn conn-btn-ghost" style={{fontSize:11,padding:"6px 12px"}} onClick={async()=>{if(feedText.trim()||feedMedia.length){const txt=feedText.trim();setFeedText("");setFeedMedia([]);const moment={id:Date.now(),author:currentUser.name,avatar:currentUser.avatar,type:feedMedia.length?"photo":"text",text:txt,img:feedMedia[0]||undefined,media:[...feedMedia],time:"Just now"};setStories(prev=>[moment,...prev]);showToast("Moment posted!");}}}>⚡ Moment</button>
                    </div>
                    {showEmojiPicker && <div style={{display:"flex",gap:6,flexWrap:"wrap",padding:"8px 0"}}>{["😍","🔥","❤️","😂","😢","😡","👍","🎉","✨","💯","👏","🙌"].map(e=><span key={e} style={{fontSize:22,cursor:"pointer",transition:"transform .15s"}} onClick={()=>{setFeedText(prev=>prev+" "+e);setShowEmojiPicker(false)}} onMouseEnter={e=>e.currentTarget.style.transform="scale(1.3)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>{e}</span>)}</div>}
                  </div>
                </div>
                {feedPosts.length === 0 && feedPostsStatic.length === 0 && (
                  <div className="empty-state" style={{paddingTop:60}}>
                    <div className="empty-icon" style={{fontSize:48}}>📝</div>
                    <div className="empty-title">No posts yet</div>
                    <div className="empty-sub">Be the first to share your creative work!</div>
                  </div>
                )}
                {[...feedPostsStatic,...feedPosts].sort((a,b)=>b.id-a.id).filter(p=>feedFilter==="all"||p.type===feedFilter).map(post=>{
                  const feedReactionArr = feedReactions[post.id]||[];
                  const totalReactions = ["❤️","🔥","😍","😂","😢","😡"].reduce((s,r)=>s+(feedReactionArr.filter(x=>x===r).length||0),(post.liked?1:0));
                  return (
                    <div key={post.id} className="conn-card" style={{flexDirection:"column",margin:"0 20px 14px",padding:0,overflow:"hidden"}}>
                      <div style={{padding:"14px 18px 0",display:"flex",alignItems:"center",gap:10}}>
                        <img src={post.avatar} alt="" style={{width:40,height:40,borderRadius:"50%",objectFit:"cover"}} onError={handleImgError} />
                        <div>
                          <div style={{fontSize:15,fontWeight:700}}>{post.author}</div>
                          <div style={{fontSize:11,color:"var(--muted)"}}>{post.time}</div>
                        </div>
                        <button style={{marginLeft:"auto",background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:16}} onClick={()=>{setShowReport(true);setReportTarget({id:post.id,type:"feed_post",name:post.author})}}><FiMoreHorizontal size={16} /></button>
                      </div>
                      <div style={{padding:"10px 18px",fontSize:14,color:"var(--text)",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{post.text}</div>
                      {post.img && (
                        <div style={{position:"relative"}}>
                          <img src={post.img} alt="" style={{width:"100%",maxHeight:360,objectFit:"cover",display:"block"}} onError={handleImgError} />
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
                      <div style={{display:"flex",justifyContent:"space-around",padding:"8px 18px",borderTop:"1px solid rgba(255,255,255,0.04)"}}>
                        <div style={{position:"relative"}}>
                          <button style={{background:"none",border:"none",color:post.liked?"var(--coral)":"var(--muted)",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",gap:4,padding:"4px 12px",borderRadius:8,transition:"all .2s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.05)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"} onClick={()=>{setFeedPosts(prev=>prev.map(p=>p.id===post.id?({...p,liked:!p.liked}):p));if(feedPostsStatic.some(p=>p.id===post.id))setFeedPostsStatic(prev=>prev.map(p=>p.id===post.id?({...p,liked:!p.liked}):p));}}
>♥ {post.likes+(post.liked?1:0)}</button>
                        </div>
                        <button style={{background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",gap:4,padding:"4px 12px",borderRadius:8}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.05)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"} onClick={()=>setReplyingTo(replyingTo===post.id?null:post.id)}>💬 {post.comments}</button>
                        <button style={{background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",gap:4,padding:"4px 12px",borderRadius:8}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.05)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"} onClick={()=>{navigator.clipboard?.writeText("https://wyzdesign.com/muse/post/"+post.id);showToast("Link copied!")}}>↗ {post.shares}</button>
                      </div>
                      {replyingTo === post.id && (
                        <div style={{display:"flex",gap:8,padding:"10px 18px",borderTop:"1px solid rgba(255,255,255,0.04)"}}>
                          <input className="inp" placeholder="Write a reply..." value={commentText} onChange={e=>setCommentText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&commentText.trim()){const txt=commentText.trim();setFeedPosts(prev=>prev.map(p=>p.id===post.id?{...p,comments:p.comments+1}:p));setCommentText("");setReplyingTo(null);apiFetch("/api/muse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"forum",type:"reply",postId:post.id,text:txt})});showToast("Reply posted!")}}} style={{flex:1,fontSize:13,padding:"8px 12px",borderRadius:10,background:"var(--glass)",border:"1px solid rgba(255,255,255,0.06)",color:"var(--text)"}} />
                          <button className="conn-btn conn-btn-primary" style={{fontSize:12,padding:"6px 14px"}} onClick={()=>{if(commentText.trim()){const txt=commentText.trim();setFeedPosts(prev=>prev.map(p=>p.id===post.id?{...p,comments:p.comments+1}:p));setCommentText("");setReplyingTo(null);apiFetch("/api/muse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"forum",type:"reply",postId:post.id,text:txt})});showToast("Reply posted!")}}}>Send</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <Nav active="connections" onNavigate={showScreen} onHamburgerToggle={openHamburger} />
            </div>
              <div className={"screen-el"+(screen==="matches"?" active":"")}>
              <div className="hdr">
                <div className="logo-link">muse</div>
<div style={{display:"flex",gap:10}}>
{!searchOpen && !showLikesYou && (<button className="hdr-btn" style={{position:"relative",width:34,height:34,overflow:"visible"}} onClick={()=>setShowLikesYou(!showLikesYou)}><FiHeart size={16} />{likedBy.length > 0 && <span style={{position:"absolute",top:-4,right:-4,width:16,height:16,borderRadius:"50%",background:"linear-gradient(135deg,var(--coral),var(--pink))",fontSize:9,fontWeight:800,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1,boxShadow:"0 1px 4px rgba(0,0,0,0.5)"}}>{likedBy.length}</span>}</button>)}
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
                        <div key={p.id} style={{position:"relative",borderRadius:16,overflow:"hidden",aspectRatio:"3/4",cursor:"pointer"}} onClick={()=>{
                          if (!matches.find(m => m.id === p.id)) {
                            setMatches(prev => [...prev, {...p, messages:[]}]);
                          }
                          const target = matches.find(m => m.id === p.id) || {...p, messages:[]};
                          setChatTarget(target);
                          showScreen("chat");
                        }}>
                          <img src={p.img} alt={p.name} style={{width:"100%",height:"100%",objectFit:"cover"}} />
                          <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"12px",background:"linear-gradient(to top,rgba(10,6,18,0.9),transparent)"}}>
                            <div style={{fontSize:15,fontWeight:700}}>{p.name}</div>
                            <div style={{fontSize:12,background:"linear-gradient(90deg,var(--gold),var(--amber))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontWeight:600}}>{p.type}</div>
                          </div>
                          <div style={{position:"absolute",top:8,right:8,padding:"4px 10px",borderRadius:99,background:"linear-gradient(135deg,var(--coral),var(--pink))",fontSize:10,fontWeight:700,color:"#fff"}}>♥ Liked You</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
              <>
              <div className="match-list" style={{flex:1,display:"flex",flexDirection:"column",justifyContent:matches.length===0?"center":"flex-start",padding:matches.length===0?"20vh 10vw":"0"}}>
                {matches.length === 0 && (
                  <div className="empty-state" style={{padding:60}}>
                    <div className="empty-icon" style={{fontSize:64}}><FiHeart size={72} /></div>
                    <div className="empty-title" style={{fontSize:22,marginTop:20}}>No sparks yet</div>
                    <div className="empty-sub" style={{fontSize:14,maxWidth:240,margin:"12px auto 0"}}>Start swiping to find your creative connections</div>
                  </div>
                )}
                {matches.filter(m => searchQuery === "" || m.name.toLowerCase().includes(searchQuery.toLowerCase())).map(m => {
                  const expanded = expandedMatchId === String(m.id);
                  return (
                  <div key={m.id} data-mid={String(m.id)} data-exp={expanded?"1":"0"} className={"match-card"+(expanded?" match-card-expanded":"")} onClick={()=>{ if(expanded){ setExpandedMatchId(null); return; } setChatTarget(m); showScreen("chat"); }}>
                    <div className="match-avatar-wrap">
                      <img src={m.img} alt={m.name} className="match-avatar" onError={handleImgError} />
                      {m.online && <div className="online-dot" />}
                    </div>
                    <div className="match-info">
                      <div className="match-name">{m.name}</div>
                      <div className="match-type">{m.type}</div>
                      <div className="match-msg">{m.messages?.[m.messages.length-1]?.text || getIcebreaker(m.type)}</div>
                      {expanded && (
                        <div className="match-expand">
                          <div className="match-expand-bio">{m.bio || "Creative soul looking for their next collaboration."}</div>
                          <div className="match-expand-meta">
                            {m.location && <span>{m.location}</span>}
                            {typeof m.distanceMi === "number" && <span>{m.distanceMi} mi</span>}
                            {m.zodiac && <span>{m.zodiac}</span>}
                          </div>
                          <button className="match-expand-btn" onClick={(e)=>{ e.stopPropagation(); setExpandedMatchId(null); setChatTarget(m); showScreen("chat"); }}>Open Chat</button>
                        </div>
                      )}
                    </div>
                    <div className="match-time">{m.messages?.[m.messages.length-1]?.time || ""}</div>
                  </div>
                  );
                })}
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
                     <img src={chatTarget.img} alt={chatTarget.name} className="chat-avatar" onError={handleImgError} />
                    <div className="chat-info">
                      <div className="chat-name">{chatTarget.name}</div>
                      <div className="chat-type">{chatTarget.type}</div>
                    </div>
                  </div>
                  <div className="messages" ref={messagesEndRef}>
                    {(chatTarget.messages || []).map((msg, i) => (
                      <div key={i} className={"msg "+(msg.from==="me"?"msg-me":"msg-them")}>
                        {msg.img && <img src={msg.img} alt="" style={{maxWidth:200,borderRadius:12,marginBottom:6,display:"block"}} />}
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
                      <button key={q} className="quick-reply" onClick={()=>setChatInput(q)}>{q}</button>
                    ))}
                  </div>
                  <div className="chat-input-wrap">
                    <label style={{cursor:"pointer",color:"var(--muted)",fontSize:18,display:"flex",alignItems:"center"}}>
                      <FiImage size={18} />
                      <input type="file" accept="image/*" style={{display:"none"}} onChange={(e)=>{
                        const f=e.target.files?.[0];
                        if(f&&chatTarget){
                          const r=new FileReader();
                          r.onload=()=>{
                            const imgMsg={from:"me",text:"",img:r.result as string,time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})};
                            setChatTarget(prev=>prev?{...prev,messages:[...prev.messages,imgMsg]}:prev);
                            setMatches(prev=>prev.map(m=>m.id===chatTarget.id?{...m,messages:[...m.messages,imgMsg]}:m));
                          };
                          r.readAsDataURL(f);
                        }
                      }} />
                    </label>
                    <input className="chat-inp" placeholder="Type a message..." value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&chatInput.trim()){sendMsg()}}} />
                    <button className="send-btn" onClick={sendMsg}><FiSend size={18} /></button>
                  </div>
                </div>
              )}
              <Nav active="matches" onNavigate={showScreen} onHamburgerToggle={openHamburger} />
            </div>
            <div className={"screen-el"+(screen==="briefs"?" active":"")}>
              <div className="hdr">
                <div className="logo-link">muse</div>
                <button className="hdr-btn" onClick={()=>setShowPostBrief(true)}><FiPlus size={18} /></button>
              </div>
              <div className="conn-tabs" style={{padding:"0 12px"}}>
                {([["all","All"],["tfp","TFP"],["paid","Paid"],["opencall","Open Call"],["vision","Concept"]] as const).map(([k,l])=>(
                  <div key={k} className={"conn-tab"+(museCat===k?" active":"")} onClick={()=>setMuseCat(k as any)}>{l}</div>
                ))}
              </div>
              <div className="briefs-scroll">
                {(() => {
                  const allBriefs = [...userBriefs.map(b=>({...b,author:currentUser.name,authorImg:currentUser.avatar,deadline:"Flexible",urgent:false,nsfw:false,cat:b.cat||"vision"})),...(liveBriefs || BRIEFS)];
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
                        <img src={brief.authorImg} alt={brief.author} className="brief-avatar" />
                        <div className="brief-info" style={{flex:1}}>
                          <div className="brief-author"><strong>{brief.author}</strong></div>
                          <div className="brief-meta">{brief.budget} · {brief.deadline}</div>
                        </div>
                        <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:4,width:"100%"}}>
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
                          <button className={"brief-btn-apply"+(appliedBriefs.includes(brief.id)?" applied":"")} style={{padding:"8px 14px",fontSize:12}} onClick={()=>{if(!appliedBriefs.includes(brief.id)){setAppliedBriefs([...appliedBriefs,brief.id]);showToast("Applied!")}}}>
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
            <div className={"screen-el"+(screen==="portfolio"?" active":"")}>
              <div className="hdr">
                <div className="logo-link">muse</div>
                <button className="hdr-btn" onClick={()=>setShowPortfolioUpload(true)}><FiPlus size={18} /></button>
              </div>
              <div className="portfolio-scroll">
                {currentUser.portfolio.length === 0 && (
                  <div className="empty-state">
                    <div className="empty-icon"><FiImage size={48} /></div>
                    <div className="empty-title">No portfolio items yet</div>
                    <div className="empty-sub">Upload your work to showcase your talent</div>
                  </div>
                )}
                <div className="portfolio-grid">
                  {currentUser.portfolio.map((item, i) => (
                    <div key={i} className="portfolio-item">
                      <img src={item.img} alt={item.title} />
                      <div className="portfolio-item-overlay">
                        <div className="portfolio-item-title">{item.title}</div>
                        <div className="portfolio-item-likes">♥ {(item as any).likes || 0}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Nav active="portfolio" onNavigate={showScreen} onHamburgerToggle={openHamburger} />
            </div>
            <div className={"screen-el"+(screen==="moments"?" active":"")}>
              <div className="hdr">
                <div className="logo-link">muse</div>
                <div style={{width:40}} />
              </div>
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
                        <img src={s.img||s.avatar} alt="" onError={handleImgError} />
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
                    <img src={s.img||s.avatar} alt="" className="moments-card-img" onError={handleImgError} />
                    <div className="moments-card-body">
                      <div className="moments-card-user">
                        <img src={s.avatar} alt="" className="moments-card-avatar" onError={handleImgError} />
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
              <Nav active="moments" onNavigate={showScreen} onHamburgerToggle={openHamburger} />
            </div>
            <div className={"screen-el"+(screen==="profile"?" active":"")}>
              <div className="hdr">
                <div className="logo-link">muse</div>
                <div style={{display:"flex",gap:10}}>
                  <button className="hdr-btn" onClick={()=>setShowEditProfile(true)}><FiEdit2 size={18} /></button>
                  <button className="hdr-btn" onClick={()=>setScreen("settings")}><FiSettings size={18} /></button>
                </div>
              </div>
              <div className="profile-scroll">
                <div className="completeness">
                  <div className="completeness-text">
                    <span>Profile Completeness</span>
                    <span>{Math.min(100, (currentUser.name !== "You" ? 15 : 0) + (obData.bio ? 15 : 0) + (obData.type ? 15 : 0) + ((obData.looking||[]).length ? 10 : 0) + ((obData.styles||[]).length ? 10 : 0) + (obData.zodiac ? 8 : 0) + (obData.mbti ? 7 : 0) + (obData.lifePath ? 5 : 0) + (obData.chinese ? 5 : 0) + (obData.loc ? 10 : 0))}%</span>
                  </div>
                  <div className="completeness-bar"><div className="completeness-fill" style={{width:Math.min(100, (currentUser.name !== "You" ? 15 : 0) + (obData.bio ? 15 : 0) + (obData.type ? 15 : 0) + ((obData.looking||[]).length ? 10 : 0) + ((obData.styles||[]).length ? 10 : 0) + (obData.zodiac ? 8 : 0) + (obData.mbti ? 7 : 0) + (obData.lifePath ? 5 : 0) + (obData.chinese ? 5 : 0) + (obData.loc ? 10 : 0))+"%"}} /></div>
                </div>
                <div className="profile-top">
                  <div className="profile-avatar-wrap">
                     <img src={currentUser.avatar} alt={currentUser.name} className="profile-avatar" onError={handleImgError} />
                    <div className="profile-ring" />
                  </div>
                  <div className="profile-name">{currentUser.name}</div>
                  <div className="profile-type">{obData.type || "Creative"}</div>
                  <div className="profile-loc">{obData.loc || "Set your location"}</div>
                </div>
                <div className="stats-row">
                  <div className="stat"><div className="stat-num">{matches.length}</div><div className="stat-label">Matches</div></div>
                  <div className="stat"><div className="stat-num">{matchStreak}</div><div className="stat-label">Streak</div></div>
                  <div className="stat"><div className="stat-num">{currentUser.stats.likes}</div><div className="stat-label">Likes</div></div>
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
                  <div style={{fontSize:13,color:"var(--text2)",marginBottom:10}}>Plan: <span style={{color:"var(--gold)",fontWeight:600}}>Free</span></div>
                  <button className="btn btn-gold" style={{fontSize:14,padding:"14px 0"}} onClick={()=>setScreen("subscription")}>Upgrade</button>
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
                <div className="profile-btn"><button className="btn btn-outline" onClick={() => { setEditName(currentUser.name); setEditBio(obData.bio||""); setEditLoc(obData.loc||""); setShowEditProfile(true); }}>Edit Profile</button></div>
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
            <button className="btn btn-gold" onClick={()=>{if(briefTitle.trim()){setUserBriefs(prev=>[...prev,{id:Date.now(),title:briefTitle,desc:briefDesc,budget:briefCat==="concept"?"—":briefBudget||"Negotiable",tags:["New",briefCat],cat:briefCat}]);showToast("Posted!");setShowPostBrief(false);setBriefTitle("");setBriefDesc("");setBriefBudget("");setBriefCat("concept")}else{showToast("Title required")}}}>Post</button>
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

      {/* PORTFOLIO UPLOAD MODAL */}
      {showPortfolioUpload && (
        <div className="modal-overlay">
          <div className="modal-header">
            <button className="modal-back" onClick={()=>setShowPortfolioUpload(false)}><FiArrowLeft size={20} /></button>
            <div className="modal-title">Add Work</div>
            <button className="modal-close" onClick={()=>setShowPortfolioUpload(false)}><FiX size={18} /></button>
          </div>
          <div className="modal-body">
            <input className="inp" placeholder="Title" value={uploadTitle} onChange={e=>setUploadTitle(e.target.value)} />
            <input ref={portfolioInputRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={async (e)=>{
              const files = Array.from(e.target.files||[]);
              if(files.length===0) return;
              showToast("Uploading "+files.length+" file(s)...");
              for(const f of files){
                const url = await uploadImage(f,"portfolio");
                if(url) setCurrentUser(prev=>({...prev,portfolio:[...prev.portfolio,{img:url,title:uploadTitle||"Work "+(prev.portfolio.length+1),type:"photo"}]}));
              }
              setShowPortfolioUpload(false);showToast(files.length+" work(s) added!");
            }} />
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
              {[1,2,3,4,5,6].map(i=>(
                <div key={i} style={{aspectRatio:"3/4",borderRadius:10,overflow:"hidden",cursor:"pointer",border:"2px dashed rgba(255,255,255,0.15)",background:"rgba(255,255,255,0.03)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,color:"var(--muted)"}} onClick={()=>portfolioInputRef.current?.click()}>+</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBSCRIPTION SCREEN */}
      {screen === "subscription" && (
        <div className="phone-wrap">
          <div className="phone" id="muse-app">
            <div className="notch" />
            <div className="hdr">
              <div className="logo-link">muse</div>
              <button className="hdr-btn" onClick={()=>showScreen("profile")}><FiArrowLeft size={18} /></button>
            </div>
            <div className="sub-scroll">
              <div className="sub-header">
                <div className="sub-title">Unlock Your Potential</div>
                <div className="sub-subtitle">Choose the plan for your creative journey</div>
              </div>
              {TIERS.map(tier => (
                <div key={tier.name} className={"tier-card"+(tier.name.toLowerCase()===userTier?" current":"")} style={{position:"relative"}}>
                  {tier.name.toLowerCase()===userTier && <div className="tier-current-badge" style={{position:"absolute",top:"-8px",right:"12px"}}>Current</div>}
                  <div className="tier-header">
                    <div className="tier-name">{tier.name}</div>
                    <div><span className="tier-price">{tier.price}</span><span className="tier-period">{tier.period}</span></div>
                  </div>
                  <ul className="tier-features">{tier.features.map(f=><li key={f}>{f}</li>)}</ul>
                  <button className={"tier-btn"+(tier.name==="Sovereign"?" tier-btn-primary":" tier-btn-outline")} onClick={async()=>{if(tier.name.toLowerCase()===userTier)return;if(tier.name==="Free"){showToast("You're on the Free plan");return;}try{const r=await fetch("/api/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"subscription",plan:tier.name.toLowerCase(),email:authUser?.email,userId:authUser?.id})});const d=await r.json();if(d.url){window.location.href=d.url}else{showToast(d.error||"Checkout unavailable, try again later")}}catch{showToast("Checkout unavailable, try again later")}}}>
                    {tier.name.toLowerCase()===userTier ? "Current Plan" : tier.name==="Free" ? "Free Plan" : "Select "+tier.name}
                  </button>
                </div>
              ))}
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
              <div className="logo-link">muse</div>
              <button className="hdr-btn" onClick={()=>showScreen("profile")}><FiArrowLeft size={18} /></button>
            </div>
            <div className="settings-scroll">
              <div className="settings-group">
                <div className="settings-group-title">Account</div>
                {[
                  {icon:<FiUser size={18}/>,label:"Edit Profile",desc:"Name, bio, photos",action:()=>setShowEditProfile(true)},
                  {icon:<FiSettings size={18}/>,label:"Notifications",desc:"Push and email alerts",action:()=>setShowNotificationsSettings(!showNotificationsSettings)},
                  {icon:<FiLink size={18}/>,label:"Connected Accounts",desc:"Instagram, Spotify, etc.",action:()=>setShowConnectedAccounts(!showConnectedAccounts)},
                  {icon:<FiStar size={18}/>,label:"Personality Profile",desc:"Zodiac, MBTI, Life Path",action:()=>{setScreen("onboard");setObStep(7)}},
                  {icon:<FiUsers size={18}/>,label:"Creative Profile",desc:"Type, styles, looking for",action:()=>{setScreen("onboard");setObStep(4)}},
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
                <div className="settings-group-title">Privacy</div>
                {[
                  {icon:<FiEye size={18}/>,label:"NSFW Content",desc:"Show or hide 18+ content",action:()=>{if(!showNsfw){setShowAgeGate(true);setPendingNsfw(true)}else{setShowNsfw(false)}}},
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
              <div key={r.label} className="report-option" onClick={async()=>{if(reportTarget){try{await apiFetch("/api/muse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"report",target_id:reportTarget.id,target_type:reportTarget.type,reason:r.label})});}catch{}}showToast("Reported: "+r.label);setShowReport(false);setReportTarget(null)}}>
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
              <img src={noteTargetProfile.img} alt={noteTargetProfile.name} style={{width:48,height:48,borderRadius:"50%",objectFit:"cover"}} onError={handleImgError} />
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
            <p><strong>5. Your Rights</strong>{"\n"}You can access, update, or delete your account data at any time through the app settings. You may request a copy of all data we hold about you by contacting support@wyzdesign.com. You may also request deletion of your account and all associated data.</p>
            <p><strong>6. Cookies & Tracking</strong>{"\n"}We use essential cookies for authentication and session management. We do not use third-party advertising cookies. Analytics data is collected anonymously to improve the service.</p>
            <p><strong>7. Children's Privacy</strong>{"\n"}Muse is not intended for users under 18. We do not knowingly collect information from children. If we become aware of such collection, we will delete the information immediately.</p>
            <p><strong>8. Changes to This Policy</strong>{"\n"}We may update this Privacy Policy from time to time. We will notify you of material changes through the app or by email.</p>
            <p><strong>9. Contact Us</strong>{"\n"}For questions about this Privacy Policy, contact us at privacy@wyzdesign.com or WYZ Design LLC.</p>
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
              <button className="btn btn-gold" style={{width:"100%",borderColor:"var(--coral)",background:"linear-gradient(135deg,var(--coral),#ff4444)"}} onClick={async()=>{if(authUser?.id){try{await fetch("/api/muse/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"delete-account",auth_id:authUser.id})});}catch(e){}}localStorage.removeItem("muse_user");localStorage.removeItem("muse_v1");setAuthUser(null);setShowDeleteConfirm(false);setScreen("auth");showToast("Account deleted. We're sorry to see you go.")}}>Yes, Delete My Account</button>
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
                <img src={a.avatar} alt="" style={{width:40,height:40,borderRadius:"50%",objectFit:"cover",backgroundColor:"#1a0a2e"}} />
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
              <img src={stories[showStory].img} alt="" style={{maxWidth:"90%",maxHeight:"70vh",borderRadius:16,objectFit:"contain",backgroundColor:"#1a0a2e"}} />
              <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"center",marginTop:16}}>
                <img src={stories[showStory].avatar} alt="" style={{width:32,height:32,borderRadius:"50%",objectFit:"cover",backgroundColor:"#1a0a2e"}} />
                <span style={{color:"#fff",fontWeight:700}}>{stories[showStory].author}</span>
                <span style={{color:"rgba(255,255,255,0.5)",fontSize:12}}>{stories[showStory].time}</span>
              </div>
            </div>
          )}
          <div style={{position:"absolute",bottom:30,color:"rgba(255,255,255,0.5)",fontSize:12}}>Tap anywhere to close</div>
        </div>
      )}
      {/* GLOBAL PREMIUM POPUP */}
      {showPremiumPopup && (
        <div className="premium-popup">
          <button className="premium-popup-close" onClick={()=>setShowPremiumPopup(false)}>✕</button>
          <div style={{fontSize:14,fontWeight:700,color:"var(--gold)",marginBottom:4}}>✨ Muse Premium</div>
          <div style={{fontSize:11,color:"var(--text2)",lineHeight:1.4,marginBottom:8}}>Unlimited likes, superlikes & boosts.</div>
          <button className="btn btn-gold" style={{fontSize:11,padding:"6px 14px",width:"100%"}} onClick={()=>{setShowPremiumPopup(false);setHamburgerScreen("profile");setShowHamburger(true)}}>Upgrade $9.99</button>
        </div>
      )}
    </div>
  );
}

const MuseMap = ({ filteredProfiles, myGeo, containerRef }: { filteredProfiles: any[], myGeo?: {lat:number,lng:number}, containerRef: React.RefObject<HTMLDivElement|null> }) => {
  const mapEl = useRef<any>(null);
  useEffect(() => {
    if (!containerRef.current) return;
    const w = window as any;
    if (!w.mapboxgl) {
      const s = document.createElement("script");
      s.src = "https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js";
      s.async = true;
      s.onload = () => initMap();
      document.head.appendChild(s);
    } else { initMap(); }
    function initMap() {
      w.mapboxgl.accessToken = "pk.eyJ1Ijoid3l6ZGVzaWduIiwiYSI6ImNtczE0N2xmdjEzZ3gzYXEwc2k2YXRlYnkifQ.BYsuhyxxEykDXBKw4XNW6Q";
      const center = myGeo ? [myGeo.lng, myGeo.lat] : [-118.2437, 34.0522];
      const map = new w.mapboxgl.Map({ container: containerRef.current!, style: "mapbox://styles/mapbox/dark-v11", center, zoom: 12 });
      mapEl.current = map;
      filteredProfiles.forEach(p => {
        if (p.lat && p.lng) {
          const el = document.createElement("div"); el.className = "map-marker";
          const dot = document.createElement("div");
          dot.style.cssText = "width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#FFD700,#FF8A80);border:2px solid #0a0612;box-shadow:0 0 12px rgba(255,215,0,0.4);cursor:pointer";
          el.appendChild(dot);
          new w.mapboxgl.Marker({ element: el }).setLngLat([p.lng, p.lat]).setPopup(new w.mapboxgl.Popup({ offset: 25 }).setText(p.name + " · " + p.type)).addTo(map);
        }
      });
    }
    return () => { if (mapEl.current) mapEl.current.remove(); };
  }, [filteredProfiles, myGeo, containerRef]);
  return <div ref={containerRef} style={{ width: "100%", height: "60vh", borderRadius: 16, overflow: "hidden", marginTop: 8 }} />;
};




