"use client";

import { useState, type CSSProperties } from "react";
import { Plus } from "lucide-react";

import { COPY } from "@/lib/constants/copy";
import { mobileFabBottomWithPlayer, MOBILE_FAB_BOTTOM_DEFAULT } from "@/lib/layout/mobile-chrome";
import { trpc } from "@/lib/trpc/client";
import { usePlayerStore } from "@/stores/player.store";
import { PostMediaUploadControl } from "@/components/media/PostMediaUploadControl";
import { CreatePostDialogView } from "@/components/feed/CreatePostDialogView";
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
      <CreatePostDialogView
        open={open}
        onClose={() => setOpen(false)}
        text={text}
        busy={createPost.isPending || galleryUploads.busy}
        error={formError}
        draftStatus={cloudDraft.active ? cloudDraft.saving ? "Сохраняем облачный черновик…" : cloudDraft.error ?? "Черновик синхронизируется с desktop" : null}
        uploadControl={<PostMediaUploadControl uploads={galleryUploads} disabled={createPost.isPending} />}
        onTextChange={setText}
        onPublish={handlePublish}
      />
    </>
  );
}
