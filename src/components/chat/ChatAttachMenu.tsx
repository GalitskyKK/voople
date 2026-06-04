"use client";

import { ImageIcon, Music, Paperclip, Upload } from "lucide-react";

import { DropdownMenu } from "@/components/ui/DropdownMenu";

type ChatAttachMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPickPhoto: () => void;
  onPickAudioFile: () => void;
  onPickMusic: () => void;
  disabled?: boolean;
};

export function ChatAttachMenu({
  open,
  onOpenChange,
  onPickPhoto,
  onPickAudioFile,
  onPickMusic,
  disabled,
}: ChatAttachMenuProps) {
  const pick = (action: () => void) => {
    action();
    onOpenChange(false);
  };

  return (
    <DropdownMenu
      open={open}
      onOpenChange={onOpenChange}
      align="start"
      menuClassName="min-w-[12rem]"
      trigger={
        <button
          type="button"
          disabled={disabled}
          className="rounded-[var(--app-radius-sm)] p-2 text-[var(--app-muted)] transition-colors hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)] disabled:opacity-50"
          aria-label="Вложения"
          aria-expanded={open}
        >
          <Paperclip className="h-5 w-5" />
        </button>
      }
    >
      <button
        type="button"
        role="menuitem"
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/5"
        onClick={() => pick(onPickPhoto)}
      >
        <ImageIcon className="h-4 w-4" />
        Фото
      </button>
      <button
        type="button"
        role="menuitem"
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/5"
        onClick={() => pick(onPickMusic)}
      >
        <Music className="h-4 w-4" />
        Музыка из плейлиста
      </button>
      <button
        type="button"
        role="menuitem"
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/5"
        onClick={() => pick(onPickAudioFile)}
      >
        <Upload className="h-4 w-4" />
        Загрузить аудиофайл
      </button>
    </DropdownMenu>
  );
}
