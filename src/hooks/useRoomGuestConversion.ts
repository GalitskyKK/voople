"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { authEntryHref } from "@/lib/auth/continuation";
import type { RoomGuestConversionResult } from "@/types/room-guests";

type ConversionPhase = "idle" | "converting" | "signed_out" | "success" | "error";

async function conversionResponse(response: Response) {
  const body = await response.json().catch(() => null) as RoomGuestConversionResult | { error?: string } | null;
  if (!response.ok) {
    const error = new Error(body && "error" in body && body.error
      ? body.error
      : "Не удалось сохранить участие");
    Object.assign(error, { status: response.status });
    throw error;
  }
  return body as RoomGuestConversionResult;
}

export function useRoomGuestConversion({
  token,
  requested,
  prepareGuest,
}: {
  token: string;
  requested: boolean;
  prepareGuest: () => Promise<void>;
}) {
  const router = useRouter();
  const returnPath = useMemo(
    () => `/room-guest/${encodeURIComponent(token)}?convert=1`,
    [token],
  );
  const [phase, setPhase] = useState<ConversionPhase>(requested ? "converting" : "idle");
  const [result, setResult] = useState<RoomGuestConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const attemptedRef = useRef(false);

  const attempt = useCallback(async (redirectWhenSignedOut: boolean) => {
    setPhase("converting");
    setError(null);
    await prepareGuest();
    try {
      const response = await fetch("/api/room-guests/conversion", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
      });
      const converted = await conversionResponse(response);
      setResult(converted);
      setPhase("success");
    } catch (reason) {
      const status = reason instanceof Error && "status" in reason
        ? Number(reason.status)
        : 0;
      if (status === 401) {
        if (redirectWhenSignedOut) {
          router.push(authEntryHref("/register", returnPath));
          return;
        }
        setPhase("signed_out");
        return;
      }
      setError(reason instanceof Error ? reason.message : "Не удалось сохранить участие");
      setPhase("error");
    }
  }, [prepareGuest, returnPath, router]);

  useEffect(() => {
    if (!requested || attemptedRef.current) return;
    attemptedRef.current = true;
    const timer = window.setTimeout(() => void attempt(false), 0);
    return () => window.clearTimeout(timer);
  }, [attempt, requested]);

  return {
    phase,
    result,
    error,
    registrationHref: authEntryHref("/register", returnPath),
    loginHref: authEntryHref("/login", returnPath),
    start: () => {
      attemptedRef.current = true;
      return attempt(true);
    },
    retry: () => attempt(false),
  };
}
