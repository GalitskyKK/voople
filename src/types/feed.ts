import type { PostViewModel } from "@/types/domain";

export type FeedPageResult = {
  items: PostViewModel[];
  nextCursor?: string;
};
