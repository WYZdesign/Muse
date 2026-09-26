"use client";

import "./muse.css";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import React from "react";
import Image from "next/image";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { supabase } from "@/lib/supabase";
import { subscribeToMusePush, unsubscribeFromMusePush, ensureMusePushRegistered } from "@/app/muse-pwa";
import { persistMessage, subscribeToConversation, fetchConversationHistory, getGeolocation, distanceMiles } from "@/app/muse-realtime";
import { trackError } from "@/lib/errorTracker";
import { FiArrowLeft, FiX, FiLink, FiTwitter, FiInstagram } from "react-icons/fi";
import BackgroundScene from "./components/BackgroundScene";
import { MatchOverlay } from "./components/MatchOverlay";
import { ReportModal } from "./components/ReportModal";
import { DailyLoginModal } from "./components/DailyLoginModal";
import { PageSplash } from "./components/PageSplash";
import Confetti from "./components/Confetti";
import SwipeParticles from "./components/SwipeParticles";
import { safeSetItem, safeGetItem, safeGetItemAsync, safeRemoveItem, setRefreshToken, getRefreshToken, clearRefreshToken, QUOTA_MSG } from "./lib/safe-storage";
import { createSafeObserver } from "./lib/safe-observer";
import { getAccessToken, authFetch, fetchWithTimeout } from "./lib/api";
import { analytics, setAnalyticsUser, initAnalyticsSession } from "./lib/analytics";
import { initialsAvatarUrl } from "./lib/initials-avatar";
import { uid } from "./lib/uid";
import { getProfileShareUrl, getPostShareUrl, getMuseUrl } from "@/lib/urls";
import { viewerSide, viewerSideOf, getMuseRole } from "@/lib/role";
import { MUSE_CLOSED_BETA_HIDE_SOCIAL } from "@/lib/config";
import { STRINGS } from "@/lib/strings";
import DisclosureModal from "./components/DisclosureModal";
import AgeVerificationModal from "./components/AgeVerificationModal";
import UpsellModal from "./components/UpsellModal";
import { ZODIAC_GLYPH, MbtiIcon, LifePathIcon } from "./components/traitIcons";
import { ZODIAC_FULL, MBTI_FULL, LIFE_PATH_FULL, STYLE_FULL, BadgeInfoModal, type BadgeInfo } from "./components/badgeInfo";
import { useChatState } from "./hooks/useChatState";
import { useCall } from "./hooks/useCall";
import { useFocusTrap } from "./hooks/useFocusTrap";
import CallOverlay from "./components/CallOverlay";
import { useBriefsState } from "./hooks/useBriefsState";
import { useSavedListingsState } from "./hooks/useSavedListingsState";
import { useModalVisibility } from "./hooks/useModalVisibility";
import { useQuestsState } from "./hooks/useQuestsState";
import { useAuthOnboardingState } from "./hooks/useAuthOnboardingState";
import { useDiscoverState } from "./hooks/useDiscoverState";
import { requestMotionPermission } from "./hooks/useDeviceTilt";
import SupportChat from "./components/SupportChat";
import PageTour from "./components/PageTour";
import { PAGE_TOURS, SCREEN_TRIGGERED_TOUR_IDS, tourSeenKey, type TourScreenId } from "./components/pageTourContent";
import { ScreenErrorBoundary } from "./components/ScreenErrorBoundary";
import { DiscoverScreen } from "./screens/DiscoverScreen";
import { FeedScreen } from "./screens/FeedScreen";
import { MusesScreen } from "./screens/MusesScreen";
import { ChatScreen } from "./screens/ChatScreen";
import { CollabScreen } from "./screens/CollabScreen";
import { CommunityScreen } from "./screens/CommunityScreen";
import QuestPanel from "./screens/QuestPanel";
import { SessionsScreen } from "./screens/SessionsScreen";
import { StudiosScreen } from "./screens/StudiosScreen";
import { NetworkScreen } from "./screens/NetworkScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { MenuModal } from "./screens/MenuModal";
import type { PublicProfileUser } from "./screens/PublicProfileScreen";
const PortfolioScreen = React.lazy(() => import("./screens/PortfolioScreen").then(m => ({ default: m.PortfolioScreen })));
const BtsScreen = React.lazy(() => import("./screens/BtsScreen").then(m => ({ default: m.BtsScreen })));
const CodexScreen = React.lazy(() => import("./screens/CodexScreen").then(m => ({ default: m.CodexScreen })));
const SubscriptionScreen = React.lazy(() => import("./screens/SubscriptionScreen").then(m => ({ default: m.SubscriptionScreen })));
const AnalyticsScreen = React.lazy(() => import("./screens/AnalyticsScreen").then(m => ({ default: m.AnalyticsScreen })));
const MatchGuideScreen = React.lazy(() => import("./screens/MatchGuideScreen").then(m => ({ default: m.MatchGuideScreen })));
const PublicProfileScreen = React.lazy(() => import("./screens/PublicProfileScreen").then(m => ({ default: m.PublicProfileScreen })));
import { CardPreloader } from "@/components/CardPreloader";
import SafetyCheckinModal from "./components/SafetyCheckinModal";
import PromptBankModal from "./components/PromptBankModal";
import ReferralPanel from "./components/ReferralPanel";
import ConnectPanel from "./components/ConnectPanel";
import PaymentHistory from "./components/PaymentHistory";
import { PROFILES, AESTHETICS, BEHIND_CAMERA, IN_FRONT_CAMERA, lookingForOptions, CITY_GEO, ZODIAC, ZE, CHINESE, CE, MBTI, LIFE_PATHS, ICEBREAKERS, BRIEFS, calcMatch, matchReasons, calcZodiac, calcChineseZodiac, calcLifePath, calcMbti, type Profile, type Match, type Screen, type LikeAnchor } from "./components/types";
import { useDiscoveryData } from "./hooks/useDiscoveryData";
import { useFeedData } from "./hooks/useFeedData";
import { useCommunityData } from "./hooks/useCommunityData";
import { useSessionData } from "./hooks/useSessionData";
import { useBriefsData } from "./hooks/useBriefsData";
import { useProfileData } from "./hooks/useProfileData";
import { normalizeCommunity, normalizeEvent, normalizeForumPost, normalizeBrief, normalizeSession, normalizeFeedPost } from "./hooks/normalizers";
import { AGE_VERIFICATION_VALID_DAYS, DEMO_MODE, MATCH_VARIANTS, OWNER_EMAIL, SUPPORT_EMAIL } from "./page-constants";
import type { Notification, Professional, ProfileReview, ProfileViewer, Quest, RawApiProfile, RawFeedPost, RawForumPost, ViewProfile } from "./page-models";

type DiscoveryProfile = typeof PROFILES[number] & {
  showDistance?: boolean;
  matchScore?: number;
  distanceMi?: number;
  matchReasons?: ReturnType<typeof matchReasons>;
  lat?: number;
  lng?: number;
};

const DEMO_MOMENTS = [
  { id: 9001, author: "Maya Chen", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100", img: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800", time: "12m ago", text: "Golden hour setup for tonight's shoot. The light is unreal right now 🌅", likes: 87, comments: 12 },
  { id: 9002, author: "Jordan Rivera", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100", img: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800", time: "28m ago", text: "Lens test on the new 85mm. Creamy bokeh for days 📷", likes: 143, comments: 21 },
  { id: 9003, author: "Sam Taylor", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100", img: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800", time: "1h ago", text: "WIP color grade. Pulling shadows, pushing the teal-orange split.", likes: 56, comments: 8 },
  { id: 9004, author: "Riley Patel", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100", img: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800", time: "2h ago", text: "Studio setup build-out. T-minus 3 days to the big shoot 🎬", likes: 231, comments: 34 },
  { id: 9005, author: "Avery Brooks", avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100", img: "https://images.unsplash.com/photo-1493514789931-586cb221d7a7?w=800", time: "3h ago", text: "Location scouting found this gem. Natural diffusers everywhere.", likes: 98, comments: 15 },
  { id: 9006, author: "Kai Tanaka", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100", img: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800", time: "4h ago", text: "First edit pass on the campaign. Client's gonna love this one.", likes: 312, comments: 41 },
];

const INITIAL_STORIES = [
  {id:501,author:"Maya Chen",avatar:"https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",type:"photo",text:"Behind the scenes of today's editorial shoot. The light was absolutely magical.",likes:87,comments:12,shares:3,time:"12m ago",img:"https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600"},
  {id:502,author:"Jordan Rivera",avatar:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",type:"photo",text:"Color grading session. Testing new LUTs for the indie film.",likes:45,comments:8,shares:2,time:"1h ago",img:"https://images.unsplash.com/photo-1535016120720-40c646be5580?w=600"},
  {id:503,author:"Sam Taylor",avatar:"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100",type:"photo",text:"Studio session vibes. New album art coming together.",likes:62,comments:9,shares:4,time:"3h ago",img:"https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=600"},
  {id:504,author:"Riley Patel",avatar:"https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",type:"photo",text:"Motion capture test for the music video. The visuals are insane.",likes:134,comments:21,shares:7,time:"5h ago",img:"https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600"},
  {id:505,author:"Avery Nguyen",avatar:"https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100",type:"photo",text:"Golden hour at the pier. Sometimes the best shots are the simplest.",likes:98,comments:15,shares:6,time:"8h ago",img:"https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600"},
];





/* ═══ COMPONENT ═══ */

export default function MusePageWrapper() {
  return <ErrorBoundary><MusePage /></ErrorBoundary>;
}

function MusePage() {
  const [screen, setScreen] = useState<Screen>("auth");
  const {
    authMode, setAuthMode,
    authEmail, setAuthEmail,
    authPass, setAuthPass,
    authName, setAuthName: _setAuthName,
    authLoading, setAuthLoading,
    formErrors, setFormErrors,
    authRemember, setAuthRemember,
    obStep, setObStep,
    obData, setObData,
    testScreen, setTestScreen,
    testBirthMonth, setTestBirthMonth,
    testBirthDay, setTestBirthDay,
    testBirthYear, setTestBirthYear,
    testMbtiAnswers, setTestMbtiAnswers,
    testLevels, setTestLevels,
    obSelects, setObSelects,
    obTestKey: _obTestKey, setObTestKey,
    obTestStep: _obTestStep, setObTestStep,
    obProfilePic, setObProfilePic,
    obConnectedSocials, setObConnectedSocials,
    obPortfolioItems, setObPortfolioItems,
    obPortfolioSlot, setObPortfolioSlot,
  } = useAuthOnboardingState();
  const [showPass, setShowPass] = useState(false);
  const [authUser, setAuthUser] = useState<{id:string;email:string;profile?:{id:string;[key:string]:unknown}}|null>(null);
  const [currentUser, setCurrentUser] = useState({ id:"you", name:"You", type:"Photographer", audience:"creative" as "creative" | "industry", exp:"New here", avatar:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop", stats:{matches:0,likes:0,superLikes:0,passes:0,bookingsCompleted:0,matchesReceived:0,messagesSent:0}, createdAt:Date.now(), referrals:0, portfolios:[] as {img:string;title:string;type:string}[], foundingTier:"" as string, proExpiresAt:"" as string, tier:"free", nsfw:false as boolean, status:"" as string });
  const [, _setSelectedPortfolio] = useState<unknown>(null);
  const [cardAlbums, setCardAlbums] = useState<{id:string;title:string;cover_url:string;access_level:string;photo_count:number}[]>([]);
  const [cardAlbumIdx, setCardAlbumIdx] = useState(0);
  const [cardAlbumPhotos, setCardAlbumPhotos] = useState<string[]>([]);
  const {
    currentIdx, setCurrentIdx,
    showMatchOverlay, setShowMatchOverlay,
    showConfetti, setShowConfetti,
    matchAnimVariant, setMatchAnimVariant,
    swipeDir, setSwipeDir,
    expandedMatchId, setExpandedMatchId,
    boostActive, setBoostActive,
    boostEnd, setBoostEnd,
    discoverSearch, setDiscoverSearch,
    mapView, setMapView,
    discoverLoading, setDiscoverLoading,
    dailyLikes, setDailyLikes,
    superLikes, setSuperLikes,
    screenFlash, setScreenFlash,
    rewindStack, setRewindStack,
    discoverSearchOpen, setDiscoverSearchOpen,
    filterStyles, setFilterStyles,
    filterScore, setFilterScore,
  } = useDiscoverState();
const { chatTarget, setChatTarget, chatInput, setChatInput, showMatchMenu, setShowMatchMenu, unmatchTarget, setUnmatchTarget, chatImages, setChatImages, typingTarget, setTypingTarget, themTyping: _themTyping, setThemTyping } = useChatState();
  const [showNsfw, setShowNsfw] = useState(false);
  const [showOnline, setShowOnline] = useState(true);
  const [showDistance, setShowDistance] = useState(true);
  // Per-field profile visibility toggles (Settings > Privacy & Safety).
  // Zodiac/age/MBTI/life-path/Chinese-zodiac are free for every user;
  // showMatchPercent is Premium-gated (see UpsellModal usage in
  // SettingsScreen) same as showOnline above.
  const [showZodiac, setShowZodiac] = useState(true);
  const [showAge, setShowAge] = useState(true);
  const [showMbti, setShowMbti] = useState(true);
  const [showLifePath, setShowLifePath] = useState(true);
  const [showChinese, setShowChinese] = useState(true);
  const [showMatchPercent, setShowMatchPercent] = useState(true);
  // (debug artifact removed)
  const [bootstrapped, setBootstrapped] = useState(false);
  // Defaults true — this is a dismissible "you have unlimited likes" badge
  // gated behind isUnlimited at the render site, not a modal that should
  // start hidden. Starting it false meant the badge (and its dismiss button)
  // could never actually appear for any Pro user.
  const [showUnlimitedBadge, setShowUnlimitedBadge] = useState(true);
  const [showLikeNote, setShowLikeNote] = useState(false);
  const [likeNoteText, setLikeNoteText] = useState("");
  const [noteTargetProfile, setNoteTargetProfile] = useState<Profile | null>(null);
  // Hinge-style anchored like: which specific prompt/photo (if any) the
  // in-progress Like + Note composer is attached to.
  const [likeNoteAnchor, setLikeNoteAnchor] = useState<LikeAnchor | null>(null);
  const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0);
   const [cardScrolled, setCardScrolled] = useState(false);
   const cardScrollRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const shuffleSeedRef = useRef<number>(Math.floor(Math.random() * 0x7fffffff));
  const [galleryView, setGalleryView] = useState<{ profileId: string | number; name: string; photos: string[]; idx: number } | null>(null);
  const [lightboxPhotos, setLightboxPhotos] = useState<string[]>([]);
  const [lightboxIdx, setLightboxIdx] = useState<number>(0);
  const [portfolioPhotoIdx, setPortfolioPhotoIdx] = useState(0);
  const [promptIdx, setPromptIdx] = useState(0);
   const { savedBriefs, setSavedBriefs, appliedBriefs, setAppliedBriefs, showPostBrief, setShowPostBrief, briefTitle, setBriefTitle, briefDesc, setBriefDesc, briefBudget, setBriefBudget, briefCat, setBriefCat, userBriefs, setUserBriefs } = useBriefsState();
   const { savedSessionIds, setSavedSessionIds, savedProfileIds, setSavedProfileIds } = useSavedListingsState();
  const {
    showFilterModal, setShowFilterModal,
    showEditProfile, setShowEditProfile,
    showShareProfile, setShowShareProfile,
    showReport, setShowReport,
    showNotificationsSettings, setShowNotificationsSettings,
    showConnectedAccounts, setShowConnectedAccounts,
    showTerms, setShowTerms,
    showPrivacy, setShowPrivacy,
    showGuidelines, setShowGuidelines,
    showDeleteConfirm, setShowDeleteConfirm,
    showNewPost, setShowNewPost,
    showLikesYou, setShowLikesYou,
    showDiscoveryPrefs, setShowDiscoveryPrefs,
    showHamburger, setShowHamburger,
    showDisclosureModal, setShowDisclosureModal,
    showAgeVerification, setShowAgeVerification,
    showSafetyCheckin, setShowSafetyCheckin,
    showPromptBank, setShowPromptBank,
    showReferral, setShowReferral,
    showConnect, setShowConnect,
    showPaymentHistory, setShowPaymentHistory,
    showQuests, setShowQuests,
    showDailyLogin, setShowDailyLogin,
    showAgeGate, setShowAgeGate,
    showIntentPicker, setShowIntentPicker,
    showStories, setShowStories: _setShowStories,
    showEmojiPicker, setShowEmojiPicker,
  } = useModalVisibility();
  // Focus traps for all overlay modals
  const reportTrap = useFocusTrap(showReport, () => setShowReport(false));
  const termsTrap = useFocusTrap(showTerms, () => setShowTerms(false));
  const privacyTrap = useFocusTrap(showPrivacy, () => setShowPrivacy(false));
  const guidelinesTrap = useFocusTrap(showGuidelines, () => setShowGuidelines(false));
  const deleteConfirmTrap = useFocusTrap(showDeleteConfirm, () => setShowDeleteConfirm(false));
  const discoveryPrefsTrap = useFocusTrap(showDiscoveryPrefs, () => setShowDiscoveryPrefs(false));
  useFocusTrap(showAgeVerification, () => setShowAgeVerification(false));
  const likeNoteTrap = useFocusTrap(showLikeNote, () => setShowLikeNote(false));
  const shareProfileTrap = useFocusTrap(showShareProfile, () => setShowShareProfile(false));
  const intentPickerTrap = useFocusTrap(showIntentPicker, () => setShowIntentPicker(false));
  useFocusTrap(showFilterModal, () => setShowFilterModal(false));
  const unmatchTrap = useFocusTrap(!!unmatchTarget, () => setUnmatchTarget(null));
  const editProfileTrap = useFocusTrap(showEditProfile, () => setShowEditProfile(false));
  // Which screen's first-visit tutorial (if any) is currently open — see
  // the "Per-page tutorials" effect below.
  const [activePageTour, setActivePageTour] = useState<TourScreenId | null>(null);
  const [pendingNsfw, setPendingNsfw] = useState(false);
  const [userTier, setUserTier] = useState<string>("free");
  const [liveProfessionals, setLiveProfessionals] = useState<Professional[] | null>(null);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editLoc, setEditLoc] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editType, setEditType] = useState("");
  const [editCustomTypePending, setEditCustomTypePending] = useState(false);
  const [editLooking, setEditLooking] = useState<string[]>([]);
  const [editNsfw, setEditNsfw] = useState(false);
  const [editMediaKit, setEditMediaKit] = useState("");
  const [shareTarget, setShareTarget] = useState<{id:number|string;text:string;img:string;author:string} | null>(null);
  const [reportTarget, setReportTarget] = useState<{id:number|string;type:string;name:string} | null>(null);
  // Settings > Privacy & Safety > Blocked Users sub-page open/closed. This was
  // declared but never wired into SettingsScreen (underscore-prefixed as
  // "intentionally unused"), which made the Blocked Users button in Settings
  // a dead click — it toggled a default no-op prop instead of real state.
  const [showBlockedUsersPanel, setShowBlockedUsersPanel] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({match:true,message:true,brief:true,like:true});
  const [pushEnabled, setPushEnabled] = useState<boolean>(false);
  const [connTab, _setConnTab] = useState<"community"|"events"|"sessions"|"forum"|"feed"|"professional">("community");
  const [portfolioTab, setPortfolioTab] = useState<"all"|"portrait"|"landscape"|"sets">("all");
  const [commTab, setCommTab] = useState<"groups"|"events">("groups");
  const [sessTab, setSessTab] = useState<"sessions"|"bookings"|"requests">(() => viewerSideOf(currentUser) === "industry" ? "bookings" : "sessions");
  // The lazy init above runs before the server profile arrives (type starts
  // as the "Photographer" placeholder), so re-align once when the real type
  // lands — duality Phase 0's role-aware default.
  const sessTypeRef = useRef(currentUser?.type);
  useEffect(() => {
    const t = currentUser?.type;
    if (t && t !== sessTypeRef.current) {
      sessTypeRef.current = t;
      setSessTab(viewerSide(t) === "industry" ? "bookings" : "sessions");
    }
  }, [currentUser?.type]);
  const [_networkOpenTab, _setNetworkOpenTab] = useState<"pros"|"forum"|undefined>(undefined);
  const [forumSort, setForumSort] = useState<"hot"|"new"|"top">("hot");
  const [forumCategory, _setForumCategory] = useState<string>("all");
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostBody, setNewPostBody] = useState("");
  const [expandedPost, setExpandedPost] = useState<number|null>(null);
  const [commentText, setCommentText] = useState("");
  const [_replyingTo, setReplyingTo] = useState<number | null>(null);
  const [feedText, setFeedText] = useState("");
  const [feedMedia, setFeedMedia] = useState<string[]>([]);
  const [feedPostsStatic, setFeedPostsStatic] = useState<{id:number;author:string;avatar:string;type:string;text:string;likes:number;comments:number;shares:number;time:string;liked:boolean;saved:boolean;img?:string}[]>([{id:401,author:"Maya Chen",avatar:"https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",type:"photo",text:"Golden hour never gets old. Shot this at El Matador Beach last weekend.",likes:234,comments:18,shares:5,time:"2h ago",img:"https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600",liked:false,saved:false},{id:402,author:"Jordan Rivera",avatar:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",type:"text",text:"Just wrapped principal photography on a 30-min short. 14-hour days for 12 days straight. The footage is incredible!",likes:189,comments:32,shares:12,time:"5h ago",liked:false,saved:false},{id:403,author:"Sam Taylor",avatar:"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100",type:"photo",text:"New album art I designed. Surreal dreamlike aesthetic.",likes:312,comments:24,shares:8,time:"8h ago",img:"https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600",liked:false,saved:false},{id:404,author:"Riley Patel",avatar:"https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",type:"photo",text:"Motion graphics reel. 6 months of work in 90 seconds.",likes:567,comments:45,shares:23,time:"1d ago",liked:false,saved:false}]);
  const [feedFilter, setFeedFilter] = useState<"all"|"photos"|"videos"|"text"|"bts">("all");
  const [museCat, setMuseCat] = useState<"all"|"tfp"|"paid"|"opencall"|"concept">(() => viewerSideOf(currentUser) === "industry" ? "paid" : "all");
  type ToastType = "info" | "success" | "error";
  const [toastMsg, setToastMsg] = useState<{ msg: string; onTap?: () => void; type?: ToastType } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const editAvatarInputRef = useRef<HTMLInputElement>(null);

  // Personality Discovery
  const [_obStep10Known, _setObStep10Known] = useState<"yes"|"no"|"test"|null>(null);
  const portfolioInputRef = useRef<HTMLInputElement>(null);
  const [matchesView, setMatchesView] = useState<"list"|"grid">("list");
  const [messageRequests, setMessageRequests] = useState<unknown[]>([]);
  const [profileViews, setProfileViews] = useState(0);
  const [profileViewers, setProfileViewers] = useState<{name:string;avatar:string;time:string}[]>([]);
  const [showStory, setShowStory] = useState<number|null>(null);
  const [theme, setTheme] = useState<"lasunset"|"deepspace"|"nebula"|"deepsea"|"cinder"|"boreal"|"sunrise"|"daylight"|"sky"|"rose"|"meadow"|"frost">("lasunset");
  const [activityFeed, setActivityFeed] = useState<{id:number;type:string;from:string;avatar:string;text:string;time:string;read:boolean}[]>([]);
  const [serverNotifCount, setServerNotifCount] = useState(0);
  const [discoveryPrefs, setDiscoveryPrefs] = useState<{ageMin:number;ageMax:number;distance:number;gender:string}>({ageMin:18,ageMax:50,distance:50,gender:"all"});
  const [savedSearches, setSavedSearches] = useState<{id:string;name:string;query?:string;filters?:Record<string, unknown>}[]>([]);
  const [myGeo, setMyGeo] = useState<{lat:number;long:number;city:string;state:string;requiresIdVerification:boolean}|null>(null);
  const [supportOpen, setSupportOpen] = useState(false);

// ═══ TRUST & SAFETY STATE ═══
  const [disclosureTarget, setDisclosureTarget] = useState<{id:string;name:string} | null>(null);
  const [disclosureBookingId, setDisclosureBookingId] = useState<string | undefined>();
  const [existingDisclosure, _setExistingDisclosure] = useState<Record<string, unknown> | null>(null);
  const [ageVerified, setAgeVerified] = useState(false);
  const [verificationExpiringSoon, setVerificationExpiringSoon] = useState(false);
  // Dismiss state for the top-of-app verification banner (Torreé feedback,
  // 2026-09-08): it used to be a permanent, non-dismissible strip that
  // pushed every screen's header down and, on a real device, sat flush
  // against the status bar with no safe-area padding — reading as "blocked
  // by phone UI." Dismissing it here is presentation-only: paid-feature
  // gating below (search for "hasPayment && !ageVerified") checks the same
  // ageVerified state directly and is unaffected by this flag. The status
  // is never truly lost — Settings > Privacy & Safety carries a permanent
  // "Identity Verification" row with the same live status.
  const [verificationBannerDismissed, setVerificationBannerDismissed] = useState(false);
  // M11: dismissing used to unmount the banner instantly (no exit animation).
  // "closing" keeps it mounted for one slide-down cycle before the real
  // dismiss flips verificationBannerDismissed and unmounts it for good.
  const [verificationBannerClosing, setVerificationBannerClosing] = useState(false);
  // D1: persist dismiss across reloads (same pattern as muse_tour_seen_*).
  useEffect(() => {
    try {
      if (safeGetItem("muse_verify_banner_dismissed") === "1") setVerificationBannerDismissed(true);
    } catch { /* storage unavailable — show banner */ }
  }, []);
  const dismissVerificationBanner = () => {
    setVerificationBannerClosing(true);
    setTimeout(() => {
      setVerificationBannerDismissed(true);
      setVerificationBannerClosing(false);
      try { safeSetItem("muse_verify_banner_dismissed", "1"); } catch { /* best-effort */ }
    }, 320);
  };
  const [pendingDisclosureConfirm, setPendingDisclosureConfirm] = useState<string | null>(null);
  const [pendingDisclosureCreate, setPendingDisclosureCreate] = useState<Record<string, unknown> | null>(null);
  const {
    claimableQuests, setClaimableQuests,
    nearQuests, setNearQuests,
    topQuests, setTopQuests,
    loginStreak, setLoginStreak,
    weeklyLogins, setWeeklyLogins,
  } = useQuestsState();

  useEffect(() => {
    try {
        const c = safeGetItem("muse_open_count");
        const count = c ? parseInt(c) + 1 : 1;
        safeSetItem("muse_open_count", String(count));
      } catch (e) { console.debug("[page.tsx] open count storage ignore", e); }
  }, []);

  const [viewProfile, setViewProfileRaw] = useState<ViewProfile | null>(null);
  const [badgeInfo, setBadgeInfo] = useState<BadgeInfo | null>(null);
  const [viewProfilePhotoIdx, setViewProfilePhotoIdx] = useState(0);
  // Reset photo carousel when a new profile is opened
  // Attaches the verified session token (from localStorage) to /api/muse
  // POST calls so the server can authenticate writes. Falls back to a plain
  // fetch for GET/other endpoints and for /api/muse/auth (which manages its own auth).
  // Declared before setViewProfile (and any other useCallback that lists apiFetch
  // in deps) — block-scoped const would otherwise TDZ at line ~429.
  const apiFetch = useCallback(async (url: string, opts: RequestInit = {}) => {
    const res = await authFetch(url, opts);
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res;
  }, []);

  useEffect(() => { setViewProfilePhotoIdx(0); }, [viewProfile?.id]);
  // Tracked wrapper — counts one view per real profile per session (duality
  // stats plumbing); demo/numeric ids are skipped server-side anyway.
  const viewedSessionRef = useRef<Set<string>>(new Set());
  const setViewProfile = useCallback((p: ViewProfile | null) => {
    setViewProfileRaw(p);
    if (!p) return;
    try {
      const id = String(p?.id ?? "");
      if (!id || !authUser) return;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(id)) return;
      if (viewedSessionRef.current.has(id)) return;
      viewedSessionRef.current.add(id);
      apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "track-view", target_id: id }) }).catch(() => {});
    } catch (e) { console.debug("[page.tsx] viewProfile tracking ignore", e); }
  }, [apiFetch, authUser]);
  const viewProfileTrap = useFocusTrap(!!viewProfile, () => setViewProfileRaw(null));
  const shareTargetTrap = useFocusTrap(!!shareTarget, () => setShareTarget(null));
  const [viewProfileReviews, setViewProfileReviews] = useState<ProfileReview[]>([]);
  const [revealedNsfw, setRevealedNsfw] = useState<Set<string>>(new Set());
  const [publicProfileUser, setPublicProfileUser] = useState<PublicProfileUser | null>(null);
  const [hamburgerScreen, setHamburgerScreen] = useState<string>("");
   const [blockTarget, setBlockTarget] = useState<{id:string;name:string}|null>(null);
   const blockTrap = useFocusTrap(!!blockTarget, () => setBlockTarget(null));
   const [hydrated, setHydrated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadStateRef = useRef(false);
  const sessionAppliedRef = useRef(false);
  // Guards against a real production hang: applySession() calls
  // supabase.auth.setSession() to keep the SDK's own session in sync (see
  // that function's comments), but setSession() itself fires the
  // onAuthStateChange "SIGNED_IN" listener below — which used to call
  // applySession() again unconditionally. If refreshSession() inside
  // applySession keeps failing with the same (e.g. already-rotated) refresh
  // token, every retry calls setSession() again, which re-fires SIGNED_IN,
  // which calls applySession() again — an unbounded loop with no thrown
  // error (every step is inside a .catch(()=>{})), pegging the main thread
  // and freezing the tab. Set right before each of applySession's own
  // internal setSession() calls; the listener below checks and clears it so
  // that specific self-triggered SIGNED_IN echo doesn't re-enter
  // applySession. A real external SIGNED_IN (actual login, OAuth) never
  // sets this, so it's unaffected.
  const syncingSdkSessionRef = useRef(false);
  const _shuffleSeed = useRef(Math.floor(Math.random() * 100000));
  const _matchSwipeRef = useRef<{id:string;startX:number;el:HTMLElement|null}>({id:"",startX:0,el:null});
  const [_matchSwiping, setMatchSwiping] = useState<{id:string;offset:number} | null>(null);
   const [realtimeStatus, setRealtimeStatus] = useState<"connecting"|"connected"|"disconnected">("connecting");
   const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendTypingRef = useRef<() => void>(() => {});
  const dragRef = useRef<{startX:number;startY:number;active:boolean;relY:number;startTime:number;el:HTMLElement|null;axis:"x"|"y"|null}>({startX:0,startY:0,active:false,relY:0,startTime:0,el:null,axis:null});
  const likeLabelRef = useRef<HTMLDivElement>(null);
  const nopeLabelRef = useRef<HTMLDivElement>(null);
  const superLabelRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const dragValuesRef = useRef({x:0,y:0,opacity:0});

  const confettiPieces = useMemo(() => Array.from({length:40}).map((_,i)=>({
    left: Math.random()*100+"%",
    width: (Math.random()*6+4)+"px",
    height: (Math.random()*8+6)+"px",
    background: ["var(--gold)","var(--amber)","var(--pink)","var(--lavender)","var(--coral)","var(--mint)","#fff"][i%7],
    animationDuration: (Math.random()*2+2)+"s",
    animationDelay: Math.random()*1.5+"s",
    "--drift": (Math.random()*120-60)+"px",
    "--rot": (Math.random()*720)+"deg"
  })), []);

  const handleImgError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const el = e.currentTarget;
    if (el.dataset.fallback) return;
    el.dataset.fallback = "1";
    const initial = (el.alt || "").trim().charAt(0).toUpperCase();
    el.style.background = "linear-gradient(135deg, #2a1a3e 0%, #1a0a2e 100%)";
    el.style.display = "flex";
    el.style.alignItems = "center";
    el.style.justifyContent = "center";
    el.style.color = "rgba(255,215,0,0.6)";
    el.style.fontSize = initial ? "1.4em" : "1.8em";
    el.style.fontWeight = "700";
    el.style.fontFamily = "'Playfair Display', serif";
    el.textContent = initial || "\uD83D\uDCF7";
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
    // MutationObserver catches <img> mounted with an empty/missing or broken src
    // (blank or "undefined") which never fires an error event. Reuse the same
    // fallback treatment when we detect one app-wide.
    const sweepImg = (img: HTMLImageElement) => {
      if (img.dataset.fallback) return;
      const src = (img.getAttribute("src") || "").trim().toLowerCase();
      const broken = !src || src === "undefined" || src === "null" || src === "none";
      if (broken) {
        img.dataset.fallback = "1";
        img.style.background = "linear-gradient(135deg, #FF6B9D 0%, #C86BFF 50%, #FFB366 100%)";
        img.style.display = "flex";
        img.style.alignItems = "center";
        img.style.justifyContent = "center";
        img.style.color = "#fff";
        img.style.fontSize = "1.6em";
        img.style.fontWeight = "700";
        img.style.fontFamily = "'Playfair Display', serif";
        img.alt = img.alt?.trim().charAt(0) || "👤";
        img.textContent = img.alt || "👤";
        img.removeAttribute("src");
      }
    };
    // Wrapped in createSafeObserver (rate-based circuit breaker) as
    // defense-in-depth: this callback is already guarded against
    // self-retriggering (img.dataset.fallback check-before-mutate), but it
    // still does a subtree querySelectorAll("img") on every childList
    // mutation anywhere in the app. A future edit that removes the guard,
    // or an unrelated part of the app generating very high-frequency DOM
    // churn, would otherwise be able to reproduce the same class of
    // main-thread-freezing storm found in the "waves" observer below —
    // this makes that fail safe (observer disconnects) instead of freezing
    // the tab. See lib/safe-observer.ts for why this can't be caught once
    // it happens, only prevented.
    const mo = createSafeObserver((muts) => {
      for (const m of muts) {
        if (m.type === "childList") m.addedNodes.forEach(n => { if (n.nodeType === 1 && (n as Element).querySelectorAll) (n as Element).querySelectorAll("img").forEach(img => sweepImg(img as HTMLImageElement)); });
        if (m.type === "attributes" && m.target.nodeName === "IMG") sweepImg(m.target as HTMLImageElement);
      }
    }, { label: "img-fallback-sweep" });
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
    document.querySelectorAll<HTMLImageElement>("img").forEach(sweepImg);
    return () => { document.removeEventListener("error", onImgError, true); mo.disconnect(); };
  }, []);

  // iOS 13+ only fires deviceorientation events after DeviceOrientationEvent.
  // requestPermission() is called from inside a direct user-gesture handler.
  // Rather than gate that behind a dedicated settings toggle, ask on the
  // app's very first touch — the gyroscope-driven tilt effects (background
  // orbs, Discover card hero) are ambient polish, not a feature anything
  // depends on, so a silent one-time request here (no dialog if the platform
  // doesn't need one — Android/desktop) is enough. {once:true} handles both
  // "asked, granted" and "asked, denied" — never asks twice in a session.
  useEffect(() => {
    const onFirstTouch = () => requestMotionPermission();
    document.addEventListener("pointerdown", onFirstTouch, { once: true, passive: true });
    return () => document.removeEventListener("pointerdown", onFirstTouch);
  }, []);

  const { liveProfiles, setLiveProfiles, matches, setMatches, likedBy, setLikedBy, blockedUsers, setBlockedUsers, matchStreak, setMatchStreak } = useDiscoveryData({ apiFetch, authFetch, profileId: authUser?.profile?.id ?? null });
  // Ref to avoid stale closure on rapid swipes — always holds latest matches
  const matchesRef = useRef(matches);
  useEffect(() => { matchesRef.current = matches; }, [matches]);
  const { liveFeed, setLiveFeed, feedPosts, setFeedPosts, stories, setStories, liveForum, setLiveForum, forumPosts, setForumPosts } = useFeedData({ authFetch, profileId: authUser?.profile?.id ?? null, initialStories: INITIAL_STORIES });
  const { liveCommunities, setLiveCommunities, liveEvents, setLiveEvents, rsvpdEvents, setRsvpdEvents } = useCommunityData({ authFetch, profileId: authUser?.profile?.id ?? null });
  const { myBookings, setMyBookings, liveSessions, setLiveSessions, bookingReminders } = useSessionData({ authFetch, profileId: authUser?.profile?.id ?? null });
  const { liveBriefs, setLiveBriefs } = useBriefsData({ authFetch, profileId: authUser?.profile?.id ?? null });
  const { myStats, setMyStats: _setMyStats, safetyCheckins, setSafetyCheckins, safetyProfile, setSafetyProfile, promptBankData, setPromptBankData: _setPromptBankData, promptResponses, setPromptResponses } = useProfileData({ apiFetch, authFetch, profileId: authUser?.profile?.id ?? null });

  // ── Calls (LiveKit): ringing + in-call state for the whole app ──
  const { incoming: incomingCall, active: activeCall, error: callError, setError: setCallError, startCall, acceptCall, declineCall, endCall, leaveVoicemail, fetchHistory: fetchCallHistory, startRoom, recording: callRecording, peerRecording: callPeerRecording, startRecording: startCallRecording, stopRecording: stopCallRecording } = useCall(authUser?.profile?.id ?? null);

  // Load a profile's reviews when the profile modal opens (reviews are
  // written via submit-review but were previously never read back).
  useEffect(() => {
    if (!viewProfile?.id) { setViewProfileReviews([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithTimeout(`/api/muse?type=reviews&profile_id=${encodeURIComponent(viewProfile.id)}`);
        const d = await res.json();
        if (!cancelled) setViewProfileReviews(d.reviews || []);
      } catch { if (!cancelled) setViewProfileReviews([]); }
    })();
    return () => { cancelled = true; };
  }, [viewProfile?.id]);

  // Saved searches: hydrate whenever the Discovery Preferences modal opens so
  // the list reflects the latest server state (save/delete both happen inside
  // that modal). Non-fatal on failure — the modal still works without it.
  useEffect(() => {
    if (!showDiscoveryPrefs) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await apiFetch("/api/muse?type=saved-search-list");
        const d = await r.json();
        if (!cancelled) setSavedSearches(Array.isArray(d.searches) ? d.searches : []);
      } catch { if (!cancelled) setSavedSearches([]); }
    })();
    return () => { cancelled = true; };
  }, [showDiscoveryPrefs, apiFetch]);

  // Pulls real data from the API on mount; silently keeps the static demo
  // arrays when the table is empty or the request fails (graceful fallback).
  const bootstrapData = useCallback(async () => {    try {
      let token = "";
      try { token = JSON.parse(localStorage.getItem("muse_user") || "{}")?.access_token || ""; } catch { console.debug("[muse] ignored unreadable persisted session"); }
      // Match recommendations require auth — skip when there's no session yet
      // (avoids a 401 on the pre-login boot).
      const matchPromise = token
        ? apiFetch("/api/muse/match?limit=50").then(r => r.ok ? r.json() : null).catch(() => null)
        : Promise.resolve(null);
      // Dedup: useFeedData/useCommunityData/useBriefsData/useSessionData already
      // fetch briefs/feed/forum/events/communities/sessions and write the SAME
      // setters. Skip the redundant request when the hook has already populated
      // state (avoids ~6 duplicate GETs per load). If the hook is profileId-
      // gated and hasn't fired yet, the fetch still runs as a safe fallback.
      //
      // Live-verified regression (this session): FeedScreen does NOT actually
      // render from `liveFeed` — it renders `feedPosts` (this effect's own
      // mapped output) plus `feedPostsStatic` when DEMO_MODE is on. `liveFeed`
      // is only used there for id-matching (isLivePost) and dedup-by-text, not
      // as the displayed list. useFeedData's separate profileId-gated effect
      // DOES populate `liveFeed` independently — so once that resolved first,
      // this dedup's `liveFeed.length>0` check skipped the fetch that's the
      // ONLY thing that ever populates `feedPosts`, leaving the Feed screen
      // permanently blank (confirmed live: no `type=feed` GET fired at all,
      // and with DEMO_MODE now gating off feedPostsStatic too there was no
      // fallback content either). Fixed by keying the skip on `feedPosts`
      // alone — the thing actually rendered — not on `liveFeed`.
      const skipWrap = (already: boolean, type: string) => already ? Promise.resolve(null) : apiFetch("/api/muse?type=" + type).then(r => r.ok ? r.json() : null).catch(() => null);
      const [matchData, briefs, feed, forum, events, communities, sessions, professionals] = await Promise.all([
        matchPromise,
        skipWrap((liveBriefs?.length ?? 0) > 0, "briefs"),
        skipWrap((feedPosts?.length ?? 0) > 0, "feed"),
        skipWrap((liveForum?.length ?? 0) > 0 || (forumPosts?.length ?? 0) > 0, "forum"),
        skipWrap((liveEvents?.length ?? 0) > 0, "events"),
        skipWrap((liveCommunities?.length ?? 0) > 0, "communities"),
        skipWrap((liveSessions?.length ?? 0) > 0, "sessions"),
        apiFetch("/api/muse?type=professionals").then(r => r.ok ? r.json() : null).catch(() => null),
      ]);
      if (matchData?.profiles?.length) setLiveProfiles((matchData.profiles as RawApiProfile[]).map((p) => ({
        id: p.id, name: p.name || "Creative", img: p.avatar || initialsAvatarUrl(p.name || "Creative", p.id), type: p.type || "artist",
        bio: p.bio || "", loc: p.loc || "Unknown", styles: Array.isArray(p.styles) ? p.styles : [],
        score: p.matchScore || 70, nsfw: !!p.nsfw, looking: Array.isArray(p.looking) ? p.looking : [],
        zodiac: p.zodiac || "", chinese: p.chinese || "", mbti: p.mbti || "", lifePath: p.life_path || "",
        photos: Array.isArray(p.photos) ? p.photos : [], collabs: p.collabs || 0, verified: !!p.verified,
        matchScore: p.matchScore, rulesScore: p.rulesScore, cosineScore: p.cosineScore,
        showDistance: p.showDistance !== false,
        side: p.side || viewerSide(p.type),
      })));
      if (briefs?.briefs?.length) setLiveBriefs(briefs.briefs.map(normalizeBrief));
      if (feed?.posts?.length) {
        // Bug fix: this used to call setLiveFeed(feed.posts) with the raw,
        // un-normalized DB rows (author still nested under `author_id`
        // instead of a flat `author` string). useFeedData.ts's own
        // profileId-gated fetch normalizes the same endpoint properly —
        // whichever of the two effects resolved last silently won, so
        // depending on timing the feed could render every post with a
        // blank author name/avatar, and the feedPosts dedup below (matched
        // by `.author`) would fail to match against the raw rows, showing
        // every post twice. Normalize here too so both effects always
        // agree on the same shape regardless of which resolves last.
        setLiveFeed((feed.posts as RawFeedPost[]).map((p) => normalizeFeedPost(p, authUser?.profile?.id ?? null)));
        setFeedPosts((feed.posts as RawFeedPost[]).map((p, i: number) => ({
          id: 100000 + i,
          // Real DB id — synthetic display ids break server-side lookups
          // (reports pointed at posts no moderator could ever resolve).
          rid: p.id, author: p.author_id?.name || "Muse", avatar: p.author_id?.avatar || "",
          type: p.img ? "photo" : "text", text: p.text || "", likes: p.likes || 0, comments: p.comments || 0,
          shares: p.shares || 0, time: p.created_at ? new Date(p.created_at).toLocaleString() : "Just now",
          img: p.img || "", liked: false, saved: false
        })));
      }
      if (forum?.posts?.length) {
        setLiveForum(forum.posts.map(normalizeForumPost));
        setForumPosts((forum.posts as RawForumPost[]).map((p, i: number) => ({
          id: 100000 + i, title: p.title || "", body: p.body || "", author: p.author_id?.name || "Creative",
          avatar: p.author_id?.avatar || "", votes: p.votes || 0, comments: Array.isArray(p.comments) ? p.comments : [],
          cat: p.cat || "General", time: p.created_at ? new Date(p.created_at).toLocaleString() : "Just now", pinned: false
        })));
      }
      if (events?.events?.length) setLiveEvents(events.events.map(normalizeEvent));
      if (communities?.communities?.length) setLiveCommunities(communities.communities.map(normalizeCommunity));
      if (sessions?.sessions?.length) setLiveSessions(sessions.sessions.map(normalizeSession));
      if (professionals?.professionals?.length) setLiveProfessionals(professionals.professionals as Professional[]);
    } catch { console.debug("[muse] initial recommendation refresh failed"); }
    setBootstrapped(true);
    setDiscoverLoading(false);
  }, [apiFetch, authUser?.profile?.id, feedPosts?.length, forumPosts?.length, liveBriefs?.length, liveCommunities?.length, liveEvents?.length, liveForum?.length, liveSessions?.length, setDiscoverLoading, setFeedPosts, setForumPosts, setLiveBriefs, setLiveCommunities, setLiveEvents, setLiveFeed, setLiveForum, setLiveProfiles, setLiveSessions]);

  // ─── PERSISTENCE ───
  const STORAGE_KEY = "muse_v1";
  const STATE_VERSION = 2;
  const lastSyncRef = useRef(0);
  const saveState = useCallback(() => {
    try {
      const MAX_ITEMS = 50;
      const data = {
        v: STATE_VERSION,
        currentUser, obData, obStep, matches: matches.slice(-MAX_ITEMS), dailyLikes, superLikes,
        savedBriefs, appliedBriefs, savedSessionIds, savedProfileIds, userBriefs: userBriefs.slice(-MAX_ITEMS), blockedUsers, notifPrefs,
        obConnectedSocials, showNsfw, showOnline, showDistance, showZodiac, showAge, showMbti, showLifePath, showChinese, showMatchPercent, rsvpdEvents, forumPosts: forumPosts.slice(-MAX_ITEMS), feedPosts: feedPosts.slice(-MAX_ITEMS),
        testLevels, obSelects, obProfilePic, obPortfolioItems,         likedBy: likedBy.slice(-MAX_ITEMS),
        profileViews: DEMO_MODE ? profileViews : 0, profileViewers: DEMO_MODE ? profileViewers.slice(-20) : [], stories: stories.slice(-20), theme, activityFeed: activityFeed.slice(-MAX_ITEMS),
        discoveryPrefs, chatImages: Object.fromEntries(Object.entries(chatImages).slice(-20).map(([k,v]) => [k, v.slice(-20)])), screen, filterStyles, filterScore,
        searchQuery, connTab, museCat, authUser: authRemember ? authUser : null, chatTarget
      };
      safeSetItem(STORAGE_KEY, JSON.stringify(data));
      // Throttle the server sync to once per 30s (was every saveState tick) — big load reduction at scale.
      const now = Date.now();
      if (now - lastSyncRef.current > 30000) {
        lastSyncRef.current = now;
        apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "sync", matches, feedPosts, forumPosts, userBriefs, stats: currentUser.stats }) }).catch(() => {});
      }
    } catch { console.debug("[muse] persisted client state could not be saved"); }
  }, [apiFetch, currentUser,obData,obStep,matches,dailyLikes,superLikes,savedBriefs,appliedBriefs,savedSessionIds,savedProfileIds,userBriefs,blockedUsers,notifPrefs,obConnectedSocials,showNsfw,showOnline,showDistance,showZodiac,showAge,showMbti,showLifePath,showChinese,showMatchPercent,rsvpdEvents,forumPosts,feedPosts,testLevels,obSelects,obProfilePic,obPortfolioItems,likedBy,profileViews,profileViewers,stories,theme,activityFeed,discoveryPrefs,chatImages,screen,filterStyles,filterScore,searchQuery,connTab,museCat,authUser,authRemember,chatTarget]);

  const loadState = useCallback(async () => {
    try {
      const raw = await safeGetItemAsync(STORAGE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      // Schema version gate: discard stale/future schemas to avoid corrupting hydration.
      if (typeof d.v !== "number" || d.v > STATE_VERSION) {
        safeRemoveItem(STORAGE_KEY);
        return;
      }
      if (d.currentUser) setCurrentUser(prev => ({ ...prev, ...d.currentUser, tier: "free", foundingTier: "", proExpiresAt: "", stats: { ...prev.stats, ...(d.currentUser.stats || {}) }, portfolios: Array.isArray(d.currentUser.portfolios) ? d.currentUser.portfolios : (prev.portfolios || []) }));
      if (d.obData) setObData(d.obData);
      if (d.obStep) setObStep(d.obStep);
      if (d.authUser) setAuthUser(d.authUser);
      if (d.matches) setMatches(d.matches.map((m: Match & { target_id?: Partial<Profile> & { last_seen_at?: string } }) => {
        const t: Partial<Profile> & { last_seen_at?: string } = m.target_id || {};
        const lastSeen = t.last_seen_at || null;
        const online = !!lastSeen && (Date.now() - new Date(lastSeen).getTime()) < 5 * 60 * 1000;
        return { ...m, name: t.name || m.name, img: t.avatar || m.img, type: t.type || m.type, bio: t.bio || m.bio, location: t.loc || m.location, online, lastSeen, nsfw: t.nsfw || m.nsfw };
      }));
      if (!d.matches || d.matches.length === 0) {
        // DEMO_MODE only: never seed a real user's Matches list with fabricated
        // profiles (ARCANA/AUDREY/CHER) in live production. An empty matches list
        // shows the real empty state instead of 6 invented matches.
        if (DEMO_MODE) {
          const demoMatches = PROFILES.slice(0, 6).map((p) => ({
            id: p.id, name: p.name, img: p.img, type: p.type,
            bio: p.bio, location: p.loc, booked: false, online: !!p.online,
            messages: [], _demo: true
          }));
          setMatches(demoMatches);
        } else {
          setMatches([]);
        }
      }
      if (d.dailyLikes!=null) setDailyLikes(d.dailyLikes);
      if (d.superLikes!=null) setSuperLikes(d.superLikes);
      if (d.savedBriefs) setSavedBriefs(d.savedBriefs);
      if (d.appliedBriefs) setAppliedBriefs(d.appliedBriefs);
      if (d.savedSessionIds) setSavedSessionIds(d.savedSessionIds);
      if (d.savedProfileIds) setSavedProfileIds(d.savedProfileIds);
      if (d.userBriefs) setUserBriefs(d.userBriefs);
      if (d.blockedUsers) setBlockedUsers(d.blockedUsers);
      if (d.notifPrefs) setNotifPrefs(d.notifPrefs);
      if (d.obConnectedSocials) setObConnectedSocials(d.obConnectedSocials);
      if (d.showNsfw!=null) setShowNsfw(d.showNsfw);
      if (d.showOnline!=null) setShowOnline(d.showOnline);
      if (d.showDistance!=null) setShowDistance(d.showDistance);
      if (d.showZodiac!=null) setShowZodiac(d.showZodiac);
      if (d.showAge!=null) setShowAge(d.showAge);
      if (d.showMbti!=null) setShowMbti(d.showMbti);
      if (d.showLifePath!=null) setShowLifePath(d.showLifePath);
      if (d.showChinese!=null) setShowChinese(d.showChinese);
      if (d.showMatchPercent!=null) setShowMatchPercent(d.showMatchPercent);
      if (d.rsvpdEvents) setRsvpdEvents(d.rsvpdEvents);
      if (d.forumPosts) setForumPosts(d.forumPosts);
      if (d.feedPosts) setFeedPosts(d.feedPosts);
      if (d.testLevels) setTestLevels(d.testLevels);
      if (d.obSelects) setObSelects(d.obSelects);
      if (d.obProfilePic) setObProfilePic(d.obProfilePic);
      if (d.obPortfolioItems) setObPortfolioItems(d.obPortfolioItems);
      if (d.likedBy) setLikedBy(d.likedBy);
      if (DEMO_MODE) {
        if (d.profileViews) setProfileViews(d.profileViews);
        if (d.profileViewers) setProfileViewers(d.profileViewers);
      }
      if (d.stories && d.stories.length) setStories(d.stories);
      else setStories(DEMO_MOMENTS);
      if (d.theme) setTheme((["lasunset","deepspace","nebula","deepsea","cinder","boreal","sunrise","daylight","sky","rose","meadow","frost"].includes(d.theme) ? d.theme : "lasunset"));
      if (d.activityFeed) setActivityFeed(d.activityFeed);
      if (d.discoveryPrefs) setDiscoveryPrefs(d.discoveryPrefs);
      if (d.chatImages) setChatImages(d.chatImages);
      if (d.chatTarget) setChatTarget(d.chatTarget);
      // "moments" was BTS's old screen key before it was renamed to "bts" — kept
      // dropping it and never adding "bts" meant reloading mid-BTS silently
      // bounced you back to Discover. "community" is gated behind the closed-beta
      // flag so a stale persisted value from before the flag existed can't restore
      // straight into a screen the menu no longer offers a way to reach.
      const VALID_SCREENS = ["onboard","discover","connections","matches","chat","briefs","sessions","network","portfolio","bts","profile","settings","subscription","codex","studios","analytics", ...(MUSE_CLOSED_BETA_HIDE_SOCIAL ? [] : ["community"])];
      if (d.screen && VALID_SCREENS.includes(d.screen)) {
        // Chat requires a chatTarget to render (screen-el guards on chatTarget);
        // chatTarget is now persisted, but fallback to matches if somehow missing.
        setScreen(d.screen === "chat" && !d.chatTarget ? "matches" : d.screen);
      }
      if (d.authUser) setAuthUser(d.authUser);
      if (d.authUser && !VALID_SCREENS.includes(d.screen||"")) setScreen("discover");
    } catch { console.debug("[muse] persisted client state could not be restored"); }
    try { const b=safeGetItem("muse_boost"); if(b){const e=parseInt(b);if(e>Date.now()){setBoostActive(true);setBoostEnd(e);}else{safeRemoveItem("muse_boost");}} } catch { console.debug("[muse] persisted boost state could not be restored"); }
  }, [setAppliedBriefs, setBlockedUsers, setBoostActive, setBoostEnd, setChatImages, setChatTarget, setDailyLikes, setFeedPosts, setForumPosts, setLikedBy, setMatches, setObConnectedSocials, setObData, setObPortfolioItems, setObProfilePic, setObSelects, setObStep, setRsvpdEvents, setSavedBriefs, setSavedProfileIds, setSavedSessionIds, setStories, setSuperLikes, setTestLevels, setUserBriefs]);

  useEffect(() => { if(!boostActive||!boostEnd)return;const iv=setInterval(()=>{if(Date.now()>=boostEnd){setBoostActive(false);try{safeRemoveItem("muse_boost");}catch{console.debug("[muse] expired boost state could not be cleared");}}},5000);return()=>clearInterval(iv); }, [boostActive,boostEnd,setBoostActive]);

  // Fetch connected accounts status from server on mount (overrides stale localStorage)
  useEffect(() => {
    authFetch("/api/muse/social?action=status")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.connected) setObConnectedSocials(d.connected); })
      .catch(() => {});
  }, [setObConnectedSocials]);

  // ─── CROSS-DEVICE: Persist all preferences to server (single debounced) ───
  const prefsSnapshotRef = useRef({ obStep, notifPrefs, filterStyles, filterScore, appliedBriefs, showNsfw });
  const prefsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { prefsSnapshotRef.current = { obStep, notifPrefs, filterStyles, filterScore, appliedBriefs, showNsfw }; });

  useEffect(() => {
    if (!authUser) return;
    if (prefsTimerRef.current) clearTimeout(prefsTimerRef.current);
    prefsTimerRef.current = setTimeout(() => {
      const p = prefsSnapshotRef.current;
      apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-preferences", preferences: { onboardingStep: p.obStep, notifications: p.notifPrefs, filterStyles: p.filterStyles, filterScore: p.filterScore, appliedBriefs: p.appliedBriefs, nsfw: p.showNsfw } }) }).catch(() => {});
    }, 2000);
    return () => { if (prefsTimerRef.current) clearTimeout(prefsTimerRef.current); };
  }, [apiFetch, obStep, notifPrefs, filterStyles, filterScore, appliedBriefs, showNsfw, authUser]);

  // ─── MESSAGE REQUESTS: Fetch pending requests when on matches screen ───
  useEffect(() => {
    if (screen !== "matches" || !authUser) return;
    apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "message-requests" }) })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.requests) setMessageRequests(data.requests); })
      .catch(() => {});
  }, [apiFetch, screen, authUser]);

