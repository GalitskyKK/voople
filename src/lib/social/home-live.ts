import { selectRankedHomeItems } from "./home-ranking";
import type { HomeNowItem, HomeOverviewView } from "@/types/home";

export function mergeHomeActiveRooms(
  overview: HomeOverviewView,
  activeRooms: HomeNowItem[],
): HomeOverviewView {
  const activeConversationIds = new Set(activeRooms.flatMap((room) =>
    room.conversationId ? [room.conversationId] : [],
  ));
  const nonRoomNow = overview.now.filter((item) => item.kind !== "room");
  const continueCandidates = overview.continueCandidates.length
    ? overview.continueCandidates
    : overview.continue;
  const continueWithoutActiveRooms = continueCandidates.filter(
    (item) => !activeConversationIds.has(item.id),
  );

  return {
    ...overview,
    now: selectRankedHomeItems([...activeRooms, ...nonRoomNow], {
      limit: 5,
      minimumScore: 1,
    }),
    continue: selectRankedHomeItems(continueWithoutActiveRooms, {
      limit: 4,
      minimumScore: 1,
    }),
    continueCandidates: continueWithoutActiveRooms,
  };
}
