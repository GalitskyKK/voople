import type { Session } from "@supabase/supabase-js";
import { useMemo, useState } from "react";

import {
  ProfileAppearanceCardVisual,
  type AppearanceSceneId,
} from "@/components/profile/ProfileAppearanceCardVisual";
import { ProfileShareView } from "@/components/profile/ProfileShareView";
import type { ProfileViewModel } from "@/types/domain";

import { createDesktopTrpcClient } from "../api/trpc";
import type { DesktopConfig } from "../config";
import { DesktopProfileAvatar } from "./DesktopProfileAvatar";

export function DesktopProfileShareButton({
  profile,
  config,
  session,
  onPublished,
}: {
  profile: ProfileViewModel;
  config: DesktopConfig;
  session: Session;
  onPublished: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [scene, setScene] = useState<AppearanceSceneId>("midnight");
  const [caption, setCaption] = useState("");
  const [copied, setCopied] = useState(false);
  const [published, setPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const client = useMemo(
    () => createDesktopTrpcClient(config, () => session.access_token),
    [config, session.access_token],
  );
  const profileUrl = `${config.apiUrl}/${profile.username}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
      setError(null);
    } catch {
      setError("Не удалось скопировать ссылку");
    }
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
      return;
    }
    await copyLink();
  };

  const publish = async () => {
    if (publishing || published) return;
    setPublishing(true);
    setError(null);
    try {
      await client.mutation("post.create", {
        text: caption.trim() || undefined,
        appearanceScene: scene,
      });
      setPublished(true);
      setCaption("");
      onPublished();
    } catch (publishError: unknown) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : "Не удалось опубликовать образ",
      );
    } finally {
      setPublishing(false);
    }
  };

  return (
    <ProfileShareView
      open={open}
      scene={scene}
      caption={caption}
      preview={
        <ProfileAppearanceCardVisual
          profile={profile}
          scene={scene}
          className="max-w-[25rem]"
          avatar={
            <DesktopProfileAvatar
              displayName={profile.displayName}
              customization={profile.customization}
            />
          }
        />
      }
      publishing={publishing}
      published={published}
      copied={copied}
      error={error}
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
      onPublish={() => void publish()}
      onShare={() => void shareLink()}
      onCopy={() => void copyLink()}
    />
  );
}