const applySession = useCallback((accessToken: string, refreshToken?: string, attempt = 0, fromAuthStateChange = false) => {
    // Re-entrancy guard: if we're already in applySession from an auth-state-change callback,
    // skip the redundant setSession calls in the failure branches below.
    if (fromAuthStateChange) {
      // We already are in the chain triggered by authStateChange; we must not call setSession
      // here, which would cause an infinite loop. Return early.
      return;
    }
    // Refresh the session first — access tokens expire after 1hr, but refresh tokens
    // can silently fail (revoked, expired, etc). We try to get a fresh token before
    // validating so the user doesn't get bounced to login while actively using the app.
    let pendingToken = accessToken;
    let pendingRefresh = refreshToken || "";
    const doSessionCheck = () => {
      authFetch("/api/muse/auth", { method: "POST", body: JSON.stringify({ action: "session", access_token: pendingToken }) })
        .then(r => r.json().then(d => ({ status: r.status, d })))
        .then(({ status, d }) => {
          if (d.success && d.user) {
            const userObj = { id: d.user.id, email: d.user.email, profile: d.profile };
            setAuthUser(userObj);
            setAnalyticsUser(d.profile?.id || d.user.id);
            if (pendingRefresh) setRefreshToken(pendingRefresh);
            safeSetItem("muse_user", JSON.stringify({ access_token: pendingToken, refresh_token: pendingRefresh, user: userObj }));
            ensureMusePushRegistered();
            // Sync the Settings toggle with the browser's actual push
            // subscription state — previously always initialized to false
            // even when push was already active from a prior session.
            (async () => {
              try {
                if (typeof window !== "undefined" && "serviceWorker" in navigator) {
                  const reg = await navigator.serviceWorker.getRegistration();
                  const sub = await reg?.pushManager.getSubscription();
                  if (sub) setPushEnabled(true);
                }
              } catch { console.debug("[muse] deferred client refresh failed"); }
            })();
            if (d.profile) {
              const isOwner = d.user.email === OWNER_EMAIL;
              const effTier = isOwner ? "muse_pro" : (d.profile.tier || "free");
              setCurrentUser(prev => {
                // Merge server-persisted stats (source of truth across devices) with
                // whatever's already in local state, taking the max per field so an
                // active session's in-progress count is never clobbered backwards by
                // a slightly-stale server value.
                const serverStats = (d.profile.stats && typeof d.profile.stats === "object") ? d.profile.stats : {};
                const mergedStats = { ...prev.stats };
                for (const k of Object.keys(prev.stats) as (keyof typeof prev.stats)[]) {
                  const sv = serverStats[k];
                  if (typeof sv === "number" && sv > (mergedStats[k] || 0)) mergedStats[k] = sv;
                }
                return { ...prev, name: d.profile.name || prev.name, avatar: d.profile.avatar || prev.avatar, audience: d.profile.audience || "creative", type: d.profile.type || prev.type, foundingTier: isOwner ? "founding" : (d.profile.founding_tier || ""), proExpiresAt: isOwner ? "" : (d.profile.pro_expires_at || ""), tier: effTier, stats: mergedStats, status: d.profile.status ?? prev.status };
              });
              if (effTier) setUserTier(effTier);
              // Mirrors the server's isAgeVerificationCurrent (shared.ts) —
              // a verification older than AGE_VERIFICATION_VALID_DAYS is
              // treated as expired client-side too, so the same "show
              // AgeVerificationModal before a paid action" flow that already
              // exists naturally re-prompts for re-verification instead of
              // needing new UI. The server is still the real enforcement;
              // this only keeps the local gate from lying about it.
              if (d.profile.age_verified && d.profile.age_verified_at) {
                const verifiedAt = new Date(d.profile.age_verified_at).getTime();
                const isCurrent = !Number.isNaN(verifiedAt) && (Date.now() - verifiedAt < AGE_VERIFICATION_VALID_DAYS * 24 * 60 * 60 * 1000);
                const daysSince = Number.isNaN(verifiedAt) ? 0 : (Date.now() - verifiedAt) / (24 * 60 * 60 * 1000);
                setAgeVerified(isCurrent);
                // Expiring in ≤30 days but still valid: warn with banner.
                // isCurrent must hold here — an already-expired verification
                // (isCurrent === false) is a separate, more severe state and
                // must fall through to the red "expired" banner below, not
                // get relabeled as the softer orange "expiring soon" one.
                setVerificationExpiringSoon(isCurrent && daysSince >= (AGE_VERIFICATION_VALID_DAYS - 30) && daysSince < AGE_VERIFICATION_VALID_DAYS);
              }
              // Restore notifPrefs from server (source of truth across devices)
              if (d.profile.preferences?.notifications && typeof d.profile.preferences.notifications === "object") {
                setNotifPrefs(prev => ({ ...prev, ...d.profile.preferences.notifications }));
              }
              // Restore obStep from server (cross-device onboarding resume)
              if (d.profile.preferences?.onboardingStep && typeof d.profile.preferences.onboardingStep === "number") {
                setObStep(d.profile.preferences.onboardingStep);
              }
              // Restore filterStyles/filterScore from server (cross-device discovery filters)
              if (d.profile.preferences?.filterStyles && (Array.isArray(d.profile.preferences.filterStyles) || typeof d.profile.preferences.filterStyles === "string")) {
                setFilterStyles(Array.isArray(d.profile.preferences.filterStyles) ? d.profile.preferences.filterStyles : d.profile.preferences.filterStyles.split(",").filter(Boolean));
              }
              if (d.profile.preferences?.filterScore != null && typeof d.profile.preferences.filterScore === "number") {
                setFilterScore(d.profile.preferences.filterScore);
              }
              // Restore Discovery Preferences (age range/distance/gender) from
              // server — previously localStorage-only despite the Save button
              // claiming to save them, so a new device or cleared storage always
              // reset to the 18-50/50mi/all defaults.
              {
                const dp = d.profile.preferences;
                if (dp && (typeof dp.ageMin === "number" || typeof dp.ageMax === "number" || typeof dp.distance === "number" || typeof dp.gender === "string")) {
                  setDiscoveryPrefs(prev => ({
                    ageMin: typeof dp.ageMin === "number" ? dp.ageMin : prev.ageMin,
                    ageMax: typeof dp.ageMax === "number" ? dp.ageMax : prev.ageMax,
                    distance: typeof dp.distance === "number" ? dp.distance : prev.distance,
                    gender: typeof dp.gender === "string" ? dp.gender : prev.gender,
                  }));
                }
              }
              if (d.profile.preferences?.savedBriefs && Array.isArray(d.profile.preferences.savedBriefs)) {
                setSavedBriefs(d.profile.preferences.savedBriefs);
              }
              if (Array.isArray(d.profile.preferences?.appliedBriefs)) {
                setAppliedBriefs(d.profile.preferences.appliedBriefs);
              }
              if (Array.isArray(d.profile.preferences?.savedSessionIds)) {
                setSavedSessionIds(d.profile.preferences.savedSessionIds);
              }
              if (Array.isArray(d.profile.preferences?.savedProfileIds)) {
                setSavedProfileIds(d.profile.preferences.savedProfileIds);
              }
              if (typeof d.profile.preferences?.showOnline === "boolean") {
                setShowOnline(d.profile.preferences.showOnline);
              }
              if (typeof d.profile.preferences?.showDistance === "boolean") {
                setShowDistance(d.profile.preferences.showDistance);
              }
              if (typeof d.profile.preferences?.showZodiac === "boolean") {
                setShowZodiac(d.profile.preferences.showZodiac);
              }
              if (typeof d.profile.preferences?.showAge === "boolean") {
                setShowAge(d.profile.preferences.showAge);
              }
              if (typeof d.profile.preferences?.showMbti === "boolean") {
                setShowMbti(d.profile.preferences.showMbti);
              }
              if (typeof d.profile.preferences?.showLifePath === "boolean") {
                setShowLifePath(d.profile.preferences.showLifePath);
              }
              if (typeof d.profile.preferences?.showChinese === "boolean") {
                setShowChinese(d.profile.preferences.showChinese);
              }
              if (typeof d.profile.preferences?.showMatchPercent === "boolean") {
                setShowMatchPercent(d.profile.preferences.showMatchPercent);
              }
              setScreen(prev => (prev === "auth" || prev === "onboard") ? (d.profile.name && d.profile.type ? "discover" : "onboard") : prev);
            } else {
              setScreen(prev => (prev === "auth") ? "onboard" : prev);
            }
          } else {
            // Retry once before giving up — network hiccup, not invalid token
            if (attempt < 1) {
              setTimeout(() => { try { applySession(accessToken, refreshToken, attempt + 1); } catch { console.debug("[muse] session retry could not be scheduled"); } }, 1000);
              return;
            }
            // Suspended accounts were silently bounced to the login screen with no
            // explanation — tell the user why, and clear the dead token so reloads
            // don't loop through the same rejection. (Event, not showToast: this
            // callback is defined before showToast's declaration.)
            if (d.code === "ACCOUNT_SUSPENDED") {
              try { safeRemoveItem("muse_user"); } catch { console.debug("[muse] suspended session could not be cleared from storage"); }
              clearRefreshToken();
              try { window.dispatchEvent(new CustomEvent("muse:toast", { detail: "Your account has been suspended. Contact support@wyzdesign.com" })); } catch { console.debug("[muse] suspension toast event could not be dispatched"); }
              setAuthUser(null);
              setScreen("auth");
            } else if (status === 401) {
              // Server explicitly rejected the token itself (getUser() failed) —
              // this is the only case that actually means "not logged in."
              setAuthUser(null);
              setScreen("auth");
            } else {
              // Anything else (429 rate-limited, 500, a malformed response, etc.)
              // is a failure of THIS check, not proof the token is invalid — the
              // token in storage is untouched and may well still be good. Bouncing
              // to the login screen here was the "logged out even though I'm
              // logged in" bug: a single flaky /api/muse/auth call (e.g. hitting
              // the 30/window session rate limit after repeated app opens) wiped
              // authUser and forced the auth screen even though nothing about the
              // session was actually invalid. Leave the current screen/authUser
              // alone; real API calls elsewhere already handle their own 401s via
              // authFetch's refresh-and-retry, and a genuinely dead token will
              // surface there instead of on every load.
              try { window.dispatchEvent(new CustomEvent("muse:ready")); } catch { console.debug("[muse] ready event could not be dispatched"); }
              return;
            }
          }
          // Session resolved — splash can hide regardless of outcome
          try { window.dispatchEvent(new CustomEvent("muse:ready")); } catch { console.debug("[muse] ready event could not be dispatched"); }
        })
        .catch(() => {
          if (attempt < 1) {
            setTimeout(() => { try { applySession(accessToken, refreshToken, attempt + 1); } catch { console.debug("[muse] session retry could not be scheduled"); } }, 1000);
          } else {
            try { window.dispatchEvent(new CustomEvent("muse:ready")); } catch { console.debug("[muse] ready event could not be dispatched"); }
          }
        });
    };
    // Sync the SDK's own client-side session without re-entering applySession:
    // setSession() fires the onAuthStateChange "SIGNED_IN" listener, which
    // would otherwise call applySession() again — and if refreshSession()
    // above keeps failing with the same dead refresh token, that becomes an
    // unbounded setSession -> SIGNED_IN -> applySession -> setSession loop
    // that never throws (see syncingSdkSessionRef's declaration comment).
    // The listener clears the flag itself once it sees the echoed event;
    // this timeout is just a safety net in case that event never fires at
    // all (e.g. the call rejects before emitting anything).
    const syncSdkSession = (token: string, refresh: string) => {
      syncingSdkSessionRef.current = true;
      setTimeout(() => { syncingSdkSessionRef.current = false; }, 5000);
      supabase.auth.setSession({ access_token: token, refresh_token: refresh }).catch(() => {});
    };
    // If we have a refresh token, try to get a fresh session first
    // A definitively dead refresh token (already rotated/consumed, revoked,
    // or genuinely expired — GoTrue's "invalid_grant" / "Refresh Token Not
    // Found" family of errors) is not a transient hiccup worth retrying: on
    // top of our own logic, the SDK's autoRefreshToken background timer
    // (src/lib/supabase.ts) will keep retrying the SAME dead token on its
    // own schedule for as long as it holds one, independent of anything
    // here — confirmed live (a stale token produces a steady drip of
    // internal supabase-js refresh calls for the rest of the session).
    // Recognize this case and log out cleanly instead of feeding the SDK a
    // token we already know will never work.
    const isDeadRefreshTokenError = (err: unknown): boolean => {
      const msg = String(err instanceof Error ? err.message : err || "").toLowerCase();
      return msg.includes("refresh_token_not_found") || msg.includes("invalid_grant") || msg.includes("invalid refresh token") || msg.includes("refresh token not found") || msg.includes("already used");
    };
    const cleanLogoutDeadToken = () => {
      // Multi-tab/multi-device guard: Supabase rotates the refresh token on
      // every use, so if the SAME account is open in another tab (or the
      // installed PWA alongside a browser tab) and that tab refreshed first,
      // OUR refresh token is now "already used" even though the account is
      // still very much logged in — just somewhere else. Before nuking this
      // tab's session, check whether muse_user in localStorage already holds
      // a newer token than the one we just tried (another tab's TOKEN_REFRESHED
      // handler writes there — see below) and silently adopt it instead of
      // bouncing to the auth screen. This is the fix for "logs me out too
      // often" when the account is open in more than one place at once.
      try {
        const raw = safeGetItem("muse_user");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.access_token && parsed.access_token !== pendingToken) {
            pendingToken = parsed.access_token;
            pendingRefresh = parsed.refresh_token || "";
            if (pendingRefresh) setRefreshToken(pendingRefresh);
            syncSdkSession(pendingToken, pendingRefresh);
            doSessionCheck();
            return;
          }
        }
      } catch { console.debug("[muse] remote sign-out cleanup failed"); }
      try { safeRemoveItem("muse_user"); } catch { console.debug("[muse] local session could not be cleared"); }
      try { clearRefreshToken(); } catch { console.debug("[muse] refresh token could not be cleared"); }
      // scope:'local' clears the SDK's own in-memory/persisted session and
      // cancels its autoRefreshToken timer without a network round-trip —
      // exactly what's needed here since the token is already known-dead.
      try { supabase.auth.signOut({ scope: "local" }).catch(() => console.debug("[muse] local Supabase sign-out failed")); } catch { console.debug("[muse] local Supabase sign-out could not start"); }
      setAuthUser(null);
      setScreen("auth");
      try { window.dispatchEvent(new CustomEvent("muse:ready")); } catch { console.debug("[muse] ready event could not be dispatched"); }
    };
    if (pendingRefresh) {
      supabase.auth.refreshSession({ refresh_token: pendingRefresh })
        .then(({ data: { session }, error }) => {
          if (session?.access_token) {
            pendingToken = session.access_token;
            pendingRefresh = session.refresh_token || pendingRefresh;
            // Update storage with fresh tokens
            safeSetItem("muse_user", JSON.stringify({ access_token: pendingToken, refresh_token: pendingRefresh }));
            setRefreshToken(pendingRefresh);
            doSessionCheck();
          } else if (isDeadRefreshTokenError(error)) {
            cleanLogoutDeadToken();
          } else {
            // Refresh failed, fall back to original token. The SDK's own
            // session was never set in this branch (refreshSession() only
            // populates it on success) — without an explicit setSession
            // here, supabase.auth.getSession()/onAuthStateChange never see
            // a live session, so the TOKEN_REFRESHED auto-sync above never
            // fires for this login and the client silently stops being able
            // to tell the SDK apart from "logged out" (see doLogout's
            // signOut() comment — it depends on the SDK actually holding a
            // session to have anything to clear).
            //
            // Deliberately pass "" for the refresh token here, NOT
            // pendingRefresh: we just learned pendingRefresh doesn't work.
            // The SDK (createClient with autoRefreshToken: true, see
            // src/lib/supabase.ts) schedules its OWN internal background
            // refresh using whatever refresh token setSession() hands it —
            // re-arming it with the same dead token here just makes the SDK
            // independently retry-and-fail on its own timer forever, on top
            // of (and regardless of) our own retry logic above. Access token
            // alone is enough for realtime/RLS; there's nothing usable to
            // refresh with, so don't hand the SDK a token we know is dead.
            syncSdkSession(pendingToken, "");
            doSessionCheck();
          }
        })
        .catch((err) => {
          if (isDeadRefreshTokenError(err)) {
            cleanLogoutDeadToken();
            return;
          }
          // Refresh failed, fall back to original token — same reasoning as above.
          syncSdkSession(pendingToken, "");
          doSessionCheck();
        });
    } else {
      // No refresh token — still give the SDK the access token so its own
      // session state matches what we're actually treating as logged in.
      syncSdkSession(pendingToken, pendingRefresh);
      doSessionCheck();
    }
  }, [setAppliedBriefs, setFilterScore, setFilterStyles, setObStep, setSavedBriefs, setSavedProfileIds, setSavedSessionIds]);

  useEffect(() => {
    if (loadStateRef.current) return;
    loadStateRef.current = true;

    // Build-version check: if stale code is detected, clear SW + caches and hard reload.
    // App Router does not set __NEXT_DATA__.buildId, so derive the deploy fingerprint
    // from Vercel's dpl= query param on the first /_next/ static chunk URL — it changes
    // on every deployment.
    try {
      const script = document.querySelector<HTMLScriptElement>('script[src*="/_next/static/"]');
      const m = script?.src.match(/dpl=([^&"']+)/);
      const bid = m ? m[1] : null;
      if (bid) {
        const prev = sessionStorage.getItem("muse_build");
        if (prev && prev !== bid) {
          sessionStorage.setItem("muse_build", bid);
          if ("serviceWorker" in navigator) {
            navigator.serviceWorker.getRegistrations().then(regs => {
              regs.forEach(r => r.unregister());
              caches.keys().then(ks => {
                ks.forEach(k => caches.delete(k));
                window.location.reload();
              });
            });
          } else {
            window.location.reload();
          }
          return;
        }
        sessionStorage.setItem("muse_build", bid);
      }
    } catch { console.debug("[muse] startup data refresh failed"); }

    try { sessionStorage.setItem("muse_loaded", "1"); } catch { console.debug("[muse] load marker could not be persisted"); }
    loadState();
    initAnalyticsSession();
    setHydrated(true);
    try { window.dispatchEvent(new CustomEvent("muse:hydrated")); } catch { console.debug("[muse] hydrated event could not be dispatched"); }

    // Remote kill-switch: if MUSE_CACHE_VERSION changed server-side, purge SW +
    // caches and reload once. Non-blocking; only acts on an actual mismatch.
    try {
      const purgeAndReload = () => {
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.getRegistrations().then(regs => {
            regs.forEach(r => r.unregister());
            caches.keys().then(ks => {
              ks.forEach(k => caches.delete(k));
              window.location.reload();
            });
          });
        } else {
          window.location.reload();
        }
      };
      fetch("/api/muse/cache-version", { cache: "no-store" })
        .then(r => (r.ok ? r.json() : null))
        .then((d: { version?: string } | null) => {
          if (!d || !d.version) return;
          const prev = sessionStorage.getItem("muse_cache_version");
          if (prev && prev !== d.version) {
            sessionStorage.setItem("muse_cache_version", d.version);
            purgeAndReload();
            return;
          }
          sessionStorage.setItem("muse_cache_version", d.version);
        })
        .catch(() => {});
    } catch { console.debug("[muse] scene preference could not be restored"); }

    // Capture geolocation for distance matching (best-effort, silent on denial).
    getGeolocation().then(g => { if (g) { setMyGeo(g); try { safeSetItem("muse_geo", JSON.stringify(g)); } catch { console.debug("[muse] location could not be persisted"); } } })
      .catch(() => { /* silently handled */ });

    // Handle post-checkout return: refresh tier from server
    const params = new URLSearchParams(window.location.search);
    const upgraded = params.get("upgraded");
    if (upgraded) showToast("Welcome to Muses " + (upgraded.charAt(0).toUpperCase() + upgraded.slice(1)) + "! ✨");

    // Handle Stripe Connect onboarding return
    const connected = params.get("connected");
    if (connected === "true") showToast("Stripe account connected! You can now receive payments. 💰");

    // Handle booking-checkout return (create-booking-checkout success_url/cancel_url)
    const paymentResult = params.get("payment");
    if (paymentResult === "success") showToast("Payment successful! Your session is booked. 🎉");
    else if (paymentResult === "cancelled") showToast("Payment cancelled");

    // Handle boost-checkout return (create-boost-checkout success_url/cancel_url).
    // The webhook only marks the purchase row "paid" — boost-purchase-complete
    // is what actually grants the credits, so it must be called here with the
    // purchaseId stashed before the redirect (see SubscriptionScreen buy-boost).
    const boostResult = params.get("boost");
    if (boostResult === "success") {
      const pendingBoostId = safeGetItem("muse_pending_boost_purchase");
      if (pendingBoostId) {
        apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "boost-purchase-complete", purchaseId: pendingBoostId }) })
          .then(r => r.json())
          .then(d => {
            if (d?.success) showToast("Boost credit added! ⚡");
            else if (d?.code === "NOT_PAID") showToast("Payment still processing — your boost will appear shortly");
            else showToast(d?.error || "Couldn't confirm boost purchase — contact support if you were charged");
          })
          .catch(() => showToast("Couldn't confirm boost purchase — contact support if you were charged"))
          .finally(() => { try { safeRemoveItem("muse_pending_boost_purchase"); } catch { console.debug("[muse] pending boost marker could not be cleared"); } });
      } else {
        showToast("Boost purchase successful! ⚡");
      }
    } else if (boostResult === "cancelled") {
    try { safeRemoveItem("muse_pending_boost_purchase"); } catch { console.debug("[muse] pending boost marker could not be cleared"); }
      showToast("Boost purchase cancelled");
    }

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
      } catch { console.debug("[muse] referral code could not be restored"); }
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
      } catch { console.debug("[muse] persisted auth state could not be restored"); }

      const savedUser = safeGetItem("muse_user");
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed?.access_token && !sessionAppliedRef.current) { sessionAppliedRef.current = true; applySession(parsed.access_token, getRefreshToken() || parsed.refresh_token || ""); }
        } catch { console.debug("[muse] persisted session could not be parsed"); }
      } else {
        // No session and no saved user — new visitor, show auth after brief splash
        setTimeout(() => { try { window.dispatchEvent(new CustomEvent("muse:ready")); } catch { console.debug("[muse] ready event could not be dispatched"); } }, 1500);
      }
    })();

    // Pull real catalog data (profiles/briefs/feed/forum/events) with static fallback.
    bootstrapData();

    // Hard fallback: if bootstrapData hangs (network error, API unresponsive),
    // the UI must still become interactive after 30 seconds. Without this,
    // a stuck fetch leaves discoverLoading=true forever and the entire
    // Discover screen renders as a frozen blank state.
    setTimeout(() => { setDiscoverLoading(false); }, 30000);

    // Listen for auth state changes (OAuth completion)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.access_token) {
        // This SIGNED_IN is the echo of applySession's own internal
        // setSession() call (see syncingSdkSessionRef's declaration comment)
        // — applySession already ran doSessionCheck() for this exact token,
        // so re-entering it here would loop forever whenever the refresh
        // token keeps failing. Swallow it once and move on.
        if (syncingSdkSessionRef.current) {
          syncingSdkSessionRef.current = false;
          return;
        }
        if (sessionAppliedRef.current) {
          sessionAppliedRef.current = false;
        }
        sessionAppliedRef.current = true;
        applySession(session.access_token, session.refresh_token);
      }
      // Keep the cached token fresh — supabase-js auto-refreshes its own copy
      // but only SIGNED_IN was handled here, so after the JWT TTL every cached-
      // token API call silently 401'd even though a valid refreshed token existed.
      if (event === "TOKEN_REFRESHED" && session?.access_token) {
        try {
          const raw = safeGetItem("muse_user");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.access_token && parsed.access_token !== session.access_token) {
              if (session.refresh_token) setRefreshToken(session.refresh_token);
              safeSetItem("muse_user", JSON.stringify({
                ...parsed,
                access_token: session.access_token,
                refresh_token: session.refresh_token || parsed.refresh_token,
              }));
            }
          }
    } catch { console.debug("[muse] safety state refresh failed"); }
      }
    });
    return () => { authListener?.subscription?.unsubscribe(); };
  // This installs one subscription for the component lifetime. Including the
  // bootstrap callback would re-register it whenever bootstrapped data changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cross-tab session sync: when the SAME browser has this account open in
  // more than one tab (or the installed PWA running alongside a regular
  // browser tab), each tab refreshes its access token on its own 1hr timer.
  // Supabase rotates the refresh token on every use, so whichever tab
  // refreshes second gets an "already used" error on a token another tab
  // already rotated away — previously that read as a dead session and force-
  // logged that tab out even though the account was still perfectly logged
  // in next door. The `storage` event fires in every OTHER tab the instant
  // one tab's TOKEN_REFRESHED handler (above) writes the new tokens to
  // muse_user, so listening for it lets every other tab adopt the fresh
  // token proactively instead of racing its own stale one and losing.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== "muse_user" || !e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed?.access_token) {
          if (parsed.refresh_token) setRefreshToken(parsed.refresh_token);
          applySession(parsed.access_token, parsed.refresh_token || "");
        }
      } catch { console.debug("[muse] client preference refresh failed"); }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [applySession]);
  useEffect(() => { const t = setTimeout(saveState, 4000); return () => clearTimeout(t); }, [saveState]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    // Persistence is handled by saveState (theme is part of its payload) —
    // no separate read-modify-write here to avoid a lost-update race on muse_v1.
  }, [theme]);

  // Poll the server's unread-notification count so the menu/bottom-nav bell
  // reflects real DB rows (matches, likes, bookings, reviews, brief apps, etc.)
  // and not just the local activityFeed. Only when the user is authed.
  useEffect(() => {
    if (!authUser?.id) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const r = await authFetch("/api/muse?type=notification-count");
        if (cancelled) return;
        const d = await r.json();
        if (d && typeof d.count === "number") setServerNotifCount(d.count);
      } catch { console.debug("[muse] client preference refresh failed"); }
    };
    poll();
    const iv = setInterval(poll, 20000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [authUser?.id]);

  // Pull the real "who viewed my profile" list so the Profile Activity section
  // shows genuine viewer avatars/names (fed by track-view → profile_view rows),
  // not just the local activityFeed. Feed them into activityFeed as deduped
  // "viewed your profile" items too, so the section is populated from the DB.
  useEffect(() => {
    if (!authUser?.id) return;
    let cancelled = false;
    const pull = async () => {
      try {
        const r = await authFetch("/api/muse?type=profile-viewers");
        if (cancelled) return;
        const d = await r.json();
        if (d && Array.isArray(d.viewers)) {
          setProfileViewers(d.viewers);
          // Merge new viewer rows into the activity feed (dedup by viewer id),
          // placed chronologically by view time.
          setActivityFeed(prev => {
            const existingViewerIds = new Set<string | number>(prev.filter(x => x.type === "profile_view").map(x => x.id));
            const newItems = d.viewers
              .filter((v: ProfileViewer) => !existingViewerIds.has(v.id || ""))
              .map((v: ProfileViewer) => ({
                id: v.id || uid(),
                type: "profile_view",
                from: v.name || "Someone",
                avatar: v.avatar || "",
                text: "viewed your profile",
                time: v.viewedAt ? (() => { const ms = Date.now() - new Date(v.viewedAt).getTime(); const m = Math.floor(ms / 60000); if (m < 1) return "Just now"; if (m < 60) return `${m}m ago`; const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`; return `${Math.floor(h / 24)}d ago`; })() : "",
                read: true,
              }));
            return [...newItems, ...prev];
          });
        }
      } catch { console.debug("[muse] notification count refresh failed"); }
    };
    pull();
    const iv = setInterval(pull, 60000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [authUser?.id]);

  // Load background transparency from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("muse_bg_opacity");
      if (stored) document.documentElement.style.setProperty("--scene-opacity", stored);
    } catch { console.debug("[muse] screen scroll restoration failed"); }
  }, []);

  // Show the tide waves only when the user scrolls to the very bottom of the
  // active screen — attach a scroll listener to whichever .screen-el is active,
  // re-binding on screen change. The waves fade in (CSS .show) ~40px from the
  // bottom; the active screen is found via the live DOM so this keeps working
  // for every screen without a per-screen listener.
  // Show waves at bottom of ANY screen when scrolled near the bottom.
  const waveShowRef = useRef(false);
  useEffect(() => {
    const wave = document.querySelector(".wave-bottom");
    const check = () => {
      const p = document.querySelector('.screen-el.active');
      if (!p || !wave) return;
      const scroller = (p as HTMLElement).scrollTop !== undefined ? (p as HTMLElement) : p.querySelector<HTMLElement>('[style*="overflow"],.conn-scroll,.profile-scroll,.settings-scroll,.portfolio-scroll,.match-list');
      const el: HTMLElement | null = scroller || p as HTMLElement;
      const near = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
      if (near !== waveShowRef.current) {
        waveShowRef.current = near;
        wave.classList.toggle("show", near);
      }
    };
    const scroller = document.querySelector(".screen-el.active");
    if (scroller) {
      scroller.addEventListener("scroll", check, { passive: true });
      check();
    }
    return () => { if (scroller) scroller.removeEventListener("scroll", check); };
  }, [screen]);

  // Scroll to top on every screen navigation (Torreé audit), except Settings
  // and Profile — those manage their own internal scroll position and a
  // reset here would fight it. Keyed on `screen` so it fires whether
  // navigation went through showScreen, goBack, or a direct setScreen call.
  // Most screens' real scrolling happens on an inner content div (flex:1,
  // overflowY:auto) rather than the outer .screen-el itself, so this resets
  // both the .screen-el.active container and any scrollable descendant.
  useEffect(() => {
    if (screen === "settings" || screen === "profile") return;
    try {
      const active = document.querySelector<HTMLElement>(".screen-el.active");
      if (!active) return;
      active.scrollTop = 0;
      active.querySelectorAll<HTMLElement>('[style*="overflow"],.match-list,.messages,.profile-scroll,.portfolio-scroll,.settings-scroll,.briefs-scroll,.conn-scroll,.sub-scroll,.modal-body,.card-info-scroll').forEach(el => { el.scrollTop = 0; });
    } catch { console.debug("[muse] streak refresh failed"); }
  }, [screen]);

  // Also always show waves on the swipe card (Discover) as a gradient accent.
  //
  // CRITICAL FIX (freeze root cause): this previously observed
  // document.body with { childList: true, subtree: true, attributes: true,
  // attributeFilter: ['class'] } — i.e. every class-attribute change and
  // every node insertion/removal ANYWHERE on the page, not just Discover.
  // Its own callback called classList.add('waves-visible'), which is
  // itself a class-attribute mutation the same observer was watching, and
  // reran document.querySelectorAll('.swipe-card.top-card') (a whole-
  // document query) on every single one of those mutations. Mounting the
  // Discover card stack (or, after that, literally any class/DOM churn
  // anywhere else in this 3000+ line app — toasts, badges, animations)
  // could fire this callback in rapid, sustained succession, each firing
  // native DOM-traversal work with no JS between them to interrupt — a
  // microtask storm that starves the render thread and freezes the tab.
  // Confirmed via CPU profiling during the "app freezes after login /
  // after ~2s on Discover" reports: ~98% of samples were in Chromium's
  // native code, not JS, with this exact callback on the stack.
  //
  // Fix: scope the observer to the card stack only (not document.body),
  // and drop the attributes/class watch entirely — classList.add is
  // idempotent, so we only ever need to react to NEW cards being
  // inserted (childList), never to class changes (which we caused).
  //
  // HARDENING: also wrapped in createSafeObserver as a second, independent
  // layer of defense — even with the scoped target above, a future edit to
  // this effect (or to .card-stack's own render logic) could reintroduce a
  // tight mutate->observe->mutate loop. The circuit breaker makes that fail
  // as "waves stop appearing" instead of "the app freezes".
  useEffect(() => {
    const addWaves = () => {
      document.querySelectorAll('.swipe-card.top-card').forEach(c => c.classList.add('waves-visible'));
    };
    addWaves();
    const target = document.querySelector('.card-stack') || document.body;
    const obs = createSafeObserver(addWaves, { label: "discover-waves" });
    obs.observe(target, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [screen]);



  const showToast = useCallback((msg: string | { msg: string; onTap?: () => void; type?: ToastType }) => { const t = typeof msg === "string" ? { msg } : msg; setToastMsg(t); setTimeout(() => setToastMsg(null), 3000); }, []);

  // Check for OAuth callback on mount. Was previously (incorrectly) a React.useEffect
  // call nested inside loadState's async body — a Rules-of-Hooks violation that threw
  // "Invalid hook call" any time a returning user had persisted state, i.e. almost
  // every real login/reload. Hoisted to a proper top-level effect.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    if (connected) {
      setObConnectedSocials(prev => ({ ...prev, [connected]: true }));
      showToast(`${connected.charAt(0).toUpperCase() + connected.slice(1)} connected!`);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [setObConnectedSocials, showToast]);

  // Onboarding multi-select toggle with a hard cap. Toggling off always works;
  // adding beyond the cap is ignored and surfaces a toast instead.
  const toggleObMulti = (field: "looking" | "styles", value: string, max: number) => {
    const arr: string[] = (obData[field as keyof typeof obData] as string[] | undefined) || [];
    if (arr.includes(value)) { setObData(d => ({ ...d, [field]: arr.filter(x => x !== value) })); return; }
    if (arr.length >= max) { showToast(`Max ${max} selected`); return; }
    setObData(d => ({ ...d, [field]: [...arr, value] }));
  };

  const handleQuestsChange = useCallback(async () => {
    try {
      const res = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "get-quests" }) });
      const d = await res.json();
      if (Array.isArray(d?.quests)) {
        const quests = d.quests as Quest[];
        setClaimableQuests(quests.filter((q) => q.completed && !q.claimed).length);
        setNearQuests(quests.filter((q) => !q.completed && q.progress / q.target >= 0.6).length);
        const TIER_COLORS: Record<string,string> = { starter: "#98FB98", daily: "#87CEEB", weekly: "#FFD700", monthly: "#D4A5FF", season: "#FF69B4", legendary: "#FF8A80" };
        const top = quests
          .filter((q) => !q.completed && q.progress > 0)
          .sort((a, b) => (b.progress / b.target) - (a.progress / a.target))
          .slice(0, 3)
          .map((q) => ({ id: q.id, title: q.title, icon: q.icon, progress: q.progress, target: q.target, color: TIER_COLORS[q.quest_tier] || "#FFD700" }));
        setTopQuests(top);
      }
      if (typeof d?.streak === "number") setLoginStreak(d.streak);
    } catch { console.debug("[muse] quest refresh failed"); }
  }, [apiFetch, setClaimableQuests, setLoginStreak, setNearQuests, setTopQuests]);

  // Quest tracking — call after successful actions. Batches multiple keys into
  // one request; silent unless a quest is newly completed or the user levels up
  // (one subtle toast each, never stacked).
  const trackQuest = useCallback(async (...actionKeys: string[]) => {
    if (!actionKeys.length) return;
    try {
      const res = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "track-quest", action_keys: actionKeys }) });
      const data = await res.json();
      if (!data?.success || !Array.isArray(data.results)) return;
      const completed = data.results.find((r: { newlyCompleted?: boolean; leveledUp?: boolean; action_key?: string; quest?: { icon?: string; title?: string } }) => r.newlyCompleted);
      if (completed) showToast(`${completed.quest?.icon || "⭐"} Quest complete: ${completed.quest?.title || completed.action_key}`);
      else {
        const leveled = data.results.find((r: { leveledUp?: boolean }) => r.leveledUp);
        if (leveled) showToast("🎉 Level up! Keep completing quests for rewards");
      }
      if (completed) setClaimableQuests(n => n + 1);
    } catch { console.debug("[muse] safety preference refresh failed"); }
  }, [apiFetch, setClaimableQuests, showToast]);

  // Surface storage quota failures to the user instead of failing silently.
  useEffect(() => {
    const onQuota = () => showToast(QUOTA_MSG);
    window.addEventListener("muse:storage-quota", onQuota);
    return () => window.removeEventListener("muse:storage-quota", onQuota);
  }, [showToast]);

  // Toast channel for code that runs before showToast exists (session bootstrap).
  useEffect(() => {
    const onToast = (e: Event) => { const msg = (e as CustomEvent<string>).detail; if (msg) showToast(msg); };
    window.addEventListener("muse:toast", onToast);
    return () => window.removeEventListener("muse:toast", onToast);
  }, [showToast]);


  // Login quests + claimables badge — runs once authed+bootstrapped. Must live
  // AFTER trackQuest's declaration. Login counts once per calendar day so
  // daily/streak quests stay accurate across refreshes.
  const questBootRef = useRef(false);
  useEffect(() => {
    if (!bootstrapped || !authUser || questBootRef.current) return;
    questBootRef.current = true;
    const today = new Date().toISOString().slice(0, 10);
    let lastLoginDay = "";
    try { lastLoginDay = safeGetItem("muse_quest_login_day") || ""; } catch { console.debug("[muse] quest login state could not be read"); }
    if (lastLoginDay !== today) {
      try { safeSetItem("muse_quest_login_day", today); } catch { console.debug("[muse] quest login state could not be saved"); }
      try {
        let days: string[] = [];
        try { days = JSON.parse(safeGetItem("muse_login_days") || "[]"); } catch { console.debug("[muse] login history could not be read"); }
        if (!days.includes(today)) { days.push(today); }
        const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
        days = days.filter(d => new Date(d) >= cutoff);
        safeSetItem("muse_login_days", JSON.stringify(days));
        const weekDays: boolean[] = [];
        for (let i = 6; i >= 0; i--) {
          const dt = new Date(); dt.setDate(dt.getDate() - i);
          weekDays.push(days.includes(dt.toISOString().slice(0, 10)));
        }
        setWeeklyLogins(weekDays);
      } catch { console.debug("[muse] activity refresh failed"); }
      trackQuest("login", "login_streak");
      setTimeout(() => setShowDailyLogin(true), 800);
    }
    apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "get-quests" }) })
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d?.quests)) setClaimableQuests((d.quests as Quest[]).filter((q) => q.completed && !q.claimed).length);
        // Bug fix (live-verified): this boot-time fetch used to read only
        // `quests` from the response, leaving `loginStreak` at its initial 0
        // until the user happened to open the Quests panel (the only other
        // place that reads `d.streak`, see handleQuestsChange above). That
        // made the "Welcome back!" streak popup — which fires automatically
        // right below this block — always show "Start Your Streak" even for
        // an account with a real multi-day streak, while the day-checkmarks
        // next to it (driven by the separate, purely-local `weeklyLogins`)
        // could already show several days filled in. Now this fetch keeps
        // `loginStreak` in sync with the server the same way it already does.
        if (typeof d?.streak === "number") setLoginStreak(d.streak);
      })
      .catch(() => {});
  }, [bootstrapped, authUser, trackQuest, apiFetch, setClaimableQuests, setLoginStreak, setShowDailyLogin, setWeeklyLogins]);

  // Per-page tutorials: each major screen gets its own small lightbox the
  // first time this browser ever opens it (tracked one localStorage flag
  // per screen, muse_tour_seen_<screen>, same safeGetItem/safeSetItem
  // pattern as the old single muse_feature_tour_seen flag it replaces).
  // Only one page tour is ever open at once, tracked here rather than as a
  // showX boolean per screen.
  const pageTourShownRef = useRef<Set<string>>(new Set());
  const maybeShowPageTour = useCallback((id: TourScreenId) => {
    if (activePageTour) return;
    if (pageTourShownRef.current.has(id)) return;
    // Same defensive pattern the old trigger used with showDailyLogin —
    // never stack a page tour on top of another full-screen modal.
    if (showDailyLogin || showAgeVerification || showAgeGate || showQuests || showStories || showHamburger) return;
    // Check localStorage FIRST — if this screen's tour has already been dismissed
    // in any prior session, don't show it again. (Previously the localStorage
    // read happened after adding to the ref, which was fine, but the early ref
    // add also meant a dismissed tour would be re-added to the ref set and
    // then immediately discarded — harmless but confusing; cleaner to gate
    // the localStorage check before any ref mutation.)
    let seen = "";
    try { seen = safeGetItem(tourSeenKey(id)) || ""; } catch { console.debug("[muse] tour state could not be read"); }
    if (seen) return;
    pageTourShownRef.current.add(id);
    setActivePageTour(id);
  }, [activePageTour, showDailyLogin, showAgeVerification, showAgeGate, showQuests, showStories, showHamburger]);

  useEffect(() => {
    if (!bootstrapped || !authUser) return;
    if (!(SCREEN_TRIGGERED_TOUR_IDS as string[]).includes(screen)) return;
    const t = setTimeout(() => maybeShowPageTour(screen as TourScreenId), 600);
    return () => clearTimeout(t);
  }, [screen, bootstrapped, authUser, maybeShowPageTour]);

  useEffect(() => {
    if (!bootstrapped || !authUser) return;
    try {
      let days: string[] = [];
      try { days = JSON.parse(safeGetItem("muse_login_days") || "[]"); } catch { console.debug("[muse] login history could not be read"); }
      const weekDays: boolean[] = [];
      for (let i = 6; i >= 0; i--) {
        const dt = new Date(); dt.setDate(dt.getDate() - i);
        weekDays.push(days.includes(dt.toISOString().slice(0, 10)));
      }
      setWeeklyLogins(weekDays);
    } catch { console.debug("[muse] weekly login state could not be updated"); }
  }, [bootstrapped, authUser, setWeeklyLogins]);

  const doLogout = useCallback(async (message: string = "Logged out") => {
    try { await authFetch("/api/muse/auth", { method: "POST", body: JSON.stringify({ action: "logout" }) }); } catch { console.debug("[muse] remote logout request failed"); }
    // Kill the CLIENT-side supabase session too — without this, the persisted
    // supabase-js session survives and silently re-logs the user on next load
    // (shared-device risk). The backend call alone was a no-op for this.
    try { await supabase.auth.signOut(); } catch { console.debug("[muse] local logout cleanup failed"); }
    clearRefreshToken();
    const keys = ["muse_user","muse_state","muse_v1","muse_geo","muse_boost","muse_last_reset","muse_local","muse_premium","muse_referral_code","muse_open_count","muse_hide_premium"];
    keys.forEach(k => { try { safeRemoveItem(k); } catch { console.debug("[muse] local logout key could not be cleared"); } });
    setAuthUser(null); setCurrentUser(prev => ({ ...prev, name:"", email:"", avatar:"", type:"", tier:"free", foundingTier:"", proExpiresAt:"" })); setUserTier("free"); setScreen("auth"); screenHistoryRef.current = []; showToast(message);
  }, [showToast]);

  const doLogoutFull = useCallback(async () => {
    await doLogout(); setHamburgerScreen(""); setShowHamburger(false);
  }, [doLogout, setShowHamburger]);

  // authFetch (lib/api.ts) dispatches this when a request 401s, the user HAD
  // a token, and a refresh attempt still couldn't produce a usable one — the
  // session is genuinely dead (e.g. an expired access token surviving in
  // localStorage while sessionStorage's refresh token is gone). Without this,
  // every caller just shows its own generic "X failed" toast with no hint
  // that re-login is what's actually needed (found via Sessions' "Book
  // Session", but authFetch is used for every authenticated action, so it
  // isn't Sessions-specific). Multiple in-flight requests can all 401 at
  // once, so guard against logging out more than once per dead session.
  const sessionExpiredHandledRef = useRef(false);
  useEffect(() => {
    const onSessionExpired = () => {
      if (sessionExpiredHandledRef.current) return;
      sessionExpiredHandledRef.current = true;
      doLogout("Your session expired — please log in again");
    };
    window.addEventListener("muse:session-expired", onSessionExpired);
    return () => window.removeEventListener("muse:session-expired", onSessionExpired);
  }, [doLogout]);
  // Re-arm the guard above on every fresh login, so a session that expires,
  // gets logged out, and is then logged back into (same tab) still gets the
  // clear "please log in again" handling if THAT session later expires too.
  useEffect(() => { if (authUser) sessionExpiredHandledRef.current = false; }, [authUser]);

  const uploadImage = useCallback(async (file: File, folder: string): Promise<string | null> => {
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);
      // File uploads legitimately take longer than the 15s default on a
      // slow connection — give this call site more room before the
      // shared authFetch timeout would abort it.
      const r = await authFetch("/api/muse/upload", { method: "POST", body: fd, timeoutMs: 60000 });
      const j = await r.json();
      if (j.success && j.url) {
        if (folder === "portfolio") trackQuest("upload_photo");
        return j.url;
      }
      showToast("Upload failed: " + (j.error || "Unknown"));
      return null;
    } catch { trackError("upload_image_failed", { folder }); showToast("Upload failed"); return null; }
  }, [showToast, trackQuest]);

  // Recorded clips (voice / video notes). Same /api/muse/upload endpoint, but
  // the server must be told audio vs video — both are WebM containers with an
  // identical header, so it can't tell from the bytes.
  const uploadMedia = useCallback(async (file: File, folder: string, mediaKind: "voice" | "video"): Promise<string | null> => {
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);
      fd.append("mediaKind", mediaKind);
      const r = await authFetch("/api/muse/upload", { method: "POST", body: fd, timeoutMs: 120000 });
      const j = await r.json();
      if (j.success && j.url) return j.url;
      showToast("Upload failed: " + (j.error || "Unknown"));
      return null;
    } catch { trackError("upload_media_failed", { folder, mediaKind }); showToast("Upload failed"); return null; }
  }, [showToast]);

  const sendChatMedia = useCallback(async (url: string, kind: "voice" | "video", durationMs: number, mediaType: string, transcript?: string) => {
    if (!url || !chatTarget) return;
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const myId = authUser?.profile?.id || authUser?.id || "local";
    const clientMsgId = `${myId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const userMsg = { from: "me" as const, text: "", img: "", kind, mediaUrl: url, mediaType, durationMs, transcript, time: now, clientMsgId };
    const targetId = String(chatTarget.id);
    setChatTarget(prev => prev ? { ...prev, messages: [...prev.messages, userMsg] } : prev);
    setMatches(prev => prev.map(m => String(m.id) === targetId ? { ...m, messages: [...m.messages, userMsg] } : m));
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    let sent = true;
    try {
      sent = await persistMessage({ myId, theirId: targetId, text: "", img: "", kind, mediaUrl: url, mediaType, durationMs, transcript, clientMsgId });
    } catch { sent = false; }
    if (!sent && myId !== "local") {
      setChatTarget(prev => prev ? { ...prev, messages: prev.messages.filter(m => m !== userMsg) } : prev);
      setMatches(prev => prev.map(m => String(m.id) === targetId ? { ...m, messages: m.messages.filter(mm => mm !== userMsg) } : m));
      showToast(kind === "voice" ? "Voice note couldn't be sent" : "Video note couldn't be sent");
    }
  }, [chatTarget, authUser, setChatTarget, setMatches, showToast]);

  // Single source of truth lives in components/types.ts — a second local copy
  // existed here and the two were drifting.
  const getIcebreaker = useCallback((type: string, seed?: string) => {
    const pool = ICEBREAKERS[type] || ICEBREAKERS.default;
    const hash = seed ? seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0) : 0;
    return pool[hash % pool.length];
  }, []);

  const getReferralTier = (c:number) => c>=50?{tier:"Platinum",discount:20,perks:"20% off all services",nextThreshold:null}:c>=20?{tier:"Gold",discount:15,perks:"15% off all services",nextThreshold:50}:c>=5?{tier:"Silver",discount:10,perks:"10% off all services",nextThreshold:20}:c>=1?{tier:"Bronze",discount:0,perks:"Exclusive badge",nextThreshold:5}:{tier:"None",discount:0,perks:"Invite friends to earn",nextThreshold:1};
  const checkProfileBadges = (stats: Partial<typeof currentUser.stats>, createdAt:number):{name:string;desc:string;icon:string;color:string}[] => {
    const b:{name:string;desc:string;icon:string;color:string}[] = [];
    if (createdAt && Date.now()-createdAt > 31536000000) b.push({name:"Full Moon",icon:"🌕",color:"#C0C0FF",desc:"1 year on Muses"});
    if ((stats.bookingsCompleted ?? 0) >= 50) b.push({name:"Golden Hour",icon:"☀️",color:"#FFD700",desc:"50+ shoots completed"});
    else if ((stats.bookingsCompleted ?? 0) >= 10) b.push({name:"Collab King",icon:"👑",color:"#FFD700",desc:"10+ bookings completed"});
    if ((stats.matchesReceived ?? 0) >= 100) b.push({name:"Rising Star",icon:"⭐",color:"#FFBF00",desc:"100+ matches"});
    if ((stats.messagesSent ?? 0) >= 500) b.push({name:"Social Butterfly",icon:"🦋",color:"#FF69B4",desc:"500+ messages"});
    return b;
  };

  const unreadNotificationCount = useMemo(() => Math.max(activityFeed.filter(n => !n.read).length, serverNotifCount), [activityFeed, serverNotifCount]);

  // Audit fix (2026-09-08): the hamburger's Activity > Applied/Saved tabs
  // only ever had the bare brief ID for each entry (appliedBriefs/
  // savedBriefs are just id arrays), so every row fell back to a generic
  // "Quest #1" label — never the real brief title shown everywhere else
  // (Collab card, this same brief's own page). Mirrors the exact merge
  // CollabScreen already uses (userBriefs, then liveBriefs falling back to
  // the static BRIEFS demo set) so the lookup matches what's actually
  // rendered as "the briefs list" elsewhere in the app.
  const briefTitleById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const b of userBriefs) if (b?.id != null && b.title) map[String(b.id)] = b.title;
    for (const b of (liveBriefs?.length ? liveBriefs : BRIEFS)) if (b?.id != null && b.title && !map[String(b.id)]) map[String(b.id)] = b.title;
    return map;
  }, [userBriefs, liveBriefs]);

  // Merge server-side notifications (bookings, connections, check-ins) into the
  // activity feed so the Activity modal shows real DB rows, not just local events.
  useEffect(() => {
    const pid = authUser?.profile?.id;
    if (!pid) return;
    let cancelled = false;
    authFetch("/api/muse?type=notifications")
      .then(r => r.json())
      .then(j => {
        if (cancelled) return;
        const list = (j.notifications || []) as Notification[];
        if (!list.length) return;
        setActivityFeed(prev => {
          // Dedup by stable id, not by body text: two DIFFERENT notifications
          // can legitimately share identical text (e.g. two "Someone liked your
          // post" events), and the old text-based dedup silently dropped the
          // second one.
          const existing = new Set<number | undefined>(prev.map(a => a.id));
          const mapped = list
            .filter(n => n && n.body && !existing.has(n.id))
            .map((n) => ({
              id: n.id ?? uid(),
              type: n.type || "info",
              // Audit fix (Torreé batch Part B item 8): this used to
              // hardcode from/avatar to "" for every server-sourced
              // notification, which is what made ProfileScreen's Activity
              // tab show a generic "Someone" / ghost "S" avatar even when
              // the real sender's name and photo were available. The GET
              // ?type=notifications handler now embeds + normalizes the
              // sender profile (from_id -> muse_profiles) onto n.from/
              // n.avatar directly, same as feedbackGetNotifications
              // already did for MenuModal's own panel — a genuinely
              // senderless system notification (no from_id, e.g. a
              // booking reminder) still falls back to "Someone"/"S"
              // downstream, which is correct for those, not a bug.
              from: n.from || "",
              avatar: n.avatar || "",
              text: String(n.body),
              time: n.created_at ? new Date(n.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "",
              read: !!n.read,
            }));
          return mapped.length ? [...mapped.reverse(), ...prev] : prev;
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [authUser?.profile?.id]);

  const filteredProfiles = useMemo(() => {
    // Stable order guarantee: the demo/static deck is shuffled ONCE with a
    // per-mount random seed, then live profiles are APPENDED (never reshuffled),
    // and we do NOT re-sort by distance after first paint. A new seed on every
    // full page load/refresh means a different card shows first each time,
    // while the order stays fixed during a single session (no mid-view jumps).
    const seed = shuffleSeedRef.current;
    const mulberry = (a: number) => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const base = [...PROFILES];
    for (let i = base.length - 1; i > 0; i--) {
      const j = Math.floor(mulberry(seed + i) * (i + 1));
      [base[i], base[j]] = [base[j], base[i]];
    }
    // Audit fix (2026-09-08): liveProfiles come back from /api/muse?type=discover-ranked
    // pre-sorted server-side — boosted + complementary-side first, then by match
    // score (see get.ts) — specifically so a paid boost gets someone seen sooner.
    // This used to APPEND liveProfiles after the entire shuffled demo deck, which
    // silently discarded that ranking: a boosted real user could never appear
    // before dozens of unranked demo cards. Now real, ranked profiles lead (in
    // the order the server already computed — never re-sorted here), with the
    // shuffled demo deck filling in after. Demo-deck order among itself is still
    // untouched, so it doesn't jump mid-session.
    // Gating the static demo deck behind DEMO_MODE: in production this deck of
    // hardcoded creatives (ARCANA/AUDREY/CHER…) never leaks — the swipe deck is
    // pure live `discover-ranked` data, so nobody swipes fabricated people.
    const liveProfileList = (liveProfiles || []) as DiscoveryProfile[];
    const merged: DiscoveryProfile[] = DEMO_MODE && liveProfileList.length
      ? [...liveProfileList, ...base.filter((dp) => !liveProfileList.some((lp) => String(lp.id) === String(dp.id)))]
      : liveProfileList.length
        ? liveProfileList
        : (DEMO_MODE ? base : []);
    let list = showNsfw ? merged : merged.filter(p => !p.nsfw);
    if (filterStyles.length > 0) list = list.filter(p => p.styles.some((s: string) => filterStyles.includes(s)));
    if (filterScore > 50) list = list.filter(p => p.score >= filterScore);
    if (discoverSearch.trim()) {
      const q = discoverSearch.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.type?.toLowerCase().includes(q) || p.loc?.toLowerCase().includes(q) || p.styles?.some((s: string) => s.toLowerCase().includes(q)));
    }
    const enriched = list.map(p => {
      const geo = CITY_GEO[p.loc];
      // Static demo profiles have no showDistance flag (default true); live
      // profiles carry the target's own privacy preference from /api/muse/match —
      // don't compute/attach a distance figure for someone who opted out.
      const targetAllowsDistance = p.showDistance !== false;
      const distMi = myGeo && geo && targetAllowsDistance ? distanceMiles(myGeo, geo) : null;
      const boosted: DiscoveryProfile = geo ? { ...p, lat: geo.lat, lng: geo.long } : { ...p };
      if (distMi !== null) boosted.distanceMi = distMi;
      // Recompute live match % from the user's current type/looking (the duality
      // change). calcMatch is source-of-truth; static seed score is a floor only
      // when the user hasn't set a type yet.
      try {
        const meForMatch = { type: obData.type || "", styles: obData.styles || [], looking: obData.looking || [], zodiac: obData.zodiac, chinese: obData.chinese, mbti: obData.mbti, lifePath: obData.lifePath };
        const liveScore = calcMatch(meForMatch, p);
        if (obData.type) boosted.score = Math.min(99, Math.max(boosted.score, liveScore));
        boosted.matchReasons = matchReasons(meForMatch, p);
      } catch { console.debug("[muse] match explanation could not be calculated"); }
      if (boosted.badges?.length) {
        const badgeBoost = boosted.badges.reduce((acc: number, b) => {
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
    return enriched;
  }, [liveProfiles, showNsfw, filterStyles, filterScore, myGeo, discoverSearch, obData.chinese, obData.lifePath, obData.mbti, obData.type, obData.looking, obData.styles, obData.zodiac]);

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
        setCardAlbumPhotos((d.photos || []).map((p: { img_url: string }) => p.img_url));
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
  }, [setDailyLikes, setSuperLikes]);

  const flash = useCallback((color: string) => { setScreenFlash(color); setTimeout(() => setScreenFlash(null), 300); }, [setScreenFlash]);
  // Back-navigation history: showScreen pushes the screen we're leaving so a
  // back button can return to the ACTUAL previous page (e.g. Analytics → back
  // → Profile, not Discover). goBack pops the stack; falls back to discover.
  const screenHistoryRef = useRef<(typeof screen)[]>([]);
  const showScreen = useCallback((s: typeof screen) => {
    setScreen(prev => {
      if (prev !== s) {
        screenHistoryRef.current.push(prev);
        if (screenHistoryRef.current.length > 50) screenHistoryRef.current.shift();
      }
      return s;
    });
    analytics.screenView(s);
    try { window.scrollTo({ top: 0, behavior: "instant" }); } catch { console.debug("[muse] screen scroll reset failed"); }
  }, []);
  const goBack = useCallback(() => {
    const prev = screenHistoryRef.current.pop();
    const dest = prev && prev !== "auth" ? prev : "discover";
    setScreen(dest);
    analytics.screenView(dest);
    try { window.scrollTo({ top: 0, behavior: "instant" }); } catch { console.debug("[muse] screen scroll reset failed"); }
  }, []);

  const matchActions = useMemo(() => ({
    setExpandedMatchId, setChatTarget, showScreen, setMatchSwiping,
    setReportTarget, setShowReport, setUnmatchTarget, setBlockTarget, handleImgError, getIcebreaker, setViewProfile
  }), [setExpandedMatchId, setChatTarget, showScreen, setMatchSwiping, setReportTarget, setShowReport, setUnmatchTarget, setBlockTarget, handleImgError, getIcebreaker, setViewProfile]);

  const openHamburger = useCallback(() => { setHamburgerScreen(""); setShowHamburger(true); }, [setShowHamburger]);

  const handleOAuth = useCallback(async (provider: "google" | "facebook" | "x") => {
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
  }, [setAuthLoading, showToast]);

  const handleAuthClick = useCallback(async () => {
    if (authLoading) return;
    const e: Record<string,string> = {};
    if (!authEmail.trim()) e.email = "Email required";
    if (!authPass.trim()) e.pass = "Password required";
    // Sign-up password complexity is enforced server-side (validatePassword in
    // /api/muse/auth) and guided by the live strength meter here. It is
    // deliberately NOT hard-blocked client-side: an existing account whose
    // password predates these rules (or was created via OAuth) must still be
    // able to submit, so it can be recognised and sent to Log In instead of
    // dead-ending on "Needs a symbol".
    if (Object.keys(e).length) { setFormErrors(e); return; }
    setAuthLoading(true);
    try {
      // Was a bare fetch() with no timeout — a hung request here (the
      // server accepts the connection but never responds) left authLoading
      // stuck true forever: the Log In button stays on "Loading..."
      // indefinitely with no way out except a manual reload. Matches the
      // exact shape of the earliest "froze after clicking Log In" reports
      // from this engagement. fetchWithTimeout aborts and rejects into the
      // existing catch block below instead.
      // Try the credentials as a LOGIN first — on BOTH tabs. On the Sign Up tab
      // this is what stops the "spaz": entering a pre-existing account's
      // credentials signs the user straight in instead of dead-ending on
      // sign-up rules. A genuinely new email fails this login and falls through
      // to register below. This is a UX pre-check only; a login succeeds solely
      // with valid credentials, so it reveals nothing about which emails exist.
      let effectiveAction: "login" | "register" = "login";
      let r = await fetchWithTimeout("/api/muse/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email: authEmail.trim(), password: authPass }),
      });
      if (!r.ok && authMode === "signup") {
        r = await fetchWithTimeout("/api/muse/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "register",
            email: authEmail.trim(),
            password: authPass,
            name: authName || authEmail.split("@")[0],
          }),
        });
        effectiveAction = "register";
      }
      const j = await r.json();
      // Sign-up attempted with an email that already has an account: move the
      // user to the tab that can actually help them and say so plainly.
      if (r.status === 409 && j?.code === "ACCOUNT_EXISTS") {
        setAuthMode("login");
        const msg = j.error || "You already have an account — log in instead.";
        setFormErrors({ email: msg });
        showToast({ msg, type: "error" });
        setAuthLoading(false);
        return;
      }
      if (!r.ok) { setFormErrors({ email: j.error || "Auth failed" }); setAuthLoading(false); return; }
      if (j.registrationPending) {
        setAuthMode("login");
        setAuthPass("");
        showToast(j.message || "Check your email to continue, then sign in.");
        setAuthLoading(false);
        return;
      }
      // The login endpoint now returns the session token directly — use it.
      const accessToken = j.session?.access_token || "";
      const refreshToken = j.session?.refresh_token || "";
      const userObj = { id: j.user.id, email: j.user.email, profile: j.profile || null };
      setAuthUser(userObj);
      if (refreshToken) setRefreshToken(refreshToken);
      safeSetItem("muse_user", JSON.stringify({ access_token: accessToken, refresh_token: refreshToken, user: userObj }));
      // "Remember me": only pre-fill the email next time when opted in. The
      // session itself is persisted separately — see saveState(), which writes
      // `authUser: authRemember ? authUser : null`.
      try {
        if (authRemember) localStorage.setItem("muse_remember_email", authEmail.trim());
        else localStorage.removeItem("muse_remember_email");
      } catch { /* storage unavailable */ }
      // Attach session to browser supabase client so realtime works under RLS.
      if (accessToken) {
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).catch(() => {});
      }
      if (j.profile) {
        setCurrentUser(prev => ({ ...prev, name: j.profile.name || prev.name, avatar: j.profile.avatar || prev.avatar, type: j.profile.type || prev.type }));
      }
      setScreen(effectiveAction === "register" ? "onboard" : "discover");
      if (effectiveAction === "register") setObStep(0);
      analytics[effectiveAction === "register" ? "signup" : "login"]("email");
      flash("#FFD700");
    } catch { showToast({ msg: "Login failed — check your credentials", type: "error" }); }
    setAuthLoading(false);
  }, [authMode, authEmail, authPass, authName, authLoading, authRemember, flash, setAuthLoading, setAuthMode, setAuthPass, setFormErrors, setObStep, showToast]);

  const swipeLocked = useRef(false);
  const [intentProfile, setIntentProfile] = useState<Profile|null>(null);
  const [userDefaultIntent, setUserDefaultIntent] = useState<string>("");
  const [intentSelection, setIntentSelection] = useState<string[]>([]);
  const [showNoteTooltip, setShowNoteTooltip] = useState(() => !safeGetItem("muse_note_seen"));

  const isUnlimited = true;

  // Contextual upsell modal — shown in place of a plain toast the moment a
  // free-tier user hits a Pro-gated limit (daily likes, super likes, "Likes
  // You" profiles, etc). `feature`/`reason` are set per-gate right before
  // opening so the same modal can explain whichever benefit was just blocked.
  const [upsell, setUpsell] = useState<{ feature: string; reason: string; icon?: string } | null>(null);
  const closeUpsell = useCallback(() => setUpsell(null), []);

  const doSwipe = useCallback((dir: "left" | "right" | "super", intentOverride?: string) => {
    if (swipeLocked.current) return;
    swipeLocked.current = true;
    setTimeout(() => { swipeLocked.current = false; }, 500);
    setSwipeDir(dir === "left" ? "left" : "right");
    setTimeout(() => setSwipeDir(null), 800);
    if (!isUnlimited && dailyLikes <= 0 && dir === "right") { setUpsell({ feature: "Unlimited Likes", reason: "You've used all your likes for today. Go Pro to like as many creatives as you want, with no daily limit.", icon: "💛" }); return; }
    const p = filteredProfiles[currentIdx];
    if (!p) return;
    if (!isUnlimited && dir === "super" && superLikes <= 0) { setUpsell({ feature: "More Super Likes", reason: "You're out of super likes for today. Muses Pro's unlimited likes means you're never stuck waiting for a reset.", icon: "💜" }); return; }
    analytics.discoverSwipe(dir as "left" | "right" | "super", String(p.id), p.type);
    if (dir === "right" || dir === "super") {
      const effectiveIntent = intentOverride || userDefaultIntent;
      if (!effectiveIntent) { setIntentProfile(p); setIntentSelection([]); setShowIntentPicker(true); swipeLocked.current = false; return; }
      const intent = dir === "super" ? "super" : effectiveIntent;
      const matchScore = p.matchScore ?? calcMatch({ styles: obData.styles || [], looking: obData.looking || [], zodiac: obData.zodiac, chinese: obData.chinese, mbti: obData.mbti, lifePath: obData.lifePath }, p);
      // Every right-swipe is a real like — the backend `match` action always
      // fires (creating a muse_matches row + notifying the target). `isMatch`
      // only decides whether we show the celebratory "You matched!" overlay;
      // it must NOT swallow the like, or a like on a low-score profile is lost.
       const isMatch = !DEMO_MODE && matchScore > 50;
      // Round 46 fix: this used to call apiFetch, which throws on any
      // non-2xx response (see apiFetch's own `if (!res.ok) throw` a few
      // lines up in this file). The `.then()` below never saw a non-ok
      // response — apiFetch had already thrown by the time it would have
      // run — so every failure (rate limit, blocked, suspended, a genuine
      // 500) landed in the same generic `.catch()` and showed the same
      // unhelpful "Match failed — try again" with no way to tell what
      // actually happened. Switched to authFetch (resolves instead of
      // throwing on non-2xx) so the status/body can actually be inspected,
      // and surfaced the specific cases the server can return
      // (matching.ts's matchCreate: 429 rate limited, 403 blocked/
      // suspended, 400 bad target) instead of one catch-all message.
      if (DEMO_MODE) {
        showToast("Demo interest preview — no person was notified and no match was created.");
      } else authFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "match", target_id: p.id, intent }) }).then(async (r) => {
        if (!r.ok) {
          const d = await r.json().catch((): { error?: string } => ({}));
          if (r.status === 429) showToast("You're swiping a bit fast — give it a few seconds and try again");
          else if (r.status === 403) showToast(d?.error || "Can't like this profile right now");
          else showToast(d?.error || "Match failed — try again");
          return;
        }
        const d = await r.json().catch(() => ({}));
        // If the server reported this is a mutual match (target already liked
        // us), surface the overlay even below the client score threshold.
        if (d?.matched && !isMatch) {
          const newMatch: Match = { ...p, messages: [] };
          setMatches(prev => [...prev, newMatch]);
          setMatchStreak(prev => prev + 1);
          setTimeout(() => {
            setShowMatchOverlay(newMatch);
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 1500);
            setExpandedMatchId(String(newMatch.id));
            analytics.discoverMatch(String(p.id), p.type);
            setActivityFeed(prev => [{id:uid(),type:"match",from:p.name,avatar:p.img,text:"You matched with "+p.name+"!",time:"Just now",read:false},...prev]);
            flash("#FFD700");
          }, 450);
        }
      }).catch(() => {
        showToast("Match failed — try again");
      });
      if (isMatch) {
        const newMatch: Match = { ...p, messages: [] };
        setMatches(prev => [...prev, newMatch]);
        setMatchStreak(prev => prev + 1);
        setActivityFeed(prev => [{id:uid(),type:"match",from:p.name,avatar:p.img,text:"You matched with "+p.name+"!",time:"Just now",read:false},...prev]);
        setTimeout(() => {
          setShowMatchOverlay(newMatch);
          setMatchAnimVariant(Math.floor(Math.random() * MATCH_VARIANTS.length));
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 2500);
          setExpandedMatchId(String(newMatch.id));
          analytics.discoverMatch(String(p.id), p.type);
          flash("#FFD700");
        }, 450);
      }
      if (dir === "super") { if (!isUnlimited) { setSuperLikes(prev => Math.max(0, prev - 1)); } setCurrentUser(prev => ({ ...prev, stats: { ...prev.stats, superLikes: prev.stats.superLikes + 1 } })); flash("#D4A5FF"); }
      else { if (!isUnlimited) { setDailyLikes(prev => Math.max(0, prev - 1)); } }
      setCurrentUser(prev => ({ ...prev, stats: { ...prev.stats, likes: prev.stats.likes + 1 } }));
    } else {
      // Passing costs nothing — only Like/Super Like are metered by dailyLikes/superLikes.
      setCurrentUser(prev => ({ ...prev, stats: { ...prev.stats, passes: prev.stats.passes + 1 } }));
    }
    const flyEl = (dragRef.current.el && dragRef.current.el.isConnected)
      ? dragRef.current.el
      : (typeof document !== "undefined" ? (document.querySelector('.swipe-card.top-card') as HTMLElement | null) : null);
    if (flyEl) {
      // Keep the outgoing card opaque until it has cleared the clipped deck.
      // Fading it from the first animation frame exposed the queued card behind
      // it, and the old 260ms swap removed the card before its 360ms transform
      // had finished. That produced a visible "peek" during every pass/like.
      flyEl.style.transition = "transform .36s cubic-bezier(.36,0,.66,-0.02)";
      flyEl.style.transform = dir === "super"
        ? "translateY(-130%) scale(0.92)"
        : `translateX(${dir === "right" ? 150 : -150}%) rotate(${dir === "right" ? 24 : -24}deg)`;
      flyEl.style.opacity = "1";
    }
    const swapDelay = flyEl ? 380 : 0;
    const swapToNext = () => {
      setRewindStack(prev => [...prev, currentIdx]);
      setCurrentIdx(prev => prev + 1);
      setCurrentPhotoIdx(0);
      setPortfolioPhotoIdx(0);
      setPromptIdx(0);
      setCardScrolled(false);
    };
    if (swapDelay > 0) setTimeout(swapToNext, swapDelay);
    else swapToNext();
    if (dir === "right" || dir === "super") trackQuest("swipe", "first_swipe", "like_profile");
    else trackQuest("swipe", "first_swipe");
  }, [currentIdx, dailyLikes, superLikes, filteredProfiles, isUnlimited, flash, obData, userDefaultIntent, trackQuest, setCurrentIdx, setDailyLikes, setExpandedMatchId, setMatchAnimVariant, setMatchStreak, setMatches, setRewindStack, setShowConfetti, setShowIntentPicker, setShowMatchOverlay, setSuperLikes, setSwipeDir, showToast]);

  useEffect(() => { if(screen!=="discover")return;const onKey=(e:KeyboardEvent)=>{if(e.key==="ArrowLeft"){e.preventDefault();doSwipe("left")}if(e.key==="ArrowRight"){e.preventDefault();doSwipe("right")}};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey)},[screen,doSwipe]);

  // Pause ambient animations when tab hidden (battery/thermal/cpu savings)
  useEffect(() => {
    const onVis = () => { document.body.classList.toggle("animations-paused", document.hidden); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Story auto-advance: 5s per story, then next (or close at the end)
  useEffect(() => {
    if (showStory === null) return;
    const timer = setTimeout(() => {
      setShowStory(prev => (prev !== null && prev < stories.length - 1) ? prev + 1 : null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [showStory, stories.length]);

  const doRewind = useCallback(() => {
    if (rewindStack.length === 0) { showToast("No profiles left to undo"); return; }
    const prev = rewindStack[rewindStack.length - 1];
    setRewindStack(stack => stack.slice(0, -1));
    setCurrentIdx(prev);
    setCurrentPhotoIdx(0);
    setPortfolioPhotoIdx(0);
    setPromptIdx(0);
    setCardScrolled(false);
    flash("#D4A5FF");
  }, [rewindStack, flash, setCurrentIdx, setRewindStack, showToast]);

  const doLikeWithNote = useCallback((anchor?: LikeAnchor) => {
    setShowNoteTooltip(false); safeSetItem("muse_note_seen","1");
    const p = filteredProfiles[currentIdx];
    if (!p) return;
    if (!isUnlimited && dailyLikes <= 0) { setUpsell({ feature: "Unlimited Likes", reason: "You've used all your likes for today. Go Pro to like as many creatives as you want, with no daily limit.", icon: "💛" }); return; }
    setNoteTargetProfile(p);
    setLikeNoteAnchor(anchor ?? null);
    // Prefill the note from the anchor (still editable) so the composer opens
    // already pointed at what was tapped — Hinge-style anchored likes.
    setLikeNoteText(anchor
      ? (anchor.type === "prompt" ? `Loved your prompt: "${anchor.value}"` : `Loved your ${anchor.value.toLowerCase()}!`)
      : "");
    setShowLikeNote(true);
  }, [currentIdx, dailyLikes, filteredProfiles, isUnlimited]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const target = e.target as HTMLElement;
    // If user taps inside the scrollable card info area, let native scroll handle it
    // Don't capture pointer — capture steals all subsequent pointer events from children
    if (target.closest && target.closest('.card-info-scroll')) {
      return;
    }
    if (target.closest && (target.closest('.card-action-btn') || target.closest('.card-portfolio-btn') || target.closest('.card-photo-thumb') || target.closest('button') || target.closest('a'))) return;
    const card = e.currentTarget as HTMLElement;
    const cardTop = card.getBoundingClientRect().top;
    const relY = e.clientY - cardTop;
    dragRef.current = { startX: e.clientX, startY: e.clientY, active: true, relY, startTime: Date.now(), el: card, axis: null };
    // Only capture pointer if user is NOT starting inside the scrollable card
    // info area — capture steals all subsequent pointer events from children,
    // which breaks native scroll in .card-info-scroll.
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
      if (dragRef.current.axis === null) {
      if (absDx < 5 && absDy < 5) return;
      if (absDy > absDx) {
        // Vertical gesture — release so native scroll takes over.
        dragRef.current.active = false;
        (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
        return;
      }
      // Require horizontal movement to be significantly greater than vertical
      // before locking into swipe mode — lets vertical scroll win by default.
      if (absDx < absDy * 1.5) return;
      dragRef.current.axis = "x";
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
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    const dx = e.clientX - dragRef.current.startX;
    const committed = dragRef.current.axis === "x" && Math.abs(dx) > 80;
    if (committed) {
      doSwipe(dx > 0 ? "right" : "left");
    }
    const el = dragRef.current.el;
    if (el && !committed) {
      el.style.transition = "transform .42s cubic-bezier(.16,1,.3,1)";
      el.style.transform = "";
    }
    if (likeLabelRef.current) likeLabelRef.current.style.opacity = "0";
    if (nopeLabelRef.current) nopeLabelRef.current.style.opacity = "0";
    if (superLabelRef.current) superLabelRef.current.style.opacity = "0";
  }, [doSwipe]);

  const onPointerCancel = useCallback(() => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    const el = dragRef.current.el;
    if (el) {
      el.style.transition = "transform .4s cubic-bezier(.4,0,.2,1)";
      el.style.transform = "";
    }
    if (likeLabelRef.current) likeLabelRef.current.style.opacity = "0";
    if (nopeLabelRef.current) nopeLabelRef.current.style.opacity = "0";
    if (superLabelRef.current) superLabelRef.current.style.opacity = "0";
  }, []);

  const openChat = useCallback((match: Match) => { setChatTarget(match); setScreen("chat"); }, [setChatTarget]);

  const sanitizeInput = (text: string) => text.replace(/[<>]/g, '').slice(0, 500);
  const toggleSocial = useCallback((key: string) => {
    const currentlyConnected = obConnectedSocials[key];
    if (currentlyConnected) {
      // Disconnect — the endpoint reads provider from the query string (not
      // a JSON body) and only exports a GET handler, so this has to match
      // that shape rather than POSTing a body.
      apiFetch(`/api/muse/social?provider=${key}&action=disconnect`).then(() => {
        setObConnectedSocials(prev => ({ ...prev, [key]: false }));
        showToast(`${key.charAt(0).toUpperCase() + key.slice(1)} disconnected`);
      }).catch(() => showToast("Failed to disconnect"));
    } else {
      // Connect - the endpoint requires an auth bearer header to identify
      // the caller, which a raw window.location.href navigation can't
      // send. Fetch it (authenticated) for the provider's real OAuth URL,
      // then navigate the browser there ourselves.
      apiFetch(`/api/muse/social?provider=${key}&action=auth`)
        .then(r => r.json())
        .then(d => { if (d.authUrl) window.location.href = d.authUrl; else showToast(d.error || `Couldn't connect ${key}`); })
        .catch(() => showToast(`Couldn't connect ${key}`));
    }
  }, [apiFetch, obConnectedSocials, setObConnectedSocials, showToast]);
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

    const myId = authUser?.profile?.id || authUser?.id || "local";
    // Generated once and threaded through to both the optimistic bubble and
    // the server insert so history-merge can dedup by id instead of content —
    // two distinct messages with identical text sent close together used to
    // get collapsed into one.
    const clientMsgId = `${myId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const userMsg = { from: "me", text: clean, time: now, clientMsgId };
    const targetId = String(chatTarget.id);
    setChatTarget(prev => prev ? { ...prev, messages: [...prev.messages, userMsg] } : prev);
    setMatches(prev => prev.map(m => String(m.id) === targetId ? { ...m, messages: [...m.messages, userMsg] } : m));
    setChatInput("");
    setTimeout(() => messagesEndRef.current?.scrollIntoView({behavior:"smooth"}), 50);
    let sent = true;
    try { sent = await persistMessage({ myId, theirId: targetId, text: clean, clientMsgId }); } catch { sent = false; }
    // persistMessage returns false (never throws) on a real failure — safety
    // block, rate limit, or a block between the two of you. The bubble was
    // already shown optimistically above; without this the sender would see
    // "sent" even when the message never reached the other person at all.
    if (!sent && myId !== "local") {
      setChatTarget(prev => prev ? { ...prev, messages: prev.messages.filter(m => m !== userMsg) } : prev);
      setMatches(prev => prev.map(m => String(m.id) === targetId ? { ...m, messages: m.messages.filter(mm => mm !== userMsg) } : m));
      showToast({ msg: "Message couldn't be sent", type: "error" });
      return;
    }
    analytics.messageSend(String(chatTarget?.id || ""), false);
    trackQuest("send_message", "first_message");
    // Show typing + simulated reply only in demo mode (no real remote partner).
    if (!DEMO_MODE) return;
    setTypingTarget(Number(chatTarget.id));
    setTimeout(() => {
      setTypingTarget(null);
      const replies = ["Great vision, let's work on this","I'm available — tell me more about the project","This is exactly what I'm looking for","Let's make something great together","This aligns with what I do best","I'd be glad to bring this to life","Can we schedule a call to discuss?","I've been looking for something like this","Ready when you are — let's create","This is the right fit for my portfolio"];
      const reply = { from: "them" as const, text: replies[~~(Math.random() * replies.length)], time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
      setChatTarget(prev => prev ? { ...prev, messages: [...prev.messages, reply] } : prev);
      setMatches(prev => prev.map(m => String(m.id) === targetId ? { ...m, messages: [...m.messages, reply] } : m));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({behavior:"smooth"}), 50);
    }, 1200 + Math.random() * 2000);
  }, [chatInput, chatTarget, authUser, trackQuest, setChatInput, setChatTarget, setMatches, setShowDisclosureModal, setTypingTarget, showToast]);

  // Send an image message (chat attach button → uploaded URL → image bubble).
  const sendChatImg = useCallback(async (imgUrl: string) => {
    if (!imgUrl || !chatTarget) return;
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const myId = authUser?.profile?.id || authUser?.id || "local";
    const clientMsgId = `${myId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const userMsg = { from: "me" as const, text: "", img: imgUrl, time: now, clientMsgId };
    const targetId = String(chatTarget.id);
    setChatTarget(prev => prev ? { ...prev, messages: [...prev.messages, userMsg] } : prev);
    setMatches(prev => prev.map(m => String(m.id) === targetId ? { ...m, messages: [...m.messages, userMsg] } : m));
    setTimeout(() => messagesEndRef.current?.scrollIntoView({behavior:"smooth"}), 50);
    let sent = true;
    try { sent = await persistMessage({ myId, theirId: targetId, text: "", img: imgUrl, clientMsgId }); } catch { sent = false; }
    if (!sent && myId !== "local") {
      setChatTarget(prev => prev ? { ...prev, messages: prev.messages.filter(m => m !== userMsg) } : prev);
      setMatches(prev => prev.map(m => String(m.id) === targetId ? { ...m, messages: m.messages.filter(mm => mm !== userMsg) } : m));
      showToast("Image couldn't be sent");
      return;
    }
    analytics.messageSend(String(chatTarget?.id || ""), true);
    if (!DEMO_MODE) return;
    setTypingTarget(Number(chatTarget.id));
    setTimeout(() => {
      setTypingTarget(null);
      const replies = ["Love this shot! 🔥","This is gorgeous","Wow, where was this taken?","You've got a great eye","This is exactly my style","Incredible work","Okay, this is art","I need to know the story behind this"];
      const reply = { from: "them" as const, text: replies[~~(Math.random() * replies.length)], time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
      setChatTarget(prev => prev ? { ...prev, messages: [...prev.messages, reply] } : prev);
      setMatches(prev => prev.map(m => String(m.id) === targetId ? { ...m, messages: [...m.messages, reply] } : m));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({behavior:"smooth"}), 50);
    }, 1200 + Math.random() * 2000);
  }, [chatTarget, authUser, setChatTarget, setMatches, setTypingTarget, showToast]);

  // Real-time incoming messages for the active conversation.
  useEffect(() => {
    if (!chatTarget || !authUser?.profile?.id) return;
    const myId = authUser.profile.id;
    const theirId = String(chatTarget.id);
    const sub = subscribeToConversation({
      myId,
      theirId,
      onMessage: (senderId, text, img) => {
        const msg = { from: "them" as const, text, img, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
        setChatTarget(prev => prev ? { ...prev, messages: [...prev.messages, msg] } : prev);
        setMatches(prev => prev.map(m => String(m.id) === theirId ? { ...m, messages: [...m.messages, msg] } : m));
        setTimeout(() => messagesEndRef.current?.scrollIntoView({behavior:"smooth"}), 50);
      },
      onStatus: (status) => setRealtimeStatus(status),
      onTyping: () => {
        setThemTyping(true);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => setThemTyping(false), 2200);
      },
    });
    sendTypingRef.current = sub.sendTyping;
    return sub.unsubscribe;
  }, [authUser?.profile?.id, chatTarget, chatTarget?.id, authUser?.id, setChatTarget, setMatches, setThemTyping]);

  // Load persisted conversation history when a chat is opened -- the realtime
  // subscription above only catches messages that arrive *after* it connects,
  // so without this a returning user (new device, cleared storage, or just a
  // missed message) would only ever see whatever happens to be in local state.
  // Server history is treated as canonical; any local-only messages (e.g. an
  // optimistic send not yet reflected server-side) are appended after it.
  useEffect(() => {
    if (!chatTarget || !authUser?.profile?.id) return;
    const myId = authUser.profile.id;
    const theirId = String(chatTarget.id);
    let cancelled = false;
    fetchConversationHistory({ myId, theirId }).then(history => {
      if (cancelled || !history.length) return;
      // Prefer id-based dedup (clientMsgId, threaded through from send time)
      // over content matching — two distinct messages sent close together
      // with identical text+img used to collapse into one under the old
      // text+"|"+img key. Fall back to content matching only for messages
      // that predate this fix and never got a clientMsgId.
      const seenIds = new Set(history.map(h => h.clientMsgId).filter(Boolean));
      const seenContent = new Set(history.map(h => h.text + "|" + (h.img || "")));
      const isDupe = (m: { clientMsgId?: string; text?: string; img?: string }) => m.clientMsgId ? seenIds.has(m.clientMsgId) : seenContent.has((m.text || "") + "|" + (m.img || ""));
      setChatTarget(prev => {
        if (!prev || String(prev.id) !== theirId) return prev;
        const localOnly = (prev.messages || []).filter(m => !isDupe(m));
        return { ...prev, messages: [...history, ...localOnly] };
      });
      setMatches(prev => prev.map(m => {
        if (String(m.id) !== theirId) return m;
        const localOnly = (m.messages || []).filter(mm => !isDupe(mm));
        return { ...m, messages: [...history, ...localOnly] };
      }));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [authUser?.profile?.id, chatTarget, chatTarget?.id, authUser?.id, setChatTarget, setMatches]);

  const saveProfileEdits = useCallback(async () => {
    setCurrentUser(prev => ({ ...prev, name: editName || prev.name, avatar: editAvatar || prev.avatar, type: editType || prev.type }));
    setObData(prev => ({ ...prev, bio: editBio, loc: editLoc, type: editType || prev.type, looking: editLooking.length ? editLooking : prev.looking, mediaKitUrl: editMediaKit }));
    let geo: { lat: number; long: number; city?: string } | null = null;
    try { geo = await getGeolocation(); } catch { console.debug("[muse] profile location lookup failed"); }
    setShowEditProfile(false);
    // Auto-detect NSFW from bio keywords (matches the chat disclosure trigger regex)
    const bioLower = (editBio || "").toLowerCase();
    const bioHasNsfw = /\bnude\b|\bnudity\b|\bnsfw\b|\bnsf[ww]\b|\bexplicit\b|\bboudoir\b|\bpenetrat\b|\bsexual\b|\berotic\b|\btopless\b|\bundressed\b|\bintimate\b|\bsensual\b|\badult\b/i.test(bioLower);
    const nsfwValue = editNsfw || bioHasNsfw;
    try {
      const r = await authFetch("/api/muse/auth", {
        method: "POST",
        body: JSON.stringify({
          action: "update-profile",
          name: editName,
          bio: editBio,
          loc: editLoc,
          avatar: editAvatar,
          type: editType,
          looking: editLooking,
          nsfw: nsfwValue,
          media_kit_url: editMediaKit.trim(),
          // Torreé audit item 6: carry the "Other" custom-type review flag
          // through to the saved profile.
          ...(editCustomTypePending ? { custom_type_pending: true } : {}),
          ...(geo ? { lat: geo.lat, long: geo.long, city: geo.city } : {}),
        }),
      });
      if (!r.ok) throw new Error("save failed");
      if (nsfwValue && !currentUser.nsfw) showToast("Profile marked as NSFW — your content will be age-gated");
      else showToast("Saved!");
      trackQuest("update_profile", "complete_profile");
      if ((editBio || "").trim().length >= 50) trackQuest("write_bio");
      if ((obData.styles || []).length > 0) trackQuest("set_styles");
    } catch {
      showToast("Failed to save — try again");
    }
  }, [editName, editBio, editLoc, editAvatar, editType, editCustomTypePending, editLooking, editNsfw, editMediaKit, obData.styles, setObData, setShowEditProfile, showToast, currentUser.nsfw, trackQuest]);

  return !hydrated ? <PageSplash /> : (
    <div style={{"display":"contents"}}>
      <a href="#muse-main" className="sr-only" style={{zIndex:99999}} onClick={()=>{requestAnimationFrame(()=>document.getElementById("muse-main")?.focus())}} onFocus={(e)=>{e.currentTarget.style.cssText="position:fixed;top:0;left:0;padding:8px 16px;background:var(--gold);color:#0a0612;fontWeight:700;borderRadius:0 0 8px 0;width:auto;height:auto;clip:auto;overflow:visible;margin:0"}} onBlur={(e)=>{e.currentTarget.removeAttribute("style")}}>Skip to main content</a>
      <CardPreloader currentIdx={currentIdx} profiles={filteredProfiles} />
      <Confetti active={showConfetti} />
      
      {swipeDir && <SwipeParticles active dir={swipeDir} />}
      <BackgroundScene flash={screenFlash} />
      {/* Torreé audit (2026-09-16): the three layers previously shared nearly
          the same baseline (85/100/115, a 30px band), the same wavelength
          (~180-220px per crest), and similar amplitude — stacked with
          decreasing opacity that reads as one wave traced three times
          ("stacked pringles chips") rather than three distinct bodies of
          water at different depths. Now each layer has its own baseline
          band, crest frequency and amplitude: layer 1 is a few big, slow,
          far-reaching swells sitting highest; layer 2 is mid-frequency
          chop sitting lower and further back; layer 3 is small, tight
          ripples hugging the bottom, furthest back. The bands only lightly
          overlap, so depth reads clearly even before the drift animation
          (staggered durations/delays, unchanged) adds motion parallax. */}
      <div className="wave-bottom" aria-hidden="true">
        <svg viewBox="0 0 1440 160" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path className="wave-path-1" d="M0,95 C240,45 480,135 720,85 C960,35 1200,120 1440,70 L1440,160 L0,160 Z" />
        </svg>
        <svg viewBox="0 0 1440 160" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path className="wave-path-2" d="M0,135 C120,108 240,152 360,122 C480,92 600,148 720,118 C840,88 960,144 1080,114 C1200,84 1320,140 1440,122 L1440,160 L0,160 Z" />
        </svg>
        <svg viewBox="0 0 1440 160" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path className="wave-path-3" d="M0,148 C60,138 120,153 180,143 C240,133 300,151 360,141 C420,131 480,149 540,139 C600,129 660,147 720,137 C780,127 840,145 900,135 C960,125 1020,143 1080,133 C1140,123 1200,141 1260,131 C1320,121 1380,139 1440,133 L1440,160 L0,160 Z" />
        </svg>
        {/* Round 43: 4th, deepest layer added per Torree's "more stacks of
            tides... more full" request. Fills in the bottom band so the
            taller container (height 22%->32%) reads as a fuller body of
            water rather than the same 3 curves just stretched over more
            space. Flattest, broadest curve, slowest drift, furthest back. */}
        <svg viewBox="0 0 1440 160" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path className="wave-path-4" d="M0,158 C180,150 360,159 540,152 C720,145 900,158 1080,150 C1200,145 1320,155 1440,150 L1440,160 L0,160 Z" />
        </svg>
      </div>
      {showMatchOverlay && (
        <MatchOverlay
          match={showMatchOverlay}
          variant={MATCH_VARIANTS[matchAnimVariant] || MATCH_VARIANTS[0]}
          currentUserAvatar={currentUser.avatar}
          confettiPieces={confettiPieces}
          onClose={() => setShowMatchOverlay(null)}
          onMessage={() => { setShowMatchOverlay(null); openChat(showMatchOverlay); }}
          onImageError={handleImgError}
        />
      )}
      {showIntentPicker && intentProfile && (
        <div className="intent-overlay" ref={intentPickerTrap} role="dialog" aria-modal="true" aria-label="Intent picker" onPointerDown={(e) => { if (e.target === e.currentTarget) { setShowIntentPicker(false); setIntentProfile(null); setIntentSelection([]); } }}>
          <div className="intent-modal">
            <div style={{textAlign:"center",marginBottom:16}}>
              <Image loading="lazy" src={intentProfile.img} alt="Avatar" width={60} height={60} style={{borderRadius:"50%",objectFit:"cover",marginBottom:8}} onError={handleImgError} />
              <div style={{fontSize:16,fontWeight:700,color:"var(--text)"}}>{intentProfile.name}</div>
              <div style={{fontSize:12,color:"var(--muted)"}}>{intentProfile.type}</div>
            </div>
            <div style={{fontSize:13,color:"var(--text2)",textAlign:"center",marginBottom:16}}>What's your intent with {intentProfile.name.split(" ")[0]}? <span style={{opacity:0.7}}>(up to 2)</span></div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {(getMuseRole({ audience: currentUser.audience, type: currentUser.type || obData.type }) === "muse" ? [
                {icon:"📌",label:"Book / Hire",desc:"Bring them onto a project you're casting or producing",intent:"hire"},
                {icon:"🤝",label:"Collaborate",desc:"Work together on a project",intent:"collab"},
                {icon:"📁",label:"Scout for Future Work",desc:"Keep them in mind for upcoming briefs",intent:"scout"},
                {icon:"🔗",label:"Connect",desc:"Grow your industry network",intent:"connect"},
              ] : [
                {icon:"🤝",label:"Collaborate",desc:"Work together on a project",intent:"collab"},
                {icon:"💼",label:"Hire / Commission",desc:"Professional paid work",intent:"hire"},
                {icon:"🔗",label:"Connect",desc:"Grow your creative network",intent:"connect"},
                {icon:"👁️",label:"Inspired By",desc:"Your work inspires me",intent:"inspire"},
              ]).map(({icon,label,desc,intent})=>(
                <button key={intent} className={`intent-btn ${intentSelection.includes(intent) ? "selected" : ""}`} onClick={(e)=>{
                  e.stopPropagation();
                  // Round 46: two-tap flow — first tap highlights option 1,
                  // second tap highlights option 2 (and vice-versa). No
                  // other outline, no ripple, no hover state — just the
                  // selected background swap. If a third tap lands on an
                  // already-selected item, it deselects; if it lands on a
                  // third option while two are already chosen, it's ignored.
                  if (intentSelection.length >= 2 && !intentSelection.includes(intent)) return;
                  setIntentSelection(prev => prev.includes(intent) ? prev.filter(i => i !== intent) : [...prev, intent]);
                }} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,background:intentSelection.includes(intent) ? "var(--gold)" : "var(--glass)",cursor:"pointer",width:"100%",textAlign:"left",transition:"all .15s"}}
                >
                  <span style={{fontSize:28}}>{icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:700,color:"var(--text)"}}>{label}</div>
                    <div style={{fontSize:11,color:"var(--muted)"}}>{desc}</div>
                  </div>
                </button>
              ))}
            </div>
            {intentSelection.length > 0 && (
              <button className="intent-submit" onClick={()=>{
                const chosenIntent = intentSelection.join("+");
                setUserDefaultIntent(chosenIntent);
                setShowIntentPicker(false);
                setIntentProfile(null);
                setIntentSelection([]);
                doSwipe("right", chosenIntent);
              }} style={{display:"block",width:"100%",marginTop:12,padding:8,border:"none",background:"var(--gold)",color:"var(--text)",fontSize:12,cursor:"pointer",fontWeight:600}}>Submit {intentSelection.length} intent{(intentSelection.length > 1 ? "s" : "")}</button>
            )}
            <button className="intent-skip" onClick={()=>{setShowIntentPicker(false);setIntentProfile(null);setIntentSelection([]);setUserDefaultIntent("");doSwipe("left")}} style={{display:"block",width:"100%",marginTop:12,padding:8,border:"none",background:"none",color:"var(--muted)",fontSize:12,cursor:"pointer"}}>Skip this profile</button>
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
      {toastMsg && (
        <button type="button" style={{ position: "fixed", left: "50%", bottom: "calc(84px + env(safe-area-inset-bottom,0px))", transform: "translateX(-50%)", zIndex: 4000, background: "rgba(20,12,34,0.92)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: `1px solid ${toastMsg.type === "success" ? "rgba(152,251,152,0.4)" : toastMsg.type === "error" ? "rgba(255,107,107,0.45)" : "rgba(255,215,0,0.28)"}`, color: "#f5f0ff", padding: "10px 18px", borderRadius: 999, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", boxShadow: "0 6px 24px rgba(0,0,0,0.5)", pointerEvents: toastMsg.onTap ? "auto" : "none", cursor: toastMsg.onTap ? "pointer" : "default", animation: "museToastIn .22s ease-out forwards" }} onClick={toastMsg.onTap}>
          {toastMsg.type === "success" ? "✓ " : toastMsg.type === "error" ? "✕ " : ""}{toastMsg.msg}
        </button>
      )}
      <ScreenErrorBoundary name="MenuModal">
        <MenuModal showHamburger={showHamburger} setShowHamburger={setShowHamburger} hamburgerScreen={hamburgerScreen} setHamburgerScreen={setHamburgerScreen} showScreen={showScreen} liveCommunities={liveCommunities} liveEvents={liveEvents} showNsfw={showNsfw} rsvpdEvents={rsvpdEvents} setRsvpdEvents={setRsvpdEvents} matches={matches} openChat={openChat} setChatTarget={setChatTarget} showToast={showToast} handleImgError={handleImgError} setViewProfile={setViewProfile} currentUser={currentUser} showNewPost={showNewPost} setShowNewPost={setShowNewPost} newPostTitle={newPostTitle} setNewPostTitle={setNewPostTitle} newPostBody={newPostBody} setNewPostBody={setNewPostBody} setForumPosts={setForumPosts} liveForum={liveForum} setLiveForum={setLiveForum} forumSort={forumSort} setForumSort={setForumSort} expandedPost={expandedPost} setExpandedPost={setExpandedPost} commentText={commentText} setCommentText={setCommentText} setSupportOpen={setSupportOpen} doLogoutFull={doLogoutFull} discoveryPrefs={discoveryPrefs} setDiscoveryPrefs={setDiscoveryPrefs} notifPrefs={notifPrefs} setNotifPrefs={setNotifPrefs} setShowNsfw={setShowNsfw} appliedBriefs={appliedBriefs} savedBriefs={savedBriefs} bookingsForHub={myBookings} setShowSafetyCheckin={setShowSafetyCheckin} setShowPromptBank={setShowPromptBank} setShowBlockedUsers={setShowBlockedUsersPanel} setShowConnect={setShowConnect} setShowPaymentHistory={setShowPaymentHistory} setShowReferral={setShowReferral} nearQuests={nearQuests} topQuests={topQuests} loginStreak={loginStreak} weeklyLogins={weeklyLogins} isUnlimited={isUnlimited} profileViews={myStats ? myStats.views : profileViews} likesReceived={myStats ? myStats.likes : likedBy.length} setObStep={setObStep} showOnline={showOnline} setShowOnline={setShowOnline} showDistance={showDistance} setShowDistance={setShowDistance} blockedUsers={blockedUsers} setScreen={setScreen} setShowAgeVerification={setShowAgeVerification} apiFetch={apiFetch} authFetch={authFetch} uid={uid} authUser={authUser} activityFeed={activityFeed} onOpenActivity={() => { setActivityFeed(prev => prev.map(a => ({ ...a, read: true }))); const unreadIds = activityFeed.filter(a => !a.read).map(a => a.id); if (unreadIds.length) { authFetch("/api/muse", { method: "POST", body: JSON.stringify({ action: "mark-read", notificationIds: unreadIds }) }).catch(() => {}); } }} onMarkAllRead={() => setActivityFeed(prev => prev.map(a => ({ ...a, read: true })))} unreadCount={unreadNotificationCount} briefTitleById={briefTitleById} liveProfessionals={liveProfessionals} setShowQuests={setShowQuests} questClaimables={claimableQuests} getReferralTier={getReferralTier} />
      </ScreenErrorBoundary>
      <SupportChat open={supportOpen} onClose={() => setSupportOpen(false)} />
      {screen === "auth" ? (
        <div className="phone-wrap">
          <div className="phone" id="muse-app">
            <div className="notch" />
            <div className="screen-el active">
              <div className="onboard" role="main" id="muse-main" tabIndex={-1} style={{paddingTop:30}}>
                <div className="sparkle" style={{top:"8%",left:"6%",fontSize:24}}>✦</div>
                <div className="sparkle" style={{top:"15%",right:"10%",fontSize:18}}>✧</div>
                <div className="sparkle" style={{bottom:"35%",left:"12%",fontSize:20}}>✦</div>
                <div className="sparkle" style={{bottom:"12%",right:"6%",fontSize:16}}>✧</div>
                <div className="hero-text muse-brand-lockup" style={{marginBottom:14}}>Muses <span>by WYZ</span></div>
                <div className="hero-sub">Where creatives find <em>real connections</em></div>
                <div style={{width:"100%",maxWidth:320,margin:"0 auto"}}>
                  <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
                    <button className={"auth-tab"+(authMode==="login"?" active":"")} role="tab" aria-selected={authMode==="login"} onClick={()=>setAuthMode("login")}>Log In</button>
                    <button className={"auth-tab"+(authMode==="signup"?" active":"")} role="tab" aria-selected={authMode==="signup"} onClick={()=>setAuthMode("signup")}>Sign Up</button>
                  </div>
                  <input className={"inp"+(formErrors.email?" error":"")} placeholder="Email" type="email" aria-label="Email address" value={authEmail} onChange={e=>{setAuthEmail(e.target.value);setFormErrors(p=>({...p,email:""}))}} style={authEmail.length>28?{textOverflow:"ellipsis"}:{}} title={authEmail} />
                  {formErrors.email && <div className="error-msg">{formErrors.email}</div>}
                  <div style={{position:"relative"}}>
                    <input className={"inp"+(formErrors.pass?" error":"")} placeholder="Password" type={showPass?"text":"password"} aria-label="Password" value={authPass} onChange={e=>{setAuthPass(e.target.value);setFormErrors(p=>({...p,pass:""}))}} style={{paddingRight:44}} />
                    <button type="button" onClick={()=>setShowPass(p=>!p)} style={{position:"absolute",right:4,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:18,padding:0,lineHeight:1,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center"}} aria-label={showPass?"Hide password":"Show password"}>{showPass?"🙈":"👁️"}</button>
                  </div>
                  {authMode==="signup" && authPass && (()=>{const l=authPass.length;const u=/[A-Z]/.test(authPass);const y=/[!@#$%^&*]/.test(authPass);const s=l>=8&&u&&y?l>=12?4:3:l>=6?2:1;const lbl=["","Weak","Fair","Strong","Very strong"][s];const col=["","var(--sunset)","var(--sunset-orange)","var(--amber)","var(--mint)"][s];const t=["","weak","fair","strong","vstrong"][s];return(<div><div className="pw-meter-label" style={{color:col}}>{lbl}</div><div className="pw-meter-wrap"><div className={"pw-meter-bar"+(s>=1?" "+t:"")}/><div className={"pw-meter-bar"+(s>=2?" "+t:"")}/><div className={"pw-meter-bar"+(s>=3?" "+t:"")}/><div className={"pw-meter-bar"+(s>=4?" "+t:"")}/></div></div>);})()}
                  {formErrors.pass && <div className="error-msg">{formErrors.pass}</div>}
                  <div style={{display:"flex",alignItems:"center",gap:8,marginTop:10,minHeight:44}}>
                    <input id="auth-remember" type="checkbox" checked={authRemember} onChange={e=>setAuthRemember(e.target.checked)} style={{width:18,height:18,accentColor:"#ffd700",flexShrink:0,cursor:"pointer"}} />
                    <label htmlFor="auth-remember" style={{fontSize:13,color:"rgba(255,255,255,0.7)",cursor:"pointer",display:"block",padding:"13px 0",flex:1}}>Remember me</label>
                  </div>
                  {authMode==="login" && <button type="button" onClick={async()=>{if(!authEmail.trim()){setFormErrors({email:"Enter your email first"});return;}setAuthLoading(true);try{const r=await authFetch("/api/muse/auth",{method:"POST",body:JSON.stringify({action:"forgot-password",email:authEmail.trim()})});const j=await r.json();showToast(j.message||j.error||"Check your email for a password reset link!");}catch{showToast("Network error");}setAuthLoading(false);}} style={{background:"none",border:"none",color:"var(--gold)",fontSize:12,cursor:"pointer",textAlign:"right",width:"100%",marginTop:4,padding:0}}>Forgot password?</button>}
                  <button className="btn btn-gold" style={{marginTop:10,opacity:authLoading?0.6:1}} disabled={authLoading} onClick={handleAuthClick}>{authLoading?"Loading...":authMode==="login"?"Log In":"Create Account"}</button>
                  <div className="auth-divider"><span>or continue with</span></div>
                  <div style={{display:"flex",gap:10}}>
                    <button className="auth-social-btn" style={{flex:1,width:"auto",minWidth:0,padding:"14px 8px",gap:6}} onClick={()=>handleOAuth("google")}><svg width="16" height="16" viewBox="0 0 48 48" style={{flexShrink:0}}><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5c10 0 19.5-7.3 19.5-19.5 0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12.5 24 12.5c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4.5 24 4.5 16.3 4.5 9.7 8.8 6.3 14.7z"/><path fill="#4CAF50" d="M24 43.5c5.4 0 10.3-2.1 14-5.4l-6.5-5.5C29.6 34 26.9 35 24 35c-5.3 0-9.7-2.6-11.3-7.5l-6.5 5C9.6 40.2 16.2 43.5 24 43.5z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.6l6.5 5.5C41.4 35.7 43.5 30.3 43.5 24c0-1.3-.1-2.3-.4-3.5z"/></svg><span>Google</span></button>
                    <button className="auth-social-btn" style={{flex:1,width:"auto",minWidth:0,padding:"14px 8px",gap:6}} onClick={()=>handleOAuth("facebook")}><svg width="16" height="16" viewBox="0 0 48 48" style={{flexShrink:0}}><path fill="#1877F2" d="M48 24C48 10.7 37.3 0 24 0S0 10.7 0 24c0 11.9 8.7 21.8 20 23.6V31h-6v-7h6v-5.3c0-5.9 3.5-9.2 8.9-9.2 2.6 0 5.3.5 5.3.5v5.8h-3c-2.9 0-3.8 1.8-3.8 3.7V24h6.5l-1 7h-5.5v16.6C39.3 45.8 48 35.9 48 24z"/></svg><span>Facebook</span></button>
                    <button className="auth-social-btn" style={{flex:1,width:"auto",minWidth:0,padding:"14px 8px",gap:6}} onClick={()=>handleOAuth("x")} aria-label="Continue with X"><svg width="16" height="16" viewBox="0 0 24 24" style={{flexShrink:0}}><path fill="#fff" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg><span>X</span></button>
                  </div>
                  <div className="auth-terms-wrap">
                    <span style={{fontSize:13,color:"rgba(255,255,255,0.65)"}}>By continuing you agree to our</span>
                    <span className="auth-terms" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setShowTerms(true); } }} onClick={()=>setShowTerms(true)}>Terms</span>
                    <span className="auth-terms" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setShowPrivacy(true); } }} onClick={()=>setShowPrivacy(true)}>Privacy</span>
                    <span className="auth-terms" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setShowGuidelines(true); } }} onClick={()=>setShowGuidelines(true)}>Guidelines</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
<div className={"phone-wrap"+((screen==="subscription"||screen==="settings"||screen==="analytics")?" phone-wrap-standalone-hidden":"")}>
<div className="phone" id="muse-app">
<div className="notch" />

{/* ═══ VERIFICATION EXPIRY BANNER ═══ */}
{/* Absolutely-positioned overlay attached to the top edge of the bottom nav
    (bottom: var(--nav-h)) — it slides down into view over the nav on show and
    slides back up out of view on dismiss (see .verify-banner keyframes in
    muse.css). It never pushes or shifts any other content: it's taken out of
    flow entirely (position:absolute against .phone, which is position:relative),
    so no sibling ever reserves space for it. Status is never lost: Settings >
    Privacy & Safety > Identity Verification always shows the same live state,
    dismissed or not. */}
{((!ageVerified) || verificationExpiringSoon) && !verificationBannerDismissed && (
  <div className={"verify-banner" + (verificationBannerClosing ? " verify-banner-closing" : "")} style={{ position: "absolute", bottom: "var(--nav-h, calc(72px + env(safe-area-inset-bottom, 0px)))", left: 0, right: 0, zIndex: 9999, background: verificationExpiringSoon ? "linear-gradient(135deg, #ff8c00, #ffd700)" : "linear-gradient(135deg, #ff4444, #ff6b6b)", padding: "10px 44px 10px 10px", boxShadow: "0 -4px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.12)", textAlign: "center", fontSize: 12, fontWeight: 700, color: "#0a0612", display: "flex", alignItems: "center", justifyContent: "center", gap: 2, whiteSpace: "nowrap", overflow: "hidden", opacity: 0.85 }}>
    <span>{verificationExpiringSoon ? "Your verification is expiring soon" : "Verify identity for full features."}</span>
    <button onClick={() => setShowAgeVerification(true)} style={{ minWidth: 44, minHeight: 44, background: "none", border: "none", color: "#0a0612", textDecoration: "underline", cursor: "pointer", fontWeight: 800, padding: 0, whiteSpace: "nowrap", flexShrink: 0 }}>Verify Now</button>
    <button
      onClick={dismissVerificationBanner}
      aria-label="Dismiss"
      style={{ position: "absolute", top: "50%", right: 4, transform: "translateY(-50%)", width: 44, height: 44, background: "none", border: "none", color: "#0a0612", opacity: 0.75, cursor: "pointer", padding: 4, display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <FiX size={15} />
    </button>
  </div>
)}

<main id="muse-main" role="main" tabIndex={-1} style={{flex:1,display:"flex",flexDirection:"column",minHeight:0}}>
{/* Live status region — non-blocking announcements for async actions */}
<div role="status" aria-live="polite" aria-atomic="true" id="muse-live-status" className="sr-only" />
<div className={"screen-el"+(screen==="onboard"?" active":"")}>
  <div className="onboard">
    {obStep === 0 && (
                  <div className="onboard-content">
                    <div className="sparkle" style={{top:"10%",left:"6%",fontSize:24}}>✦</div>
                    <div className="sparkle" style={{top:"20%",right:"10%",fontSize:18}}>✧</div>
                    <div className="sparkle" style={{bottom:"30%",left:"15%",fontSize:20}}>✦</div>
                    <div className="sparkle" style={{bottom:"15%",right:"6%",fontSize:16}}>✧</div>
                    <div className="hero-text" style={{textAlign:"center"}}>Find your Muse</div>
                    <div className="hero-sub">Where creatives find <em>real connections</em> for professional collaboration</div>
                    <button className="btn btn-gold" onClick={()=>setObStep(1)}>Get Started</button>
                  </div>
                )}
                {obStep === 1 && (
                  <div className="onboard-content">
                    <div className="step-title">Your Info</div>
                    <div className="step-sub">Tell us about yourself</div>
                    <input className="inp" aria-label="Display name" placeholder="Display Name" value={obData.name||""} onChange={e=>setObData(d=>({...d,name:e.target.value}))} />
                    <input className="inp" aria-label="Location" placeholder="Location (City, State)" value={obData.loc||""} onChange={e=>setObData(d=>({...d,loc:e.target.value}))} />
                    <textarea className="inp" aria-label="Bio" placeholder="Who are you as a creative?" rows={3} value={obData.bio||""} onChange={e=>setObData(d=>({...d,bio:e.target.value}))} />
                    <button className="btn btn-gold" disabled={!(obData.name||"").trim()} style={!(obData.name||"").trim()?{opacity:0.5}:undefined} onClick={()=>setObStep(2)}>Next</button>
                    <button className="back-link" onClick={()=>setObStep(0)}>Back</button>
                  </div>
                )}
                {obStep === 2 && (
                  <div className="onboard-content">
                    <div className="step-title">Creative Type</div>
                    <div className="step-sub">Where do you work — behind the camera or in front of it?</div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                      {([["creative", "I'm here to work & collaborate"], ["industry", "I'm here to hire & book"]] as const).map(([val, label]) => (
                        <div key={val} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setObData(d => ({ ...d, audience: val })); } }} onClick={() => setObData(d => ({ ...d, audience: val }))} style={{ flex: 1, padding: "10px 8px", borderRadius: 12, cursor: "pointer", textAlign: "center", fontSize: 12, fontWeight: 700, transition: "all .25s", background: obData.audience === val ? "rgba(255,215,0,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${obData.audience === val ? "rgba(255,215,0,0.3)" : "rgba(255,255,255,0.06)"}`, color: obData.audience === val ? "var(--gold)" : "var(--muted)" }}>{label}</div>
                      ))}
                    </div>
                    <div className="side-group">
                      <div className="side-label">🎬 Behind the Camera</div>
                      <div className="side-sub">You make the work — crew, direction, craft.</div>
                      <div className="chips">
                        {BEHIND_CAMERA.map(t => (
                          <div key={t} className={"chip"+(obData.type===t?" sel":"")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setObData(d=>({...d,type:t,customTypePending:false})); } }} onClick={()=>setObData(d=>({...d,type:t,customTypePending:false}))}><span>{t}</span></div>
                        ))}
                      </div>
                    </div>
                    <div className="side-group" style={{ marginTop: 16 }}>
                      <div className="side-label">📸 In Front of the Camera</div>
                      <div className="side-sub">You're the talent — on-camera, performing, audience-facing.</div>
                      <div className="chips">
                        {IN_FRONT_CAMERA.map(t => (
                          <div key={t} className={"chip"+(obData.type===t?" sel":"")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setObData(d=>({...d,type:t,customTypePending:false})); } }} onClick={()=>setObData(d=>({...d,type:t,customTypePending:false}))}><span>{t}</span></div>
                        ))}
                        {/* Torreé audit item 6: not every creative role fits the
                            preset list — "Other" lets someone type their own,
                            saved as a real `type` value immediately and flagged
                            custom_type_pending for admin review. */}
                        <div key="other" className={"chip"+(obData.customTypePending?" sel":"")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setObData(d=>({...d,type:"",customTypePending:true})); } }} onClick={()=>setObData(d=>({...d,type:"",customTypePending:true}))}><span>Add New +</span></div>
                      </div>
                    </div>
                    {obData.customTypePending && (
                      <input className="inp" aria-label="Creative role" placeholder="Type your creative role..." value={obData.type||""} onChange={e=>setObData(d=>({...d,type:e.target.value}))} style={{ marginTop: 10 }} autoFocus />
                    )}
                    {!obData.type && <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", margin: "6px 0 2px" }}>Select one to continue</div>}
                    <button className="btn btn-gold" disabled={!obData.type} style={!obData.type?{opacity:0.5}:undefined} onClick={()=>setObStep(3)}>Next</button>
                    <button className="back-link" onClick={()=>setObStep(1)}>Back</button>
                  </div>
                )}
                {obStep === 3 && (
                  <div className="onboard-content">
                    <div className="step-title">Looking For</div>
                    <div className="step-sub">What kind of connections interest you?</div>
                    <div className="chips">
                      {lookingForOptions(obData.type || "").map(l => (
                        <div key={l} className={"chip"+((obData.looking||[]).includes(l)?" sel":"")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleObMulti("looking", l, 4); } }} onClick={()=>toggleObMulti("looking", l, 4)}><span>{l}</span></div>
                      ))}
                    </div>
                    {!(obData.looking||[]).length && <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", margin: "6px 0 2px" }}>Select at least one to continue</div>}
                    <button className="btn btn-gold" disabled={!(obData.looking||[]).length} style={!(obData.looking||[]).length?{opacity:0.5}:undefined} onClick={()=>setObStep(4)}>Next</button>
                    <button className="back-link" onClick={()=>setObStep(2)}>Back</button>
                  </div>
                )}
                {obStep === 4 && (
                  <div className="onboard-content">
                    <div className="step-title">Aesthetic Style</div>
                    <div className="step-sub">What's your creative aesthetic?</div>
                    <div className="chips">
                      {AESTHETICS.map(s => (
                        <div key={s} className={"chip"+((obData.styles||[]).includes(s)?" sel":"")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleObMulti("styles", s, 5); } }} onClick={()=>toggleObMulti("styles", s, 5)}><span>{s}</span></div>
                      ))}
                      {/* Torreé audit item 6: aesthetic "Other" — typed values are
                          appended to `styles` immediately and flagged
                          custom_style_pending for admin review. */}
                      <div key="other" className={"chip"+(obData.showCustomStyleInput?" sel":"")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setObData(d=>({...d,showCustomStyleInput:!d.showCustomStyleInput})); } }} onClick={()=>setObData(d=>({...d,showCustomStyleInput:!d.showCustomStyleInput}))}><span>Add New +</span></div>
                    </div>
                    {obData.showCustomStyleInput && (
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <input className="inp" aria-label="Custom aesthetic" placeholder="Type your own aesthetic..." value={obData.customStyleDraft||""} onChange={e=>setObData(d=>({...d,customStyleDraft:e.target.value}))} style={{ margin: 0, flex: 1 }} autoFocus />
                        <button className="btn btn-outline" style={{ padding: "0 16px" }} onClick={() => {
                          const v = (obData.customStyleDraft || "").trim();
                          if (!v) return;
                          const cur = obData.styles || [];
                          if (cur.includes(v)) return;
                          if (cur.length >= 5) { showToast("Max 5 selected"); return; }
                          setObData(d => ({ ...d, styles: [...(d.styles||[]), v], customStylePending: true, customStyleDraft: "" }));
                        }}>Add</button>
                      </div>
                    )}
                    {(obData.styles||[]).filter(s => !AESTHETICS.includes(s)).length > 0 && (
                      <div className="chips" style={{ marginTop: 8 }}>
                        {(obData.styles||[]).filter(s => !AESTHETICS.includes(s)).map(s => (
                          <div key={s} className="chip sel" role="button" tabIndex={0} title="Tap to remove" onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setObData(d => ({ ...d, styles: (d.styles||[]).filter(x => x !== s) })); } }} onClick={() => setObData(d => ({ ...d, styles: (d.styles||[]).filter(x => x !== s) }))}><span>✎ {s} ✕</span></div>
                        ))}
                      </div>
                    )}
                    {!(obData.styles||[]).length && <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", margin: "6px 0 2px" }}>Select at least one style to continue</div>}
                    <button className="btn btn-gold" disabled={!(obData.styles||[]).length} style={!(obData.styles||[]).length?{opacity:0.5}:undefined} onClick={()=>setObStep(5)}>Next</button>
                    <button className="back-link" onClick={()=>setObStep(3)}>Back</button>
                  </div>
                )}
                {obStep === 5 && (
                  <div className="onboard-content">
                    <div className="ob-progress"><div className="ob-dot filled"/><div className="ob-dot filled"/><div className="ob-dot filled"/><div className="ob-dot filled"/><div className="ob-dot active"/><div className="ob-dot"/><div className="ob-dot"/><div className="ob-dot"/></div>
                    <div className="step-title">Know Yourself?</div>
                    <div className="step-sub">Do you know your zodiac, MBTI, or life path?</div>
                    <div style={{display:"flex",flexDirection:"column",gap:12,width:"100%",maxWidth:320}}>
                      <button className="btn btn-gold" onClick={()=>setObStep(14)} style={{background:"linear-gradient(135deg,var(--gold),var(--amber))"}}>Skip, Set Up Later</button>
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
                        <div key={z} className={"chip"+(obData.zodiac===z?" sel":"")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setObData(d=>({...d,zodiac:z})); } }} onClick={()=>setObData(d=>({...d,zodiac:z}))}><span>{ZE[z]} {z}</span></div>
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
                        <div key={c} className={"chip"+(obData.chinese===c?" sel":"")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setObData(d=>({...d,chinese:c})); } }} onClick={()=>setObData(d=>({...d,chinese:c}))}><span>{CE[c]} {c}</span></div>
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
                        <div key={m} className={"chip"+(obData.mbti===m?" sel":"")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setObData(d=>({...d,mbti:m})); } }} onClick={()=>setObData(d=>({...d,mbti:m}))}><span>{m}</span></div>
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
                        <div key={lp} className={"chip"+(obData.lifePath===lp?" sel":"")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setObData(d=>({...d,lifePath:lp})); } }} onClick={()=>setObData(d=>({...d,lifePath:lp}))}><span>{lp}</span></div>
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
                        <select className="inp" aria-label="Birth month" value={testBirthMonth} onChange={e=>setTestBirthMonth(e.target.value)}>
                          <option value="">Month</option>
                          {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m,i)=><option key={i} value={String(i+1)}>{m}</option>)}
                        </select>
                        <input className="inp" aria-label="Birth day" placeholder="Day" type="number" min={1} max={31} value={testBirthDay} onChange={e=>setTestBirthDay(e.target.value)} />
                        <button className="btn btn-gold" onClick={()=>{if(testBirthMonth&&testBirthDay){const z=calcZodiac(parseInt(testBirthMonth),parseInt(testBirthDay));setObData(d=>({...d,zodiac:z}));showToast("You are a "+z+"! "+ZE[z]);setObStep(14)}}}>Calculate</button>
                        <button className="back-link" onClick={()=>setObStep(10)}>Back</button>
                      </div>
                    )}
                    {testScreen === "chinese" && (
                      <div>
                        <div className="step-title">Chinese Zodiac</div>
                        <div className="step-sub">Enter your birth year</div>
                        <input className="inp" aria-label="Birth year" placeholder="Year (e.g. 1995)" type="number" min={1900} max={2026} value={testBirthYear} onChange={e=>setTestBirthYear(e.target.value)} />
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
                            <div className={"chip"+(testMbtiAnswers.ei==="e"?" sel":"")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTestMbtiAnswers(p=>({...p,ei:"e"})); } }} onClick={()=>setTestMbtiAnswers(p=>({...p,ei:"e"}))}><span>Talk to everyone</span></div>
                            <div className={"chip"+(testMbtiAnswers.ei==="i"?" sel":"")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTestMbtiAnswers(p=>({...p,ei:"i"})); } }} onClick={()=>setTestMbtiAnswers(p=>({...p,ei:"i"}))}><span>Find one person</span></div>
                          </div>
                          <div style={{fontSize:14,fontWeight:700,color:"var(--gold)",marginBottom:8}}>You prefer...</div>
                          <div className="chips" style={{marginBottom:16}}>
                            <div className={"chip"+(testMbtiAnswers.sn==="s"?" sel":"")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTestMbtiAnswers(p=>({...p,sn:"s"})); } }} onClick={()=>setTestMbtiAnswers(p=>({...p,sn:"s"}))}><span>Facts & details</span></div>
                            <div className={"chip"+(testMbtiAnswers.sn==="n"?" sel":"")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTestMbtiAnswers(p=>({...p,sn:"n"})); } }} onClick={()=>setTestMbtiAnswers(p=>({...p,sn:"n"}))}><span>Big picture ideas</span></div>
                          </div>
                          <div style={{fontSize:14,fontWeight:700,color:"var(--gold)",marginBottom:8}}>Decisions come from...</div>
                          <div className="chips" style={{marginBottom:16}}>
                            <div className={"chip"+(testMbtiAnswers.tf==="t"?" sel":"")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTestMbtiAnswers(p=>({...p,tf:"t"})); } }} onClick={()=>setTestMbtiAnswers(p=>({...p,tf:"t"}))}><span>Logic & analysis</span></div>
                            <div className={"chip"+(testMbtiAnswers.tf==="f"?" sel":"")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTestMbtiAnswers(p=>({...p,tf:"f"})); } }} onClick={()=>setTestMbtiAnswers(p=>({...p,tf:"f"}))}><span>Values & impact</span></div>
                          </div>
                          <div style={{fontSize:14,fontWeight:700,color:"var(--gold)",marginBottom:8}}>You like things...</div>
                          <div className="chips" style={{marginBottom:16}}>
                            <div className={"chip"+(testMbtiAnswers.jp==="j"?" sel":"")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTestMbtiAnswers(p=>({...p,jp:"j"})); } }} onClick={()=>setTestMbtiAnswers(p=>({...p,jp:"j"}))}><span>Planned & structured</span></div>
                            <div className={"chip"+(testMbtiAnswers.jp==="p"?" sel":"")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTestMbtiAnswers(p=>({...p,jp:"p"})); } }} onClick={()=>setTestMbtiAnswers(p=>({...p,jp:"p"}))}><span>Flexible & open</span></div>
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
                        <select className="inp" aria-label="Birth month" value={testBirthMonth} onChange={e=>setTestBirthMonth(e.target.value)}>
                          <option value="">Month</option>
                          {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m,i)=><option key={i} value={String(i+1)}>{m}</option>)}
                        </select>
                        <input className="inp" aria-label="Birth day" placeholder="Day" type="number" min={1} max={31} value={testBirthDay} onChange={e=>setTestBirthDay(e.target.value)} />
                        <input className="inp" aria-label="Birth year" placeholder="Year" type="number" min={1900} max={2026} value={testBirthYear} onChange={e=>setTestBirthYear(e.target.value)} />
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
                    <input ref={photoInputRef} type="file" accept="image/*" aria-label="Upload profile photo" style={{display:"none"}} onChange={async (e)=>{const f=e.target.files?.[0];if(f){showToast("Uploading...");const url=await uploadImage(f,"avatars");if(url){setObProfilePic(url);showToast("Photo added!")}}}} />
                    <div className="ob-upload-zone" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); photoInputRef.current?.click(); } }} onClick={() => photoInputRef.current?.click()}>
                      {obProfilePic ? <Image loading="lazy" src={obProfilePic} alt="Profile" fill sizes="130px" style={{ objectFit: "cover", borderRadius: "50%" }} /> : (
                        <>
                          <div className="ob-upload-icon">📸</div>
                          <div className="ob-upload-text">Tap to add photo</div>
                        </>
                      )}
                    </div>
                    <button className="btn btn-gold" onClick={()=>setObStep(15)}>Next</button>
                    <button className="ob-skip" onClick={()=>setObStep(15)}>Skip for now</button>
                    <button className="back-link" onClick={()=>setObStep(5)}>Back</button>
                  </div>
                )}
                {obStep === 15 && (
                  <div className="onboard-content">
                    <div className="step-title">Your Portfolio</div>
                    <div className="step-sub">Show off your best work</div>
                    <input ref={portfolioInputRef} type="file" accept="image/*" aria-label="Upload portfolio photo" style={{display:"none"}} onChange={async (e)=>{
                      const f=e.target.files?.[0];
                      const slot=obPortfolioSlot;
                      if(e.target) e.target.value="";
                      if(f && slot!=null){
                        showToast("Uploading...");
                        const url=await uploadImage(f,"portfolio");
                        if(url){
                          setObPortfolioItems(prev => {
                            const next=[...prev];
                            next[slot]={img:url,title:"Work "+(slot+1)};
                            return next;
                          });
                          showToast("Work added!");
                        } else {
                          showToast("Upload failed — try again");
                        }
                      }
                    }} />
                    <div className="ob-portfolio-grid">
                      {[0,1,2,3,4,5].map(i => (
                        <div key={i} className="ob-portfolio-slot" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setObPortfolioSlot(i); portfolioInputRef.current?.click(); } }} onClick={() => {
                           setObPortfolioSlot(i);
                           portfolioInputRef.current?.click();
                         }}>
                          {obPortfolioItems[i] ? <Image loading="lazy" src={obPortfolioItems[i].img} alt="Work" fill sizes="(max-width: 600px) 33vw, 200px" style={{ objectFit: "cover", borderRadius: 10 }} /> : <div className="ob-portfolio-plus">+</div>}
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
                    <div style={{width:"100%",maxWidth:360,marginBottom:20,padding:"16px 18px",borderRadius:16,border:"1px solid rgba(255,215,0,0.28)",background:"rgba(255,215,0,0.05)",boxShadow:"0 2px 14px rgba(255,215,0,0.06)"}}>
                      <div style={{fontSize:12,fontWeight:700,color:"var(--gold)",letterSpacing:0.4,textTransform:"uppercase",marginBottom:4}}>Have a referral code?</div>
                      <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",marginBottom:10}}>Optional — you and a friend both get a free month.</div>
                      <div style={{display:"flex",gap:8}}>
                        <input className="inp" aria-label="Referral code" placeholder="MUSE-XXXXXX" value={obData.referralCode || ""} onChange={e=>setObData(prev=>({...prev,referralCode:e.target.value}))} style={{margin:0,flex:1,textTransform:"uppercase",letterSpacing:1,fontFamily:"monospace"}} />
                      </div>
                      {obData.referralCode && obData.referralCode.length >= 6 && (
                        <div style={{fontSize:11,color:"#4ecdc4",marginTop:8}}>🎉 You and your friend will both get a free month when you subscribe!</div>
                      )}
                    </div>
                    <button className="btn btn-gold" style={{padding:"18px 24px",fontSize:17,fontWeight:800,letterSpacing:0.3,marginTop:4}} onClick={async ()=>{
                      setCurrentUser(prev=>({...prev,name:obData.name||prev.name,type:obData.type||prev.type,avatar:obProfilePic||prev.avatar}));
                      const geo = await getGeolocation();
                      if(authUser?.id){
                        try{
                          const r = await authFetch("/api/muse/auth",{method:"POST",body:JSON.stringify({action:"update-profile",
                            name:obData.name,loc:obData.loc,bio:obData.bio,audience:obData.audience||"creative",type:obData.type,
                            looking:obData.looking,styles:obData.styles,
                            zodiac:obData.zodiac,chinese:obData.chinese,mbti:obData.mbti,life_path:obData.lifePath,
                            avatar:obProfilePic,
                            // Torreé audit item 6: carry the "Other" custom-value
                            // review flags through to the saved profile.
                            ...(obData.customTypePending ? { custom_type_pending: true } : {}),
                            ...(obData.customStylePending ? { custom_style_pending: true } : {}),
                            ...(geo ? { lat: geo.lat, long: geo.long, city: geo.city } : {})
                          })});
                          if (!r.ok) showToast("Profile saved locally — sync will retry");
                        }catch{ showToast("Profile saved locally — sync will retry"); }
                        // Apply referral code if entered
                        if (obData.referralCode) {
                          try {
                            const rr = await authFetch("/api/muse/referral", { method: "POST", body: JSON.stringify({ action: "apply", referralCode: obData.referralCode.trim().toUpperCase() }) });
                            if (!rr.ok) showToast("Referral code couldn't be applied");
                          } catch { showToast("Referral code couldn't be applied"); }
                        }
                        // Turn the onboarding portfolio step's uploads into a real
                        // album so they actually show up in Portfolio afterward.
                        const realPortfolioPhotos = obPortfolioItems.filter(Boolean);
                        if (realPortfolioPhotos.length) {
                          try {
                            const ar = await authFetch("/api/muse", { method: "POST", body: JSON.stringify({ action: "create-album", title: "My Portfolio", access_level: "public" }) });
                            const ad = await ar.json();
                            if (ad?.success && ad?.album?.id) {
                              for (const item of realPortfolioPhotos) {
                                try { await authFetch("/api/muse", { method: "POST", body: JSON.stringify({ action: "add-album-photo", albumId: ad.album.id, img_url: item.img }) }); } catch { console.debug("[muse] portfolio photo could not be added to album"); }
                              }
                            }
                          } catch { console.debug("[muse] album photo import failed"); }
                        }
                      }
                      setScreen("discover");showToast("Welcome to Muses!")
                    }}>Enter Muses →</button>
                    <button className="back-link" onClick={()=>setObStep(16)}>Back</button>
                  </div>
                )}
              </div>
            </div>
            <ScreenErrorBoundary name="Discover">
            <DiscoverScreen screen={screen} showScreen={showScreen} showNsfw={showNsfw} openHamburger={openHamburger} unreadNotificationCount={unreadNotificationCount} discoveryPrefs={discoveryPrefs} setDiscoveryPrefs={setDiscoveryPrefs} showDiscoveryPrefs={showDiscoveryPrefs} setShowDiscoveryPrefs={setShowDiscoveryPrefs} showFilterModal={showFilterModal} setShowFilterModal={setShowFilterModal} mapView={mapView} setMapView={setMapView} filteredProfiles={filteredProfiles} isLoading={discoverLoading} currentIdx={currentIdx} setCurrentIdx={setCurrentIdx} boostActive={boostActive} setBoostActive={setBoostActive} setBoostEnd={setBoostEnd} discoverSearchOpen={discoverSearchOpen} setDiscoverSearchOpen={setDiscoverSearchOpen} discoverSearch={discoverSearch} setDiscoverSearch={setDiscoverSearch} myGeo={myGeo} myStyles={obData.styles || []} apiFetch={apiFetch} showToast={showToast} demo={DEMO_MODE} doSwipe={doSwipe} setViewProfile={setViewProfile} viewProfile={viewProfile} handleImgError={handleImgError} matches={matches} setMatches={setMatches} openChat={openChat} setChatTarget={setChatTarget} stories={stories} currentUser={currentUser} uid={uid} showMatchMenu={showMatchMenu} setShowMatchMenu={setShowMatchMenu} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel} currentPhotoIdx={currentPhotoIdx} setCurrentPhotoIdx={setCurrentPhotoIdx} cardScrolled={cardScrolled} setCardScrolled={setCardScrolled} showNoteTooltip={showNoteTooltip} setShowNoteTooltip={setShowNoteTooltip} promptIdx={promptIdx} setPromptIdx={setPromptIdx} cardAlbumIdx={cardAlbumIdx} setCardAlbumIdx={setCardAlbumIdx} cardAlbumPhotos={cardAlbumPhotos} cardAlbums={cardAlbums} portfolioPhotoIdx={portfolioPhotoIdx} setPortfolioPhotoIdx={setPortfolioPhotoIdx} setLightboxPhotos={setLightboxPhotos} setLightboxIdx={setLightboxIdx} doRewind={doRewind} canRewind={rewindStack.length > 0} doLikeWithNote={doLikeWithNote} setDailyLikes={setDailyLikes} setSuperLikes={setSuperLikes} isUnlimited={isUnlimited} showUnlimitedBadge={showUnlimitedBadge} setShowUnlimitedBadge={setShowUnlimitedBadge} dailyLikes={dailyLikes} superLikes={superLikes} galleryView={galleryView} setGalleryView={setGalleryView} lightboxPhotos={lightboxPhotos} lightboxIdx={lightboxIdx} heroRef={heroRef} likeLabelRef={likeLabelRef} nopeLabelRef={nopeLabelRef} cardScrollRef={cardScrollRef} />
            </ScreenErrorBoundary>
            <ScreenErrorBoundary name="Feed">
            <FeedScreen screen={screen} showScreen={showScreen} feedFilter={feedFilter} setFeedFilter={setFeedFilter} feedText={feedText} setFeedText={setFeedText} feedMedia={feedMedia} setFeedMedia={setFeedMedia} feedPosts={feedPosts} setFeedPosts={setFeedPosts} liveFeed={liveFeed} setLiveFeed={setLiveFeed} showEmojiPicker={showEmojiPicker} setShowEmojiPicker={setShowEmojiPicker} showNewPost={showNewPost} setShowNewPost={setShowNewPost} newPostTitle={newPostTitle} setNewPostTitle={setNewPostTitle} newPostBody={newPostBody} setNewPostBody={setNewPostBody} currentUser={currentUser} apiFetch={apiFetch} authFetch={authFetch} showToast={showToast} handleImgError={handleImgError} stories={stories} setStories={setStories} uploadImage={uploadImage} uploadMedia={uploadMedia} uid={uid} bootstrapped={bootstrapped} feedPostsStatic={feedPostsStatic} setFeedPostsStatic={setFeedPostsStatic} demo={DEMO_MODE} setReplyingTo={setReplyingTo} commentText={commentText} setCommentText={setCommentText} openHamburger={openHamburger} unreadNotificationCount={unreadNotificationCount} setShowReport={setShowReport} setReportTarget={setReportTarget} setShareTarget={setShareTarget} setViewProfile={setViewProfile} onStatusSaved={(status) => setCurrentUser(prev => ({ ...prev, status }))} />
            </ScreenErrorBoundary>
            <ScreenErrorBoundary name="Muses">
            <MusesScreen screen={screen} showScreen={showScreen} goBack={goBack} matches={matches} setMatches={setMatches} searchOpen={searchOpen} setSearchOpen={setSearchOpen} matchesView={matchesView} setMatchesView={setMatchesView} showLikesYou={showLikesYou} setShowLikesYou={setShowLikesYou} likedBy={likedBy} openChat={openChat} setChatTarget={setChatTarget} setBlockTarget={setBlockTarget} setReportTarget={setReportTarget} apiFetch={apiFetch} showToast={showToast} handleImgError={handleImgError} setViewProfile={setViewProfile} currentUser={currentUser} showNsfw={showNsfw} openHamburger={openHamburger} unreadNotificationCount={unreadNotificationCount} searchQuery={searchQuery} setSearchQuery={setSearchQuery} expandedMatchId={expandedMatchId} matchActions={matchActions} messageRequests={messageRequests} setMessageRequests={setMessageRequests} />
            </ScreenErrorBoundary>
            <ScreenErrorBoundary name="Bts">
            <React.Suspense fallback={null}><BtsScreen screen={screen} stories={stories} setStories={setStories} showScreen={showScreen} goBack={goBack} openHamburger={openHamburger} unreadNotificationCount={unreadNotificationCount} showToast={showToast} setShowStory={setShowStory} handleImgError={handleImgError} apiFetch={apiFetch} uploadMedia={uploadMedia} setShowReport={setShowReport} setReportTarget={setReportTarget} /></React.Suspense>
            </ScreenErrorBoundary>
            <ScreenErrorBoundary name="Codex">
            <React.Suspense fallback={null}><CodexScreen screen={screen} showScreen={showScreen} goBack={goBack} openHamburger={openHamburger} unreadNotificationCount={unreadNotificationCount} /></React.Suspense>
            </ScreenErrorBoundary>
            <ScreenErrorBoundary name="Chat">
            <ChatScreen screen={screen} chatTarget={chatTarget} setChatTarget={setChatTarget} showScreen={showScreen} goBack={goBack} messages={chatTarget?.messages || []} setMessages={((messages: unknown) => setChatTarget((previous) => previous ? { ...previous, messages: typeof messages === "function" ? (messages as (_prior: Match["messages"]) => Match["messages"])(previous.messages) : messages as Match["messages"] } : previous)) as React.ComponentProps<typeof ChatScreen>["setMessages"]} chatText={chatInput} setChatText={setChatInput} messagesEndRef={messagesEndRef} sendChat={sendMsg} sendChatImg={sendChatImg} handleImgError={handleImgError} setViewProfile={setViewProfile} setUnmatchTarget={setUnmatchTarget} setBlockTarget={setBlockTarget} setShowReport={setShowReport} setReportTarget={setReportTarget} typingTarget={typingTarget} realtimeStatus={realtimeStatus} sendTyping={sendTypingRef.current} uploadImage={uploadImage} uploadMedia={uploadMedia} sendChatMedia={sendChatMedia} startCall={startCall} fetchCallHistory={fetchCallHistory} showToast={showToast} openHamburger={openHamburger} unreadNotificationCount={unreadNotificationCount} demo={DEMO_MODE} />
            </ScreenErrorBoundary>
            <ScreenErrorBoundary name="Collab">
            <CollabScreen screen={screen} showScreen={showScreen} goBack={goBack} museCat={museCat} setMuseCat={setMuseCat} userBriefs={userBriefs} setUserBriefs={setUserBriefs} showPostBrief={showPostBrief} setShowPostBrief={setShowPostBrief} liveBriefs={liveBriefs || []} showNsfw={showNsfw} currentUser={currentUser} apiFetch={apiFetch} showToast={showToast} uid={uid} appliedBriefs={appliedBriefs} setAppliedBriefs={setAppliedBriefs} savedBriefs={savedBriefs} setSavedBriefs={setSavedBriefs} setChatTarget={setChatTarget} briefTitle={briefTitle} setBriefTitle={setBriefTitle} briefDesc={briefDesc} setBriefDesc={setBriefDesc} briefBudget={briefBudget} setBriefBudget={setBriefBudget} briefCat={briefCat} setBriefCat={setBriefCat} openHamburger={openHamburger} unreadNotificationCount={unreadNotificationCount} setShowReport={setShowReport} setReportTarget={setReportTarget} demo={DEMO_MODE} />
            </ScreenErrorBoundary>

            <ScreenErrorBoundary name="Community">
            <CommunityScreen screen={screen} showScreen={showScreen} goBack={goBack} commTab={commTab} setCommTab={setCommTab} liveCommunities={liveCommunities} liveEvents={liveEvents} showNsfw={showNsfw} rsvpdEvents={rsvpdEvents} setRsvpdEvents={setRsvpdEvents} apiFetch={apiFetch} showToast={showToast} handleImgError={handleImgError} openHamburger={openHamburger} unreadNotificationCount={unreadNotificationCount} onJoinVoiceRoom={startRoom} setShowReport={setShowReport} setReportTarget={setReportTarget} demo={DEMO_MODE} />
            </ScreenErrorBoundary>

            <ScreenErrorBoundary name="Sessions">
            {screen === "studios" && (
              <ScreenErrorBoundary name="Studios">
                <StudiosScreen screen={screen} showScreen={showScreen} goBack={goBack} apiFetch={apiFetch} openHamburger={() => setShowHamburger(true)} unreadNotificationCount={unreadNotificationCount} />
              </ScreenErrorBoundary>
            )}
            <SessionsScreen screen={screen} showScreen={showScreen} goBack={goBack} sessTab={sessTab} setSessTab={setSessTab} matches={matches} setMatches={setMatches} openChat={openChat} setChatTarget={setChatTarget} apiFetch={apiFetch} authFetch={authFetch} showToast={showToast} handleImgError={handleImgError} uid={uid} currentUser={currentUser} setShowAgeVerification={setShowAgeVerification} demo={DEMO_MODE} liveSessions={liveSessions || undefined} setLiveSessions={setLiveSessions} myBookings={myBookings} setMyBookings={setMyBookings} bookingReminders={bookingReminders} setDisclosureTarget={setDisclosureTarget} setDisclosureBookingId={setDisclosureBookingId} setShowDisclosureModal={setShowDisclosureModal} setViewProfile={setViewProfile} openHamburger={openHamburger} unreadNotificationCount={unreadNotificationCount} setShowReport={setShowReport} setReportTarget={setReportTarget} savedSessionIds={savedSessionIds} setSavedSessionIds={setSavedSessionIds} />
            </ScreenErrorBoundary>

            <ScreenErrorBoundary name="Network">
            <NetworkScreen screen={screen} showScreen={showScreen} goBack={goBack} showNsfw={showNsfw} openHamburger={openHamburger} unreadNotificationCount={unreadNotificationCount} matches={matches} apiFetch={apiFetch} showToast={showToast} setViewProfile={setViewProfile} currentUser={currentUser} handleImgError={handleImgError} openChat={openChat} liveForum={liveForum} setLiveForum={setLiveForum} showNewPost={showNewPost} setShowNewPost={setShowNewPost} newPostTitle={newPostTitle} setNewPostTitle={setNewPostTitle} newPostBody={newPostBody} setNewPostBody={setNewPostBody} setForumPosts={setForumPosts} forumSort={forumSort} setForumSort={setForumSort} forumCategory={forumCategory} uid={uid} setShowReport={setShowReport} setReportTarget={setReportTarget} liveProfessionals={liveProfessionals} openTab={_networkOpenTab} savedProfileIds={savedProfileIds} setSavedProfileIds={setSavedProfileIds} demo={DEMO_MODE} onTabChange={tab => { if (tab === "forum") maybeShowPageTour("forum"); }} />
            </ScreenErrorBoundary>
            <ScreenErrorBoundary name="Portfolio">
            <React.Suspense fallback={null}><PortfolioScreen screen={screen} showScreen={showScreen} goBack={goBack} openHamburger={openHamburger} unreadNotificationCount={unreadNotificationCount} matches={matches} getAccessToken={getAccessToken} uploadImage={uploadImage} showToast={showToast} /></React.Suspense>
            </ScreenErrorBoundary>
            <ScreenErrorBoundary name="Profile">
            <ProfileScreen screen={screen} showScreen={showScreen} goBack={goBack} currentUser={currentUser} obData={obData} setObData={setObData} isUnlimited={isUnlimited} showUnlimitedBadge={showUnlimitedBadge} setShowUnlimitedBadge={setShowUnlimitedBadge} openHamburger={openHamburger} handleImgError={handleImgError} setShowEditProfile={setShowEditProfile} setEditName={setEditName} setEditBio={setEditBio} setEditLoc={setEditLoc} setEditAvatar={setEditAvatar} setEditType={setEditType} setEditLooking={setEditLooking} setEditNsfw={setEditNsfw} setEditMediaKit={setEditMediaKit} showToast={showToast} promptResponses={promptResponses} promptBankData={promptBankData} setShowPromptBank={setShowPromptBank} matches={matches} unreadNotificationCount={unreadNotificationCount} obSelects={obSelects} testLevels={testLevels} showNsfw={showNsfw} setShowNsfw={setShowNsfw} setShowAgeVerification={setShowAgeVerification} matchStreak={matchStreak} userTier={userTier} portfolioTab={portfolioTab} setPortfolioTab={setPortfolioTab} setSelectedPortfolio={_setSelectedPortfolio} lightboxPhotos={lightboxPhotos} lightboxIdx={lightboxIdx} setLightboxPhotos={setLightboxPhotos} setLightboxIdx={setLightboxIdx} activityFeed={activityFeed} setShowShareProfile={setShowShareProfile} setScreen={setScreen} setObTestKey={setObTestKey} setTestScreen={setTestScreen} setObStep={setObStep} setObTestStep={setObTestStep} setChatTarget={setChatTarget} checkProfileBadges={checkProfileBadges} getReferralTier={getReferralTier} apiFetch={apiFetch} doLogout={doLogout} setShowQuests={setShowQuests} loginStreak={loginStreak} weeklyLogins={weeklyLogins} questClaimables={claimableQuests} />
            </ScreenErrorBoundary>
          </main>
        </div>
      </div>
      )}

      

      {/* SUBSCRIPTION SCREEN */}
      {screen === "subscription" && <React.Suspense fallback={null}><ScreenErrorBoundary name="Subscription"><SubscriptionScreen screen={screen} showScreen={showScreen} goBack={goBack} currentUser={currentUser} authUser={authUser} userTier={userTier} setUserTier={setUserTier} openHamburger={openHamburger} unreadNotificationCount={unreadNotificationCount} showToast={showToast} apiFetch={apiFetch} /></ScreenErrorBoundary></React.Suspense>}
      {/* ANALYTICS SCREEN */}
      {screen === "analytics" && <React.Suspense fallback={null}><ScreenErrorBoundary name="Analytics"><AnalyticsScreen screen={screen} showScreen={showScreen} goBack={goBack} currentUser={currentUser} apiFetch={apiFetch} showToast={showToast} openHamburger={openHamburger} unreadNotificationCount={unreadNotificationCount} /></ScreenErrorBoundary></React.Suspense>}
      {screen === "matchGuide" && <React.Suspense fallback={null}><ScreenErrorBoundary name="MatchGuide"><MatchGuideScreen screen={screen} showScreen={showScreen} goBack={goBack} /></ScreenErrorBoundary></React.Suspense>}
      {/* SETTINGS SCREEN */}
      {screen === "settings" && <ScreenErrorBoundary name="Settings"><SettingsScreen screen={screen} showScreen={showScreen} goBack={goBack} currentUser={currentUser} obData={obData} showNsfw={showNsfw} setShowNsfw={setShowNsfw} notifPrefs={notifPrefs} setNotifPrefs={setNotifPrefs} blockedUsers={blockedUsers} setBlockedUsers={setBlockedUsers} obConnectedSocials={obConnectedSocials} toggleSocial={toggleSocial} theme={theme} setTheme={setTheme} openHamburger={openHamburger} unreadNotificationCount={unreadNotificationCount} showToast={showToast} doLogout={doLogout} setShowEditProfile={setShowEditProfile} setEditName={setEditName} setEditBio={setEditBio} setEditLoc={setEditLoc} setEditAvatar={setEditAvatar} setEditNsfw={setEditNsfw} setShowNotificationsSettings={setShowNotificationsSettings} showNotificationsSettings={showNotificationsSettings} setShowConnectedAccounts={setShowConnectedAccounts} showConnectedAccounts={showConnectedAccounts} pushEnabled={pushEnabled} setPushEnabled={setPushEnabled} subscribeToMusePush={subscribeToMusePush} unsubscribeFromMusePush={unsubscribeFromMusePush} setShowTerms={setShowTerms} setShowPrivacy={setShowPrivacy} setShowGuidelines={setShowGuidelines} setShowDeleteConfirm={setShowDeleteConfirm} isUnlimited={isUnlimited} setShowConnect={setShowConnect} setShowPaymentHistory={setShowPaymentHistory} setShowReferral={setShowReferral} setShowSafetyCheckin={setShowSafetyCheckin} setShowPromptBank={setShowPromptBank} promptResponses={promptResponses} promptBankData={promptBankData} myGeo={myGeo} setShowAgeGate={setShowAgeGate} setPendingNsfw={setPendingNsfw} setShowAgeVerification={setShowAgeVerification} setScreen={setScreen} setObStep={setObStep} apiFetch={apiFetch} setShowQuests={setShowQuests} questClaimables={claimableQuests} showBlockedUsers={showBlockedUsersPanel} setShowBlockedUsers={setShowBlockedUsersPanel} ageVerified={ageVerified} verificationExpiringSoon={verificationExpiringSoon} discoveryPrefs={discoveryPrefs} setDiscoveryPrefs={setDiscoveryPrefs} showOnline={showOnline} setShowOnline={setShowOnline} showDistance={showDistance} setShowDistance={setShowDistance} showZodiac={showZodiac} setShowZodiac={setShowZodiac} showAge={showAge} setShowAge={setShowAge} showMbti={showMbti} setShowMbti={setShowMbti} showLifePath={showLifePath} setShowLifePath={setShowLifePath} showChinese={showChinese} setShowChinese={setShowChinese} showMatchPercent={showMatchPercent} setShowMatchPercent={setShowMatchPercent} userTier={userTier} setUpsell={setUpsell} authFetch={authFetch} setSupportOpen={setSupportOpen} preferences={(currentUser as typeof currentUser & { preferences?: Record<string, unknown>; profile?: { preferences?: Record<string, unknown> } }).preferences ?? (currentUser as typeof currentUser & { profile?: { preferences?: Record<string, unknown> } }).profile?.preferences ?? {}} /></ScreenErrorBoundary>}

      {showReport && (
        <ReportModal
          target={reportTarget}
          dialogRef={reportTrap}
          apiFetch={apiFetch}
          onClose={() => { setShowReport(false); setReportTarget(null); }}
          onReported={showToast}
        />
      )}

      {/* LIKE + NOTE MODAL */}
      {showLikeNote && noteTargetProfile && (
        <div className="modal-overlay" style={{zIndex:500}} ref={likeNoteTrap} role="dialog" aria-modal="true" aria-label="Like and note">
          <div className="modal-header">
            <button className="modal-back" aria-label="Back" onClick={()=>{setShowLikeNote(false);setLikeNoteAnchor(null);}}><FiArrowLeft size={20} /></button>
            <div className="modal-title">Like + Note</div>
            <button className="modal-close" onClick={()=>{setShowLikeNote(false);setLikeNoteAnchor(null);}} aria-label="Close"><FiX size={18} /></button>
          </div>
          <div className="modal-body" style={{display:"flex",flexDirection:"column",gap:16,paddingTop:20}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <Image loading="lazy" src={noteTargetProfile.img} alt={noteTargetProfile.name} width={48} height={48} style={{borderRadius:"50%",objectFit:"cover"}} onError={handleImgError} />
              <div>
                <div style={{fontWeight:700,fontSize:16,color:"var(--text)"}}>{noteTargetProfile.name}</div>
                <div style={{fontSize:13,color:"var(--muted)"}}>{noteTargetProfile.type}</div>
              </div>
            </div>
            {likeNoteAnchor && (
              <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:10,background:"rgba(255,215,0,0.1)",border:"1px solid rgba(255,215,0,0.25)",fontSize:12,color:"var(--gold)",fontWeight:600}}>
                ✦ Liking {likeNoteAnchor.type === "prompt" ? `their prompt: "${likeNoteAnchor.value}"` : likeNoteAnchor.value.toLowerCase()}
              </div>
            )}
            <textarea className="inp" aria-label="Like note" placeholder="Send a note with your like…" rows={4} value={likeNoteText} onChange={e=>setLikeNoteText(e.target.value)} style={{fontSize:14,resize:"none",borderRadius:12}} />
            <div style={{fontSize:12,color:"var(--muted)",textAlign:"right"}}>{likeNoteText.length}/200</div>
            <button className="btn btn-gold" onClick={async ()=>{
              if (!noteTargetProfile) return;
              const target = noteTargetProfile;
              const anchor = likeNoteAnchor;
              doSwipe("right");
              const note = likeNoteText.trim().slice(0,200);
              setShowLikeNote(false);
              setLikeNoteText("");
              setNoteTargetProfile(null);
              setLikeNoteAnchor(null);
              // Persist the like with its anchor/note so the recipient sees
              // exactly what was liked (in their notifications). doSwipe only
              // calls the match action when it judges a mutual match, so an
              // anchored/annotated like needs its own explicit record —
              // matchCreate merges anchor/note into the existing row either way.
              if (target?.id) {
                apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "match", target_id: target.id, note, anchor_type: anchor?.type, anchor_value: anchor?.value }) }).catch(() => {});
              }
              if (note) {
                const msg = note;
                const myId = authUser?.profile?.id || authUser?.id || "local";
                const clientMsgId = `${myId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                const userMsg = { from: "me", text: msg, time: "Just now", clientMsgId };
                setMatches(prev => prev.map(m => m.id === target.id ? { ...m, messages: [...(m.messages||[]), userMsg] } : m));
                let sent = true;
                try { sent = await persistMessage({ myId, theirId: String(target.id), text: msg, clientMsgId }); } catch { sent = false; }
                if (!sent && myId !== "local") {
                  setMatches(prev => prev.map(m => m.id === target.id ? { ...m, messages: m.messages.filter(mm => mm !== userMsg) } : m));
                  showToast("Liked, but the note couldn't be sent");
                } else {
                  showToast("Liked + note sent!");
                }
              }
            }} style={{width:"100%",padding:"14px"}}>
              ✦ Send Like & Note
            </button>
          </div>
        </div>
      )}

      {/* TERMS OF SERVICE MODAL */}
      {showTerms && (
        <div className="modal-overlay lighter" ref={termsTrap} role="dialog" aria-modal="true" aria-label="Terms of Service">
          <div className="modal-header">
            <button className="modal-back" aria-label="Back" onClick={()=>setShowTerms(false)}><FiArrowLeft size={20} /></button>
            <div className="modal-title">Terms of Service</div>
            <button className="modal-close" onClick={()=>setShowTerms(false)} aria-label="Close"><FiX size={18} /></button>
          </div>
          <div className="modal-body" style={{maxHeight:"70vh",overflowY:"auto",lineHeight:1.7,fontSize:13,color:"var(--text2)"}}>
            <div style={{fontWeight:700,fontSize:16,color:"var(--text)",marginBottom:12}}>Muses by WYZ Terms of Service</div>
            <p><strong>1. Acceptance of Terms</strong>{"\n"}By accessing or using Muse, a creative networking platform operated by WYZ Design, you agree to be bound by these Terms of Service. If you do not agree, do not use the service.</p>
            <p><strong>2. Eligibility</strong>{"\n"}You must be at least 18 years old to use Muse. By using the service, you represent that you meet this age requirement.</p>
            <p><strong>3. User Accounts</strong>{"\n"}You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate and complete information during registration and to update it as necessary.</p>
            <p><strong>4. User Content</strong>{"\n"}You retain ownership of content you post on Muse. By posting content, you grant Muse a non-exclusive, worldwide license to use, display, and distribute your content in connection with the service.</p>
            <p><strong>5. Prohibited Conduct</strong>{"\n"}You may not: harass other users, post illegal or harmful content, attempt to circumvent security measures, use the service for commercial spam, or violate any applicable laws.</p>
            <p><strong>6. Intellectual Property</strong>{"\n"}All content, trademarks, and intellectual property on Muse (excluding user content) are owned by WYZ Design. You may not copy, modify, or distribute our intellectual property without written consent.</p>
            <p><strong>7. Privacy</strong>{"\n"}Your use of Muse is also governed by our Privacy Policy. Please review it to understand how we collect, use, and protect your information.</p>
            <p><strong>8. Termination</strong>{"\n"}We reserve the right to suspend or terminate your account at our discretion, with or without notice, for conduct that violates these Terms or is otherwise harmful to the service or its users.</p>
            <p><strong>9. Disclaimer</strong>{"\n"}Muse is provided {"\""}as is{"\""} without warranties of any kind. We are not liable for any damages arising from your use of the service.</p>
            <p><strong>10. Changes to Terms</strong>{"\n"}We may update these Terms at any time. Continued use of Muse after changes constitutes acceptance of the new Terms.</p>
            <div style={{textAlign:"center",padding:"16px 0",fontSize:11,color:"var(--muted)"}}>Last updated: July 2026 · WYZ Design LLC</div>
            <button className="btn btn-gold" style={{width:"100%",marginTop:8}} onClick={()=>setShowTerms(false)}>I Understand</button>
          </div>
        </div>
      )}

      {showPrivacy && (
        <div className="modal-overlay lighter" ref={privacyTrap} role="dialog" aria-modal="true" aria-label="Privacy Policy">
          <div className="modal-header">
            <button className="modal-back" aria-label="Back" onClick={()=>setShowPrivacy(false)}><FiArrowLeft size={20} /></button>
            <div className="modal-title">Privacy Policy</div>
            <button className="modal-close" onClick={()=>setShowPrivacy(false)} aria-label="Close"><FiX size={18} /></button>
          </div>
          <div className="modal-body" style={{maxHeight:"70vh",overflowY:"auto",lineHeight:1.7,fontSize:13,color:"var(--text2)"}}>
            <div style={{fontWeight:700,fontSize:16,color:"var(--text)",marginBottom:12}}>Muses by WYZ Privacy Policy</div>
            <p><strong>1. Information We Collect</strong>{"\n"}Account information (name, email, profile details you provide), content you post (photos, messages, briefs, forum posts), usage data (swipes, matches, interactions), device information (browser type, OS, IP address).</p>
            <p><strong>2. How We Use Your Information</strong>{"\n"}To provide and improve the Muse service, to match you with compatible creatives, to communicate with you about your account and the service, to detect and prevent fraud or abuse, and to comply with legal obligations.</p>
            <p><strong>3. Information Sharing</strong>{"\n"}We do not sell your personal information. We may share information with service providers who assist in operating the platform (hosting, analytics), when required by law, or with your explicit consent. Your profile is visible to other Muses users based on your privacy settings.</p>
            <p><strong>4. Data Storage & Security</strong>{"\n"}Your data is stored on secure servers provided by Supabase. We use industry-standard encryption for data in transit (TLS) and at rest. However, no method of transmission over the Internet is 100% secure.</p>
             <p><strong>5. Your Rights</strong>{"\n"}You can access, update, or delete your account data at any time through the app settings. You may request a copy of all data we hold about you by contacting {SUPPORT_EMAIL}. You may also request deletion of your account. Access is removed immediately; account data is permanently deleted after 30 days, except where safety, fraud-prevention, or legal obligations require retention.</p>
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
        <div className="modal-overlay lighter" ref={guidelinesTrap} role="dialog" aria-modal="true" aria-label="Community Guidelines">
          <div className="modal-header">
            <button className="modal-back" aria-label="Back" onClick={()=>setShowGuidelines(false)}><FiArrowLeft size={20} /></button>
            <div className="modal-title">Community Guidelines</div>
            <button className="modal-close" onClick={()=>setShowGuidelines(false)} aria-label="Close"><FiX size={18} /></button>
          </div>
          <div className="modal-body" style={{maxHeight:"70vh",overflowY:"auto",lineHeight:1.7,fontSize:13,color:"var(--text2)"}}>
            <div style={{fontWeight:700,fontSize:16,color:"var(--text)",marginBottom:12}}>Muses by WYZ Community Guidelines</div>
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
        <div className="modal-overlay lighter" ref={deleteConfirmTrap} role="dialog" aria-modal="true" aria-label="Confirm account deletion">
          <div className="modal-header">
            <button className="modal-back" aria-label="Back" onClick={()=>setShowDeleteConfirm(false)}><FiArrowLeft size={20} /></button>
            <div className="modal-title">Delete Account</div>
            <button className="modal-close" onClick={()=>setShowDeleteConfirm(false)} aria-label="Close"><FiX size={18} /></button>
          </div>
          <div className="modal-body" style={{textAlign:"center"}}>
            <div style={{fontSize:48,marginBottom:16}}>⚠️</div>
            <div style={{fontSize:18,fontWeight:700,color:"var(--text)",marginBottom:8}}>Are you sure?</div>
            <div style={{fontSize:14,color:"var(--text2)",marginBottom:24,lineHeight:1.6}}>Your access is removed immediately. Your account data is scheduled for permanent deletion after 30 days, except records we must retain for legal, safety, fraud, dispute, or recordkeeping obligations. See the Privacy Policy for details.</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
               <button className="btn btn-gold" style={{width:"100%",borderColor:"var(--coral)",background:"linear-gradient(135deg,var(--coral),#ff4444)"}} onClick={async()=>{try{const res=await authFetch("/api/muse/auth",{method:"POST",body:JSON.stringify({action:"delete-account"})});if(!res.ok) throw new Error("failed");safeRemoveItem("muse_user");safeRemoveItem("muse_v1");safeRemoveItem("muse_geo");safeRemoveItem("muse_boost");safeRemoveItem("muse_last_reset");safeRemoveItem("muse_local");safeRemoveItem("muse_premium");safeRemoveItem("muse_referral_code");safeRemoveItem("muse_open_count");safeRemoveItem("muse_hide_premium");setAuthUser(null);setShowDeleteConfirm(false);setScreen("auth");showToast("Account deletion is scheduled. Access is removed now; data is purged after 30 days.");return}catch{showToast("Delete failed. Try again")}}}>Schedule Account Deletion</button>
              <button className="btn btn-outline" style={{width:"100%"}} onClick={()=>setShowDeleteConfirm(false)}>{STRINGS.cancel}</button>
            </div>
          </div>
        </div>
      )}

      {/* DISCOVERY PREFERENCES MODAL */}
      {showDiscoveryPrefs && (
        <div className="modal-overlay" ref={discoveryPrefsTrap} role="dialog" aria-modal="true" aria-label="Discovery preferences" onPointerDown={(e) => { if (e.target === e.currentTarget) setShowDiscoveryPrefs(false); }}>
          <div className="modal-header">
            <button className="modal-back" aria-label="Close discovery preferences" onClick={()=>setShowDiscoveryPrefs(false)}><FiArrowLeft size={20} /></button>
            <div className="modal-title" style={{fontSize:16.5,whiteSpace:"nowrap"}}>Discovery Preferences</div>
          </div>
          <div className="modal-body">
            <div style={{marginBottom:20}}>
              <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:8}}>Age Range: {discoveryPrefs.ageMin} to {discoveryPrefs.ageMax}</div>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <input type="range" aria-label="Minimum age" min={18} max={65} value={discoveryPrefs.ageMin} onChange={e=>setDiscoveryPrefs(p=>({...p,ageMin:Math.min(Number(e.target.value),p.ageMax-1)}))} style={{flex:1,accentColor:"var(--gold)"}} />
              <input type="range" aria-label="Maximum age" min={18} max={65} value={discoveryPrefs.ageMax} onChange={e=>setDiscoveryPrefs(p=>({...p,ageMax:Math.max(Number(e.target.value),p.ageMin+1)}))} style={{flex:1,accentColor:"var(--gold)"}} />
              </div>
            </div>
            <div style={{marginBottom:20}}>
              <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:8}}>Max Distance: {discoveryPrefs.distance} mi</div>
              <input type="range" aria-label="Maximum distance in miles" min={1} max={100} value={discoveryPrefs.distance} onChange={e=>setDiscoveryPrefs(p=>({...p,distance:Number(e.target.value)}))} style={{width:"100%",accentColor:"var(--gold)"}} />
            </div>
            <div style={{marginBottom:20}}>
              <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:8}}>Show Me</div>
              <div style={{display:"flex",gap:8,overflowX:"auto",whiteSpace:"nowrap",scrollbarWidth:"none",paddingBottom:4,WebkitOverflowScrolling:"touch"}}>
                {["all","women","men","non-binary"].map(g=>(
                   <button key={g} type="button" aria-pressed={discoveryPrefs.gender===g} onClick={()=>setDiscoveryPrefs(p=>({...p,gender:g}))} style={{minWidth:44,minHeight:44,padding:"8px 16px",borderRadius:99,cursor:"pointer",fontSize:12,fontWeight:600,transition:"all .25s",whiteSpace:"nowrap",flexShrink:0,background:discoveryPrefs.gender===g?"rgba(255,215,0,0.12)":"rgba(255,255,255,0.04)",border:"1px solid "+(discoveryPrefs.gender===g?"rgba(255,215,0,0.3)":"rgba(255,255,255,0.06)"),color:discoveryPrefs.gender===g?"var(--gold)":"var(--muted)"}}>{g.charAt(0).toUpperCase()+g.slice(1)}</button>
                ))}
              </div>
            </div>
            <button className="btn btn-outline" style={{width:"100%",marginBottom:10}} onClick={async ()=>{
              // Auto-name from the active filters; prefer the live search prompt
              // when the user has typed one (same convention as search).
              const autoName = `${discoveryPrefs.gender==="all"?"Anyone":discoveryPrefs.gender.charAt(0).toUpperCase()+discoveryPrefs.gender.slice(1)} · ${discoveryPrefs.ageMin}-${discoveryPrefs.ageMax} · ${discoveryPrefs.distance}mi`;
              const name = (searchQuery||"").trim() || autoName;
              const filters = { ...discoveryPrefs, filterStyles, filterScore };
              if (DEMO_MODE) {
                setSavedSearches(prev => [...prev, { id: `demo-search-${Date.now()}`, name, query: (searchQuery||"").trim(), filters }]);
                showToast("Search saved for this demo session");
                return;
              }
              try {
                const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "saved-search-save", name, query: (searchQuery||"").trim(), filters }) });
                if (!r.ok) throw new Error("failed");
                showToast("Search saved");
                try { const lr = await apiFetch("/api/muse?type=saved-search-list"); const ld = await lr.json(); setSavedSearches(Array.isArray(ld.searches)?ld.searches:[]); } catch { console.debug("[muse] saved searches could not be refreshed"); }
              } catch { showToast("Couldn't save search"); }
            }}>Save this search</button>
            <button className="btn btn-gold" style={{width:"100%"}} onClick={()=>{
              setShowDiscoveryPrefs(false);
              showToast("Preferences saved!");
              // Was local-state-only despite the toast claiming it saved — ageMin/
              // ageMax/distance/gender are already whitelisted server-side (unlike
              // filterStyles/filterScore, which do have their own persistence
              // effect), they just were never sent. Persist on this explicit Save
              // click rather than debouncing every slider tick.
              if (!DEMO_MODE) apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-preferences", preferences: discoveryPrefs }) }).catch(() => {});
            }}>{STRINGS.save}</button>
            {savedSearches.length > 0 && (
              <div style={{marginTop:16}}>
                <div style={{fontSize:12,fontWeight:700,color:"var(--text2)",marginBottom:8}}>Saved Searches</div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {savedSearches.map(s => (
                    <div key={s.id} style={{display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:10,padding:"8px 10px"}}>
                      <button onClick={()=>{
                        const f = s.filters || {};
                        setDiscoveryPrefs(p=>({...p, ageMin: typeof f.ageMin==="number"?f.ageMin:p.ageMin, ageMax: typeof f.ageMax==="number"?f.ageMax:p.ageMax, distance: typeof f.distance==="number"?f.distance:p.distance, gender: typeof f.gender==="string"?f.gender:p.gender}));
                        if (Array.isArray(f.filterStyles)) setFilterStyles(f.filterStyles);
                        if (typeof f.filterScore==="number") setFilterScore(f.filterScore);
                        setShowDiscoveryPrefs(false);
                        showToast("Search applied");
                      }} style={{flex:1,minHeight:44,textAlign:"left",background:"none",border:"none",color:"var(--text)",fontSize:13,fontWeight:600,cursor:"pointer",padding:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name}</button>
                      <button aria-label="Delete saved search" title="Delete" onClick={async (e)=>{
                        e.stopPropagation();
                        const prev = savedSearches;
                        setSavedSearches(p=>p.filter(x=>x.id!==s.id));
                        if (DEMO_MODE) return;
                        try {
                          const r = await apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "saved-search-delete", searchId: s.id, id: s.id }) });
                          if (!r.ok) throw new Error("failed");
                        } catch { setSavedSearches(prev); showToast("Couldn't delete"); }
                      }} style={{width:44,minWidth:44,height:44,background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:14,lineHeight:1,padding:"2px 4px"}}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* UNMATCH CONFIRMATION */}
      {unmatchTarget && (
        <div ref={unmatchTrap} className="modal-overlay" role="dialog" aria-modal="true" aria-label="Unmatch">
          <div className="modal-header">
            <button className="modal-back" aria-label="Back" onClick={()=>setUnmatchTarget(null)}><FiArrowLeft size={20} /></button>
            <div className="modal-title">Unmatch</div>
            <button className="modal-close" onClick={()=>setUnmatchTarget(null)} aria-label="Close"><FiX size={18} /></button>
          </div>
          <div className="modal-body" style={{textAlign:"center"}}>
            <div style={{fontSize:48,marginBottom:16}}>💔</div>
            <div style={{fontSize:18,fontWeight:700,color:"var(--text)",marginBottom:8}}>Unmatch with {unmatchTarget.name}?</div>
            <div style={{fontSize:14,color:"var(--text2)",marginBottom:24,lineHeight:1.6}}>This will remove them from your matches and delete all messages. This cannot be undone.</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <button className="btn btn-gold" style={{width:"100%",background:"linear-gradient(135deg,var(--coral),#ff4444)",borderColor:"var(--coral)"}} onClick={async()=>{
                const t=unmatchTarget;
                const prevMatches=matches;
                setMatches(prev=>prev.filter(m=>String(m.id)!==String(t.id)));
                setUnmatchTarget(null);
                showScreen("matches");
                showToast("Unmatched");
                try{
                  const r=await apiFetch("/api/muse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"unmatch",target_id:t.id})});
                  if(!r.ok) throw new Error("unmatch failed");
                }catch{
                  setMatches(prevMatches);
                  showToast("Couldn't unmatch — try again");
                }
              }}>{STRINGS.unmatch}</button>
              <button className="btn btn-outline" style={{width:"100%"}} onClick={()=>setUnmatchTarget(null)}>{STRINGS.cancel}</button>
            </div>
          </div>
        </div>
      )}
      {blockTarget && (
        <div ref={blockTrap} className="modal-overlay" role="dialog" aria-modal="true" aria-label="Block user">
          <div className="modal-header">
            <button className="modal-back" aria-label="Back" onClick={()=>setBlockTarget(null)}><FiArrowLeft size={20} /></button>
            <div className="modal-title">Block</div>
            <button className="modal-close" onClick={()=>setBlockTarget(null)} aria-label="Close"><FiX size={18} /></button>
          </div>
          <div className="modal-body" style={{textAlign:"center"}}>
            <div style={{fontSize:48,marginBottom:16}}>🚫</div>
            <div style={{fontSize:18,fontWeight:700,color:"var(--text)",marginBottom:8}}>Block {blockTarget.name}?</div>
            <div style={{fontSize:14,color:"var(--text2)",marginBottom:24,lineHeight:1.6}}>They won&apos;t be able to see your profile, message you, or match with you again. This cannot be undone.</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <button className="btn btn-gold" style={{width:"100%",background:"linear-gradient(135deg,#ff4444,#8b0000)",borderColor:"#ff4444"}} onClick={async()=>{const t=blockTarget;const prevMatches=matches;setMatches(prev=>prev.filter(m=>String(m.id)!==String(t.id)));setBlockTarget(null);setBlockedUsers(prev=>prev.includes(String(t.id))?prev:[...prev,String(t.id)]);showScreen("matches");showToast(t.name+" blocked");try{await apiFetch("/api/muse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"block",target_id:t.id})});}catch{setMatches(prevMatches);showToast("Couldn't block — try again")}}}>{STRINGS.block}</button>
              <button className="btn btn-outline" style={{width:"100%"}} onClick={()=>setBlockTarget(null)}>{STRINGS.cancel}</button>
            </div>
          </div>
        </div>
      )}

      {/* STORIES VIEWER */}
      {showStory!==null && (
        <div style={{position:"fixed",inset:0,zIndex:600,background:"rgba(0,0,0,0.96)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <div style={{position:"absolute",top:18,left:16,right:16,display:"flex",gap:5,zIndex:4}}>
            {stories.map((s,i)=>(
              <div key={s.id} style={{flex:1,height:3,borderRadius:2,background:"rgba(255,255,255,0.25)",overflow:"hidden"}}>
                <div key={showStory} style={{height:"100%",width:"100%",background:"var(--gold)",transformOrigin:"left",transform:i<showStory?"scaleX(1)":"scaleX(0)",animation:i===showStory?"storyProgress 5s linear forwards":"none"}} />
              </div>
            ))}
          </div>
          <button style={{position:"absolute",top:14,right:14,zIndex:5,background:"none",border:"none",color:"#fff",fontSize:26,cursor:"pointer",padding:6}} onClick={()=>setShowStory(null)} aria-label="Close story">✕</button>
          {stories[showStory] && (
            <div style={{textAlign:"center",pointerEvents:"none"}}>
              <Image loading="lazy" src={stories[showStory].img} alt="Photo" width={800} height={1200} style={{width:"auto",height:"auto",maxWidth:"90%",maxHeight:"70vh",borderRadius:16,objectFit:"contain",backgroundColor:"#1a0a2e"}} />
              <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"center",marginTop:16}}>
                <Image loading="lazy" src={stories[showStory].avatar} alt="Avatar" width={32} height={32} style={{borderRadius:"50%",objectFit:"cover",backgroundColor:"#1a0a2e"}} />
                <span style={{color:"#fff",fontWeight:700}}>{stories[showStory].author}</span>
                <span style={{color:"rgba(255,255,255,0.5)",fontSize:12}}>{stories[showStory].time}</span>
              </div>
            </div>
          )}
          <div style={{position:"absolute",left:0,top:0,bottom:0,width:"30%",zIndex:2}} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation();setShowStory(prev=>prev!==null&&prev>0?prev-1:prev); } }} onClick={(e)=>{e.stopPropagation();setShowStory(prev=>prev!==null&&prev>0?prev-1:prev)}} />
          <div style={{position:"absolute",right:0,top:0,bottom:0,width:"30%",zIndex:2}} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation();setShowStory(prev=>prev!==null&&prev<stories.length-1?prev+1:null); } }} onClick={(e)=>{e.stopPropagation();setShowStory(prev=>prev!==null&&prev<stories.length-1?prev+1:null)}} />
          <div style={{position:"absolute",bottom:24,color:"rgba(255,255,255,0.5)",fontSize:12,zIndex:3,pointerEvents:"none"}}>Tap sides to navigate · tap ✕ to close</div>
        </div>
      )}
      {viewProfile && (
        <div className="modal-overlay" ref={viewProfileTrap} role="dialog" aria-modal="true" aria-label="View profile" onPointerDown={(e) => { if (e.target === e.currentTarget) setViewProfile(null); }}>
          <div className="modal-panel" style={{maxWidth:420,width:"90%",maxHeight:"88vh",overflowY:"auto",borderRadius:24,padding:0,background:"linear-gradient(180deg,#0f081e,#0a0612)"}}>
            <div style={{position:"relative",width:"100%",aspectRatio:"3/4",overflow:"hidden"}}>
              {(() => {
                const photos = (viewProfile.photos?.length ? viewProfile.photos : [viewProfile.img]).filter((photo): photo is string => Boolean(photo));
                const curPhoto = photos[viewProfilePhotoIdx] || photos[0] || viewProfile.img || "";
                return <>
                  <Image loading="lazy" src={curPhoto} alt={viewProfile.name || "Profile"} fill sizes="(max-width: 600px) 100vw, 400px" style={{objectFit:"cover",filter:viewProfile.nsfw&&!revealedNsfw.has(String(viewProfile.id))?"blur(26px) brightness(0.7)":"none",transition:"filter .3s"}} />
                  {viewProfile.nsfw&&!revealedNsfw.has(String(viewProfile.id))&&(
                    <button onClick={(e)=>{e.stopPropagation();setRevealedNsfw(prev=>{const n=new Set(prev);n.add(String(viewProfile.id));return n;})}} style={{position:"absolute",inset:0,zIndex:5,background:"rgba(10,6,18,0.45)",border:"none",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,cursor:"pointer"}}>
                      <div style={{fontSize:30,fontWeight:800,color:"#ff8a80"}}>18+</div>
                      <div style={{fontSize:13,fontWeight:700,color:"#fff",letterSpacing:0.03}}>NSFW content</div>
                      <div style={{fontSize:11,color:"rgba(255,255,255,0.7)"}}>Tap to reveal</div>
                    </button>
                  )}
                  {photos.length > 1 && (
                    <div style={{position:"absolute",bottom:70,left:0,right:0,display:"flex",justifyContent:"center",gap:6,zIndex:4}}>
                      {photos.map((_:string,i:number)=>(
                        <div key={i} onClick={(e)=>{e.stopPropagation();setViewProfilePhotoIdx(i);}} role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();e.stopPropagation();setViewProfilePhotoIdx(i);}}} style={{width:7,height:7,borderRadius:"50%",background:i===viewProfilePhotoIdx?"#FFD700":"rgba(255,255,255,0.4)",cursor:"pointer",transition:"all .2s"}} />
                      ))}
                    </div>
                  )}
                  {photos.length > 1 && <>
                    <div role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();e.stopPropagation();setViewProfilePhotoIdx(p=>p>0?p-1:photos.length-1);}}} onClick={(e)=>{e.stopPropagation();setViewProfilePhotoIdx(p=>p>0?p-1:photos.length-1);}} style={{position:"absolute",left:0,top:0,bottom:0,width:"35%",zIndex:3,cursor:"pointer"}} />
                    <div role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();e.stopPropagation();setViewProfilePhotoIdx(p=>p<photos.length-1?p+1:0);}}} onClick={(e)=>{e.stopPropagation();setViewProfilePhotoIdx(p=>p<photos.length-1?p+1:0);}} style={{position:"absolute",right:0,top:0,bottom:0,width:"35%",zIndex:3,cursor:"pointer"}} />
                  </>}
                </>;
              })()}
              <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"20px",background:"linear-gradient(to top,rgba(10,6,18,0.95),transparent)"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <div style={{fontSize:24,fontWeight:800,fontFamily:"'Playfair Display',serif",fontStyle:"italic"}}>{viewProfile.name}</div>
                  {viewProfile.verified && <span role="button" tabIndex={0} onClick={(e)=>{e.stopPropagation();setBadgeInfo({name:"Verified",desc:"Identity verified by Muses by WYZ — we confirmed this member's government ID and professional credentials.",icon:"✓",color:"#FFD700"});}} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();e.stopPropagation();setBadgeInfo({name:"Verified",desc:"Identity verified by Muses by WYZ — we confirmed this member's government ID and professional credentials.",icon:"✓",color:"#FFD700"});}}} style={{cursor:"pointer",fontSize:16,color:"#FFD700"}} title="Identity verified">✓</span>}
                </div>
                <div style={{fontSize:14,color:"var(--gold)",fontWeight:600}}>{viewProfile.type}</div>
                {viewProfile.tier && <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{viewProfile.tier}</div>}
              </div>
              <button onClick={()=>setViewProfile(null)} aria-label="Close profile" style={{position:"absolute",top:12,right:12,width:32,height:32,borderRadius:"50%",background:"rgba(0,0,0,0.6)",border:"none",color:"#fff",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",zIndex:5}}>✕</button>
            </div>
            <div style={{padding:20}}>
              <div style={{display:"flex",gap:12,marginBottom:16,justifyContent:"space-around"}}>
                {[
                  {label:"Collabs",value:viewProfile.collabs ?? "—"},
                  {label:"Score",value:viewProfile.score ?? "—"},
                  {label:"Views",value:viewProfile.views ?? "—"},
                ].map(s => (
                  <div key={s.label} style={{textAlign:"center"}}>
                    <div style={{fontSize:18,fontWeight:800,color:"var(--gold)"}}>{s.value}</div>
                    <div style={{fontSize:10,color:"var(--muted)"}}>{s.label}</div>
                  </div>
                ))}
              </div>
              {viewProfile.badges && viewProfile.badges.length > 0 && (
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
                  {viewProfile.badges.map((b, i) => (
                    <span key={i} style={{padding:"3px 8px",borderRadius:99,background:b.bg||"rgba(255,215,0,0.1)",border:`1px solid ${b.bd||"rgba(255,215,0,0.2)"}`,fontSize:10,fontWeight:700,color:b.color||"var(--gold)",cursor:"pointer"}}>{b.icon} {b.name}</span>
                  ))}
                </div>
              )}
              {viewProfile.bio && <p style={{color:"var(--text2)",lineHeight:1.6,fontSize:14,marginBottom:16}}>{viewProfile.bio}</p>}
              {viewProfile.location && <div style={{fontSize:13,color:"var(--text2)",marginBottom:12}}>📍 {viewProfile.location}{typeof viewProfile.distanceMi==="number"?` · ${viewProfile.distanceMi} mi`:""}</div>}
              {(viewProfile.styles || []).length > 0 && (
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
                  {(viewProfile.styles || []).map((s:string)=><button key={s} onClick={(e)=>{e.stopPropagation();setBadgeInfo({name:s,desc:STYLE_FULL[s]||"A creative style this member works in.",icon:"🎨",color:"#FFD700"})}} style={{padding:"3px 8px",borderRadius:99,background:"rgba(255,215,0,0.1)",border:"1px solid rgba(255,215,0,0.2)",fontSize:10,fontWeight:600,color:"var(--gold)",cursor:"pointer"}}>{s}</button>)}
                </div>
              )}
              {(viewProfile.looking || []).length > 0 && (
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
                  {(viewProfile.looking || []).map((l:string)=><span key={l} style={{padding:"3px 8px",borderRadius:99,background:"rgba(255,105,180,0.12)",border:"1px solid rgba(255,105,180,0.2)",fontSize:10,fontWeight:600,color:"#FF69B4"}}>looking for {l}</span>)}
                </div>
              )}
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
                {viewProfile.zodiac && <button onClick={(e)=>{e.stopPropagation();setBadgeInfo({name:`${viewProfile.zodiac} — ${ZODIAC_FULL[viewProfile.zodiac || ""]?.tag||""}`,desc:ZODIAC_FULL[viewProfile.zodiac || ""]?.desc||"",icon:ZODIAC_GLYPH[viewProfile.zodiac || ""]||"✦",color:"#D4A5FF"})}} style={{padding:"3px 8px",borderRadius:99,background:"rgba(212,165,255,0.12)",border:"1px solid rgba(212,165,255,0.2)",fontSize:10,fontWeight:600,color:"var(--lavender)",cursor:"pointer"}}>{ZODIAC_GLYPH[viewProfile.zodiac || ""]||"✦"} {viewProfile.zodiac}</button>}
                {viewProfile.mbti && <button onClick={(e)=>{e.stopPropagation();setBadgeInfo({name:`${viewProfile.mbti} — ${MBTI_FULL[viewProfile.mbti || ""]?.tag||""}`,desc:MBTI_FULL[viewProfile.mbti || ""]?.desc||"",icon:<MbtiIcon code={viewProfile.mbti || ""} size={16}/>,color:"#FFD700"})}} style={{padding:"3px 8px",borderRadius:99,background:"rgba(255,215,0,0.1)",border:"1px solid rgba(255,215,0,0.2)",fontSize:10,fontWeight:600,color:"var(--gold)",cursor:"pointer",display:"inline-flex",alignItems:"center",gap:4}}><MbtiIcon code={viewProfile.mbti || ""} size={10}/> {viewProfile.mbti}</button>}
                {viewProfile.lifePath && <button onClick={(e)=>{e.stopPropagation();setBadgeInfo({name:`Life Path ${viewProfile.lifePath}`,desc:LIFE_PATH_FULL[String(viewProfile.lifePath)]||"",icon:<LifePathIcon n={Number(viewProfile.lifePath)} size={16}/>,color:"#98FB98"})}} style={{padding:"3px 8px",borderRadius:99,background:"rgba(152,251,152,0.1)",border:"1px solid rgba(152,251,152,0.2)",fontSize:10,fontWeight:600,color:"var(--mint)",cursor:"pointer",display:"inline-flex",alignItems:"center",gap:4}}><LifePathIcon n={Number(viewProfile.lifePath)} size={10}/> LP {viewProfile.lifePath}</button>}
              </div>
              {typeof viewProfile.collabs === "number" && <div style={{fontSize:13,color:"var(--text2)",marginBottom:16}}>🤝 {viewProfile.collabs} collaborations</div>}
              {viewProfileReviews.length > 0 && (
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:14,fontWeight:700,color:"var(--text)",marginBottom:8}}>Reviews</div>
                  {viewProfileReviews.map((rv) => (
                    <div key={rv.id} style={{padding:"10px 12px",borderRadius:12,background:"rgba(255,255,255,0.04)",marginBottom:8}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                        <span style={{fontSize:12,fontWeight:700,color:"var(--text)"}}>{rv.reviewer_id?.name || "Anonymous"}</span>
                        <span style={{fontSize:12,color:"var(--gold)"}}>{"★".repeat(rv.rating)}{"☆".repeat(5 - rv.rating)}</span>
                      </div>
                      {rv.body && <div style={{fontSize:12,color:"var(--text2)",lineHeight:1.5}}>{rv.body}</div>}
                    </div>
                  ))}
                </div>
              )}
              <button className="btn btn-gold" style={{width:"100%"}} onClick={() => {const u=viewProfile;setViewProfile(null);setPublicProfileUser({ ...u, badges: u.badges?.map(b => b.name) });}}>View Full Profile</button>
            </div>
            <BadgeInfoModal info={badgeInfo} onClose={()=>setBadgeInfo(null)} />
          </div>
        </div>
      )}
      {/* ══════ PUBLIC PROFILE ══════ */}
      {publicProfileUser && (
        <React.Suspense fallback={null}>
          <ScreenErrorBoundary name="PublicProfile">
            <PublicProfileScreen
              user={publicProfileUser}
              onBack={() => setPublicProfileUser(null)}
              onMessage={(u) => { setPublicProfileUser(null); setChatTarget(u as unknown as Match); showScreen("chat"); }}
              onReport={(u) => { setReportTarget({ id: u.id, type: "user", name: u.name || "Unknown" }); setShowReport(true); setPublicProfileUser(null); }}
              onBlock={(u) => { setBlockTarget({ id: u.id, name: u.name || "Unknown" }); setPublicProfileUser(null); }}
              handleImgError={handleImgError}
              currentUser={currentUser}
              apiFetch={apiFetch}
              showToast={showToast}
              lightboxPhotos={lightboxPhotos}
              lightboxIdx={lightboxIdx}
              setLightboxPhotos={setLightboxPhotos}
              setLightboxIdx={setLightboxIdx}
            />
          </ScreenErrorBoundary>
        </React.Suspense>
      )}
      {/* ══════ SHARE MODAL ══════ */}
      {shareTarget && (
        <div className="modal-overlay" ref={shareTargetTrap} role="dialog" aria-modal="true" aria-label="Share" onPointerDown={(e) => { if (e.target === e.currentTarget) setShareTarget(null); }}>
          <div className="modal-panel" style={{ maxWidth: 420, width: "90%", borderRadius: 24, padding: "24px 20px", background: "linear-gradient(180deg,#0f081e,#0a0612)" }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Playfair Display',serif", fontStyle: "italic", color: "var(--gold)" }}>Share</div>
              <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 6 }}>Share {shareTarget.author}'s post</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
              {[
                { name: "X", icon: "𝕏", color: "#000", bg: "#fff" },
                { name: "Facebook", icon: "f", color: "#fff", bg: "#1877F2" },
                { name: "Instagram", icon: "📸", color: "#fff", bg: "#E4405F" },
                { name: "WhatsApp", icon: "💬", color: "#fff", bg: "#25D366" },
                { name: "LinkedIn", icon: "in", color: "#fff", bg: "#0A66C2" },
                { name: "Email", icon: "✉️", color: "#fff", bg: "#6B7280" },
                { name: "Copy", icon: "🔗", color: "#fff", bg: "#8B5CF6" },
                { name: "More", icon: "•••", color: "#fff", bg: "#374151" },
              ].map(s => {
                const url = getPostShareUrl(shareTarget.id);
                const text = encodeURIComponent((shareTarget.text || "Check this out on Muses by WYZ!").slice(0, 200));
                const href = s.name === "X" ? `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${text}`
                  : s.name === "Facebook" ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
                  : s.name === "LinkedIn" ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
                  : s.name === "WhatsApp" ? `https://wa.me/?text=${text}%20${encodeURIComponent(url)}`
                  : s.name === "Email" ? `mailto:?subject=${encodeURIComponent("Check this out on Muses by WYZ")}&body=${text}%20${encodeURIComponent(url)}`
                  : null;
                return (
                  <button key={s.name} onClick={() => {
                    if (s.name === "Copy") { navigator.clipboard?.writeText(url); showToast("Link copied!"); setShareTarget(null); }
                    else if (s.name === "More") { if (navigator.share) { navigator.share({ title: "Muses by WYZ", text: shareTarget.text || "Check this out on Muses by WYZ!", url }).catch(() => {}); } else { navigator.clipboard?.writeText(url); showToast("Link copied!"); } setShareTarget(null); }
                    else if (href) { window.open(href, "_blank", "noopener"); setShareTarget(null); }
                  }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "14px 6px", cursor: "pointer", transition: "all .2s" }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: s.bg, color: s.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800 }}>{s.icon}</div>
                    <div style={{ fontSize: 11, color: "var(--text2)", fontWeight: 600 }}>{s.name}</div>
                  </button>
                );
              })}
            </div>
            <button className="btn btn-outline" style={{ width: "100%", fontSize: 13, fontWeight: 600 }} onClick={() => setShareTarget(null)}>{STRINGS.cancel}</button>
          </div>
        </div>
      )}
      {/* ══════ EDIT PROFILE MODAL ══════ */}
      {showEditProfile && (
        <div ref={editProfileTrap} className="modal-overlay" role="dialog" aria-modal="true" aria-label="Edit profile">
          <div className="modal-header" style={{ position: "relative" }}>
            <button className="modal-back" onClick={()=>setShowEditProfile(false)} aria-label="Back"><FiArrowLeft size={20} /></button>
            <div className="modal-title" style={{ flex: 1, textAlign: "center" }}>Edit Profile</div>
            <div style={{ width: 42 }} />
          </div>
          <div className="modal-body">
            <div style={{display:"flex",justifyContent:"center",marginBottom:16}}>
              <div style={{position:"relative"}}>
                <Image src={editAvatar || currentUser.avatar} alt="Avatar" width={88} height={88} style={{borderRadius:"50%",objectFit:"cover",border:"3px solid var(--gold)",background:"#1a0a2e"}} onError={handleImgError} />
                <button type="button" onClick={()=>editAvatarInputRef.current?.click()} style={{position:"absolute",bottom:0,right:0,width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#ffd700,#ff8a80)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#0a0612"}} title="Upload profile photo" aria-label="Upload profile photo">+</button>
                <input ref={editAvatarInputRef} type="file" accept="image/*" aria-label="Upload profile photo" style={{display:"none"}} onChange={async (e)=>{const f=e.target.files?.[0];if(f){showToast("Uploading...");const url=await uploadImage(f,"avatars");if(url){setEditAvatar(url);showToast("Photo added!")}}}} />
              </div>
            </div>
            <input className="inp" aria-label="Display name" placeholder="Display Name" value={editName} onChange={e=>setEditName(e.target.value)} />
            <textarea className="inp" aria-label="Bio" placeholder="Bio" rows={3} value={editBio} onChange={e=>setEditBio(e.target.value)} />
            <input className="inp" aria-label="Location" placeholder="Location" value={editLoc} onChange={e=>setEditLoc(e.target.value)} />
            <input className="inp" aria-label="Media kit link" placeholder="Media Kit link (PDF or portfolio one-pager)" value={editMediaKit} onChange={e=>setEditMediaKit(e.target.value)} />
            <div style={{ marginBottom: 12 }}>
              <div className="side-label">Creative Type</div>
              <div className="side-sub" style={{ marginBottom: 6 }}>🎬 Behind the Camera</div>
              <div className="chips" style={{ marginBottom: 8 }}>
                {BEHIND_CAMERA.map(t => <div key={t} className={"chip"+(editType===t?" sel":"")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setEditType(t); setEditCustomTypePending(false); } }} onClick={()=>{setEditType(t);setEditCustomTypePending(false);}}><span>{t}</span></div>)}
              </div>
              <div className="side-sub" style={{ marginBottom: 6 }}>📸 In Front of the Camera</div>
              <div className="chips">
                {IN_FRONT_CAMERA.map(t => <div key={t} className={"chip"+(editType===t?" sel":"")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setEditType(t); setEditCustomTypePending(false); } }} onClick={()=>{setEditType(t);setEditCustomTypePending(false);}}><span>{t}</span></div>)}
                {/* Torreé audit item 6 */}
                <div key="other" className={"chip"+(editCustomTypePending?" sel":"")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setEditType(""); setEditCustomTypePending(true); } }} onClick={()=>{setEditType("");setEditCustomTypePending(true);}}><span>Add New +</span></div>
              </div>
              {editCustomTypePending && (
                <input className="inp" aria-label="Creative role" placeholder="Type your creative role..." value={editType} onChange={e=>setEditType(e.target.value)} style={{ marginTop: 10 }} />
              )}
            </div>
            <div style={{ marginBottom: 14 }}>
              <div className="side-label">Looking For</div>
              <div className="chips">
                {lookingForOptions(editType || currentUser.type || "").map(l => (
                  <div key={l} className={"chip"+((editLooking.length?editLooking:obData.looking||[]).includes(l)?" sel":"")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); const cur = editLooking.length?editLooking:(obData.looking||[]); setEditLooking(cur.includes(l)?cur.filter(x=>x!==l):[...cur,l]); } }} onClick={()=>{const cur = editLooking.length?editLooking:(obData.looking||[]); setEditLooking(cur.includes(l)?cur.filter(x=>x!==l):[...cur,l]);}}><span>{l}</span></div>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 14, padding: "12px 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>NSFW Profile</div>
                  <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 2 }}>Mark your profile as 18+ — content will be age-gated in Discovery</div>
                </div>
                <div role="switch" aria-checked={editNsfw} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setEditNsfw(!editNsfw); } }} onClick={() => setEditNsfw(!editNsfw)} className={"toggle-track" + (editNsfw ? " active" : "")} style={{ width: 44, height: 24, borderRadius: 12, cursor: "pointer", position: "relative", transition: "all .3s", background: editNsfw ? "linear-gradient(135deg,var(--coral),var(--pink))" : "rgba(255,255,255,0.1)", flexShrink: 0 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 10, background: "#fff", position: "absolute", top: 2, left: editNsfw ? 22 : 2, transition: "all .3s" }} />
                </div>
              </div>
            </div>
            <button className="btn btn-gold" style={{width:"100%"}} onClick={saveProfileEdits}>{STRINGS.save}</button>
          </div>
        </div>
      )}
      {/* ══════ SHARE PROFILE SHEET ══════ */}
      {showShareProfile && (
        <div className="modal-overlay" ref={shareProfileTrap} role="dialog" aria-modal="true" aria-label="Share profile" onPointerDown={(e) => { if (e.target === e.currentTarget) setShowShareProfile(false); }}>
          <div className="share-sheet">
            <div className="share-title">Share Profile</div>
            <div className="share-options">
              <div className="share-opt" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigator.clipboard?.writeText(getProfileShareUrl(authUser?.id||currentUser.name.replace(/\s+/g,"-").toLowerCase())).then(()=>showToast("Link copied!")).catch(()=>showToast("Copied!"));setShowShareProfile(false); } }} onClick={()=>{navigator.clipboard?.writeText(getProfileShareUrl(authUser?.id||currentUser.name.replace(/\s+/g,"-").toLowerCase())).then(()=>showToast("Link copied!")).catch(()=>showToast("Copied!"));setShowShareProfile(false)}}><span className="share-opt-icon"><FiLink size={24} /></span><span className="share-opt-label">Copy</span></div>
              <div className="share-opt" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); window.open("https://twitter.com/intent/tweet?text=Check%20out%20my%20Muses%20by%20WYZ%20profile!&url="+encodeURIComponent(getMuseUrl()),"blank"); } }} onClick={()=>{window.open("https://twitter.com/intent/tweet?text=Check%20out%20my%20Muses%20by%20WYZ%20profile!&url="+encodeURIComponent(getMuseUrl()),"blank")}}><span className="share-opt-icon"><FiTwitter size={24} /></span><span className="share-opt-label">Twitter</span></div>
              <div className="share-opt" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); const url=getProfileShareUrl(authUser?.id||currentUser.name.replace(/\s+/g,"-").toLowerCase());if(navigator.share){navigator.share({title:"My Muses Profile",text:"Check out my Muses profile!",url}).catch(()=>{});}else{navigator.clipboard?.writeText(url).then(()=>showToast("Link copied! Paste it in your IG bio or story")).catch(()=>window.open("https://www.instagram.com/"));}setShowShareProfile(false); } }} onClick={()=>{const url=getProfileShareUrl(authUser?.id||currentUser.name.replace(/\s+/g,"-").toLowerCase());if(navigator.share){navigator.share({title:"My Muses Profile",text:"Check out my Muses profile!",url}).catch(()=>{});}else{navigator.clipboard?.writeText(url).then(()=>showToast("Link copied! Paste it in your IG bio or story")).catch(()=>window.open("https://www.instagram.com/"));}setShowShareProfile(false)}}><span className="share-opt-icon"><FiInstagram size={24} /></span><span className="share-opt-label">IG</span></div>
            </div>
            <div className="share-link"><span className="share-link-text">{getProfileShareUrl(authUser?.id||currentUser.name.replace(/\s+/g,"-").toLowerCase()).replace(/^https?:\/\//, "")}</span><button className="share-link-copy" onClick={()=>{navigator.clipboard?.writeText(getProfileShareUrl(authUser?.id||currentUser.name.replace(/\s+/g,"-").toLowerCase())).then(()=>showToast("Link copied!")).catch(()=>showToast("Copied!"))}}>Copy</button></div>
            <button className="btn btn-outline" style={{marginTop:16,width:"100%"}} onClick={()=>setShowShareProfile(false)}>{STRINGS.close}</button>
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
            if (d.blocked) { setShowDisclosureModal(false); showToast("Request blocked — violates Muses by WYZ terms"); return; }
            if (d.success) { setShowDisclosureModal(false); showToast("Disclosure sent for review"); }
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
            setShowDisclosureModal(false); showToast("Disclosure confirmed ✓");
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
              showToast("Disclosure confirmed ✓");
            } else if (pendingDisclosureCreate) {
              const form = pendingDisclosureCreate;
              setPendingDisclosureCreate(null);
              const r = await authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "create-disclosure", ...form, responderId: disclosureTarget?.id, bookingId: disclosureBookingId }) });
              const d = await r.json();
              if (d.blocked) { showToast("Request blocked — violates Muses by WYZ terms"); return; }
              if (d.success) { showToast("Disclosure sent for review"); }
            }
          }}
          onClose={() => {
            setShowAgeVerification(false);
            setPendingDisclosureConfirm(null);
            setPendingDisclosureCreate(null);
          }}
        />
      )}
      {/* ══════ CONTEXTUAL UPSELL MODAL ══════ */}
      <UpsellModal
        open={upsell !== null}
        onClose={closeUpsell}
        feature={upsell?.feature || ""}
        reason={upsell?.reason || ""}
        icon={upsell?.icon}
        currentUser={currentUser}
        showScreen={showScreen}
      />
      {/* ══════ SAFETY CHECK-IN MODAL ══════ */}
      {showSafetyCheckin && (
        <SafetyCheckinModal
          checkins={safetyCheckins}
          safetyProfile={safetyProfile}
          onRespond={async (id, response, shared, reason) => {
            const r = await authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "respond-checkin", checkinId: id, response, sharedWithContact: shared, reason }) });
            if (!r.ok) { showToast("Failed to save response"); return; }
            setSafetyCheckins(prev => prev.map(c => c.id === id ? { ...c, status: response, responded_at: new Date().toISOString() } : c));
          }}
          onSaveSafetyProfile={async (profile) => {
            const r = await authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "save-safety-profile", ...profile }) });
            if (!r.ok) { showToast("Failed to save safety profile"); return; }
            setSafetyProfile(profile); showToast("Safety profile saved");
          }}
          onShareDetails={async (bookingId, method) => {
            const r = await authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "share-safety-details", bookingId, shareMethod: method }) });
            if (!r.ok) { showToast("Failed to share details"); return; }
            showToast("Details shared with trusted contact");
          }}
          onFetchStrikes={async () => {
            const r = await authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "get-strikes" }) });
            const d = await r.json();
            return d.strikes || [];
          }}
          onFetchDisclosures={async () => {
            const r = await authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "get-disclosures" }) });
            const d = await r.json();
            return d.disclosures || [];
          }}
          onAppealStrike={async (strikeId, text) => {
            const r = await authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "appeal-strike", strikeId, appealText: text }) });
            return r.ok;
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
            if (!d.success) throw new Error(d.error || "Failed to save");
            setPromptResponses(prev => {
              const existing = prev.findIndex(r => r.prompt_id === promptId);
              const newResp = { id: "new", prompt_id: promptId, response_text: text, response_choices: choices };
              if (existing >= 0) { const copy = [...prev]; copy[existing] = newResp; return copy; }
              return [...prev, newResp];
            });
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
      {showDailyLogin && (
        <DailyLoginModal
          name={currentUser.name}
          creativeType={currentUser.type}
          weeklyLogins={weeklyLogins}
          loginStreak={loginStreak}
          onClose={() => setShowDailyLogin(false)}
          onViewQuests={() => { setShowDailyLogin(false); setShowQuests(true); }}
        />
      )}
      {activePageTour && (
        <PageTour
          open
          onClose={() => {
            try { safeSetItem(tourSeenKey(activePageTour), "1"); } catch { console.debug("[muse] tour completion could not be persisted"); }
            setActivePageTour(null);
          }}
          icon={PAGE_TOURS[activePageTour].icon}
          from={PAGE_TOURS[activePageTour].from}
          to={PAGE_TOURS[activePageTour].to}
          slides={PAGE_TOURS[activePageTour].slides}
          orbitCount={PAGE_TOURS[activePageTour].orbitCount}
          sparkCount={PAGE_TOURS[activePageTour].sparkCount}
          ringStyle={PAGE_TOURS[activePageTour].ringStyle}
          ariaLabel={PAGE_TOURS[activePageTour].ariaLabel}
        />
      )}
      <ScreenErrorBoundary name="QuestPanel">
        <QuestPanel
          show={showQuests}
          onClose={() => setShowQuests(false)}
          apiFetch={apiFetch}
          showToast={showToast}
          onClaimablesChange={setClaimableQuests}
          onQuestsChange={handleQuestsChange}
          loginStreak={loginStreak}
          weeklyLogins={weeklyLogins}
        />
      </ScreenErrorBoundary>

      {/* ── Incoming call ring ── */}
      {incomingCall && !activeCall && (
        <div role="dialog" aria-modal="true" aria-label="Incoming call" style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(5,3,10,0.94)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, textAlign: "center" }}>
          <div style={{ width: 104, height: 104, borderRadius: "50%", background: "linear-gradient(135deg,#ffd700,#d4a5ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 42, fontWeight: 800, color: "#0a0612" }}>
            {(incomingCall.fromName || "?").slice(0, 1).toUpperCase()}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#f5f0ff" }}>{incomingCall.fromName}</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.65)" }}>
            Incoming {incomingCall.kind === "voice" ? "voice" : "video"} call
          </div>
          <div style={{ display: "flex", gap: 18, marginTop: 10 }}>
            <button onClick={declineCall} style={{ width: 66, height: 66, borderRadius: "50%", border: "none", background: "#ff3b30", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Decline</button>
            <button onClick={acceptCall} style={{ width: 66, height: 66, borderRadius: "50%", border: "none", background: "#34c759", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Accept</button>
          </div>
        </div>
      )}

      {activeCall && (
        <CallOverlay
          call={activeCall}
          onEnd={endCall}
          onVoicemail={leaveVoicemail}
          uploadMedia={uploadMedia}
          recording={!!callRecording}
          peerRecording={callPeerRecording}
          onToggleRecording={() => (callRecording ? stopCallRecording() : startCallRecording())}
          onReport={() => { setReportTarget({ id: activeCall.peerId, type: "user", name: activeCall.peerName }); setShowReport(true); }}
        />
      )}

      {callError && !activeCall && (
        <div onClick={() => setCallError(null)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setCallError(null); } }} style={{ position: "fixed", bottom: 96, left: "50%", transform: "translateX(-50%)", zIndex: 10002, background: "#2a1216", color: "#ff8a80", border: "1px solid rgba(255,138,128,0.35)", borderRadius: 12, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", maxWidth: "90vw" }}>
          {callError}
        </div>
      )}
    </div>
  );
}
