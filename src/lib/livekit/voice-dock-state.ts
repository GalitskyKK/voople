import type { ChatRoomParticipantView } from "@/types/chat";

export type VoiceDockMediaState = {
  micMuted: boolean;
  cameraEnabled: boolean;
  screenSharing: boolean;
};

export function resolveVoiceDockActiveSpeaker(
  participants: readonly ChatRoomParticipantView[],
  activeSpeakerIds: ReadonlySet<string>,
) {
  return participants.find((participant) => activeSpeakerIds.has(participant.id))
    ?.displayName ?? null;
}

export function formatVoiceDockParticipantCount(count: number) {
  const absolute = Math.abs(count);
  const lastTwo = absolute % 100;
  const last = absolute % 10;
  const noun = lastTwo >= 11 && lastTwo <= 14
    ? "участников"
    : last === 1
      ? "участник"
      : last >= 2 && last <= 4
        ? "участника"
        : "участников";

  return `${count} ${noun}`;
}

export function describeVoiceDockMediaState({
  micMuted,
  cameraEnabled,
  screenSharing,
}: VoiceDockMediaState) {
  return [
    micMuted ? "микрофон выключен" : "микрофон включён",
    cameraEnabled ? "камера включена" : null,
    screenSharing ? "экран передаётся" : null,
  ].filter((value): value is string => Boolean(value));
}
