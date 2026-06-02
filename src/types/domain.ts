import type { CustomizationFlags, CustomizationAssets, DisplayNameStyle } from "@/lib/customization/types";

export type ProfileStatus = {
  moodValue?: number | null;
  thought?: string | null;
  trackTitle?: string | null;
  trackArtist?: string | null;
};

export type ProfileCustomizationView = {
  themePrimary: string;
  themeAccent: string;
  bannerValue: { color?: string; url?: string };
  flags: CustomizationFlags;
  assets: CustomizationAssets;
  displayName: DisplayNameStyle;
  avatarRingId?: string | null;
};

export type ProfileViewModel = {
  id: string;
  username: string;
  displayName: string;
  bio?: string | null;
  createdAt: string;
  subscriptionStartedAt?: string | null;
  /** Активная подписка Voople+ (для своего баннера и др. premium). */
  hasVooplePlus?: boolean;
  customization: ProfileCustomizationView;
  status: ProfileStatus;
  stats: { posts: number; followers: number; following: number; views: number };
};

export type PostAuthorView = {
  username: string;
  displayName: string;
  hasVooplePlus?: boolean;
  avatarUrl?: string;
  customization?: ProfileCustomizationView;
};

export type StatusPostPayload = {
  moodValue?: number | null;
  thought?: string | null;
  trackTitle?: string | null;
  trackArtist?: string | null;
};

export type PostMediaType = "image" | "gif" | "meme";

export type PostViewModel = {
  id: string;
  author: PostAuthorView;
  kind?: "text" | "status";
  text?: string;
  status?: StatusPostPayload;
  mediaUrl?: string | null;
  mediaType?: PostMediaType | null;
  repostComment?: string;
  repost?: {
    target: PostViewModel;
  };
  likeCount: number;
  replyCount: number;
  viewCount: number;
  repostCount: number;
  /** ISO 8601 — отображать через RelativeTime */
  createdAt: string;
  likedByViewer?: boolean;
  repostedByViewer?: boolean;
  tags?: string[];
};

export type CommentViewModel = {
  id: string;
  postId: string;
  text: string;
  mediaUrl?: string | null;
  mediaType?: PostMediaType | null;
  createdAt: string;
  author: PostAuthorView;
  canDelete: boolean;
};
