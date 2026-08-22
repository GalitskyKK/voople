"use client";

import { useState, type ReactNode } from "react";

import type { AppearanceSceneId } from "./ProfileAppearanceCardVisual";
import { ProfileShareView } from "./ProfileShareView";

export function ProfileShareController({
  displayName,
  profileUrl,
  renderPreview,
  publish,
  publishError,
}: {
  displayName: string;
  profileUrl: string;
  renderPreview: (scene: AppearanceSceneId) => ReactNode;
  publish: (draft: { caption: string; scene: AppearanceSceneId }) => Promise<void>;
  publishError?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [scene, setScene] = useState<AppearanceSceneId>("midnight");
  const [caption, setCaption] = useState("");
  const [copied, setCopied] = useState(false);
  const [published, setPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setLocalError(null);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setLocalError("Не удалось скопировать ссылку");
    }
  };

  const shareLink = async () => {
    if (!navigator.share) return copyLink();
    await navigator.share({
      title: `${displayName} в Voople`,
      text: "Смотри мой новый образ в Voople",
      url: profileUrl,
    }).catch(() => undefined);
  };

  const submit = async () => {
    if (publishing || published) return;
    setPublishing(true);
    setLocalError(null);
    try {
      await publish({ caption: caption.trim(), scene });
      setPublished(true);
      setCaption("");
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Не удалось опубликовать образ");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <ProfileShareView
      open={open}
      scene={scene}
      caption={caption}
      preview={renderPreview(scene)}
      publishing={publishing}
      published={published}
      copied={copied}
      error={localError ?? publishError}
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
      onPublish={() => void submit()}
      onShare={() => void shareLink()}
      onCopy={() => void copyLink()}
    />
  );
}
