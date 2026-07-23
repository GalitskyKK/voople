"use client";

import { Check, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type PostShareButtonProps = {
  postId: string;
  authorName: string;
  text?: string;
};

export function PostShareButton({ postId, authorName, text }: PostShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
  }, []);

  async function share() {
    const url = `${window.location.origin}/post/${postId}`;
    const shareData = {
      title: `Пост ${authorName} в Voople`,
      text: text?.trim().slice(0, 160) || `Посмотрите пост ${authorName} в Voople`,
      url,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setCopied(false), 2_000);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="voople-post-action"
      aria-label={copied ? "Ссылка скопирована" : "Поделиться постом"}
      title={copied ? "Ссылка скопирована" : "Поделиться"}
    >
      {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      <span className="sr-only" aria-live="polite">{copied ? "Ссылка скопирована" : ""}</span>
    </button>
  );
}
