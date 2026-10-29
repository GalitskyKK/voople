"use client";

import { useId } from "react";
import { ImagePlus, LoaderCircle } from "lucide-react";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { ROOM_COVER_PRESETS, type RoomCoverDraft } from "@/lib/chat/room-cover";
import { RoomCoverVisual } from "./RoomCoverVisual";

export function RoomCoverPicker({ value, disabled, onChange, onUploadingChange }: {
  value?: RoomCoverDraft; disabled?: boolean; onChange: (value: RoomCoverDraft) => void;
  onUploadingChange: (uploading: boolean) => void;
}) {
  const id = useId();
  const upload = useMediaUpload("room-cover");
  const busy = disabled || upload.isUploading;
  return <fieldset className="mt-5 min-w-0" disabled={busy}>
    <legend className="text-sm font-medium">Обложка комнаты</legend>
    <div className="voople-room-cover-picker mt-2" role="group" aria-label="Стандартные обложки">
      {ROOM_COVER_PRESETS.map((preset) => <button key={preset.id} type="button" disabled={busy}
        className="voople-room-cover-picker__option" aria-label={preset.label}
        aria-pressed={value?.kind === "preset" && value.preset === preset.id}
        onClick={() => { upload.reset(); onChange({ kind: "preset", preset: preset.id }); }}>
        <span className="voople-room-cover-picker__image"><RoomCoverVisual cover={{ preset: preset.id, imageUrl: null }} /></span>
        <span>{preset.label}</span>
      </button>)}
    </div>
    <label htmlFor={id} className="voople-room-cover-picker__upload" aria-disabled={busy}>
      {upload.isUploading ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ImagePlus className="h-4 w-4" aria-hidden="true" />}
      {upload.isUploading ? "Загружаем…" : "Своя картинка"}
      <input id={id} type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy}
        onChange={async (event) => {
          const file = event.target.files?.[0]; event.target.value = "";
          if (!file) return;
          if (file.size > 5 * 1024 * 1024) { upload.setError("Выберите изображение до 5 МБ"); return; }
          onUploadingChange(true);
          try { const result = await upload.uploadFile(file); if (result) onChange({ kind: "upload", mediaKey: result.mediaKey }); }
          finally { onUploadingChange(false); }
        }} />
    </label>
    {value?.kind === "upload" && upload.uploaded ? <div className="mt-3 flex items-center gap-3 text-xs text-[var(--app-muted)]">
      <span className="voople-room-cover-picker__image h-14 w-14 shrink-0"><RoomCoverVisual cover={{ preset: "orbit", imageUrl: upload.uploaded.previewUrl }} /></span>Своя обложка выбрана
    </div> : null}
    <p className="mt-2 text-xs leading-5 text-[var(--app-muted)]">JPEG, PNG, WebP или GIF до 5 МБ. Обложку видят участники группы; файл доступен по публичной ссылке.</p>
    {upload.error ? <p className="mt-2 text-sm text-[var(--voople-danger)]" role="alert">{upload.error}</p> : null}
  </fieldset>;
}
