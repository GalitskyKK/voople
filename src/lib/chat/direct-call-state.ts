import type { IncomingCallView } from "@/types/chat";

export const DIRECT_CALL_RING_MS = 45_000;

export function callStartedAtMs(startedAt: string): number {
  return Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/.test(startedAt) ? startedAt : `${startedAt}Z`);
}

export function incomingCallKey(call: IncomingCallView): string {
  return `${call.chatId}:${call.startedAt}`;
}

export function incomingCallExpiresAt(call: IncomingCallView): number {
  return callStartedAtMs(call.startedAt) + DIRECT_CALL_RING_MS;
}

export function visibleIncomingCall(
  call: IncomingCallView | null,
  handledKey: string | null,
  now: number,
): IncomingCallView | null {
  return call && incomingCallKey(call) !== handledKey && incomingCallExpiresAt(call) > now ? call : null;
}

export function shouldNotifyIncomingCall(key: string, busy: boolean, lastNotifiedKey: string | null): boolean {
  return !busy && key !== lastNotifiedKey;
}

export function matchesIncomingCall(
  expectedStartedAt: string,
  room: { status: string; startedAt: string | null; startedBy: string | null },
  recipientId: string,
): boolean {
  return room.status === "ringing" && room.startedAt === expectedStartedAt && room.startedBy !== recipientId;
}
