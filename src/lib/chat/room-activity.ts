export type RoomActivityEvent = {
  dayKey: string;
  event: "started" | "ended" | "missed" | "declined" | "cancelled";
  durationSeconds: number | null;
  roomKind?: "direct" | "group";
};

export function summarizeGroupRoomActivity(events: RoomActivityEvent[]) {
  const summaries = new Map<string, { durationSeconds: number; sessions: number }>();
  for (const event of events) {
    if (event.roomKind !== "group" || event.event !== "ended") continue;
    const summary = summaries.get(event.dayKey) ?? { durationSeconds: 0, sessions: 0 };
    summary.durationSeconds += event.durationSeconds ?? 0;
    summary.sessions += 1;
    summaries.set(event.dayKey, summary);
  }
  return summaries;
}
