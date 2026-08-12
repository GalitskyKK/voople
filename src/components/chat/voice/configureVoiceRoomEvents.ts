import {
  RoomEvent,
  Track,
  type ConnectionQuality,
  type LocalTrackPublication,
  type Participant,
  type RemoteParticipant,
  type RemoteTrack,
  type RemoteTrackPublication,
  type Room,
} from "livekit-client";

import { getMicrophoneMuted } from "./voice-room-config";

type ConfigureVoiceRoomEventsOptions = {
  room: Room;
  isCurrent: () => boolean;
  onRemoteTrack: (
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant,
  ) => void;
  onRemoteTrackDetached: (
    track: RemoteTrack,
    publication: RemoteTrackPublication,
  ) => void;
  onLocalVideoPublished: (
    publication: LocalTrackPublication,
    participantId: string,
  ) => void;
  onLocalVideoUnpublished: (publication: LocalTrackPublication) => void;
  onMicrophonesChange: (
    localMuted: boolean,
    remoteMutedById: Record<string, boolean>,
  ) => void;
  onActiveSpeakersChange: (participantIds: ReadonlySet<string>) => void;
  onConnectionQualityChange: (quality: ConnectionQuality) => void;
  onAudioBlockedChange: (blocked: boolean) => void;
  onReconnecting: () => void;
  onReconnected: () => void;
  onParticipantConnected?: () => void;
  onParticipantDisconnected?: () => void;
};

export function configureVoiceRoomEvents({
  room,
  isCurrent,
  onRemoteTrack,
  onRemoteTrackDetached,
  onLocalVideoPublished,
  onLocalVideoUnpublished,
  onMicrophonesChange,
  onActiveSpeakersChange,
  onConnectionQualityChange,
  onAudioBlockedChange,
  onReconnecting,
  onReconnected,
  onParticipantConnected,
  onParticipantDisconnected,
}: ConfigureVoiceRoomEventsOptions) {
  const syncMicrophones = () => {
    if (!isCurrent()) return;
    const remoteMutedById = Object.fromEntries(
      [...room.remoteParticipants.values()].map((participant) => {
        const publication = participant.getTrackPublication(Track.Source.Microphone);
        return [participant.identity, publication ? publication.isMuted : true];
      }),
    );
    onMicrophonesChange(getMicrophoneMuted(room), remoteMutedById);
  };

  room
    .on(RoomEvent.TrackPublished, syncMicrophones)
    .on(RoomEvent.TrackUnpublished, syncMicrophones)
    .on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      onRemoteTrack(track, publication, participant);
      syncMicrophones();
    })
    .on(RoomEvent.TrackUnsubscribed, onRemoteTrackDetached)
    .on(RoomEvent.LocalTrackPublished, (publication) => {
      onLocalVideoPublished(publication, room.localParticipant.identity);
      syncMicrophones();
    })
    .on(RoomEvent.LocalTrackUnpublished, (publication) => {
      onLocalVideoUnpublished(publication);
      syncMicrophones();
    })
    .on(RoomEvent.TrackMuted, syncMicrophones)
    .on(RoomEvent.TrackUnmuted, syncMicrophones)
    .on(RoomEvent.ParticipantConnected, () => {
      syncMicrophones();
      onParticipantConnected?.();
    })
    .on(RoomEvent.ParticipantDisconnected, () => {
      syncMicrophones();
      onParticipantDisconnected?.();
    })
    .on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
      onActiveSpeakersChange(new Set(speakers.map((speaker) => speaker.identity)));
    })
    .on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
      if (participant.isLocal) onConnectionQualityChange(quality);
    })
    .on(RoomEvent.AudioPlaybackStatusChanged, () => {
      onAudioBlockedChange(!room.canPlaybackAudio);
    })
    .on(RoomEvent.SignalReconnecting, onReconnecting)
    .on(RoomEvent.Reconnecting, onReconnecting)
    .on(RoomEvent.Reconnected, () => {
      if (!isCurrent()) return;
      onReconnected();
      syncMicrophones();
    });

  return syncMicrophones;
}
