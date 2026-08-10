"use client";

import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

import type { UserSearchHit } from "@/types/search";

export function ChatContactResults({
  contacts,
  loading,
  openingContactId,
  onOpen,
  renderAvatar,
  renderTitle,
}: {
  contacts: UserSearchHit[];
  loading: boolean;
  openingContactId: string | null;
  onOpen: (contact: UserSearchHit) => void;
  renderAvatar?: (contact: UserSearchHit) => ReactNode;
  renderTitle?: (contact: UserSearchHit) => ReactNode;
}) {
  if (loading) {
    return (
      <div className="order-1 flex items-center justify-center gap-2 px-3 py-5 text-xs text-[var(--app-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" /> Ищем контакты
      </div>
    );
  }
  if (!contacts.length) return null;

  return (
    <div className="order-1">
      <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--app-muted)]">
        Люди
      </p>
      <ul className="space-y-0.5">
        {contacts.map((contact) => (
          <li key={contact.id}>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-[var(--app-surface-soft)] disabled:opacity-60"
              disabled={openingContactId !== null}
              onClick={() => onOpen(contact)}
            >
              {renderAvatar?.(contact)}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {renderTitle?.(contact) ?? contact.displayName}
                </span>
                <span className="block truncate text-xs text-[var(--app-muted)]">
                  @{contact.username}
                </span>
              </span>
              {openingContactId === contact.id ? (
                <Loader2 className="h-4 w-4 animate-spin text-[var(--app-muted)]" />
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
