"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Pencil, Trash2, Upload } from "lucide-react";

import { COPY } from "@/lib/constants/copy";
import { trpc } from "@/lib/trpc/client";
import type { ProfileViewModel } from "@/types/domain";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { AppThemeSelector } from "@/components/theme/AppThemeSelector";
import { BannerDrawEditor } from "@/components/profile/BannerDrawEditor";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { ProfileBanner } from "@/components/profile/ProfileBanner";

type ProfileEditSheetProps = {
  profile: ProfileViewModel;
};

export function ProfileEditSheet({ profile }: ProfileEditSheetProps) {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [error, setError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    profile.customization.assets.animatedAvatarUrl ?? null,
  );
  const [bannerMode, setBannerMode] = useState<"upload" | "draw">("upload");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const utils = trpc.useUtils();
  const { uploadFile, isUploading, error: uploadError, setError: setUploadError } = useMediaUpload("avatar");
  const {
    uploadFile: uploadBannerFile,
    isUploading: isBannerUploading,
    error: bannerUploadError,
    setError: setBannerUploadError,
  } = useMediaUpload("banner");

  const update = trpc.profile.update.useMutation({
    onSuccess: async () => {
      await utils.profile.getByUsername.invalidate({ username: profile.username });
      router.refresh();
      setOpen(false);
      setError(null);
    },
    onError: (err) => setError(err.message),
  });

  const setCustomBanner = trpc.customization.setCustomBanner.useMutation({
    onSuccess: async () => {
      await utils.profile.getByUsername.invalidate({ username: profile.username });
      router.refresh();
      setBannerUploadError(null);
    },
    onError: (err) => setBannerUploadError(err.message),
  });

  const clearBanner = trpc.customization.clearSlot.useMutation({
    onSuccess: async () => {
      await utils.profile.getByUsername.invalidate({ username: profile.username });
      router.refresh();
    },
    onError: (err) => setBannerUploadError(err.message),
  });

  const setAvatarPhoto = trpc.customization.setAvatarPhoto.useMutation({
    onSuccess: async () => {
      await utils.profile.getByUsername.invalidate({ username: profile.username });
      router.refresh();
      setUploadError(null);
    },
    onError: (err) => setUploadError(err.message),
  });

  const handleSave = () => {
    setError(null);
    update.mutate({
      displayName: displayName.trim(),
      bio: bio.trim() || null,
    });
  };

  const handleAvatarPick = () => {
    if (isUploading || setAvatarPhoto.isPending) return;
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    const uploaded = await uploadFile(file);
    if (!uploaded) return;
    setAvatarPreview(uploaded.previewUrl);
    setAvatarPhoto.mutate({ mediaKey: uploaded.mediaKey });
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  const handleBannerPick = () => {
    if (isBannerUploading || setCustomBanner.isPending) return;
    bannerInputRef.current?.click();
  };

  const handleBannerFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBannerUploadError(null);
    const uploaded = await uploadBannerFile(file);
    if (!uploaded) return;
    setCustomBanner.mutate({ mediaKey: uploaded.mediaKey });
    if (bannerInputRef.current) bannerInputRef.current.value = "";
  };

  const handleBannerDrawExport = async (file: File) => {
    setBannerUploadError(null);
    const uploaded = await uploadBannerFile(file);
    if (!uploaded) return;
    setCustomBanner.mutate({ mediaKey: uploaded.mediaKey });
  };

  const avatarBusy = isUploading || setAvatarPhoto.isPending;
  const bannerBusy = isBannerUploading || setCustomBanner.isPending || clearBanner.isPending;
  const hasBanner = profile.customization.flags.hasBanner;

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="md"
        aria-label="Редактировать профиль"
        onClick={() => {
          setDisplayName(profile.displayName);
          setBio(profile.bio ?? "");
          setAvatarPreview(profile.customization.assets.animatedAvatarUrl ?? null);
          setOpen(true);
        }}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)}>
        <h2 className="mb-4 pe-10 text-lg font-semibold">Редактировать профиль</h2>
        <div className="mb-4 flex items-center gap-4">
          <ProfileAvatar
            displayName={displayName}
            size="lg"
            ring={profile.customization.flags.hasAvatarRing}
            decorationUrl={profile.customization.assets.avatarDecorationUrl}
            animatedAvatarUrl={avatarPreview}
          />
          <div>
            <Button
              type="button"
              variant="secondary"
              size="md"
              disabled={avatarBusy}
              onClick={handleAvatarPick}
            >
              {avatarBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {avatarBusy ? "Загрузка…" : "Фото аватара"}
            </Button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleAvatarChange}
            />
            {uploadError && <p className="mt-2 text-xs text-red-400">{uploadError}</p>}
          </div>
        </div>
        <label className="mb-3 block text-sm">
          Отображаемое имя
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2"
          />
        </label>
        <label className="mb-4 block text-sm">
          О себе
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={100}
            rows={3}
            className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2"
          />
        </label>
        <div className="mb-4 border-t border-white/10 pt-4">
          <h3 className="mb-2 text-sm font-medium text-white">Баннер профиля</h3>
          <div className="overflow-hidden rounded-xl border border-white/10">
            <ProfileBanner customization={profile.customization} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant={bannerMode === "upload" ? "primary" : "secondary"}
              size="md"
              disabled={bannerBusy}
              onClick={() => setBannerMode("upload")}
            >
              Загрузить
            </Button>
            <Button
              type="button"
              variant={bannerMode === "draw" ? "primary" : "secondary"}
              size="md"
              disabled={bannerBusy}
              onClick={() => setBannerMode("draw")}
            >
              Нарисовать
            </Button>
            {hasBanner && (
              <Button
                type="button"
                variant="secondary"
                size="md"
                disabled={bannerBusy}
                aria-label="Убрать баннер"
                onClick={() => clearBanner.mutate({ slot: "banner" })}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          {bannerMode === "upload" ? (
            <div className="mt-3">
              <Button
                type="button"
                variant="secondary"
                size="md"
                disabled={bannerBusy}
                onClick={handleBannerPick}
              >
                {bannerBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
                {bannerBusy ? "Загрузка…" : "Выбрать изображение"}
              </Button>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleBannerFile}
              />
            </div>
          ) : (
            <BannerDrawEditor
              className="mt-3"
              backgroundColor={profile.customization.themePrimary}
              busy={bannerBusy}
              onExport={handleBannerDrawExport}
            />
          )}
          {bannerUploadError && <p className="mt-2 text-xs text-red-400">{bannerUploadError}</p>}
        </div>
        <div className="mb-4 border-t border-white/10 pt-4">
          <AppThemeSelector />
          <p className="mt-3 text-sm text-white/50">
            <Link href="/shop?tab=customize" className="text-(--theme-accent) underline-offset-2 hover:underline">
              Оформление профиля
            </Link>
          </p>
        </div>
        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
        <Button
          type="button"
          variant="primary"
          className="w-full"
          disabled={update.isPending}
          onClick={handleSave}
        >
          {update.isPending ? "…" : COPY.save}
        </Button>
      </Sheet>
    </>
  );
}
