import type { CSSProperties, Dispatch, RefObject, SetStateAction, SyntheticEvent } from "react";
import type { LikeAnchor, Match, Profile, Screen, ShootDisclosure } from "../components/types";
import type { ProfileReview, ViewProfile, CurrentUser } from "../page-models";
import type { OnboardingData } from "../hooks/useAuthOnboardingState";
import type { BadgeInfo } from "../components/badgeInfo";
import type { PublicProfileUser } from "../screens/PublicProfileScreen";
import type { TourScreenId } from "../components/pageTourContent";
import type { IncomingCall, ActiveCall } from "../hooks/useCall";
import type { CheckinData, SafetyProfile } from "../components/SafetyCheckinModal";
import type { Prompt, Response as PromptResponse } from "../components/PromptBankModal";

export type Story = { id?: string | number; img: string; avatar: string; author: string; time: string };

export type Setter<T> = Dispatch<SetStateAction<T>>;

export type ToastType = "info" | "success" | "error";
export type ToastInput = string | { msg: string; onTap?: () => void; type?: ToastType };

export type ShareTarget = { id: number | string; text: string; img: string; author: string };
export type ReportTarget = { id: number | string; type: string; name: string };
export type TargetRef = { id: string; name: string };
export type UnmatchTarget = { id: string | number; name: string };
export type DiscoveryPrefs = { ageMin: number; ageMax: number; distance: number; gender: string };
export type SavedSearch = { id: string; name: string; query?: string; filters?: Record<string, unknown> };
export type UpsellInfo = { feature: string; reason: string; icon?: string };
export type AuthUser = { id: string; email: string; profile?: { id: string; [key: string]: unknown } } | null;

