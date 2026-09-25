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

export type BetaSearchPerson = UserSearchHit & {
  online: boolean;
  commonGroups: { count: number; groups: Array<{ id: string; name: string }> };
  canMessage: boolean;
};

export type BetaSearchResult = { people: BetaSearchPerson[] };

export type ExploreHighlights = {
  users: UserSearchHit[];
  posts: PostViewModel[];
  communities: PublicGroupSearchHit[];
};
