"use client";

import { useId, useState, type ReactNode } from "react";
import { FlipHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";

type FlipCardProps = {
  front: ReactNode;
  /** Обратная сторона: preview или editor в зависимости от flipped */
  renderBack: (flipped: boolean) => ReactNode;
  className?: string;
  flipLabel?: string;
  flipped?: boolean;
  onFlippedChange?: (flipped: boolean) => void;
};

/**
 * 3D-переворот карточки. В режиме preview (лицо) на обороте — статичный canvas;
 * после переворота — интерактивный editor (см. renderBack).
 */
export function FlipCard({
  front,
  renderBack,
  className,
  flipLabel = "Оборот карточки — рисование",
  flipped: flippedProp,
  onFlippedChange,
}: FlipCardProps) {
  const [flippedInternal, setFlippedInternal] = useState(false);
  const flipped = flippedProp ?? flippedInternal;
  const setFlipped = onFlippedChange ?? setFlippedInternal;
  const flipHintId = useId();

  return (
    <div className={cn("flip-card group relative", className)}>
      <button
        type="button"
        aria-label={flipLabel}
        aria-pressed={flipped}
        aria-describedby={flipHintId}
        className="flip-card__toggle absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
        onClick={() => setFlipped(!flipped)}
      >
        <FlipHorizontal className="h-4 w-4" aria-hidden />
      </button>

      <p id={flipHintId} className="sr-only">
        {flipped
          ? "Режим рисования на обратной стороне карточки"
          : "Лицевая сторона — профиль; оборот — общий холст для рисования"}
      </p>

      <div className="flip-card__scene" style={{ perspective: "1000px" }}>
        <div
          className={cn(
            "flip-card__inner relative w-full transition-transform duration-700 ease-in-out",
            flipped && "[transform:rotateY(180deg)]",
          )}
          style={{ transformStyle: "preserve-3d" }}
        >
          <div
            className="flip-card__face flip-card__face--front relative w-full [backface-visibility:hidden]"
            style={{ transform: "rotateY(0deg)" }}
          >
            {front}
          </div>

          <div
            className="flip-card__face flip-card__face--back absolute inset-0 min-h-full w-full [backface-visibility:hidden]"
            style={{ transform: "rotateY(180deg)" }}
          >
            {renderBack(flipped)}
          </div>
        </div>
      </div>
    </div>
  );
}
