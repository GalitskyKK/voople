import type { GroupJoinPolicy, GroupVisibility } from "@/types/chat";

export function normalizeGroupVisibility(value: unknown): GroupVisibility {
  return value === "public" || value === "unlisted" ? value : "private";
}

export function normalizeGroupJoinPolicy(value: unknown): GroupJoinPolicy {
  return value === "open" || value === "request" ? value : "invite_only";
}
