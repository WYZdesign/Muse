"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import type { Profile } from "../components/types";

export function useProfileState() {
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editLoc, setEditLoc] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editType, setEditType] = useState("");
  const [editCustomTypePending, setEditCustomTypePending] = useState(false);
  const [editLooking, setEditLooking] = useState<string[]>([]);
  const [editNsfw, setEditNsfw] = useState(false);
  const [editMediaKit, setEditMediaKit] = useState("");
  const [portfolioPhotoIdx, setPortfolioPhotoIdx] = useState(0);
  const [promptIdx, setPromptIdx] = useState(0);
  const [showEditProfile, setShowEditProfile] = useState(false);
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
  const [portfolioTab, setPortfolioTab] = useState<"all" | "portrait" | "landscape" | "sets">("all");
  const [cardAlbums, setCardAlbums] = useState<{ id: string; title: string; cover_url: string; access_level: string; photo_count: number }[]>([]);
  const [cardAlbumIdx, setCardAlbumIdx] = useState(0);
  const [cardAlbumPhotos, setCardAlbumPhotos] = useState<string[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<any>(null);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [portfolioStats, setPortfolioStats] = useState<any>({});

  const viewedSessionRef = useRef<Set<string>>(new Set());
  const cardScrollRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const shuffleSeedRef = useRef<number>(Math.floor(Math.random() * 0x7fffffff));
  const galleryView = useRef<{ profileId: string | number; name: string; photos: string[]; idx: number } | null>(null);
  const lightboxPhotos = useRef<string[]>([]);
  const lightboxIdx = useRef<number>(0);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const editAvatarInputRef = useRef<HTMLInputElement>(null);
  const portfolioInputRef = useRef<HTMLInputElement>(null);

  const setViewProfile = useCallback((p: any) => {
    setViewProfileRaw(p);
  }, []);

  useEffect(() => { setViewProfilePhotoIdx(0); }, [viewProfile?.id]);

  return {
    editName, setEditName,
    editBio, setEditBio,
    editLoc, setEditLoc,
    editAvatar, setEditAvatar,
    editType, setEditType,
    editCustomTypePending, setEditCustomTypePending,
    editLooking, setEditLooking,
    editNsfw, setEditNsfw,
    editMediaKit, setEditMediaKit,
    portfolioPhotoIdx, setPortfolioPhotoIdx,
    promptIdx, setPromptIdx,
    showEditProfile, setShowEditProfile,
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
    portfolioTab, setPortfolioTab,
    cardAlbums, setCardAlbums,
    cardAlbumIdx, setCardAlbumIdx,
    cardAlbumPhotos, setCardAlbumPhotos,
    selectedPortfolio, setSelectedPortfolio,
    showPortfolioModal, setShowPortfolioModal,
    portfolioStats, setPortfolioStats,
    viewedSessionRef,
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