/** View-model type layer for page.tsx: shared auth, user, profile, and feed types consumed by the screens and hooks. */
import type { PublicProfileUser } from "./screens/PublicProfileScreen";
import type { Match } from "./components/types";
import type { ToastInput } from "./modals/types";

// Shared controller/component types (P2 type-clean pass).
export type AuthMode = "login" | "signup";
export type FormErrors = Record<string, string>;
export type OAuthProvider = "google" | "facebook" | "x";
export type AuthFetchFn = (url: string, opts?: RequestInit) => Promise<Response>;
export type ShowToastFn = (msg: ToastInput) => void;
export type TestScreen = "zodiac" | "mbti" | "chinese" | "lifepath" | "done" | null;
export type AuthUser = { id: string; email: string; profile?: { id: string;[key: string]: unknown } } | null;
export type CurrentUser = {
  id: string;
  name: string;
  type: string;
  audience: "creative" | "industry";
  exp: string;
  avatar: string;
  stats: {
    matches: number;
    likes: number;
    superLikes: number;
    passes: number;
    bookingsCompleted: number;
    matchesReceived: number;
    messagesSent: number;
  };
  createdAt: number;
  referrals: number;
  portfolios: { img: string; title: string; type: string }[];
  foundingTier: string;
  proExpiresAt: string;
  tier: string;
  nsfw: boolean;
  status: string;
  [key: string]: unknown;
};

export type ProfileBadge = {
  name: string;
  icon?: string;
  color?: string;
  bg?: string;
  bd?: string;
};

export type ViewProfile = Omit<PublicProfileUser, "badges"> & {
  id: string;
  score?: number;
  views?: number;
  tier?: string;
  looking?: string[];
  badges?: ProfileBadge[];
};

export type ProfileReview = {
  id: string;
  rating: number;
  body?: string;
  reviewer_id?: { name?: string };
};

export type RawApiProfile = {
  id: string;
  name?: string;
  avatar?: string;
  type?: string;
  bio?: string;
  loc?: string;
  styles?: string[];
  matchScore?: number;
  rulesScore?: number;
  cosineScore?: number;
  nsfw?: boolean;
  looking?: string[];
  zodiac?: string;
  chinese?: string;
  mbti?: string;
  life_path?: number | string;
  photos?: string[];
  collabs?: number;
  verified?: boolean;
  showDistance?: boolean;
  age?: number;
  showAge?: boolean;
  side?: "behind" | "front";
};

export type RawFeedPost = {
  id: string;
  author_id?: { name?: string; avatar?: string };
  img?: string;
  text?: string;
  likes?: number;
  comments?: number;
  shares?: number;
  created_at?: string;
};

export type RawForumPost = {
  id: string;
  author_id?: { name?: string; avatar?: string };
  title?: string;
  body?: string;
  votes?: number;
  comments?: { author: string; text: string }[];
  cat?: string;
  created_at?: string;
};

export type Quest = {
  id: string;
  title: string;
  icon: string;
  completed: boolean;
  claimed: boolean;
  progress: number;
  target: number;
  quest_tier: string;
};

export type ProfileViewer = {
  id?: string;
  name?: string;
  avatar?: string;
  viewedAt?: string;
};

export type Notification = {
  id?: number;
  body?: string;
  type?: string;
  from?: string;
  avatar?: string;
  actor?: { name?: string; avatar?: string };
  created_at?: string;
  read?: boolean;
};

export type Professional = {
  id: number;
  name: string;
  type: string;
  img: string;
  loc: string;
  exp: string;
  openings: number;
  rate: string;
  skills: string[];
  looking: string[];
  nsfw: boolean;
};

// Network forum/thread view models. The forum feed rows (live normalizeForumPost
// rows and the static FORUM_POSTS demo fallback) share NetworkForumPost;
// ThreadReply is a reply flat from the server, nested for display via
// parentReplyId, and ChatLaunchTarget is the partial chat target the pro detail
// modal hands to page.tsx's openChat (typed for a full Match).
export type NetworkForumComment = { id?: string | number; author: string; text: string };
export type NetworkForumPost = {
  id: number;
  title: string;
  body: string;
  author: string;
  avatar: string;
  votes: number;
  comments: NetworkForumComment[];
  cat: string;
  time: string;
  pinned: boolean;
};
export type ThreadReply = {
  id?: string | number | null;
  author: string;
  avatar?: string;
  text?: string;
  time?: string;
  parentReplyId?: string | number | null;
  depth?: number;
  isOwn?: boolean;
  children?: ThreadReply[];
};
export type ThreadReplyNode = Omit<ThreadReply, "children"> & { __key: string; children: ThreadReplyNode[] };
export type ChatLaunchTarget = {
  id?: string | number;
  name?: string;
  type?: string;
  img?: string;
  avatar?: string;
  messages?: Match["messages"];
};