export type MuseModalsProps = {
  // Shared helpers
  apiFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  showToast: (msg: ToastInput) => void;
  handleImgError: (e: SyntheticEvent<HTMLImageElement>) => void;
  uploadImage: (file: File, folder: string) => Promise<string | null>;
  uploadMedia: (file: File, folder: string, mediaKind: "voice" | "video") => Promise<string | null>;
  showScreen: (s: Screen) => void;
  safeSetItem: (key: string, value: string) => void;
  currentUser: CurrentUser;
  authUser: AuthUser;
  matches: Match[];
  setMatches: Setter<Match[]>;

  // Intent picker (pre-screen overlay)
  intentPickerTrap: RefObject<HTMLDivElement | null>;
  showIntentPicker: boolean;
  setShowIntentPicker: Setter<boolean>;
  intentProfile: Profile | null;
  setIntentProfile: Setter<Profile | null>;
  intentSelection: string[];
  setIntentSelection: Setter<string[]>;
  setUserDefaultIntent: Setter<string>;
  doSwipe: (dir: "left" | "right" | "super", intentOverride?: string) => void;
  obData: OnboardingData;

  // Match overlay
  showMatchOverlay: Match | null;
  setShowMatchOverlay: Setter<Match | null>;
  matchAnimVariant: number;
  confettiPieces: (CSSProperties & Record<"--drift" | "--rot", string>)[];

  // Report
  showReport: boolean;
  setShowReport: Setter<boolean>;
  reportTarget: ReportTarget | null;
  reportTrap: RefObject<HTMLDivElement | null>;

  // Like + note
  showLikeNote: boolean;
  setShowLikeNote: Setter<boolean>;
  noteTargetProfile: Profile | null;
  setNoteTargetProfile: Setter<Profile | null>;
  likeNoteTrap: RefObject<HTMLDivElement | null>;
  likeNoteAnchor: LikeAnchor | null;
  setLikeNoteAnchor: Setter<LikeAnchor | null>;
  likeNoteText: string;
  setLikeNoteText: Setter<string>;

  // Legal / account modals
  showTerms: boolean;
  setShowTerms: Setter<boolean>;
  termsTrap: RefObject<HTMLDivElement | null>;
  showPrivacy: boolean;
  setShowPrivacy: Setter<boolean>;
  privacyTrap: RefObject<HTMLDivElement | null>;
  showGuidelines: boolean;
  setShowGuidelines: Setter<boolean>;
  guidelinesTrap: RefObject<HTMLDivElement | null>;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: Setter<boolean>;
  deleteConfirmTrap: RefObject<HTMLDivElement | null>;
  setAuthUser: Setter<AuthUser>;
  setScreen: Setter<Screen>;

  // Discovery preferences
  showDiscoveryPrefs: boolean;
  setShowDiscoveryPrefs: Setter<boolean>;
  discoveryPrefsTrap: RefObject<HTMLDivElement | null>;
  discoveryPrefs: DiscoveryPrefs;
  setDiscoveryPrefs: Setter<DiscoveryPrefs>;
  searchQuery: string;
  filterStyles: string[];
  setFilterStyles: Setter<string[]>;
  filterScore: number;
  setFilterScore: Setter<number>;
  savedSearches: SavedSearch[];
  setSavedSearches: Setter<SavedSearch[]>;
  DEMO_MODE: boolean;

  // Unmatch / block
  unmatchTarget: UnmatchTarget | null;
  setUnmatchTarget: Setter<UnmatchTarget | null>;
  unmatchTrap: RefObject<HTMLDivElement | null>;
  blockTarget: TargetRef | null;
  setBlockTarget: Setter<TargetRef | null>;
  blockTrap: RefObject<HTMLDivElement | null>;
  setBlockedUsers: Setter<string[]>;

  // Stories viewer
  showStory: number | null;
  setShowStory: Setter<number | null>;
  stories: Story[];

  // View profile
  viewProfile: ViewProfile | null;
  setViewProfile: (p: ViewProfile | null) => void;
  viewProfileTrap: RefObject<HTMLDivElement | null>;
  viewProfilePhotoIdx: number;
  setViewProfilePhotoIdx: Setter<number>;
  revealedNsfw: Set<string>;
  setRevealedNsfw: Setter<Set<string>>;
  badgeInfo: BadgeInfo | null;
  setBadgeInfo: Setter<BadgeInfo | null>;
  viewProfileReviews: ProfileReview[];
  setPublicProfileUser: Setter<PublicProfileUser | null>;

  // Public profile overlay
  publicProfileUser: PublicProfileUser | null;
  setChatTarget: Setter<Match | null>;
  setReportTarget: Setter<ReportTarget | null>;
  lightboxPhotos: string[];
  lightboxIdx: number;
  setLightboxPhotos: Setter<string[]>;
  setLightboxIdx: Setter<number>;

  // Share post
  shareTarget: ShareTarget | null;
  setShareTarget: Setter<ShareTarget | null>;
  shareTargetTrap: RefObject<HTMLDivElement | null>;

  // Edit profile
  showEditProfile: boolean;
  setShowEditProfile: Setter<boolean>;
  editProfileTrap: RefObject<HTMLDivElement | null>;
  editAvatar: string;
  setEditAvatar: Setter<string>;
  editAvatarInputRef: RefObject<HTMLInputElement | null>;
  editName: string;
  setEditName: Setter<string>;
  editBio: string;
  setEditBio: Setter<string>;
  editLoc: string;
  setEditLoc: Setter<string>;
  editMediaKit: string;
  setEditMediaKit: Setter<string>;
  editType: string;
  setEditType: Setter<string>;
  editCustomTypePending: boolean;
  setEditCustomTypePending: Setter<boolean>;
  editLooking: string[];
  setEditLooking: Setter<string[]>;
  editNsfw: boolean;
  setEditNsfw: Setter<boolean>;
  saveProfileEdits: () => void;

  // Share profile
  showShareProfile: boolean;
  setShowShareProfile: Setter<boolean>;
  shareProfileTrap: RefObject<HTMLDivElement | null>;

  // Disclosure
  showDisclosureModal: boolean;
  setShowDisclosureModal: Setter<boolean>;
  disclosureTarget: TargetRef | null;
  setDisclosureTarget: Setter<TargetRef | null>;
  disclosureBookingId: string | undefined;
  existingDisclosure: ShootDisclosure | null;
  ageVerified: boolean;
  setAgeVerified: Setter<boolean>;
  pendingDisclosureConfirm: string | null;
  setPendingDisclosureConfirm: Setter<string | null>;
  pendingDisclosureCreate: Record<string, unknown> | null;
  setPendingDisclosureCreate: Setter<Record<string, unknown> | null>;

  // Age verification
  showAgeVerification: boolean;
  setShowAgeVerification: Setter<boolean>;

  // Upsell
  upsell: UpsellInfo | null;
  closeUpsell: () => void;

  // Safety check-in
  showSafetyCheckin: boolean;
  setShowSafetyCheckin: Setter<boolean>;
  safetyCheckins: CheckinData[];
  setSafetyCheckins: Setter<CheckinData[]>;
  safetyProfile: SafetyProfile | null;
  setSafetyProfile: Setter<SafetyProfile | null>;

  // Prompt bank
  showPromptBank: boolean;
  setShowPromptBank: Setter<boolean>;
  promptBankData: Prompt[];
  promptResponses: PromptResponse[];
  setPromptResponses: Setter<PromptResponse[]>;

  // Panels
  showReferral: boolean;
  setShowReferral: Setter<boolean>;
  showConnect: boolean;
  setShowConnect: Setter<boolean>;
  showPaymentHistory: boolean;
  setShowPaymentHistory: Setter<boolean>;

  // Daily login / tour / quests
  showDailyLogin: boolean;
  setShowDailyLogin: Setter<boolean>;
  weeklyLogins: boolean[];
  loginStreak: number;
  setShowQuests: Setter<boolean>;
  activePageTour: TourScreenId | null;
  setActivePageTour: Setter<TourScreenId | null>;
  showQuests: boolean;
  setClaimableQuests: Setter<number>;
  handleQuestsChange: () => void;

  // Calls
  incomingCall: IncomingCall;
  activeCall: ActiveCall;
  declineCall: () => void;
  acceptCall: () => void;
  endCall: () => void;
  leaveVoicemail: (url: string, durationMs: number, transcript?: string) => void;
  callRecording: { egressId?: string } | null;
  callPeerRecording: boolean;
  startCallRecording: () => void;
  stopCallRecording: () => void;
};

/**
 * The fields the end-of-tree modal stack actually consumes. The intent picker
 * and the match overlay render earlier in the tree (before the auth/screen
 * ternary), so they keep their own render sites and are not part of the stack.
 */
export type MuseModalsStackProps = Omit<
  MuseModalsProps,
  | "intentPickerTrap"
  | "showIntentPicker"
  | "setShowIntentPicker"
  | "intentProfile"
  | "setIntentProfile"
  | "intentSelection"
  | "setIntentSelection"
  | "setUserDefaultIntent"
  | "showMatchOverlay"
  | "setShowMatchOverlay"
  | "matchAnimVariant"
  | "confettiPieces"
>;
