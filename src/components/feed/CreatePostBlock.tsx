"use client";

import { useState } from "react";
import { Paperclip } from "lucide-react";

import { COPY } from "@/lib/constants/copy";
import { trpc } from "@/lib/trpc/client";
import type { ProfileViewModel } from "@/types/domain";
import { MediaUploadControl } from "@/components/media/MediaUploadControl";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { Button } from "@/components/ui/Button";
import type { UploadedMedia } from "@/hooks/useMediaUpload";
import { PostComposer } from "./PostComposer";

type CreatePostBlockProps = {
  className?: string;
  profile?: ProfileViewModel;
  /** С сервера — без лишнего user.me и без hydration mismatch */
  canPost?: boolean;
};

/** Desktop compose block (feed + profile). Mobile uses FAB + sheet. */
export function CreatePostBlock({
  className,
  profile: profileProp,
  canPost = false,
}: CreatePostBlockProps) {
  const [mediaOpen, setMediaOpen] = useState(false);
  const [text, setText] = useState("");
  const [media, setMedia] = useState<UploadedMedia | null>(null);
  const [uploadResetKey, setUploadResetKey] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const createPost = trpc.post.create.useMutation({
    onSuccess: (newPost) => {
      setText("");
      setMedia(null);
      setUploadResetKey((key) => key + 1);
      setFormError(null);
      setMediaOpen(false);
      void utils.feed.getPage.invalidate();
      if (profileProp?.username) {
        utils.profile.getPostsByUsername.setData(
          { username: profileProp.username },
          (prev) => (prev ? [newPost, ...prev] : [newPost]),
        );
      }
    },
    onError: (err) => setFormError(err.message),
  });

  const user = profileProp;
  const displayName = user?.displayName ?? "…";
  const hasRing = user?.customization.flags.hasAvatarRing ?? false;
  const decorationUrl = user?.customization.assets.avatarDecorationUrl;
  const avatarPhotoUrl = user?.customization.assets.animatedAvatarUrl;

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
    <section
      className={className ?? "voople-compose-block voople-panel hidden p-4 lg:block"}
    >
      <div className="voople-compose-block__row flex items-start gap-3">
        <ProfileAvatar
          displayName={displayName}
          size="sm"
          ring={hasRing}
          decorationUrl={decorationUrl}
          animatedAvatarUrl={avatarPhotoUrl}
        />
        <div className="min-w-0 flex-1">
          <PostComposer
            value={text}
            onChange={setText}
            disabled={createPost.isPending}
            placeholder={COPY.composePlaceholder}
            compact
          />
        </div>
      </div>
      {mediaOpen && (
        <div className="voople-compose-block__editor mt-3 border-t border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] pt-3">
          <MediaUploadControl
            key={uploadResetKey}
            purpose="post"
            onChange={setMedia}
            disabled={createPost.isPending}
          />
        </div>
      )}
      <div className="voople-compose-block__toolbar mt-3 flex items-center justify-between gap-2 border-t border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] pt-3">
        <div className="flex gap-1 text-[color-mix(in_srgb,var(--foreground)_40%,transparent)]">
          <button
            type="button"
            onClick={() => setMediaOpen((open) => !open)}
            className="rounded-lg p-2 hover:bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] hover:text-[color-mix(in_srgb,var(--foreground)_70%,transparent)]"
            aria-label={mediaOpen ? "Скрыть вложение" : "Добавить вложение"}
            aria-pressed={mediaOpen}
          >
            <Paperclip className="h-5 w-5" />
          </button>
        </div>
        <Button
          type="button"
          variant="primary"
          size="md"
          className="voople-compose-block__publish shrink-0"
          disabled={createPost.isPending}
          onClick={handlePublish}
        >
          {createPost.isPending ? "…" : COPY.publish}
        </Button>
      </div>
      {formError && <p className="mt-2 text-sm text-red-400">{formError}</p>}
    </section>
  );
}
