import { Track, type RemoteParticipant, type RemoteTrackPublication } from "livekit-client";

export function screenPublicationBelongsToFocus(
  publication: RemoteTrackPublication,
  participant: RemoteParticipant,
  activeTrackId: string | null,
) {
  if (!activeTrackId) return false;
  if (publication.source === Track.Source.ScreenShare) {
    return publication.trackSid === activeTrackId;
  }
  return [...participant.trackPublications.values()].some(
    (candidate) => candidate.source === Track.Source.ScreenShare && candidate.trackSid === activeTrackId,
  );
}
