"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";

import { AdminAssetPackUpload } from "@/components/admin/AdminAssetPackUpload";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { inferMediaBaseFromAssetId, normalizeMediaBase, posterAssetIdForBase, suggestMediaBase, usesAssetPack, type AssetPackFileRole } from "@/lib/shop/asset-packs";
import { uploadAdminCustomizationAsset } from "@/lib/admin/upload-customization-asset";
import { extensionForCustomizationMime } from "@/lib/object-storage/customization-paths";
import {
  defaultAssetFolderForKind,
  defaultEquipSlotForKind,
  kindRequiresCdnAsset,
  kindSupportsOptionalCdn,
  SHOP_KIND_OPTIONS,
  slugifyAssetId,
  suggestItemId,
} from "@/lib/shop/defaults";
import type { ShopEquipSlot, ShopItemKind } from "@/lib/shop/catalog";
import { trpc } from "@/lib/trpc/client";
import type { AdminShopItemRecord } from "@/types/admin-shop";
import { SubscriptionRequirementField } from "@/components/admin/SubscriptionRequirementField";

type FormState = {
  id: string;
  seasonId: string;
  kind: ShopItemKind;
  name: string;
  description: string;
  priceRub: number;
  priceCoins: number;
  isFree: boolean;
  sortOrder: number;
  assetFolder: string;
  assetId: string;
  equipSlot: ShopEquipSlot;
  equipValue: string;
  requiresSubscription: boolean;
};

function emptyForm(): FormState {
  return {
    id: "",
    seasonId: "launch",
    kind: "effect",
    name: "",
    description: "",
    priceRub: 79,
    priceCoins: 180,
    isFree: true,
    sortOrder: 100,
    assetFolder: "effects",
    assetId: "",
    equipSlot: "profile_effect_id",
    equipValue: "",
    requiresSubscription: false,
  };
}

function formFromItem(item: AdminShopItemRecord): FormState {
  const equipValue =
    item.equipValue ??
    (usesAssetPack(item.kind) ? inferMediaBaseFromAssetId(item.assetId) ?? "" : "");

  return {
    id: item.id,
    seasonId: item.seasonId ?? "launch",
    kind: item.kind,
    name: item.name,
    description: item.description ?? "",
    priceRub: item.priceRub,
    priceCoins: item.priceCoins,
    isFree: item.isFree,
    sortOrder: item.sortOrder,
    assetFolder: item.assetFolder ?? "",
    assetId: item.assetId ?? "",
    equipSlot: item.equipSlot,
    equipValue,
    requiresSubscription: item.requiresSubscription,
  };
}

type AdminAssetEditorProps = {
  open: boolean;
  item: AdminShopItemRecord | null;
  onClose: () => void;
  onSaved: () => void;
};