// Feed (FeedScreen) view models. A feed card renders from three sources that all
// share one shape: live DB rows (normalizeFeedPost), posts created this session
// (numeric uid ids), and the static demo fallback. The id is typed number to
// match the feedPosts/feedPostsStatic state owned by page.tsx; live DB rows carry
// UUID strings at runtime but are only ever keyed, compared, or passed opaquely.
export type FeedPostRow = {
  id: number;
  author: string;
  avatar: string;
  type: string;
  text: string;
  likes: number;
  comments: number;
  shares: number;
  time: string;
  liked: boolean;
  saved: boolean;
  img?: string;
  media?: string[];
  reactions?: Record<string, number>;
  views?: number;
  isBts?: boolean;
  kind?: "voice" | "video";
  mediaUrl?: string;
  media_url?: string;
  durationMs?: number;
  transcript?: string;
  momentId?: number | string;
  online?: boolean;
  lastSeen?: string;
  createdAt?: number;
  authorVerified?: boolean;
  rid?: number | string;
};

export type FeedReply = {
  author: string;
  avatar?: string;
  text?: string;
  time?: string;
};

// A behind-the-scenes "moment" story row (FeedScreen writes these from captures;
// the live moments fetch maps into the same slot).
export type FeedStory = {
  id: number | string;
  author: string;
  avatar: string;
  type: string;
  text: string;
  img?: string;
  media?: string[];
  time: string;
};

// The story slot's owned row (useFeedData's `stories` state). Same fields as
// FeedStory but `img` is always present, because the shared slots that render
// it (FeedScreen's row, the StoryViewer) read `img` unconditionally, while the
// raw moments endpoint can omit it.
export type MomentStory = Omit<FeedStory, "img"> & { img: string };

// Settings (role-adaptive) view models. MuseTheme is the persisted theme union
// (page.tsx's theme state); BlockedProfileRow is the enriched blocked-users row
// the Settings blocked-users sub-page fetches by id and falls back from to the
// raw id when a profile has not resolved.
export type MuseTheme = "lasunset" | "deepspace" | "nebula" | "deepsea" | "cinder" | "boreal" | "sunrise" | "daylight" | "sky" | "rose" | "meadow" | "frost";
export type BlockedProfileRow = { id?: string; name: string; avatar?: string };

// Selected-portfolio + per-portfolio stats slots owned by the user/profile
// state hooks. The portfolio payload is opaque API data whose fields vary by
// endpoint, so the record stays open; stats is a string-keyed map of opaque
// per-portfolio values.
export type PortfolioSelection = {
  id?: string | number;
  title?: string;
  access_level?: string;
  cover_url?: string;
  photo_count?: number;
  photos?: string[];
  [key: string]: unknown;
};

export type PortfolioStats = { [key: string]: unknown };

// Booking view models shared by useSessionData, the Sessions screen and the
// Menu hub. get.ts's "bookings" handler returns id + status + payment_status
// plus the embedded session/host/user join objects; the hub also reads
// created_at, and the reminder readout returns the flattened bookingId/session
// fields. SessionBooking mirrors the screen's row (accepts a null status);
// HubBooking is the wider row the hub reads (a non-null status plus created_at)
// and is still assignable to SessionBooking.
export type BookingParty = { id?: string; name?: string; avatar?: string; verified?: boolean; type?: string };
export type BookingSessionRef = { id?: string; title?: string; rate?: string; img?: string; type?: string; duration?: string };
export type SessionBooking = {
  id: string;
  status?: string | null;
  payment_status?: string | null;
  host_id?: BookingParty | null;
  user_id?: BookingParty | null;
  session_id?: BookingSessionRef | null;
};
export type HubBooking = SessionBooking & { status?: string; created_at: string };
export type BookingReminder = {
  bookingId?: string;
  isHost?: boolean;
  sessionTitle?: string;
  sessionDate?: string;
  sessionTime?: string;
  sessionLocation?: string;
};
