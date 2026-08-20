import type { PostViewModel } from "./domain";
import type { PublicGroupSearchHit } from "./chat";

export type HashtagSearchHit = {
  name: string;
  postCount: number;
};

export type UserSearchHit = {
  type: "user";
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  hasVooplePlus?: boolean;
  avatarUrl?: string | null;
};

export type SearchHit =
  | UserSearchHit
  | (HashtagSearchHit & {
      type: "hashtag";
    });

export type ExploreSearchResult = {
  users: UserSearchHit[];
  hashtags: HashtagSearchHit[];
  posts: PostViewModel[];
};

export type ExploreHighlights = {
  users: UserSearchHit[];
  posts: PostViewModel[];
  communities: PublicGroupSearchHit[];
};
