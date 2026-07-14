"use client";

import { useRef, useState } from "react";
import { Check, Upload } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { uploadAdminCustomizationAsset } from "@/lib/admin/upload-customization-asset";
import {
  assetPackForKind,
  detectPackRoleFromUpload,
  packFileName,
  packFileNames,
  type AssetPackFileRole,
} from "@/lib/shop/asset-packs";
import type { ShopItemKind } from "@/lib/shop/catalog";
import { cn } from "@/lib/utils";

type AdminAssetPackUploadProps = {
  kind: ShopItemKind;
  mediaBase: string;
  assetFolder: string;
  uploaded: Partial<Record<AssetPackFileRole, boolean>>;
  disabled?: boolean;
  onUploaded: (role: AssetPackFileRole, fileName: string) => void;
  onError: (message: string) => void;
};

export function AdminAssetPackUpload({
  kind,
  mediaBase,
  assetFolder,
  uploaded,
  disabled,
  onUploaded,
  onError,
}: AdminAssetPackUploadProps) {
  const multiInputRef = useRef<HTMLInputElement>(null);
  const pack = assetPackForKind(kind);
  const [uploading, setUploading] = useState(false);

  if (!pack) return null;

  const base = mediaBase.trim();
  const names = base ? packFileNames(base, pack) : null;
  const busy = disabled || uploading;

  const uploadFile = async (file: File, role: AssetPackFileRole) => {
    if (!base) {
      onError("Сначала укажите базовый id");
      return;
    }

    const targetFileName = packFileName(base, pack, role);
    setUploading(true);
    try {
      const result = await uploadAdminCustomizationAsset({
        file,
        assetFolder: assetFolder || "backgrounds",
        targetFileName,
      });
      onUploaded(role, result.assetId);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  };

  const handleMultiPick = async (files: FileList | null) => {
    if (!files?.length) return;
    const assigned = new Set<AssetPackFileRole>();

    for (const file of files) {
      const role = detectPackRoleFromUpload(file, pack);
      if (!role) {
        onError(`Неизвестный тип файла: ${file.name}`);
        continue;
      }
      if (assigned.has(role)) {
        onError(`Дубликат роли ${role}: ${file.name}`);
        continue;
      }
      assigned.add(role);
      await uploadFile(file, role);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-[var(--app-border)] p-3">
      <div>
        <p className="text-sm font-medium">{pack.label}</p>
        <p className="mt-0.5 text-xs text-[color-mix(in_srgb,var(--foreground)_50%,transparent)]">{pack.hint}</p>
      </div>

      {names ? (
        <ul className="space-y-2 text-xs">
          {pack.files.map((spec) => {
            const fileName = names[spec.role];
            const done = uploaded[spec.role];
            return (
              <li
                key={spec.role}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5",
                  done
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : "border-[var(--app-border)] bg-[var(--background)]",
                )}
              >
                <span className="min-w-0 truncate">
                  <span className="text-[color-mix(in_srgb,var(--foreground)_55%,transparent)]">{spec.label}: </span>
                  <code className="text-[color-mix(in_srgb,var(--foreground)_80%,transparent)]">{fileName}</code>
                </span>
                {done ? (
                  <Check className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                ) : (
                  <label className="shrink-0">
                    <input
                      type="file"
                      accept={spec.mime.join(",")}
                      className="hidden"
                      disabled={busy}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadFile(file, spec.role);
                        e.target.value = "";
                      }}
                    />
                    <span className="cursor-pointer text-[var(--theme-accent)] hover:underline">Загрузить</span>
                  </label>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-amber-300/90">Укажите базовый id — появятся имена файлов.</p>
      )}

      <input
        ref={multiInputRef}
        type="file"
        multiple
        accept="image/jpeg,video/webm,video/mp4"
        className="hidden"
        disabled={busy || !base}
        onChange={(e) => {
          void handleMultiPick(e.target.files);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={busy || !base}
        onClick={() => multiInputRef.current?.click()}
      >
        <Upload className="h-4 w-4" aria-hidden />
        Загрузить все 3 файла
      </Button>
    </div>
  );
}
