"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { PostCard } from "@/components/feed/PostCard";
import type { PostViewModel } from "@/types/domain";
import { PostDetailViewVisual } from "./PostDetailViewVisual";

type PostDetailViewProps = {
  post: PostViewModel;
  viewerId: string | null;
};

export function PostDetailView({ post, viewerId }: PostDetailViewProps) {
  return (
    <PostDetailViewVisual
      backAction={
        <Link
          href="/feed"
          className="inline-flex items-center gap-2 text-sm text-[color-mix(in_srgb,var(--foreground)_60%,transparent)] transition hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад к ленте
        </Link>
      }
    >
      <PostCard
        post={post}
        viewerId={viewerId}
        canLike={Boolean(viewerId)}
        commentsAlwaysOpen
      />
    </PostDetailViewVisual>
  );
}
