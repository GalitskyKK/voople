"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PostCard } from "@/components/feed/PostCard";
import type { PostViewModel } from "@/types/domain";

type PostDetailViewProps = {
  post: PostViewModel;
  viewerId: string | null;
};

export function PostDetailView({ post, viewerId }: PostDetailViewProps) {
  return (
    <div className="voople-post-detail py-4">
      <Link
        href="/feed"
        className="mb-4 inline-flex items-center gap-2 text-sm text-[color-mix(in_srgb,var(--foreground)_60%,transparent)] transition hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад к ленте
      </Link>
      <PostCard
        post={post}
        viewerId={viewerId}
        canLike={Boolean(viewerId)}
        commentsAlwaysOpen
      />
    </div>
  );
}
