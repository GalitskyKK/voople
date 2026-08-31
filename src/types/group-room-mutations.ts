import type { GroupNowRoomKind } from "@/types/group-now";

export type GroupRoomRecord = {
  id: string;
  groupId: string;
  kind: GroupNowRoomKind;
  name: string;
  createdBy: string | null;
};

export type GroupRoomJoinResult = {
  roomId: string;
  sessionId: string;
  providerSessionId: string;
  previousSessionId: string | null;
  switched: boolean;
};

export type GroupRoomLeaveResult = {
  left: boolean;
  sessionId: string | null;
  roomId: string | null;
  sessionStatus: "active" | "grace" | "ended" | null;
};
