"use client";

import { useState, type CSSProperties } from "react";
import { ImagePlus, Plus } from "lucide-react";

import { COPY } from "@/lib/constants/copy";
import { mobileFabBottomWithPlayer, MOBILE_FAB_BOTTOM_DEFAULT } from "@/lib/layout/mobile-chrome";
import { trpc } from "@/lib/trpc/client";
import { usePlayerStore } from "@/stores/player.store";
import { PostMediaUploadControl } from "@/components/media/PostMediaUploadControl";
import { PostComposer } from "@/components/feed/PostComposer";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { usePostMediaUploads } from "@/hooks/usePostMediaUploads";
import { useCloudPostDraft } from "@/hooks/useCloudPostDraft";

export function CreatePostFab() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const galleryUploads = usePostMediaUploads();
  const cloudDraft = useCloudPostDraft({ text, setText, uploads: galleryUploads, enabled: open });

  const { data: sessionUser } = trpc.user.viewer.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });

  const createPost = trpc.post.create.useMutation({
    onSuccess: (newPost) => {
      setText("");
      galleryUploads.reset();
      setFormError(null);
      setOpen(false);
      void cloudDraft.clear();
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
    if (!trimmed && galleryUploads.media.length === 0) {
      setFormError("Добавьте текст или изображение");
      return;
    }
    createPost.mutate({
      text: trimmed || undefined,
      media: galleryUploads.media,
    });
  };

  if (!canPost) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="voople-fab-create fixed bottom-[var(--voople-fab-mobile-bottom)] right-4 z-40 flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--foreground)] px-3.5 text-[var(--background)] shadow-lg transition-[bottom,transform] duration-200 hover:scale-[1.03] active:scale-95 lg:bottom-6 lg:right-6 lg:px-5"
        style={{
          "--voople-fab-mobile-bottom": playerActive
            ? mobileFabBottomWithPlayer(mobilePlayerExpanded)
            : MOBILE_FAB_BOTTOM_DEFAULT,
        } as CSSProperties}
        aria-label={COPY.newPost}
        aria-haspopup="dialog"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
        <span className="hidden text-sm font-semibold lg:inline">Написать пост</span>
      </button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        className="max-w-2xl p-4 sm:p-6"
        ariaLabel={COPY.newPost}
      >
        <div className="mb-5 pe-10">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--app-accent-soft)] text-[var(--theme-accent)]">
              <ImagePlus className="h-5 w-5" aria-hidden />
            </span>
            <h2 className="text-lg font-semibold">{COPY.newPost}</h2>
          </div>
          <p className="mt-2 text-sm text-[var(--app-muted)]">
            Поделитесь мыслью, фотографией или видео.
          </p>
        </div>
        <PostComposer
          value={text}
          onChange={setText}
          disabled={createPost.isPending}
          autoFocus
        />
        <PostMediaUploadControl uploads={galleryUploads} disabled={createPost.isPending} className="mt-3" />
        {cloudDraft.active ? <p className="mt-2 text-xs text-[var(--app-muted)]">{cloudDraft.saving ? "Сохраняем облачный черновик…" : cloudDraft.error ?? "Черновик синхронизируется с desktop"}</p> : null}
        {formError && <p className="mt-2 text-sm text-red-400">{formError}</p>}
        <Button
          type="button"
          variant="primary"
          className="mt-4 w-full"
          disabled={createPost.isPending || galleryUploads.busy}
          onClick={handlePublish}
        >
          {createPost.isPending ? "…" : COPY.publish}
        </Button>
      </Sheet>
    </>
  );
}
