"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { COPY } from "@/lib/constants/copy";
import { mobileFabBottomWithPlayer, MOBILE_FAB_BOTTOM_DEFAULT } from "@/lib/layout/mobile-chrome";
import { trpc } from "@/lib/trpc/client";
import { usePlayerStore } from "@/stores/player.store";
import { MediaUploadControl } from "@/components/media/MediaUploadControl";
import { PostComposer } from "@/components/feed/PostComposer";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import type { UploadedMedia } from "@/hooks/useMediaUpload";

export function CreatePostFab() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [media, setMedia] = useState<UploadedMedia | null>(null);
  const [uploadResetKey, setUploadResetKey] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const { data: sessionUser } = trpc.user.me.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });

  const createPost = trpc.post.create.useMutation({
    onSuccess: (newPost) => {
      setText("");
      setMedia(null);
      setUploadResetKey((key) => key + 1);
      setFormError(null);
      setOpen(false);
      void utils.feed.getPage.invalidate();
      if (sessionUser?.username) {
        utils.profile.getPostsByUsername.setData(
          { username: sessionUser.username },
          (prev) => (prev ? [newPost, ...prev] : [newPost]),
        );
      }
    },
    onError: (err) => setFormError(err.message),
  });

  const canPost = Boolean(sessionUser);
  const playerActive = usePlayerStore((s) => s.current != null);
  const mobilePlayerExpanded = usePlayerStore((s) => s.mobilePlayerExpanded);

  const handlePublish = () => {
    setFormError(null);
    const trimmed = text.trim();
    if (!trimmed && !media) {
      setFormError("Добавьте текст или изображение");
      return;
    }
    createPost.mutate({
      text: trimmed || undefined,
      mediaKey: media?.mediaKey,
      mediaType: media?.mediaType,
    });
  };

  if (!canPost) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="voople-fab-create fixed right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--foreground)] text-[var(--background)] shadow-lg transition-[bottom] duration-200 hover:scale-105 active:scale-95 lg:hidden"
        style={{
          bottom: playerActive
            ? mobileFabBottomWithPlayer(mobilePlayerExpanded)
            : MOBILE_FAB_BOTTOM_DEFAULT,
        }}
        aria-label={COPY.newPost}
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} placement="bottom">
        <h2 className="mb-4 pe-10 text-lg font-semibold">{COPY.newPost}</h2>
        <PostComposer
          value={text}
          onChange={setText}
          disabled={createPost.isPending}
        />
        <MediaUploadControl
          key={uploadResetKey}
          purpose="post"
          onChange={setMedia}
          disabled={createPost.isPending}
          className="mt-3"
        />
        {formError && <p className="mt-2 text-sm text-red-400">{formError}</p>}
        <Button
          type="button"
          variant="primary"
          className="mt-4 w-full"
          disabled={createPost.isPending}
          onClick={handlePublish}
        >
          {createPost.isPending ? "…" : COPY.publish}
        </Button>
      </Sheet>
    </>
  );
}
