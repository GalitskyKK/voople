"use client";

import { useRouter } from "next/navigation";

import { SavedMessagesController } from "./SavedMessagesController";

export function SavedMessagesPage() {
  const router = useRouter();
  return <SavedMessagesController onBack={() => router.replace("/messages")} />;
}
