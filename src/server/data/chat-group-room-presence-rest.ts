import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { ChatMembership } from "@/server/data/chat-access-rest";
import { filterUserIdsByPrivacyFieldRest } from "@/server/data/privacy-rest";

const ACTIVE_ROOM_WINDOW_MS = 3 * 60_000;

export type VisibleGroupRoom = {
  chatId: string;
  name: string;
};

export async function getVisibleGroupRoomPresenceRest(
  membership: ChatMembership,
  viewerId: string,
) {
  const admin = getAdminClient();
  const { data: sections, error: sectionsError } = await admin
    .from("chats")
    .select("id, name, section_access_mode")
    .eq("parent_chat_id", membership.accessChatId);
  if (sectionsError) throw new Error(sectionsError.message);

  const sectionRows = sections ?? [];
  const restrictedIds = sectionRows
    .filter((section) => section.section_access_mode === "restricted")
    .map((section) => String(section.id));
  let allowedRestrictedIds = new Set<string>();

  if (membership.role === "owner" || membership.role === "admin") {
    allowedRestrictedIds = new Set(restrictedIds);
  } else if (restrictedIds.length) {
    const { data: allowedSections, error: allowedSectionsError } = await admin
      .from("chat_section_members")
      .select("chat_id")
      .eq("user_id", viewerId)
      .in("chat_id", restrictedIds);
    if (allowedSectionsError) throw new Error(allowedSectionsError.message);
    allowedRestrictedIds = new Set(
      (allowedSections ?? []).map((row) => String(row.chat_id)),
    );
  }

  const visibleSections = sectionRows.filter(
    (section) =>
      section.section_access_mode !== "restricted" ||
      allowedRestrictedIds.has(String(section.id)),
  );
  const roomNames = new Map<string, string>([
    [membership.accessChatId, "Основная комната"],
    ...visibleSections.map(
      (section) => [
        String(section.id),
        typeof section.name === "string" && section.name.trim()
          ? section.name.trim()
          : "Раздел",
      ] as const,
    ),
  ]);
  const visibleChatIds = [...roomNames.keys()];
  const activeAfter = new Date(Date.now() - ACTIVE_ROOM_WINDOW_MS).toISOString();
  const { data: participants, error: participantsError } = await admin
    .from("chat_room_participants")
    .select("chat_id, user_id, last_seen_at")
    .in("chat_id", visibleChatIds)
    .gte("last_seen_at", activeAfter)
    .order("last_seen_at", { ascending: false });
  if (participantsError) throw new Error(participantsError.message);

  const visibleUserIds = new Set(
    await filterUserIdsByPrivacyFieldRest(
      (participants ?? []).map((row) => String(row.user_id)),
      viewerId,
      "roomsScope",
    ),
  );
  const result = new Map<string, VisibleGroupRoom>();
  for (const participant of participants ?? []) {
    const participantId = String(participant.user_id);
    const chatId = String(participant.chat_id);
    const roomName = roomNames.get(chatId);
    if (!roomName || !visibleUserIds.has(participantId) || result.has(participantId)) {
      continue;
    }
    result.set(participantId, { chatId, name: roomName });
  }
  return result;
}
