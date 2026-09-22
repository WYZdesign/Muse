"use client";
import { useState, useCallback, useRef } from "react";
import type { Screen } from "../components/types";
import { useModalVisibility } from "./useModalVisibility";

export function useAppState() {
  const [screen, setScreen] = useState<Screen>("auth");
  const [showPass, setShowPass] = useState(false);
  const [showNsfw, setShowNsfw] = useState(false);
  const [showOnline, setShowOnline] = useState(true);
  const [showDistance, setShowDistance] = useState(true);
  const [showZodiac, setShowZodiac] = useState(true);
  const [showAge, setShowAge] = useState(true);
  const [showMbti, setShowMbti] = useState(true);
  const [showLifePath, setShowLifePath] = useState(true);
  const [showChinese, setShowChinese] = useState(true);
  const [showMatchPercent, setShowMatchPercent] = useState(true);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [showUnlimitedBadge, setShowUnlimitedBadge] = useState(true);
  const [showLikeNote, setShowLikeNote] = useState(false);
  const [likeNoteText, setLikeNoteText] = useState("");
  const [noteTargetProfile, setNoteTargetProfile] = useState<any>(null);
  const [likeNoteAnchor, setLikeNoteAnchor] = useState<any>(null);
  const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0);
  const [cardScrolled, setCardScrolled] = useState(false);
  const [connTab, setConnTab] = useState<"community" | "events" | "sessions" | "forum" | "feed" | "professional">("community");
  const [portfolioTab, setPortfolioTab] = useState<"all" | "portrait" | "landscape" | "sets">("all");
  const [commTab, setCommTab] = useState<"groups" | "events">("groups");
  const [sessTab, setSessTab] = useState<"sessions" | "bookings" | "requests">("sessions");
  const [_networkOpenTab, _setNetworkOpenTab] = useState<"pros" | "forum" | undefined>(undefined);
  const [forumSort, setForumSort] = useState<"hot" | "new" | "top">("hot");
  const [forumCategory, setForumCategory] = useState<string>("all");
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostBody, setNewPostBody] = useState("");
  const [expandedPost, setExpandedPost] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [feedText, setFeedText] = useState("");
  const [feedMedia, setFeedMedia] = useState<string[]>([]);
  const [feedPostsStatic, setFeedPostsStatic] = useState<any[]>([]);
  const [feedFilter, setFeedFilter] = useState<"all" | "photos" | "videos" | "text" | "bts">("all");
  const [museCat, setMuseCat] = useState<"all" | "tfp" | "paid" | "opencall" | "concept">("all");
  const [toastMsg, setToastMsg] = useState<{ msg: string; onTap?: () => void; type?: "info" | "success" | "error" } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [_obStep10Known, _setObStep10Known] = useState<"yes" | "no" | "test" | null>(null);
  const [matchesView, setMatchesView] = useState<"list" | "grid">("list");
  const [messageRequests, setMessageRequests] = useState<any[]>([]);
  const [profileViews, setProfileViews] = useState(0);
  const [profileViewers, setProfileViewers] = useState<{ name: string; avatar: string; time: string }[]>([]);
  const [showStory, setShowStory] = useState<number | null>(null);
  const [theme, setTheme] = useState<"lasunset" | "deepspace" | "nebula" | "deepsea" | "cinder" | "boreal" | "sunrise" | "daylight" | "sky" | "rose" | "meadow" | "frost">("lasunset");
  const [activityFeed, setActivityFeed] = useState<{ id: number; type: string; from: string; avatar: string; text: string; time: string; read: boolean }[]>([]);
  const [serverNotifCount, setServerNotifCount] = useState(0);
  const [discoveryPrefs, setDiscoveryPrefs] = useState<{ ageMin: number; ageMax: number; distance: number; gender: string }>({ ageMin: 18, ageMax: 50, distance: 50, gender: "all" });
  const [savedSearches, setSavedSearches] = useState<{ id: string; name: string; query?: string; filters?: any }[]>([]);
  const [myGeo, setMyGeo] = useState<{ lat: number; long: number; city: string; state: string; requiresIdVerification: boolean } | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);

  const [disclosureTarget, setDisclosureTarget] = useState<{ id: string; name: string } | null>(null);
  const [disclosureBookingId, setDisclosureBookingId] = useState<string | undefined>();
  const [existingDisclosure, setExistingDisclosure] = useState<Record<string, unknown> | null>(null);
  const [ageVerified, setAgeVerified] = useState(false);
  const [verificationExpiringSoon, setVerificationExpiringSoon] = useState(false);
  const [verificationBannerDismissed, setVerificationBannerDismissed] = useState(false);
  const [verificationBannerClosing, setVerificationBannerClosing] = useState(false);
  const [pendingDisclosureConfirm, setPendingDisclosureConfirm] = useState<string | null>(null);
  const [pendingDisclosureCreate, setPendingDisclosureCreate] = useState<Record<string, unknown> | null>(null);

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
    showActivityFeed, setShowActivityFeed,
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
    showStories, setShowStories,
    showEmojiPicker, setShowEmojiPicker,
  } = useModalVisibility();

  const dismissVerificationBanner = useCallback(() => {
    setVerificationBannerClosing(true);
    setTimeout(() => { setVerificationBannerDismissed(true); setVerificationBannerClosing(false); }, 320);
  }, []);

  const shuffleSeed = useRef(Math.floor(Math.random() * 100000));
  const matchSwipeRef = useRef<{ id: string; startX: number; el: HTMLElement | null }>({ id: "", startX: 0, el: null });
  const [matchSwiping, setMatchSwiping] = useState<{ id: string; offset: number } | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendTypingRef = useRef<() => void>(() => {});
  const dragRef = useRef<{ startX: number; startY: number; active: boolean; relY: number; startTime: number; el: HTMLElement | null; axis: "x" | "y" | null }>({ startX: 0, startY: 0, active: false, relY: 0, startTime: 0, el: null, axis: null });
  const likeLabelRef = useRef<HTMLDivElement>(null);
  const nopeLabelRef = useRef<HTMLDivElement>(null);
  const superLabelRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const dragValuesRef = useRef({ x: 0, y: 0, opacity: 0 });
  const sessTypeRef = useRef<string>("");

  return {
    screen, setScreen,
    showPass, setShowPass,
    showNsfw, setShowNsfw,
    showOnline, setShowOnline,
    showDistance, setShowDistance,
    showZodiac, setShowZodiac,
    showAge, setShowAge,
    showMbti, setShowMbti,
    showLifePath, setShowLifePath,
    showChinese, setShowChinese,
    showMatchPercent, setShowMatchPercent,
    bootstrapped, setBootstrapped,
    showUnlimitedBadge, setShowUnlimitedBadge,
    showLikeNote, setShowLikeNote,
    likeNoteText, setLikeNoteText,
    noteTargetProfile, setNoteTargetProfile,
    likeNoteAnchor, setLikeNoteAnchor,
    currentPhotoIdx, setCurrentPhotoIdx,
    cardScrolled, setCardScrolled,
    connTab, setConnTab,
    portfolioTab, setPortfolioTab,
    commTab, setCommTab,
    sessTab, setSessTab,
    _networkOpenTab, _setNetworkOpenTab,
    forumSort, setForumSort,
    forumCategory, setForumCategory,
    newPostTitle, setNewPostTitle,
    newPostBody, setNewPostBody,
    expandedPost, setExpandedPost,
    commentText, setCommentText,
    replyingTo, setReplyingTo,
    feedText, setFeedText,
    feedMedia, setFeedMedia,
    feedPostsStatic, setFeedPostsStatic,
    feedFilter, setFeedFilter,
    museCat, setMuseCat,
    toastMsg, setToastMsg,
    searchQuery, setSearchQuery,
    searchOpen, setSearchOpen,
    _obStep10Known, _setObStep10Known,
    matchesView, setMatchesView,
    messageRequests, setMessageRequests,
    profileViews, setProfileViews,
    profileViewers, setProfileViewers,
    showStory, setShowStory,
    theme, setTheme,
    activityFeed, setActivityFeed,
    serverNotifCount, setServerNotifCount,
    discoveryPrefs, setDiscoveryPrefs,
    savedSearches, setSavedSearches,
    myGeo, setMyGeo,
    supportOpen, setSupportOpen,
    disclosureTarget, setDisclosureTarget,
    disclosureBookingId, setDisclosureBookingId,
    existingDisclosure, setExistingDisclosure,
    ageVerified, setAgeVerified,
    verificationExpiringSoon, setVerificationExpiringSoon,
    verificationBannerDismissed, setVerificationBannerDismissed,
    verificationBannerClosing, setVerificationBannerClosing,
    pendingDisclosureConfirm, setPendingDisclosureConfirm,
    pendingDisclosureCreate, setPendingDisclosureCreate,
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
    showActivityFeed, setShowActivityFeed,
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
    showStories, setShowStories,
    showEmojiPicker, setShowEmojiPicker,
    dismissVerificationBanner,
    shuffleSeed,
    matchSwipeRef,
    matchSwiping, setMatchSwiping,
    realtimeStatus, setRealtimeStatus,
    typingTimerRef,
    sendTypingRef,
    dragRef,
    likeLabelRef,
    nopeLabelRef,
    superLabelRef,
    rafRef,
    dragValuesRef,
    sessTypeRef,
  };
}