"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useTransition } from "react";

import { SessionBootstrapRecoveryView } from "./SessionBootstrapRecoveryView";
import type { AuthSessionBootstrapReason } from "@/lib/supabase/session-bootstrap";

export function WebSessionBootstrapRecovery({
  reason,
}: {
  reason: AuthSessionBootstrapReason;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const retry = useCallback(
    () => startTransition(() => router.refresh()),
    [router],
  );

  useEffect(() => {
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [retry]);

  return (
    <SessionBootstrapRecoveryView
      reason={reason}
      pending={pending}
      onRetry={retry}
    />
  );
}
