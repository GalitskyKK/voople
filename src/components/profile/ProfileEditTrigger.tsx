"use client";

import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/Button";

export function ProfileEditTrigger({
  variant,
  onClick,
}: {
  variant: "icon" | "button";
  onClick: () => void;
}) {
  if (variant === "button") {
    return (
      <Button type="button" size="sm" variant="secondary" onClick={onClick}>
        <Pencil className="h-4 w-4" />
        Редактировать профиль
      </Button>
    );
  }

  return (
    <button
      type="button"
      aria-label="Редактировать профиль"
      title="Редактировать профиль"
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white/85 backdrop-blur-sm transition hover:bg-black/55 hover:text-white"
      onClick={onClick}
    >
      <Pencil className="h-4 w-4" />
    </button>
  );
}
