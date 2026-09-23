"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import type { Profile } from "../components/types";
import { safeGetItem, safeSetItem } from "../lib/safe-storage";
import { apiFetch } from "../lib/api";

export function useUserState() {
  const [currentUser, setCurrentUser] = useState<Profile>({
    id: -1,
    name: "You",
    type: "Photographer",
    exp: "New here",
    img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
    loc: "",
    bio: "",
    collabs: 0,
    score: 0,
    verified: false,
    styles: [],
    looking: [],
    connection: "",
    nsfw: false,
    online: false,
    zodiac: "",
    chinese: "",
    mbti: "",
    lifePath: 0,
    badges: [],
    prompts: [],
    albums: [],
    photos: [],
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
    stats: { matches: 0, likes: 0, superLikes: 0, passes: 0, bookingsCompleted: 0, matchesReceived: 0, messagesSent: 0 },
    createdAt: Date.now(),
    referrals: 0,
    portfolios: [],
    foundingTier: "",
    proExpiresAt: "",
    tier: "free",
    status: "",
  } as Profile);
  const [authUser, setAuthUser] = useState<{ id: string; email: string; profile?: { id: string; [key: string]: unknown } } | null>(null);
  const [excludedPortfolios, setExcludedPortfolios] = useState<string[]>([]);
  const [portfolioAccess, setPortfolioAccess] = useState<{ [key: string]: "public" | "private" | "invite" }>({});
  const [selectedPortfolio, setSelectedPortfolio] = useState<any>(null);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [portfolioStats, setPortfolioStats] = useState<any>({});
  const [cardAlbums, setCardAlbums] = useState<{ id: string; title: string; cover_url: string; access_level: string; photo_count: number }[]>([]);
  const [cardAlbumIdx, setCardAlbumIdx] = useState(0);
  const [cardAlbumPhotos, setCardAlbumPhotos] = useState<string[]>([]);
  const [portfolioPhotoIdx, setPortfolioPhotoIdx] = useState(0);
  const [promptIdx, setPromptIdx] = useState(0);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editLoc, setEditLoc] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editType, setEditType] = useState("");
  const [editCustomTypePending, setEditCustomTypePending] = useState(false);
  const [editLooking, setEditLooking] = useState<string[]>([]);
  const [editNsfw, setEditNsfw] = useState(false);
  const [editMediaKit, setEditMediaKit] = useState("");
  const [shareTarget, setShareTarget] = useState<{ id: number | string; text: string; img: string; author: string } | null>(null);
  const [reportTarget, setReportTarget] = useState<{ id: number | string; type: string; name: string } | null>(null);
  const [showBlockedUsersPanel, setShowBlockedUsersPanel] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({ match: true, message: true, brief: true, like: true });
  const [pushEnabled, setPushEnabled] = useState<boolean>(false);
  const [userTier, setUserTier] = useState<string>("free");
  const [liveProfessionals, setLiveProfessionals] = useState<any[] | null>(null);
  const [viewProfile, setViewProfileRaw] = useState<any>(null);
  const [badgeInfo, setBadgeInfo] = useState<any>(null);
  const [viewProfilePhotoIdx, setViewProfilePhotoIdx] = useState(0);
  const [viewProfileReviews, setViewProfileReviews] = useState<any[]>([]);
  const [revealedNsfw, setRevealedNsfw] = useState<Set<string>>(new Set());
  const [publicProfileUser, setPublicProfileUser] = useState<any>(null);
  const [hamburgerScreen, setHamburgerScreen] = useState<string>("");
  const [blockTarget, setBlockTarget] = useState<{ id: string; name: string } | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [messagesEndRef, setMessagesEndRef] = useState<HTMLDivElement | null>(null);
  const [loadStateRef, setLoadStateRef] = useState(false);
  const [sessionAppliedRef, setSessionAppliedRef] = useState(false);
  const [syncingSdkSessionRef, setSyncingSdkSessionRef] = useState(false);

  const viewedSessionRef = useRef<Set<string>>(new Set());
  const setViewProfile = useCallback((p: any) => {
    setViewProfileRaw(p);
    try {
      const id = String(p?.id ?? "");
      if (!id || !authUser) return;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(id)) return;
      if (viewedSessionRef.current.has(id)) return;
      viewedSessionRef.current.add(id);
      apiFetch("/api/muse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "track-view", target_id: id }) }).catch(() => {});
    } catch { /* track-view is best-effort */ }
  }, [authUser]);

  useEffect(() => { setViewProfilePhotoIdx(0); }, [viewProfile?.id]);

  const cardScrollRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const shuffleSeedRef = useRef<number>(Math.floor(Math.random() * 0x7fffffff));
  const galleryView = useRef<{ profileId: string | number; name: string; photos: string[]; idx: number } | null>(null);
  const lightboxPhotos = useRef<string[]>([]);
  const lightboxIdx = useRef<number>(0);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const editAvatarInputRef = useRef<HTMLInputElement>(null);
  const portfolioInputRef = useRef<HTMLInputElement>(null);

  return {
    currentUser, setCurrentUser,
    authUser, setAuthUser,
    excludedPortfolios, setExcludedPortfolios,
    portfolioAccess, setPortfolioAccess,
    selectedPortfolio, setSelectedPortfolio,
    showPortfolioModal, setShowPortfolioModal,
    portfolioStats, setPortfolioStats,
    cardAlbums, setCardAlbums,
    cardAlbumIdx, setCardAlbumIdx,
    cardAlbumPhotos, setCardAlbumPhotos,
    portfolioPhotoIdx, setPortfolioPhotoIdx,
    promptIdx, setPromptIdx,
    editName, setEditName,
    editBio, setEditBio,
    editLoc, setEditLoc,
    editAvatar, setEditAvatar,
    editType, setEditType,
    editCustomTypePending, setEditCustomTypePending,
    editLooking, setEditLooking,
    editNsfw, setEditNsfw,
    editMediaKit, setEditMediaKit,
    shareTarget, setShareTarget,
    reportTarget, setReportTarget,
    showBlockedUsersPanel, setShowBlockedUsersPanel,
    notifPrefs, setNotifPrefs,
    pushEnabled, setPushEnabled,
    userTier, setUserTier,
    liveProfessionals, setLiveProfessionals,
    viewProfile, setViewProfile,
    badgeInfo, setBadgeInfo,
    viewProfilePhotoIdx, setViewProfilePhotoIdx,
    viewProfileReviews, setViewProfileReviews,
    revealedNsfw, setRevealedNsfw,
    publicProfileUser, setPublicProfileUser,
    hamburgerScreen, setHamburgerScreen,
    blockTarget, setBlockTarget,
    hydrated, setHydrated,
    messagesEndRef, setMessagesEndRef,
    loadStateRef, setLoadStateRef,
    sessionAppliedRef, setSessionAppliedRef,
    syncingSdkSessionRef, setSyncingSdkSessionRef,
    cardScrollRef,
    heroRef,
    shuffleSeedRef,
    galleryView,
    lightboxPhotos,
    lightboxIdx,
    photoInputRef,
    editAvatarInputRef,
    portfolioInputRef,
  };
}