"use client";

import { useEffect, useRef, useState } from "react";
import { Eye } from "lucide-react";

import { trpc } from "@/lib/trpc/client";

type PostViewCounterProps = {
  postId: string;
  liveCount?: number;
  initialCount: number;
  canTrack: boolean;
};

export function PostViewCounter({ postId, liveCount, initialCount, canTrack }: PostViewCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const trackedPostId = useRef<string | null>(null);
  const [confirmed, setConfirmed] = useState<{ postId: string; count: number } | null>(null);
  const count =
    liveCount ??
    (confirmed?.postId === postId ? confirmed.count : initialCount);

  const viewMutation = trpc.post.view.useMutation({
    onSuccess: (data) => setConfirmed({ postId, count: data.viewCount }),
  });
  const recordView = viewMutation.mutate;

  useEffect(() => {
    if (!canTrack || trackedPostId.current === postId) return;
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || trackedPostId.current === postId) return;
        trackedPostId.current = postId;
        recordView({ postId });
        observer.disconnect();
      },
      { threshold: 0.6 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [canTrack, postId, recordView]);

  return (
    <span ref={ref} className="inline-flex items-center gap-1.5 text-white/60" aria-label="Просмотры">
      <Eye className="h-4 w-4" />
      <span key={`${postId}:${count}`} className="voople-count-bump text-sm tabular-nums">
        {count}
      </span>
    </span>
  );
}
