"use client";

import type { ReactNode } from "react";

import { createClient } from "@/lib/supabase/client";

import { LegalConsentGate } from "./LegalConsentGate";

export function WebLegalConsentBoundary({ children }: { children: ReactNode }) {
  return (
    <LegalConsentGate
      documentBaseUrl=""
      source="web_reconsent"
      onSignOut={async () => {
        await createClient().auth.signOut();
        window.location.assign("/login");
      }}
    >
      {children}
    </LegalConsentGate>
  );
}
