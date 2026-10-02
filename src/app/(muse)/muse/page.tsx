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
import { OnboardingFlow } from "./components/OnboardingFlow";
import { AuthScreen } from "./components/AuthScreen";
import { buildFilteredProfiles } from "./lib/discover-deck";
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
import { useBootstrapData } from "./hooks/useBootstrapData";
import { useMusePersistence } from "./hooks/useMusePersistence";
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
  const { bootstrapData } = useBootstrapData({
    apiFetch,
    authUserProfileId: authUser?.profile?.id,
    liveBriefsLen: liveBriefs?.length ?? 0,
    feedPostsLen: feedPosts?.length ?? 0,
    forumPostsLen: forumPosts?.length ?? 0,
    liveForumLen: liveForum?.length ?? 0,
    liveEventsLen: liveEvents?.length ?? 0,
    liveCommunitiesLen: liveCommunities?.length ?? 0,
    liveSessionsLen: liveSessions?.length ?? 0,
    setLiveProfiles, setLiveBriefs, setLiveFeed, setFeedPosts, setLiveForum, setForumPosts,
    setLiveEvents, setLiveCommunities, setLiveSessions, setLiveProfessionals,
    setBootstrapped, setDiscoverLoading,
  });

  // ─── PERSISTENCE (moved into useMusePersistence) ───
  // Memoized on exactly the fields the old `saveState` useCallback listed, so
  // useSaveStateTimer still re-fires the debounced save only when they change.
  const persistValues = useMemo(() => ({ currentUser, obData, obStep, matches, dailyLikes, superLikes, savedBriefs, appliedBriefs, savedSessionIds, savedProfileIds, userBriefs, blockedUsers, notifPrefs, obConnectedSocials, showNsfw, showOnline, showDistance, showZodiac, showAge, showMbti, showLifePath, showChinese, showMatchPercent, rsvpdEvents, forumPosts, feedPosts, testLevels, obSelects, obProfilePic, obPortfolioItems, likedBy, profileViews, profileViewers, stories, theme, activityFeed, discoveryPrefs, chatImages, screen, filterStyles, filterScore, searchQuery, connTab, museCat, authUser, authRemember, chatTarget }), [currentUser, obData, obStep, matches, dailyLikes, superLikes, savedBriefs, appliedBriefs, savedSessionIds, savedProfileIds, userBriefs, blockedUsers, notifPrefs, obConnectedSocials, showNsfw, showOnline, showDistance, showZodiac, showAge, showMbti, showLifePath, showChinese, showMatchPercent, rsvpdEvents, forumPosts, feedPosts, testLevels, obSelects, obProfilePic, obPortfolioItems, likedBy, profileViews, profileViewers, stories, theme, activityFeed, discoveryPrefs, chatImages, screen, filterStyles, filterScore, searchQuery, connTab, museCat, authUser, authRemember, chatTarget]);
  const persistSetters = useMemo(() => ({ setCurrentUser, setObData, setObStep, setAuthUser, setMatches, setDailyLikes, setSuperLikes, setSavedBriefs, setAppliedBriefs, setSavedSessionIds, setSavedProfileIds, setUserBriefs, setBlockedUsers, setNotifPrefs, setObConnectedSocials, setShowNsfw, setShowOnline, setShowDistance, setShowZodiac, setShowAge, setShowMbti, setShowLifePath, setShowChinese, setShowMatchPercent, setRsvpdEvents, setForumPosts, setFeedPosts, setTestLevels, setObSelects, setObProfilePic, setObPortfolioItems, setLikedBy, setProfileViews, setProfileViewers, setStories, setTheme, setActivityFeed, setDiscoveryPrefs, setChatImages, setChatTarget, setScreen, setBoostActive, setBoostEnd }), []);
  const { saveState, loadState } = useMusePersistence({ values: persistValues, setters: persistSetters, apiFetch, safeSetItem, safeGetItem, safeGetItemAsync, safeRemoveItem });

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

  const filteredProfiles = useMemo(() => buildFilteredProfiles({
    seed: shuffleSeedRef.current, liveProfiles, showNsfw, filterStyles, filterScore, myGeo, discoverSearch, obData,
  }), [liveProfiles, showNsfw, filterStyles, filterScore, myGeo, discoverSearch, obData]);

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
        <AuthScreen
          authMode={authMode}
          setAuthMode={setAuthMode}
          authEmail={authEmail}
          setAuthEmail={setAuthEmail}
          formErrors={formErrors}
          setFormErrors={setFormErrors}
          authPass={authPass}
          setAuthPass={setAuthPass}
          showPass={showPass}
          setShowPass={setShowPass}
          authRemember={authRemember}
          setAuthRemember={setAuthRemember}
          authLoading={authLoading}
          setAuthLoading={setAuthLoading}
          authFetch={authFetch}
          showToast={showToast}
          handleAuthClick={handleAuthClick}
          handleOAuth={handleOAuth}
          setShowTerms={setShowTerms}
          setShowPrivacy={setShowPrivacy}
          setShowGuidelines={setShowGuidelines}
        />
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
            <OnboardingFlow
              obStep={obStep}
              setObStep={setObStep}
              obData={obData}
              setObData={setObData}
              obConnectedSocials={obConnectedSocials}
              obPortfolioItems={obPortfolioItems}
              setObPortfolioItems={setObPortfolioItems}
              obPortfolioSlot={obPortfolioSlot}
              setObPortfolioSlot={setObPortfolioSlot}
              obProfilePic={obProfilePic}
              setObProfilePic={setObProfilePic}
              testScreen={testScreen}
              setTestScreen={setTestScreen}
              testBirthMonth={testBirthMonth}
              testBirthDay={testBirthDay}
              testBirthYear={testBirthYear}
              setTestBirthMonth={setTestBirthMonth}
              setTestBirthDay={setTestBirthDay}
              setTestBirthYear={setTestBirthYear}
              testMbtiAnswers={testMbtiAnswers}
              setTestMbtiAnswers={setTestMbtiAnswers}
              setCurrentUser={setCurrentUser}
              setScreen={setScreen}
              uploadImage={uploadImage}
              toggleObMulti={toggleObMulti}
              toggleSocial={toggleSocial}
              showToast={showToast}
              authFetch={authFetch}
              authUser={authUser}
              photoInputRef={photoInputRef}
              portfolioInputRef={portfolioInputRef}
            />
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
