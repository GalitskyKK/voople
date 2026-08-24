"use client";

import type { ComponentProps, FormEvent, ReactNode } from "react";

import { cn } from "@/lib/utils";

import { ChatComposerInputView } from "./ChatComposerInputView";
import {
  ChatComposerFrame,
  CHAT_COMPOSER_SURFACE_CLASS,
} from "./ChatComposerVisual";

export function ChatComposerFormView({
  preview,
  beforeInput,
  error,
  textLength,
  onSubmit,
  input,
}: {
  preview?: ReactNode;
  beforeInput?: ReactNode;
  error?: string | null;
  textLength: number;
  onSubmit: () => void;
  input: ComponentProps<typeof ChatComposerInputView>;
}) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (input.canSend) onSubmit();
  };

  return (
    <ChatComposerFrame>
      {preview}
      {beforeInput}
      {error ? (
        <p className="mb-2 text-xs text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <form onSubmit={submit}>
        <div className={cn("relative flex items-end gap-1.5", CHAT_COMPOSER_SURFACE_CLASS)}>
          <ChatComposerInputView {...input} />
        </div>
      </form>
      {textLength >= 800 ? (
        <span className="mt-1 block text-right text-[10px] tabular-nums text-[var(--app-muted)]">
          {textLength}/1000
        </span>
      ) : null}
    </ChatComposerFrame>
  );
}
