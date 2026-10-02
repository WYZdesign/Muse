"use client";
import "./muse.css";
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { supabase } from "@/lib/supabase";
import { subscribeToMusePush, unsubscribeFromMusePush, ensureMusePushRegistered } from "@/app/muse-pwa";
import { getGeolocation, distanceMiles } from "@/app/muse-realtime";
import { FiX } from "react-icons/fi";
import BackgroundScene from "./components/BackgroundScene";
import { MatchOverlay } from "./components/MatchOverlay";
import { announce } from "./a11y";
import { PageSplash } from "./components/PageSplash";
import Confetti from "./components/Confetti";
import SwipeParticles from "./components/SwipeParticles";
import { OnboardingBirthdateField } from "./components/OnboardingBirthdateField";
import { safeSetItem, safeGetItem, safeGetItemAsync, safeRemoveItem, setRefreshToken, getRefreshToken, clearRefreshToken } from "./lib/safe-storage";
import { getAccessToken, authFetch, fetchWithTimeout } from "./lib/api";
import { analytics, setAnalyticsUser, initAnalyticsSession } from "./lib/analytics";
import { initialsAvatarUrl } from "./lib/initials-avatar";
import { uid } from "./lib/uid";
import { viewerSide, viewerSideOf } from "@/lib/role";
import { MUSE_CLOSED_BETA_HIDE_SOCIAL } from "@/lib/config";
import { STRINGS } from "@/lib/strings";
import type { BadgeInfo } from "./components/badgeInfo";
import { useChatState } from "./hooks/useChatState";
import { useCall } from "./hooks/useCall";
import { useFocusTrap } from "./hooks/useFocusTrap";
import { getIcebreaker, getReferralTier, checkProfileBadges, buildBriefTitleMap, computeUnreadCount } from "./page-helpers";
import CallOverlay from "./components/CallOverlay";
import { useBriefsState } from "./hooks/useBriefsState";
import { useSavedListingsState } from "./hooks/useSavedListingsState";
import { useModalVisibility } from "./hooks/useModalVisibility";
import { useQuestsState } from "./hooks/useQuestsState";
import { useAuthOnboardingState } from "./hooks/useAuthOnboardingState";
import { useDiscoverState } from "./hooks/useDiscoverState";
import SupportChat from "./components/SupportChat";
import PageTour from "./components/PageTour";
import { PAGE_TOURS, type TourScreenId } from "./components/pageTourContent";
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
import { MuseModals } from "./modals/MuseModals";
import { IntentPickerModal } from "./modals/IntentPickerModal";
import { PROFILES, AESTHETICS, BEHIND_CAMERA, IN_FRONT_CAMERA, lookingForOptions, CITY_GEO, ZODIAC, ZE, CHINESE, CE, MBTI, LIFE_PATHS, ICEBREAKERS, BRIEFS, calcMatch, matchReasons, calcZodiac, calcChineseZodiac, calcLifePath, calcMbti, type Profile, type Match, type Screen, type LikeAnchor } from "./components/types";
import { useDiscoveryData } from "./hooks/useDiscoveryData";
import { useFeedData } from "./hooks/useFeedData";
import { useCommunityData } from "./hooks/useCommunityData";
import { useSessionData } from "./hooks/useSessionData";
import { useSessionApply } from "./hooks/useSessionApply";
import { useBootstrapHydration } from "./hooks/useBootstrapHydration";
import { useSwipeActions } from "./hooks/useSwipeActions";
import { useThemeEffect } from "./hooks/useThemeEffect";
import { usePreferenceSync } from "./hooks/usePreferenceSync";
import { useToastChannel } from "./hooks/useToastChannel";
import { useCardAlbumPhotos } from "./hooks/useCardAlbumPhotos";
import { useChatEffects } from "./hooks/useChatEffects";
import { useNotificationSync } from "./hooks/useNotificationSync";
import { useQuestTracking } from "./hooks/useQuestTracking";
import { useSessionRefresh } from "./hooks/useSessionRefresh";
import { useVisualEffects } from "./hooks/useVisualEffects";
import { useKeyboardNav } from "./hooks/useKeyboardNav";
import { useVisibilityPause } from "./hooks/useVisibilityPause";
import { useStoryAutoAdvance } from "./hooks/useStoryAutoAdvance";
import { useMountFlags } from "./hooks/useMountFlags";
import { useViewedProfile } from "./hooks/useViewedProfile";
import { useSavedSearches } from "./hooks/useSavedSearches";
import { useMotionPermission } from "./hooks/useMotionPermission";
import { useBoostExpiry } from "./hooks/useBoostExpiry";
import { useSocialConnection } from "./hooks/useSocialConnection";
import { useMessageRequests } from "./hooks/useMessageRequests";
import { usePageTour } from "./hooks/usePageTour";
import { useDailyLikesReset } from "./hooks/useDailyLikesReset";
import { useSaveStateTimer } from "./hooks/useSaveStateTimer";
import { useSessTabRealign } from "./hooks/useSessTabRealign";
import { useVisitedScreens } from "./hooks/useVisitedScreens";
import { useBriefsData } from "./hooks/useBriefsData";
import { useProfileData } from "./hooks/useProfileData";
import { useMuseActions } from "./hooks/useMuseActions";
import { useAuthActions } from "./hooks/useAuthActions";
import { useChatActions } from "./hooks/useChatActions";
import { useProfileActions } from "./hooks/useProfileActions";
import { normalizeCommunity, normalizeEvent, normalizeForumPost, normalizeBrief, normalizeSession, normalizeFeedPost } from "./hooks/normalizers";
import { AGE_VERIFICATION_VALID_DAYS, DEMO_MODE, MATCH_VARIANTS, OWNER_EMAIL } from "./page-constants";
import type { Professional, ProfileReview, RawApiProfile, RawFeedPost, RawForumPost, ViewProfile } from "./page-models";
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
  { id: 9006, author: "Kai Tanaka", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100", img: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800", time: "4h ago", text: "First edit pass on the campaign. Client's gonna dig this one.", likes: 312, comments: 41 },
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
  // Initialize screen from localStorage (muse_v1) so first render matches
  // the persisted screen (e.g., "discover" in demo mode). This avoids a frame
  // where visitedScreens is seeded with "auth" before hydration restores the real screen.
  const [screen, setScreen] = useState<Screen>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("muse_v1");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.screen) return parsed.screen as Screen;
        }
      } catch { /* storage unavailable — default to auth */ }
    }
    return "auth";
  });
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
  const [pendingNsfw, setPendingNsfw] = useState(false);
  const [userTier, setUserTier] = useState<string>("free");
  const [liveProfessionals, setLiveProfessionals] = useState<Professional[] | null>(null);
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
  // The lazy init runs before the server profile arrives (type starts
  // as the "Photographer" placeholder), so re-align once when the real type
  // lands — duality Phase 0's role-aware default.
  const { sessTab, setSessTab } = useSessTabRealign({ currentUserType: currentUser?.type, initialSessTab: () => viewerSideOf(currentUser) === "industry" ? "bookings" : "sessions" });
  const [forumSort, setForumSort] = useState<"hot"|"new"|"top">("hot");
  const [_networkOpenTab, _setNetworkOpenTab] = useState<"pros"|"forum"|undefined>(undefined);
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
  const portfolioInputRef = useRef<HTMLInputElement>(null);
  const [matchesView, setMatchesView] = useState<"list"|"grid">("list");
  const [profileViews, setProfileViews] = useState(0);
  const [profileViewers, setProfileViewers] = useState<{name:string;avatar:string;time:string}[]>([]);
  const [theme, setTheme] = useState<"lasunset"|"deepspace"|"nebula"|"deepsea"|"cinder"|"boreal"|"sunrise"|"daylight"|"sky"|"rose"|"meadow"|"frost">("lasunset");
  const [activityFeed, setActivityFeed] = useState<{id:number;type:string;from:string;avatar:string;text:string;time:string;read:boolean}[]>([]);
  const [discoveryPrefs, setDiscoveryPrefs] = useState<{ageMin:number;ageMax:number;distance:number;gender:string}>({ageMin:18,ageMax:50,distance:50,gender:"all"});
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
  // M11: dismissing used to unmount the banner instantly (no exit animation).
  // "closing" keeps it mounted for one slide-down cycle before the real
  // dismiss flips verificationBannerDismissed and unmounts it for good.
  // D1: persist dismiss across reloads (same pattern as muse_tour_seen_*).
  const { verificationBannerDismissed, setVerificationBannerDismissed } = useMountFlags({ safeGetItem, safeSetItem });
  const [pendingDisclosureConfirm, setPendingDisclosureConfirm] = useState<string | null>(null);
  const [pendingDisclosureCreate, setPendingDisclosureCreate] = useState<Record<string, unknown> | null>(null);
  const {
    claimableQuests, setClaimableQuests,
    nearQuests, setNearQuests,
    topQuests, setTopQuests,
    loginStreak, setLoginStreak,
    weeklyLogins, setWeeklyLogins,
  } = useQuestsState();

  // Open-count bump (moved into useMountFlags above).

  const [viewProfile, setViewProfileRaw] = useState<ViewProfile | null>(null);
  const [badgeInfo, setBadgeInfo] = useState<BadgeInfo | null>(null);
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

  // Reset photo carousel when a new profile is opened (moved into useViewedProfile below).
  const viewProfileTrap = useFocusTrap(!!viewProfile, () => setViewProfileRaw(null));
  const shareTargetTrap = useFocusTrap(!!shareTarget, () => setShareTarget(null));
  const [revealedNsfw, setRevealedNsfw] = useState<Set<string>>(new Set());
  const [publicProfileUser, setPublicProfileUser] = useState<PublicProfileUser | null>(null);
  const [hamburgerScreen, setHamburgerScreen] = useState<string>("");
   const [blockTarget, setBlockTarget] = useState<{id:string;name:string}|null>(null);
   const blockTrap = useFocusTrap(!!blockTarget, () => setBlockTarget(null));
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
  const _matchSwipeRef = useRef<{id:string;startX:number;el:HTMLElement|null}>({id:"",startX:0,el:null});
  const [_matchSwiping, setMatchSwiping] = useState<{id:string;offset:number} | null>(null);
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

  // Global broken-image fallback sweep (moved into useVisualEffects below).

  // iOS 13+ only fires deviceorientation events after DeviceOrientationEvent.
  // requestPermission() is called from inside a direct user-gesture handler.
  // Rather than gate that behind a dedicated settings toggle, ask on the
  // app's very first touch — the gyroscope-driven tilt effects (background
  // orbs, Discover card hero) are ambient polish, not a feature anything
  // depends on, so a silent one-time request here (no dialog if the platform
  // doesn't need one — Android/desktop) is enough. {once:true} handles both
  // "asked, granted" and "asked, denied" — never asks twice in a session.
  useMotionPermission();

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
  // (also resets the photo carousel — see useViewedProfile)
  const { viewProfilePhotoIdx, setViewProfilePhotoIdx, viewProfileReviews, setViewProfileReviews } = useViewedProfile({ viewProfileId: viewProfile?.id, fetchWithTimeout });

  // Saved searches: hydrate whenever the Discovery Preferences modal opens so
  // the list reflects the latest server state (save/delete both happen inside
  // that modal). Non-fatal on failure — the modal still works without it.
  const { savedSearches, setSavedSearches } = useSavedSearches({ showDiscoveryPrefs, apiFetch });

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
        showDistance: p.showDistance !== false, age: p.age, showAge: p.showAge !== false,
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
          // Seeded conversation threads so demo matches open with real history
          // instead of an empty "no messages" state (owner requirement: demo
          // mode must look published).
          const now = Date.now();
          const t = (mins: number) => new Date(now - mins * 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          const DEMO_THREADS: { from: "me" | "them"; text: string; time: string }[][] = [
            [{ from: "them", text: "Hey! Checked out your portfolio — the studio lighting work is unreal.", time: t(180) },
             { from: "me", text: "Thank you! I've been experimenting with a soft-box setup lately 🙌", time: t(174) },
             { from: "them", text: "Would you be up for a shoot next week? I have a concept in mind.", time: t(12) }],
            [{ from: "me", text: "Your drone reel is incredible. Do you travel for shoots?", time: t(240) },
             { from: "them", text: "I do — mostly the Southeast, but I'll fly anywhere for the right project.", time: t(232) }],
            [{ from: "them", text: "I'd like to feature your work in the community spotlight this month.", time: t(90) },
             { from: "me", text: "That would be amazing, thank you! What do you need from me?", time: t(84) }],
            [{ from: "them", text: "Just sent over the brief for the brand campaign — take a look when you can.", time: t(30) },
             { from: "me", text: "On it. First read looks great, I'll come back with availability.", time: t(26) }],
            [{ from: "me", text: "Congrats on the gallery opening! The turnout looked packed.", time: t(600) },
             { from: "them", text: "Thank you! We sold three pieces on the first night 🥂", time: t(590) }],
            [{ from: "them", text: "Are you free to hop on a quick call about the collaboration?", time: t(20) }],
          ];
          const demoMatches = PROFILES.slice(0, 6).map((p, i) => ({
            id: p.id, name: p.name, img: p.img, type: p.type,
            bio: p.bio, location: p.loc, booked: false, online: !!p.online,
            messages: DEMO_THREADS[i] || [], _demo: true
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

  useBoostExpiry({ boostActive, boostEnd, setBoostActive, safeRemoveItem });

  // Fetch connected accounts status from server on mount (moved into useSocialConnection below).

  // ─── CROSS-DEVICE: Persist all preferences to server (single debounced) ───
  usePreferenceSync({ apiFetch, authUser, obStep, notifPrefs, filterStyles, filterScore, appliedBriefs, showNsfw });

  // ─── MESSAGE REQUESTS: Fetch pending requests when on matches screen ───
  const { messageRequests, setMessageRequests } = useMessageRequests({ screen, authUser, apiFetch });

  const applySession = useSessionApply({
    authFetch,
    supabase,
    safeSetItem,
    safeGetItem,
    safeRemoveItem,
    setRefreshToken,
    clearRefreshToken,
    setAnalyticsUser,
    ensureMusePushRegistered,
    OWNER_EMAIL,
    AGE_VERIFICATION_VALID_DAYS,
    setAuthUser,
    setCurrentUser,
    setPushEnabled,
    setUserTier,
    setAgeVerified,
    setVerificationExpiringSoon,
    setNotifPrefs,
    setObStep,
    setFilterStyles,
    setFilterScore,
    setDiscoveryPrefs,
    setSavedBriefs,
    setAppliedBriefs,
    setSavedSessionIds,
    setSavedProfileIds,
    setShowOnline,
    setShowDistance,
    setShowZodiac,
    setShowAge,
    setShowMbti,
    setShowLifePath,
    setShowChinese,
    setShowMatchPercent,
    setScreen,
    syncingSdkSessionRef,
  });

  const { hydrated, myGeo } = useBootstrapHydration({
    loadStateRef,
    sessionAppliedRef,
    syncingSdkSessionRef,
    loadState,
    initAnalyticsSession,
    getGeolocation,
    safeSetItem,
    safeGetItem,
    safeRemoveItem,
    showToast: (msg: string) => showToast(msg),
    apiFetch,
    setObData,
    supabase,
    applySession,
    getRefreshToken,
    bootstrapData,
    setDiscoverLoading,
    setRefreshToken,
  });

  const visitedScreens = useVisitedScreens(screen); // lazy-mount on first visit, then keep alive

  // Cross-tab session sync + session-expiry handling (moved into useSessionRefresh below).
  useSaveStateTimer({ saveState });

  useThemeEffect({ theme });

  const { serverNotifCount } = useNotificationSync({ authFetch, authUser, setProfileViewers, setActivityFeed });

  // Ambient visual effects (img fallback, bg opacity, tide waves, scroll reset,
  // discover waves) — see useVisualEffects.
  useVisualEffects({ screen });

  // Tide-wave scroll listener + scroll-to-top-on-navigation + Discover waves
  // observer (moved into useVisualEffects above).



  const showToast = useCallback((msg: string | { msg: string; onTap?: () => void; type?: ToastType }) => { const t = typeof msg === "string" ? { msg } : msg; setToastMsg(t); setTimeout(() => setToastMsg(null), 3000); }, []);

  // Back-navigation history: showScreen pushes the screen we're leaving so a
  // back button can return to the ACTUAL previous page (e.g. Analytics → back
  // → Profile, not Discover). goBack pops the stack; falls back to discover.
  const screenHistoryRef = useRef<(typeof screen)[]>([]);

  // Contextual upsell modal — shown in place of a plain toast the moment a
  // free-tier user hits a Pro-gated limit (daily likes, super likes, "Likes
  // You" profiles, etc). `feature`/`reason` are set per-gate right before
  // opening so the same modal can explain whichever benefit was just blocked.
  const [upsell, setUpsell] = useState<{ feature: string; reason: string; icon?: string } | null>(null);

  // Core page action handlers (quest tracking, navigation, social connect,
  // onboarding multi-select, per-page tours, verification banner) — see
  // useMuseActions. Declared here because `trackQuest`/`flash`/`maybeShowPageTour`
  // are consumed by the hooks called below (useQuestTracking, usePageTour,
  // useSwipeActions) and by useAuthActions further down.
  const {
    setViewProfile,
    handleImgError,
    toggleObMulti,
    handleQuestsChange,
    trackQuest,
    maybeShowPageTour,
    flash,
    showScreen,
    goBack,
    openHamburger,
    closeUpsell,
    toggleSocial,
    dismissVerificationBanner,
    activePageTour,
    setActivePageTour,
    verificationBannerClosing,
  } = useMuseActions({
    apiFetch,
    safeGetItem,
    safeSetItem,
    showToast,
    showDailyLogin,
    showAgeVerification,
    showAgeGate,
    showQuests,
    showStories,
    showHamburger,
    setClaimableQuests,
    setNearQuests,
    setTopQuests,
    setLoginStreak,
    obData,
    setObData,
    obConnectedSocials,
    setObConnectedSocials,
    authUser,
    setViewProfileRaw,
    setScreen,
    screenHistoryRef,
    setScreenFlash,
    setHamburgerScreen,
    setShowHamburger,
    setVerificationBannerDismissed,
    setUpsell,
  });

  // Social connection status fetch + OAuth callback handling — see useSocialConnection.
  useSocialConnection({ authFetch, setObConnectedSocials, showToast });

  // Surface storage quota failures to the user instead of failing silently.
  // Toast channel for code that runs before showToast exists (session bootstrap).
  useToastChannel({ showToast });


  // Quest tracking (login quests, daily login, weekly pips) — see useQuestTracking.
  useQuestTracking({ bootstrapped, authUser, trackQuest, apiFetch, setClaimableQuests, setLoginStreak, setShowDailyLogin, setWeeklyLogins, safeGetItem, safeSetItem });

  usePageTour({ screen, bootstrapped, authUser, maybeShowPageTour });

  // Weekly-login pips recompute (moved into useQuestTracking above).

  // Auth action handlers (login/signup submit, OAuth, logout) — see
  // useAuthActions. Called here so `doLogout` is already declared for
  // useSessionRefresh below (same ordering constraint Phase E noted).
  const { doLogout, doLogoutFull, handleOAuth, handleAuthClick } = useAuthActions({
    authMode,
    authEmail,
    authPass,
    authName,
    authLoading,
    authRemember,
    setAuthMode,
    setAuthPass,
    setAuthLoading,
    setFormErrors,
    setAuthUser,
    setCurrentUser,
    setUserTier,
    setObStep,
    setScreen,
    screenHistoryRef,
    setHamburgerScreen,
    setShowHamburger,
    supabase,
    authFetch,
    safeSetItem,
    safeRemoveItem,
    setRefreshToken,
    clearRefreshToken,
    flash,
    showToast,
  });

  useSessionRefresh({ applySession, setRefreshToken, doLogout, authUser });

  // Profile action handlers (edit-profile save + avatar/media uploads) — see
  // useProfileActions. `trackQuest` comes from useMuseActions above.
  const {
    uploadImage, uploadMedia, saveProfileEdits,
    editName, setEditName,
    editBio, setEditBio,
    editLoc, setEditLoc,
    editAvatar, setEditAvatar,
    editType, setEditType,
    editCustomTypePending, setEditCustomTypePending,
    editLooking, setEditLooking,
    editNsfw, setEditNsfw,
    editMediaKit, setEditMediaKit,
  } = useProfileActions({
    obData,
    currentUser,
    setObData,
    setCurrentUser,
    setShowEditProfile,
    authFetch,
    trackQuest,
    showToast,
  });

  // Single source of truth lives in components/types.ts — a second local copy
  // existed here and the two were drifting.


  const unreadNotificationCount = useMemo(() => computeUnreadCount(activityFeed, serverNotifCount), [activityFeed, serverNotifCount]);

  // Audit fix (2026-09-08): the hamburger's Activity > Applied/Saved tabs
  // only ever had the bare brief ID for each entry (appliedBriefs/
  // savedBriefs are just id arrays), so every row fell back to a generic
  // "Quest #1" label — never the real brief title shown everywhere else
  // (Collab card, this same brief's own page). Mirrors the exact merge
  // CollabScreen already uses (userBriefs, then liveBriefs falling back to
  // the static BRIEFS demo set) so the lookup matches what's actually
  // rendered as "the briefs list" elsewhere in the app.
  const briefTitleById = useMemo(() => buildBriefTitleMap(userBriefs, liveBriefs, BRIEFS), [userBriefs, liveBriefs]);

  // Merge server-side notifications (bookings, connections, check-ins) into the
  // activity feed so the Activity modal shows real DB rows, not just local events.
  // (moved into useNotificationSync above)

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

  const { cardAlbums, setCardAlbums, cardAlbumIdx, setCardAlbumIdx, cardAlbumPhotos, setCardAlbumPhotos } = useCardAlbumPhotos({ apiFetch, filteredProfiles, currentIdx });

  useDailyLikesReset({ safeGetItem, safeSetItem, setDailyLikes, setSuperLikes });

  const matchActions = useMemo(() => ({
    setExpandedMatchId, setChatTarget, showScreen, setMatchSwiping,
    setReportTarget, setShowReport, setUnmatchTarget, setBlockTarget, handleImgError, getIcebreaker, setViewProfile
  }), [setExpandedMatchId, setChatTarget, showScreen, setMatchSwiping, setReportTarget, setShowReport, setUnmatchTarget, setBlockTarget, handleImgError, getIcebreaker, setViewProfile]);

  const swipeLocked = useRef(false);
  const [intentProfile, setIntentProfile] = useState<Profile|null>(null);
  const [userDefaultIntent, setUserDefaultIntent] = useState<string>("");
  const [intentSelection, setIntentSelection] = useState<string[]>([]);
  const [showNoteTooltip, setShowNoteTooltip] = useState(() => !safeGetItem("muse_note_seen"));

  const isUnlimited = true;

  const { doSwipe, doRewind, doLikeWithNote, onPointerDown, onPointerMove, onPointerUp, onPointerCancel } = useSwipeActions({
    swipeLocked,
    dragRef,
    dragValuesRef,
    rafRef,
    likeLabelRef,
    nopeLabelRef,
    superLabelRef,
    currentIdx,
    dailyLikes,
    superLikes,
    filteredProfiles,
    isUnlimited,
    obData,
    userDefaultIntent,
    rewindStack,
    setSwipeDir,
    setUpsell,
    setIntentProfile,
    setIntentSelection,
    setShowIntentPicker,
    setMatches,
    setMatchStreak,
    setShowMatchOverlay,
    setShowConfetti,
    setExpandedMatchId,
    setActivityFeed,
    setMatchAnimVariant,
    setSuperLikes,
    setDailyLikes,
    setCurrentUser,
    setRewindStack,
    setCurrentIdx,
    setCurrentPhotoIdx,
    setPortfolioPhotoIdx,
    setPromptIdx,
    setCardScrolled,
    setShowNoteTooltip,
    setNoteTargetProfile,
    setLikeNoteAnchor,
    setLikeNoteText,
    setShowLikeNote,
    announce,
    trackQuest,
    analytics,
    calcMatch,
    showToast,
    authFetch,
    flash,
    uid,
    safeSetItem,
    DEMO_MODE,
    MATCH_VARIANTS,
  });

  useKeyboardNav({ screen, doSwipe });

  // Pause ambient animations when tab hidden (battery/thermal/cpu savings)
  useVisibilityPause();

  // Story auto-advance: 5s per story, then next (or close at the end)
  const { showStory, setShowStory } = useStoryAutoAdvance({ stories });

  // Chat action handlers (open thread, send text/image/voice/video) — see
  // useChatActions. `trackQuest` comes from useMuseActions above.
  const { openChat, sendMsg, sendChatImg, sendChatMedia } = useChatActions({
    chatInput,
    chatTarget,
    authUser,
    setChatInput,
    setChatTarget,
    setMatches,
    setScreen,
    setShowDisclosureModal,
    setDisclosureTarget,
    setTypingTarget,
    messagesEndRef,
    trackQuest,
    showToast,
  });

  const { realtimeStatus } = useChatEffects({ authUser, chatTarget, setChatTarget, setMatches, setThemTyping, typingTimerRef, sendTypingRef, messagesEndRef });

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
      <IntentPickerModal
        showIntentPicker={showIntentPicker}
        setShowIntentPicker={setShowIntentPicker}
        intentProfile={intentProfile}
        setIntentProfile={setIntentProfile}
        intentSelection={intentSelection}
        setIntentSelection={setIntentSelection}
        intentPickerTrap={intentPickerTrap}
        currentUser={currentUser}
        obData={obData}
        handleImgError={handleImgError}
        setUserDefaultIntent={setUserDefaultIntent}
        doSwipe={doSwipe}
      />
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
                    <button className="auth-terms" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setShowTerms(true); } }} onClick={()=>setShowTerms(true)}>Terms</button>
                    <button className="auth-terms" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setShowPrivacy(true); } }} onClick={()=>setShowPrivacy(true)}>Privacy</button>
                    <button className="auth-terms" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setShowGuidelines(true); } }} onClick={()=>setShowGuidelines(true)}>Guidelines</button>
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
        <main id="muse-main" role="main" tabIndex={-1} style={{flex:1,display:"flex",flexDirection:"column",minHeight:0}}>
          {/* Live status region — non-blocking announcements for async actions */}
          <div role="status" aria-live="polite" aria-atomic="true" id="muse-live-status" className="sr-only" />
          {/* VERIFICATION EXPIRY BANNER — inside <main> for the axe region fix; absolute, so visually unchanged. */}
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
{visitedScreens.has("onboard") && (<div className={"screen-el"+(screen==="onboard"?" active":"")}>
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
                    <OnboardingBirthdateField value={obData.birthdate} onChange={(v) => setObData(d => ({ ...d, birthdate: v }))} />
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
                        <button key={val} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setObData(d => ({ ...d, audience: val })); } }} onClick={() => setObData(d => ({ ...d, audience: val }))} style={{ flex: 1, padding: "10px 8px", borderRadius: 12, cursor: "pointer", textAlign: "center", fontSize: 12, fontWeight: 700, transition: "all .25s", background: obData.audience === val ? "rgba(255,215,0,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${obData.audience === val ? "rgba(255,215,0,0.3)" : "rgba(255,255,255,0.06)"}`, color: obData.audience === val ? "var(--gold)" : "var(--muted)" }}>{label}</button>
                      ))}
                    </div>
                    <div className="side-group">
                      <div className="side-label">🎬 Behind the Camera</div>
                      <div className="side-sub">You make the work — crew, direction, craft.</div>
                      <div className="chips">
                        {BEHIND_CAMERA.map(t => (
                          <button key={t} className={"chip"+(obData.type===t?" sel":"")} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setObData(d=>({...d,type:t,customTypePending:false})); } }} onClick={()=>setObData(d=>({...d,type:t,customTypePending:false}))}><span>{t}</span></button>
                        ))}
                      </div>
                    </div>
                    <div className="side-group" style={{ marginTop: 16 }}>
                      <div className="side-label">📸 In Front of the Camera</div>
                      <div className="side-sub">You're the talent — on-camera, performing, audience-facing.</div>
                      <div className="chips">
                        {IN_FRONT_CAMERA.map(t => (
                          <button key={t} className={"chip"+(obData.type===t?" sel":"")} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setObData(d=>({...d,type:t,customTypePending:false})); } }} onClick={()=>setObData(d=>({...d,type:t,customTypePending:false}))}><span>{t}</span></button>
                        ))}
                        {/* Torreé audit item 6: not every creative role fits the
                            preset list — "Other" lets someone type their own,
                            saved as a real `type` value immediately and flagged
                            custom_type_pending for admin review. */}
                        <button key="other" className={"chip"+(obData.customTypePending?" sel":"")} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setObData(d=>({...d,type:"",customTypePending:true})); } }} onClick={()=>setObData(d=>({...d,type:"",customTypePending:true}))}><span>Add New +</span></button>
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
                        <button key={l} className={"chip"+((obData.looking||[]).includes(l)?" sel":"")} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleObMulti("looking", l, 4); } }} onClick={()=>toggleObMulti("looking", l, 4)}><span>{l}</span></button>
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
                        <button key={s} className={"chip"+((obData.styles||[]).includes(s)?" sel":"")} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleObMulti("styles", s, 5); } }} onClick={()=>toggleObMulti("styles", s, 5)}><span>{s}</span></button>
                      ))}
                      {/* Torreé audit item 6: aesthetic "Other" — typed values are
                          appended to `styles` immediately and flagged
                          custom_style_pending for admin review. */}
                      <button key="other" className={"chip"+(obData.showCustomStyleInput?" sel":"")} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setObData(d=>({...d,showCustomStyleInput:!d.showCustomStyleInput})); } }} onClick={()=>setObData(d=>({...d,showCustomStyleInput:!d.showCustomStyleInput}))}><span>Add New +</span></button>
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
                          <button key={s} className="chip sel" tabIndex={0} title="Tap to remove" onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setObData(d => ({ ...d, styles: (d.styles||[]).filter(x => x !== s) })); } }} onClick={() => setObData(d => ({ ...d, styles: (d.styles||[]).filter(x => x !== s) }))}><span>✎ {s} ✕</span></button>
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
                        <button key={z} className={"chip"+(obData.zodiac===z?" sel":"")} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setObData(d=>({...d,zodiac:z})); } }} onClick={()=>setObData(d=>({...d,zodiac:z}))}><span>{ZE[z]} {z}</span></button>
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
                        <button key={c} className={"chip"+(obData.chinese===c?" sel":"")} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setObData(d=>({...d,chinese:c})); } }} onClick={()=>setObData(d=>({...d,chinese:c}))}><span>{CE[c]} {c}</span></button>
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
                        <button key={m} className={"chip"+(obData.mbti===m?" sel":"")} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setObData(d=>({...d,mbti:m})); } }} onClick={()=>setObData(d=>({...d,mbti:m}))}><span>{m}</span></button>
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
                        <button key={lp} className={"chip"+(obData.lifePath===lp?" sel":"")} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setObData(d=>({...d,lifePath:lp})); } }} onClick={()=>setObData(d=>({...d,lifePath:lp}))}><span>{lp}</span></button>
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
                            <button className={"chip"+(testMbtiAnswers.ei==="e"?" sel":"")} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTestMbtiAnswers(p=>({...p,ei:"e"})); } }} onClick={()=>setTestMbtiAnswers(p=>({...p,ei:"e"}))}><span>Talk to everyone</span></button>
                            <button className={"chip"+(testMbtiAnswers.ei==="i"?" sel":"")} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTestMbtiAnswers(p=>({...p,ei:"i"})); } }} onClick={()=>setTestMbtiAnswers(p=>({...p,ei:"i"}))}><span>Find one person</span></button>
                          </div>
                          <div style={{fontSize:14,fontWeight:700,color:"var(--gold)",marginBottom:8}}>You prefer...</div>
                          <div className="chips" style={{marginBottom:16}}>
                            <button className={"chip"+(testMbtiAnswers.sn==="s"?" sel":"")} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTestMbtiAnswers(p=>({...p,sn:"s"})); } }} onClick={()=>setTestMbtiAnswers(p=>({...p,sn:"s"}))}><span>Facts & details</span></button>
                            <button className={"chip"+(testMbtiAnswers.sn==="n"?" sel":"")} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTestMbtiAnswers(p=>({...p,sn:"n"})); } }} onClick={()=>setTestMbtiAnswers(p=>({...p,sn:"n"}))}><span>Big picture ideas</span></button>
                          </div>
                          <div style={{fontSize:14,fontWeight:700,color:"var(--gold)",marginBottom:8}}>Decisions come from...</div>
                          <div className="chips" style={{marginBottom:16}}>
                            <button className={"chip"+(testMbtiAnswers.tf==="t"?" sel":"")} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTestMbtiAnswers(p=>({...p,tf:"t"})); } }} onClick={()=>setTestMbtiAnswers(p=>({...p,tf:"t"}))}><span>Logic & analysis</span></button>
                            <button className={"chip"+(testMbtiAnswers.tf==="f"?" sel":"")} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTestMbtiAnswers(p=>({...p,tf:"f"})); } }} onClick={()=>setTestMbtiAnswers(p=>({...p,tf:"f"}))}><span>Values & impact</span></button>
                          </div>
                          <div style={{fontSize:14,fontWeight:700,color:"var(--gold)",marginBottom:8}}>You like things...</div>
                          <div className="chips" style={{marginBottom:16}}>
                            <button className={"chip"+(testMbtiAnswers.jp==="j"?" sel":"")} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTestMbtiAnswers(p=>({...p,jp:"j"})); } }} onClick={()=>setTestMbtiAnswers(p=>({...p,jp:"j"}))}><span>Planned & structured</span></button>
                            <button className={"chip"+(testMbtiAnswers.jp==="p"?" sel":"")} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTestMbtiAnswers(p=>({...p,jp:"p"})); } }} onClick={()=>setTestMbtiAnswers(p=>({...p,jp:"p"}))}><span>Flexible & open</span></button>
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
                            zodiac:obData.zodiac,chinese:obData.chinese,mbti:obData.mbti,life_path:obData.lifePath,birthdate:obData.birthdate,
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
            </div>)}
            {visitedScreens.has("discover") && <ScreenErrorBoundary name="Discover">
            <DiscoverScreen screen={screen} showScreen={showScreen} showNsfw={showNsfw} openHamburger={openHamburger} unreadNotificationCount={unreadNotificationCount} discoveryPrefs={discoveryPrefs} setDiscoveryPrefs={setDiscoveryPrefs} showDiscoveryPrefs={showDiscoveryPrefs} setShowDiscoveryPrefs={setShowDiscoveryPrefs} showFilterModal={showFilterModal} setShowFilterModal={setShowFilterModal} mapView={mapView} setMapView={setMapView} filteredProfiles={filteredProfiles} isLoading={discoverLoading} currentIdx={currentIdx} setCurrentIdx={setCurrentIdx} boostActive={boostActive} setBoostActive={setBoostActive} setBoostEnd={setBoostEnd} discoverSearchOpen={discoverSearchOpen} setDiscoverSearchOpen={setDiscoverSearchOpen} discoverSearch={discoverSearch} setDiscoverSearch={setDiscoverSearch} myGeo={myGeo} myStyles={obData.styles || []} apiFetch={apiFetch} showToast={showToast} demo={DEMO_MODE} doSwipe={doSwipe} setViewProfile={setViewProfile} viewProfile={viewProfile} handleImgError={handleImgError} matches={matches} setMatches={setMatches} openChat={openChat} setChatTarget={setChatTarget} stories={stories} currentUser={currentUser} uid={uid} showMatchMenu={showMatchMenu} setShowMatchMenu={setShowMatchMenu} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel} currentPhotoIdx={currentPhotoIdx} setCurrentPhotoIdx={setCurrentPhotoIdx} cardScrolled={cardScrolled} setCardScrolled={setCardScrolled} showNoteTooltip={showNoteTooltip} setShowNoteTooltip={setShowNoteTooltip} promptIdx={promptIdx} setPromptIdx={setPromptIdx} cardAlbumIdx={cardAlbumIdx} setCardAlbumIdx={setCardAlbumIdx} cardAlbumPhotos={cardAlbumPhotos} cardAlbums={cardAlbums} portfolioPhotoIdx={portfolioPhotoIdx} setPortfolioPhotoIdx={setPortfolioPhotoIdx} setLightboxPhotos={setLightboxPhotos} setLightboxIdx={setLightboxIdx} doRewind={doRewind} canRewind={rewindStack.length > 0} doLikeWithNote={doLikeWithNote} setDailyLikes={setDailyLikes} setSuperLikes={setSuperLikes} isUnlimited={isUnlimited} showUnlimitedBadge={showUnlimitedBadge} setShowUnlimitedBadge={setShowUnlimitedBadge} dailyLikes={dailyLikes} superLikes={superLikes} galleryView={galleryView} setGalleryView={setGalleryView} lightboxPhotos={lightboxPhotos} lightboxIdx={lightboxIdx} heroRef={heroRef} likeLabelRef={likeLabelRef} nopeLabelRef={nopeLabelRef} cardScrollRef={cardScrollRef} />
            </ScreenErrorBoundary>}
            {visitedScreens.has("connections") && <ScreenErrorBoundary name="Feed">
            <FeedScreen screen={screen} showScreen={showScreen} feedFilter={feedFilter} setFeedFilter={setFeedFilter} feedText={feedText} setFeedText={setFeedText} feedMedia={feedMedia} setFeedMedia={setFeedMedia} feedPosts={feedPosts} setFeedPosts={setFeedPosts} liveFeed={liveFeed} setLiveFeed={setLiveFeed} showEmojiPicker={showEmojiPicker} setShowEmojiPicker={setShowEmojiPicker} showNewPost={showNewPost} setShowNewPost={setShowNewPost} newPostTitle={newPostTitle} setNewPostTitle={setNewPostTitle} newPostBody={newPostBody} setNewPostBody={setNewPostBody} currentUser={currentUser} apiFetch={apiFetch} authFetch={authFetch} showToast={showToast} handleImgError={handleImgError} stories={stories} setStories={setStories} uploadImage={uploadImage} uploadMedia={uploadMedia} uid={uid} bootstrapped={bootstrapped} feedPostsStatic={feedPostsStatic} setFeedPostsStatic={setFeedPostsStatic} demo={DEMO_MODE} setReplyingTo={setReplyingTo} commentText={commentText} setCommentText={setCommentText} openHamburger={openHamburger} unreadNotificationCount={unreadNotificationCount} setShowReport={setShowReport} setReportTarget={setReportTarget} setShareTarget={setShareTarget} setViewProfile={setViewProfile} onStatusSaved={(status) => setCurrentUser(prev => ({ ...prev, status }))} />
            </ScreenErrorBoundary>}
            {visitedScreens.has("matches") && <ScreenErrorBoundary name="Muses">
            <MusesScreen screen={screen} showScreen={showScreen} goBack={goBack} matches={matches} setMatches={setMatches} searchOpen={searchOpen} setSearchOpen={setSearchOpen} matchesView={matchesView} setMatchesView={setMatchesView} showLikesYou={showLikesYou} setShowLikesYou={setShowLikesYou} likedBy={likedBy} openChat={openChat} setChatTarget={setChatTarget} setBlockTarget={setBlockTarget} setReportTarget={setReportTarget} apiFetch={apiFetch} showToast={showToast} handleImgError={handleImgError} setViewProfile={setViewProfile} currentUser={currentUser} showNsfw={showNsfw} openHamburger={openHamburger} unreadNotificationCount={unreadNotificationCount} searchQuery={searchQuery} setSearchQuery={setSearchQuery} expandedMatchId={expandedMatchId} matchActions={matchActions} messageRequests={messageRequests} setMessageRequests={setMessageRequests} />
            </ScreenErrorBoundary>}
            {visitedScreens.has("bts") && <ScreenErrorBoundary name="Bts">
            <React.Suspense fallback={null}><BtsScreen screen={screen} stories={stories} setStories={setStories} showScreen={showScreen} goBack={goBack} openHamburger={openHamburger} unreadNotificationCount={unreadNotificationCount} showToast={showToast} setShowStory={setShowStory} handleImgError={handleImgError} apiFetch={apiFetch} uploadMedia={uploadMedia} setShowReport={setShowReport} setReportTarget={setReportTarget} /></React.Suspense>
            </ScreenErrorBoundary>}
            {visitedScreens.has("codex") && <ScreenErrorBoundary name="Codex">
            <React.Suspense fallback={null}><CodexScreen screen={screen} showScreen={showScreen} goBack={goBack} openHamburger={openHamburger} unreadNotificationCount={unreadNotificationCount} /></React.Suspense>
            </ScreenErrorBoundary>}
            {visitedScreens.has("chat") && <ScreenErrorBoundary name="Chat">
            <ChatScreen screen={screen} chatTarget={chatTarget} setChatTarget={setChatTarget} showScreen={showScreen} goBack={goBack} messages={chatTarget?.messages || []} setMessages={((messages: unknown) => setChatTarget((previous) => previous ? { ...previous, messages: typeof messages === "function" ? (messages as (_prior: Match["messages"]) => Match["messages"])(previous.messages) : messages as Match["messages"] } : previous)) as React.ComponentProps<typeof ChatScreen>["setMessages"]} chatText={chatInput} setChatText={setChatInput} messagesEndRef={messagesEndRef} sendChat={sendMsg} sendChatImg={sendChatImg} handleImgError={handleImgError} setViewProfile={setViewProfile} setUnmatchTarget={setUnmatchTarget} setBlockTarget={setBlockTarget} setShowReport={setShowReport} setReportTarget={setReportTarget} typingTarget={typingTarget} realtimeStatus={realtimeStatus} sendTyping={sendTypingRef.current} uploadImage={uploadImage} uploadMedia={uploadMedia} sendChatMedia={sendChatMedia} startCall={startCall} fetchCallHistory={fetchCallHistory} showToast={showToast} openHamburger={openHamburger} unreadNotificationCount={unreadNotificationCount} demo={DEMO_MODE} />
            </ScreenErrorBoundary>}
            {visitedScreens.has("briefs") && <ScreenErrorBoundary name="Collab">
            <CollabScreen screen={screen} showScreen={showScreen} goBack={goBack} museCat={museCat} setMuseCat={setMuseCat} userBriefs={userBriefs} setUserBriefs={setUserBriefs} showPostBrief={showPostBrief} setShowPostBrief={setShowPostBrief} liveBriefs={liveBriefs || []} showNsfw={showNsfw} currentUser={currentUser} apiFetch={apiFetch} showToast={showToast} uid={uid} appliedBriefs={appliedBriefs} setAppliedBriefs={setAppliedBriefs} savedBriefs={savedBriefs} setSavedBriefs={setSavedBriefs} setChatTarget={setChatTarget} briefTitle={briefTitle} setBriefTitle={setBriefTitle} briefDesc={briefDesc} setBriefDesc={setBriefDesc} briefBudget={briefBudget} setBriefBudget={setBriefBudget} briefCat={briefCat} setBriefCat={setBriefCat} openHamburger={openHamburger} unreadNotificationCount={unreadNotificationCount} setShowReport={setShowReport} setReportTarget={setReportTarget} demo={DEMO_MODE} />
            </ScreenErrorBoundary>}

            {visitedScreens.has("community") && <ScreenErrorBoundary name="Community">
            <CommunityScreen screen={screen} showScreen={showScreen} goBack={goBack} commTab={commTab} setCommTab={setCommTab} liveCommunities={liveCommunities} liveEvents={liveEvents} showNsfw={showNsfw} rsvpdEvents={rsvpdEvents} setRsvpdEvents={setRsvpdEvents} apiFetch={apiFetch} showToast={showToast} handleImgError={handleImgError} openHamburger={openHamburger} unreadNotificationCount={unreadNotificationCount} onJoinVoiceRoom={startRoom} setShowReport={setShowReport} setReportTarget={setReportTarget} demo={DEMO_MODE} />
            </ScreenErrorBoundary>}

            {(visitedScreens.has("sessions") || visitedScreens.has("studios")) && <ScreenErrorBoundary name="Sessions">
            {screen === "studios" && (
              <ScreenErrorBoundary name="Studios">
                <StudiosScreen screen={screen} showScreen={showScreen} goBack={goBack} apiFetch={apiFetch} openHamburger={() => setShowHamburger(true)} unreadNotificationCount={unreadNotificationCount} />
              </ScreenErrorBoundary>
            )}
            <SessionsScreen screen={screen} showScreen={showScreen} goBack={goBack} sessTab={sessTab} setSessTab={setSessTab} matches={matches} setMatches={setMatches} openChat={openChat} setChatTarget={setChatTarget} apiFetch={apiFetch} authFetch={authFetch} showToast={showToast} handleImgError={handleImgError} uid={uid} currentUser={currentUser} setShowAgeVerification={setShowAgeVerification} demo={DEMO_MODE} liveSessions={liveSessions || undefined} setLiveSessions={setLiveSessions} myBookings={myBookings} setMyBookings={setMyBookings} bookingReminders={bookingReminders} setDisclosureTarget={setDisclosureTarget} setDisclosureBookingId={setDisclosureBookingId} setShowDisclosureModal={setShowDisclosureModal} setViewProfile={setViewProfile} openHamburger={openHamburger} unreadNotificationCount={unreadNotificationCount} setShowReport={setShowReport} setReportTarget={setReportTarget} savedSessionIds={savedSessionIds} setSavedSessionIds={setSavedSessionIds} />
            </ScreenErrorBoundary>}

            {visitedScreens.has("network") && <ScreenErrorBoundary name="Network">
            <NetworkScreen screen={screen} showScreen={showScreen} goBack={goBack} showNsfw={showNsfw} openHamburger={openHamburger} unreadNotificationCount={unreadNotificationCount} matches={matches} apiFetch={apiFetch} showToast={showToast} setViewProfile={setViewProfile} currentUser={currentUser} handleImgError={handleImgError} openChat={openChat} liveForum={liveForum} setLiveForum={setLiveForum} showNewPost={showNewPost} setShowNewPost={setShowNewPost} newPostTitle={newPostTitle} setNewPostTitle={setNewPostTitle} newPostBody={newPostBody} setNewPostBody={setNewPostBody} setForumPosts={setForumPosts} forumSort={forumSort} setForumSort={setForumSort} forumCategory={forumCategory} uid={uid} setShowReport={setShowReport} setReportTarget={setReportTarget} liveProfessionals={liveProfessionals} openTab={_networkOpenTab} savedProfileIds={savedProfileIds} setSavedProfileIds={setSavedProfileIds} demo={DEMO_MODE} onTabChange={tab => { if (tab === "forum") maybeShowPageTour("forum"); }} />
            </ScreenErrorBoundary>}
            {visitedScreens.has("portfolio") && <ScreenErrorBoundary name="Portfolio">
            <React.Suspense fallback={null}><PortfolioScreen screen={screen} showScreen={showScreen} goBack={goBack} openHamburger={openHamburger} unreadNotificationCount={unreadNotificationCount} matches={matches} getAccessToken={getAccessToken} uploadImage={uploadImage} showToast={showToast} /></React.Suspense>
            </ScreenErrorBoundary>}
            {visitedScreens.has("profile") && <ScreenErrorBoundary name="Profile">
            <ProfileScreen screen={screen} showScreen={showScreen} goBack={goBack} currentUser={currentUser} obData={obData} setObData={setObData} isUnlimited={isUnlimited} showUnlimitedBadge={showUnlimitedBadge} setShowUnlimitedBadge={setShowUnlimitedBadge} openHamburger={openHamburger} handleImgError={handleImgError} setShowEditProfile={setShowEditProfile} setEditName={setEditName} setEditBio={setEditBio} setEditLoc={setEditLoc} setEditAvatar={setEditAvatar} setEditType={setEditType} setEditLooking={setEditLooking} setEditNsfw={setEditNsfw} setEditMediaKit={setEditMediaKit} showToast={showToast} promptResponses={promptResponses} promptBankData={promptBankData} setShowPromptBank={setShowPromptBank} matches={matches} unreadNotificationCount={unreadNotificationCount} obSelects={obSelects} testLevels={testLevels} showNsfw={showNsfw} setShowNsfw={setShowNsfw} setShowAgeVerification={setShowAgeVerification} matchStreak={matchStreak} userTier={userTier} portfolioTab={portfolioTab} setPortfolioTab={setPortfolioTab} setSelectedPortfolio={_setSelectedPortfolio} lightboxPhotos={lightboxPhotos} lightboxIdx={lightboxIdx} setLightboxPhotos={setLightboxPhotos} setLightboxIdx={setLightboxIdx} activityFeed={activityFeed} setShowShareProfile={setShowShareProfile} setScreen={setScreen} setObTestKey={setObTestKey} setTestScreen={setTestScreen} setObStep={setObStep} setObTestStep={setObTestStep} setChatTarget={setChatTarget} checkProfileBadges={checkProfileBadges} getReferralTier={getReferralTier} apiFetch={apiFetch} doLogout={doLogout} setShowQuests={setShowQuests} loginStreak={loginStreak} weeklyLogins={weeklyLogins} questClaimables={claimableQuests} />
            </ScreenErrorBoundary>}
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

      <MuseModals
        apiFetch={apiFetch}
        authFetch={authFetch}
        showToast={showToast}
        handleImgError={handleImgError}
        uploadImage={uploadImage}
        uploadMedia={uploadMedia}
        showScreen={showScreen}
        safeSetItem={safeSetItem}
        currentUser={currentUser}
        authUser={authUser}
        matches={matches}
        setMatches={setMatches}
        doSwipe={doSwipe}
        obData={obData}
        showReport={showReport}
        setShowReport={setShowReport}
        reportTarget={reportTarget}
        reportTrap={reportTrap}
        showLikeNote={showLikeNote}
        setShowLikeNote={setShowLikeNote}
        noteTargetProfile={noteTargetProfile}
        setNoteTargetProfile={setNoteTargetProfile}
        likeNoteTrap={likeNoteTrap}
        likeNoteAnchor={likeNoteAnchor}
        setLikeNoteAnchor={setLikeNoteAnchor}
        likeNoteText={likeNoteText}
        setLikeNoteText={setLikeNoteText}
        showTerms={showTerms}
        setShowTerms={setShowTerms}
        termsTrap={termsTrap}
        showPrivacy={showPrivacy}
        setShowPrivacy={setShowPrivacy}
        privacyTrap={privacyTrap}
        showGuidelines={showGuidelines}
        setShowGuidelines={setShowGuidelines}
        guidelinesTrap={guidelinesTrap}
        showDeleteConfirm={showDeleteConfirm}
        setShowDeleteConfirm={setShowDeleteConfirm}
        deleteConfirmTrap={deleteConfirmTrap}
        setAuthUser={setAuthUser}
        setScreen={setScreen}
        showDiscoveryPrefs={showDiscoveryPrefs}
        setShowDiscoveryPrefs={setShowDiscoveryPrefs}
        discoveryPrefsTrap={discoveryPrefsTrap}
        discoveryPrefs={discoveryPrefs}
        setDiscoveryPrefs={setDiscoveryPrefs}
        searchQuery={searchQuery}
        filterStyles={filterStyles}
        setFilterStyles={setFilterStyles}
        filterScore={filterScore}
        setFilterScore={setFilterScore}
        savedSearches={savedSearches}
        setSavedSearches={setSavedSearches}
        DEMO_MODE={DEMO_MODE}
        unmatchTarget={unmatchTarget}
        setUnmatchTarget={setUnmatchTarget}
        unmatchTrap={unmatchTrap}
        blockTarget={blockTarget}
        setBlockTarget={setBlockTarget}
        blockTrap={blockTrap}
        setBlockedUsers={setBlockedUsers}
        showStory={showStory}
        setShowStory={setShowStory}
        stories={stories}
        viewProfile={viewProfile}
        setViewProfile={setViewProfile}
        viewProfileTrap={viewProfileTrap}
        viewProfilePhotoIdx={viewProfilePhotoIdx}
        setViewProfilePhotoIdx={setViewProfilePhotoIdx}
        revealedNsfw={revealedNsfw}
        setRevealedNsfw={setRevealedNsfw}
        badgeInfo={badgeInfo}
        setBadgeInfo={setBadgeInfo}
        viewProfileReviews={viewProfileReviews}
        setPublicProfileUser={setPublicProfileUser}
        publicProfileUser={publicProfileUser}
        setChatTarget={setChatTarget}
        setReportTarget={setReportTarget}
        lightboxPhotos={lightboxPhotos}
        lightboxIdx={lightboxIdx}
        setLightboxPhotos={setLightboxPhotos}
        setLightboxIdx={setLightboxIdx}
        shareTarget={shareTarget}
        setShareTarget={setShareTarget}
        shareTargetTrap={shareTargetTrap}
        showEditProfile={showEditProfile}
        setShowEditProfile={setShowEditProfile}
        editProfileTrap={editProfileTrap}
        editAvatar={editAvatar}
        setEditAvatar={setEditAvatar}
        editAvatarInputRef={editAvatarInputRef}
        editName={editName}
        setEditName={setEditName}
        editBio={editBio}
        setEditBio={setEditBio}
        editLoc={editLoc}
        setEditLoc={setEditLoc}
        editMediaKit={editMediaKit}
        setEditMediaKit={setEditMediaKit}
        editType={editType}
        setEditType={setEditType}
        editCustomTypePending={editCustomTypePending}
        setEditCustomTypePending={setEditCustomTypePending}
        editLooking={editLooking}
        setEditLooking={setEditLooking}
        editNsfw={editNsfw}
        setEditNsfw={setEditNsfw}
        saveProfileEdits={saveProfileEdits}
        showShareProfile={showShareProfile}
        setShowShareProfile={setShowShareProfile}
        shareProfileTrap={shareProfileTrap}
        showDisclosureModal={showDisclosureModal}
        setShowDisclosureModal={setShowDisclosureModal}
        disclosureTarget={disclosureTarget}
        setDisclosureTarget={setDisclosureTarget}
        disclosureBookingId={disclosureBookingId}
        existingDisclosure={existingDisclosure}
        ageVerified={ageVerified}
        setAgeVerified={setAgeVerified}
        pendingDisclosureConfirm={pendingDisclosureConfirm}
        setPendingDisclosureConfirm={setPendingDisclosureConfirm}
        pendingDisclosureCreate={pendingDisclosureCreate}
        setPendingDisclosureCreate={setPendingDisclosureCreate}
        showAgeVerification={showAgeVerification}
        setShowAgeVerification={setShowAgeVerification}
        upsell={upsell}
        closeUpsell={closeUpsell}
        showSafetyCheckin={showSafetyCheckin}
        setShowSafetyCheckin={setShowSafetyCheckin}
        safetyCheckins={safetyCheckins}
        setSafetyCheckins={setSafetyCheckins}
        safetyProfile={safetyProfile}
        setSafetyProfile={setSafetyProfile}
        showPromptBank={showPromptBank}
        setShowPromptBank={setShowPromptBank}
        promptBankData={promptBankData}
        promptResponses={promptResponses}
        setPromptResponses={setPromptResponses}
        showReferral={showReferral}
        setShowReferral={setShowReferral}
        showConnect={showConnect}
        setShowConnect={setShowConnect}
        showPaymentHistory={showPaymentHistory}
        setShowPaymentHistory={setShowPaymentHistory}
        showDailyLogin={showDailyLogin}
        setShowDailyLogin={setShowDailyLogin}
        weeklyLogins={weeklyLogins}
        loginStreak={loginStreak}
        setShowQuests={setShowQuests}
        activePageTour={activePageTour}
        setActivePageTour={setActivePageTour}
        showQuests={showQuests}
        setClaimableQuests={setClaimableQuests}
        handleQuestsChange={handleQuestsChange}
        incomingCall={incomingCall}
        activeCall={activeCall}
        declineCall={declineCall}
        acceptCall={acceptCall}
        endCall={endCall}
        leaveVoicemail={leaveVoicemail}
        callRecording={callRecording}
        callPeerRecording={callPeerRecording}
        startCallRecording={startCallRecording}
        stopCallRecording={stopCallRecording}
      />
      {callError && !activeCall && (
        <button onClick={() => setCallError(null)} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setCallError(null); } }} style={{ position: "fixed", bottom: 96, left: "50%", transform: "translateX(-50%)", zIndex: 10002, background: "#2a1216", color: "#ff8a80", border: "1px solid rgba(255,138,128,0.35)", borderRadius: 12, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", maxWidth: "90vw" }}>
          {callError}
        </button>
      )}
    </div>
  );
}
