"use client";

import { useState } from "react";

import { trpc } from "@/lib/trpc/client";
import type { ProfileViewModel } from "@/types/domain";
import {
  ProfileAppearanceCard,
  type AppearanceSceneId,
} from "./ProfileAppearanceCard";
import { ProfileShareView } from "./ProfileShareView";

export function ProfileShareCardButton({
  profile,
}: {
  profile: ProfileViewModel;
}) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [scene, setScene] = useState<AppearanceSceneId>("midnight");
  const [caption, setCaption] = useState("");
  const [copied, setCopied] = useState(false);
  const [published, setPublished] = useState(false);
  const publish = trpc.post.create.useMutation({
    onSuccess: () => {
      setPublished(true);
      setCaption("");
      void Promise.all([
        utils.feed.getPage.invalidate(),
        utils.profile.getPostsByUsername.invalidate({
          username: profile.username,
        }),
      ]);
    },
  });
  const profileUrl =
    typeof window === "undefined"
      ? `https://voople.ru/${profile.username}`
      : `${window.location.origin}/${profile.username}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  const shareLink = async () => {
    if (navigator.share) {
      await navigator
        .share({
          title: `${profile.displayName} в Voople`,
          text: "Смотри мой новый образ в Voople",
          url: profileUrl,
        })
        .catch(() => undefined);
    } else {
      await copyLink();
    }
  };

  return (
    <ProfileShareView
      open={open}
      scene={scene}
      caption={caption}
      preview={
        <ProfileAppearanceCard
          profile={profile}
          scene={scene}
          className="max-w-[25rem]"
        />
      }
      publishing={publish.isPending}
      published={published}
      copied={copied}
      error={publish.error?.message}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      onSceneChange={(nextScene) => {
        setScene(nextScene);
        setPublished(false);
      }}
      onCaptionChange={(value) => {
        setCaption(value);
        setPublished(false);
      }}
      onPublish={() =>
        publish.mutate({
          text: caption.trim() || undefined,
          appearanceScene: scene,
        })
      }
      onShare={() => void shareLink()}
      onCopy={() => void copyLink()}
    />
  );
}
