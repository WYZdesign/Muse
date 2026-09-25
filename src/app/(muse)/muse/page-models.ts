import type { PublicProfileUser } from "./screens/PublicProfileScreen";

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
