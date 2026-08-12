"use client";

import { Copy, Trash2, X } from "lucide-react";

import { AppPanelHeader } from "@/components/layout/AppPanelHeader";

export function ChatSelectionToolbar({
  count,
  canDelete,
  onCancel,
  onCopy,
  onDelete,
}: {
  count: number;
  canDelete: boolean;
  onCancel: () => void;
  onCopy: () => void;
  onDelete: () => void;
}) {
  return (
    <AppPanelHeader className="voople-chat-selection-toolbar">
      <button type="button" className="voople-chat-selection-toolbar__close" onClick={onCancel} aria-label="Отменить выбор">
        <X className="h-4 w-4" aria-hidden />
      </button>
      <strong className="min-w-0 flex-1">Выбрано: {count}</strong>
      <button type="button" onClick={onCopy} className="voople-chat-selection-toolbar__action">
        <Copy className="h-4 w-4" aria-hidden />
        <span>Копировать</span>
      </button>
      {canDelete ? (
        <button type="button" onClick={onDelete} className="voople-chat-selection-toolbar__action voople-chat-selection-toolbar__action--danger">
          <Trash2 className="h-4 w-4" aria-hidden />
          <span>Удалить</span>
        </button>
      ) : null}
    </AppPanelHeader>
  );
}