export function AdminAssetEditor({ open, item, onClose, onSaved }: AdminAssetEditorProps) {
  const isEdit = Boolean(item);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dividerFileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [packUploaded, setPackUploaded] = useState<Partial<Record<AssetPackFileRole, boolean>>>({});
  const [fileUploading, setFileUploading] = useState(false);
  const editorKey = `${open ? "open" : "closed"}:${item?.id ?? "new"}`;
  const [lastEditorKey, setLastEditorKey] = useState(editorKey);

  const createMutation = trpc.admin.createShopItem.useMutation();
  const updateMutation = trpc.admin.updateShopItem.useMutation();

  if (editorKey !== lastEditorKey) {
    setLastEditorKey(editorKey);
    if (open) {
      const next = item ? formFromItem(item) : emptyForm();
      setForm(next);
      setError(null);
      setUploadStatus(null);
      setPackUploaded(
        item && usesAssetPack(item.kind) && item.equipValue
          ? { poster: true, webm: true, mp4: true }
          : {},
      );
    }
  }

  const patch = (partial: Partial<FormState>) => setForm((prev) => ({ ...prev, ...partial }));

  const handleKindChange = (kind: ShopItemKind) => {
    patch({
      kind,
      assetFolder: defaultAssetFolderForKind(kind) ?? "",
      equipSlot: defaultEquipSlotForKind(kind),
      equipValue: "",
      assetId: "",
    });
    setPackUploaded({});
  };

  const handleMediaBaseChange = (raw: string) => {
    const base = normalizeMediaBase(raw);
    patch({
      equipValue: base,
      assetId: base ? posterAssetIdForBase(base) : "",
    });
    setPackUploaded({});
  };

  const handleNameBlur = () => {
    if (isEdit || form.id.trim()) return;
    const id = suggestItemId(form.name, form.kind);
    const slug = id.replace(/^[^-]+-/, "");
    if (usesAssetPack(form.kind)) {
      const base = suggestMediaBase(form.name, form.kind);
      patch({
        id,
        equipValue: base,
        assetId: posterAssetIdForBase(base),
      });
      return;
    }
    patch({
      id,
      equipValue: form.equipValue.trim() ? form.equipValue : slug,
    });
  };

  const handlePackUploaded = (role: AssetPackFileRole, fileName: string) => {
    setPackUploaded((prev) => ({ ...prev, [role]: true }));
    if (role === "poster") {
      patch({ assetId: fileName });
    }
    setUploadStatus(`Загружено: ${form.assetFolder}/${fileName}`);
  };

  const handleUpload = async (file: File) => {
    setUploadStatus(null);
    setError(null);
    setFileUploading(true);

    const contentType = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
    const hasExt = /\.[a-z0-9]{2,5}$/i.test(file.name);
    const ext = extensionForCustomizationMime(contentType);
    const targetFileName =
      form.assetId.trim() ||
      (hasExt ? slugifyAssetId(file.name) : `${slugifyAssetId(file.name.replace(/\.[^.]+$/, ""))}.${ext}`);
    const folder = form.assetFolder.trim() || defaultAssetFolderForKind(form.kind) || "effects";

    try {
      const result = await uploadAdminCustomizationAsset({
        file,
        assetFolder: folder,
        targetFileName,
      });

      patch({
        assetFolder: result.assetFolder,
        assetId: result.assetId,
      });
      if (form.kind === "profile_frame") {
        patch({ equipValue: result.assetId });
      } else {
        // Frame resolver uses the complete file name to avoid a brittle list
        // of extensions; other CDN items must always follow the uploaded file.
        patch({ equipValue: result.assetId.replace(/\.[^.]+$/, "") });
      }
      setUploadStatus(`Загружено: ${result.assetFolder}/${result.assetId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setFileUploading(false);
    }
  };

  const handleFrameDividerUpload = async (file: File) => {
    setUploadStatus(null);
    setError(null);

    if (form.kind !== "profile_frame") return;

    const base = (form.assetId.trim() || form.equipValue.trim()).replace(/\.[a-z0-9]{2,5}$/i, "");
    if (!base) {
      setError("Сначала загрузите или укажите основной файл рамки.");
      return;
    }
    if (file.type.split(";")[0]?.trim().toLowerCase() !== "image/webp") {
      setError("Для разделителя рамки используйте прозрачный WebP.");
      return;
    }

    setFileUploading(true);
    const folder = form.assetFolder.trim() || defaultAssetFolderForKind(form.kind) || "frames";

    try {
      const result = await uploadAdminCustomizationAsset({
        file,
        assetFolder: folder,
        targetFileName: `${base}-divider.webp`,
      });
      patch({ assetFolder: result.assetFolder });
      setUploadStatus(`Загружен разделитель: ${result.assetFolder}/${result.assetId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить разделитель рамки");
    } finally {
      setFileUploading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const payload = {
      id: form.id.trim(),
      seasonId: form.seasonId.trim() || "launch",
      kind: form.kind,
      name: form.name.trim(),
      description: form.description.trim() || null,
      priceRub: form.priceRub,
      priceCoins: form.priceCoins,
      isFree: form.isFree,
      sortOrder: form.sortOrder,
      assetFolder: form.assetFolder.trim() || null,
      assetId: form.assetId.trim() || null,
      equipSlot: form.equipSlot,
      equipValue: form.equipValue.trim() || null,
      requiresSubscription: form.requiresSubscription,
    };

    try {
      if (isEdit && item) {
        await updateMutation.mutateAsync({ itemId: item.id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить");
    }
  };

  const busy = createMutation.isPending || updateMutation.isPending || fileUploading;
  const isPackKind = usesAssetPack(form.kind);
  const needsCdn = kindRequiresCdnAsset(form.kind) || kindSupportsOptionalCdn(form.kind);
  const cdnRequired = kindRequiresCdnAsset(form.kind) && !isPackKind;

  return (
    <Sheet open={open} onClose={onClose} className="max-h-[90dvh] w-full max-w-xl overflow-y-auto p-0">
      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="flex items-center justify-between border-b border-[var(--app-border)] px-5 py-4">
          <h2 className="text-lg font-semibold">{isEdit ? "Редактировать ассет" : "Новый ассет"}</h2>
        </div>

        <div className="space-y-4 px-5 py-4">
          <label className="block space-y-1 text-sm">
            <span>Тип</span>
            <select
              value={form.kind}
              disabled={busy}
              onChange={(e) => handleKindChange(e.target.value as ShopItemKind)}
              className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--background)] px-3 py-2"
            >
              {SHOP_KIND_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span>Название</span>
              <input
                required
                value={form.name}
                disabled={busy}
                onChange={(e) => patch({ name: e.target.value })}
                onBlur={handleNameBlur}
                className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--background)] px-3 py-2"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>ID (slug)</span>
              <input
                required
                value={form.id}
                disabled={busy || isEdit}
                onChange={(e) => patch({ id: e.target.value })}
                className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--background)] px-3 py-2 disabled:opacity-60"
              />
            </label>
          </div>

          <label className="block space-y-1 text-sm">
            <span>Описание</span>
            <textarea
              value={form.description}
              disabled={busy}
              rows={2}
              onChange={(e) => patch({ description: e.target.value })}
              className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--background)] px-3 py-2"
            />
          </label>

          {isPackKind ? (
            <>
              <label className="block space-y-1 text-sm">
                <span>Базовый id (equipValue)</span>
                <input
                  required
                  value={form.equipValue}
                  disabled={busy}
                  onChange={(e) => handleMediaBaseChange(e.target.value)}
                  placeholder="background_blue_flowers"
                  className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--background)] px-3 py-2 font-mono text-sm"
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span>Папка CDN</span>
                <input
                  value={form.assetFolder}
                  disabled={busy}
                  onChange={(e) => patch({ assetFolder: e.target.value })}
                  className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--background)] px-3 py-2"
                />
              </label>
              <AdminAssetPackUpload
                kind={form.kind}
                mediaBase={form.equipValue}
                assetFolder={form.assetFolder}
                uploaded={packUploaded}
                disabled={busy}
                onUploaded={handlePackUploaded}
                onError={setError}
              />
              {uploadStatus ? <p className="text-xs text-emerald-400">{uploadStatus}</p> : null}
            </>
          ) : needsCdn ? (
            <div className="space-y-3 rounded-xl border border-[var(--app-border)] p-3">
              <p className="text-sm font-medium">
                Файл в CDN{cdnRequired ? "" : " (опционально)"}
              </p>
              {form.kind === "profile_frame" ? (
                <p className="rounded-lg bg-[var(--app-surface-soft)] p-2 text-xs leading-5 text-[var(--app-muted)]">
                  Основная рамка: прозрачный WebP 1200×1600 px, рабочая полоса по краям — 96 px,
                  центр прозрачный. Вертикальные стороны растягиваются, углы сохраняют пропорции.
                </p>
              ) : null}
              {form.kind === "feed_card" ? (
                <p className="rounded-lg bg-[var(--app-surface-soft)] p-2 text-xs leading-5 text-[var(--app-muted)]">
                  Бейдж ленты: WebP ровно 1200×240 px. Левая зона 320 px и правая зона 450 px сохраняют пропорции, растягивается только центр. Аватар и имя накладываются интерфейсом, поэтому отверстие, текст и отдельный круг в ассете не нужны. Заполняйте фон до границ холста, без внешних прозрачных полей.
                </p>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1 text-sm">
                  <span>Папка</span>
                  <input
                    value={form.assetFolder}
                    disabled={busy}
                    onChange={(e) => patch({ assetFolder: e.target.value })}
                    className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--background)] px-3 py-2"
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span>Имя файла (assetId)</span>
                  <input
                    value={form.assetId}
                    disabled={busy}
                    onChange={(e) => patch({ assetId: e.target.value })}
                    placeholder="minti.webp"
                    className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--background)] px-3 py-2"
                  />
                </label>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/webp,image/png,image/jpeg,image/gif,video/mp4,video/webm"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUpload(file);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" aria-hidden />
                Загрузить файл в бакет
              </Button>
              {form.kind === "profile_frame" ? (
                <div className="space-y-2 border-t border-[var(--app-border)] pt-3">
                  <p className="text-xs text-[color-mix(in_srgb,var(--foreground)_62%,transparent)]">
                    Разделитель: отдельный прозрачный WebP 1200×144 px. Основная рамка загружается
                    отдельным WebP без области разделителя. В исходном PSD можно оставить два артборда,
                    но экспортировать их нужно двумя файлами. Разделитель сохранится как{" "}
                    <code>{(form.assetId || "frame").replace(/\.[^.]+$/, "")}-divider.webp</code>.
                  </p>
                  <input
                    ref={dividerFileInputRef}
                    type="file"
                    accept="image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleFrameDividerUpload(file);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy || !(form.assetId.trim() || form.equipValue.trim())}
                    onClick={() => dividerFileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" aria-hidden />
                    Загрузить разделитель
                  </Button>
                </div>
              ) : null}
              {uploadStatus ? (
                <p className="text-xs text-emerald-400">{uploadStatus}</p>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-[color-mix(in_srgb,var(--foreground)_50%,transparent)]">
              CSS-предмет: файл не нужен. Для тем приложения цвета задаются в app-themes.ts.
            </p>
          )}

          {!isPackKind ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span>equipValue</span>
              <input
                value={form.equipValue}
                disabled={busy}
                onChange={(e) => patch({ equipValue: e.target.value })}
                className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--background)] px-3 py-2"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Сезон</span>
              <input
                value={form.seasonId}
                disabled={busy}
                onChange={(e) => patch({ seasonId: e.target.value })}
                className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--background)] px-3 py-2"
              />
            </label>
          </div>
          ) : (
            <label className="block space-y-1 text-sm">
              <span>Сезон</span>
              <input
                value={form.seasonId}
                disabled={busy}
                onChange={(e) => patch({ seasonId: e.target.value })}
                className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--background)] px-3 py-2"
              />
            </label>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="block space-y-1 text-sm">
              <span>Voops</span>
              <input
                type="number"
                min={0}
                value={form.priceCoins}
                disabled={busy}
                onChange={(e) => patch({ priceCoins: Number(e.target.value) })}
                className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--background)] px-3 py-2"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>₽</span>
              <input
                type="number"
                min={0}
                value={form.priceRub}
                disabled={busy}
                onChange={(e) => patch({ priceRub: Number(e.target.value) })}
                className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--background)] px-3 py-2"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Порядок</span>
              <input
                type="number"
                min={0}
                value={form.sortOrder}
                disabled={busy}
                onChange={(e) => patch({ sortOrder: Number(e.target.value) })}
                className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--background)] px-3 py-2"
              />
            </label>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input
                type="checkbox"
                checked={form.isFree}
                disabled={busy}
                onChange={(e) => patch({ isFree: e.target.checked })}
              />
              Бесплатно
            </label>
          </div>

          <SubscriptionRequirementField checked={form.requiresSubscription} disabled={busy} onChange={(requiresSubscription) => patch({ requiresSubscription })} />

          {error ? <p className="text-sm text-red-400">{error}</p> : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--app-border)] px-5 py-4">
          <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Сохранение…" : isEdit ? "Сохранить" : "Создать"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
