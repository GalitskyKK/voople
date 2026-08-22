"use client";

import {
  Room,
  RoomEvent,
  Track,
  type ConnectionQuality,
  type DisconnectReason,
  type LocalTrackPublication,
  type RemoteParticipant,
  type RemoteTrack,
  type RemoteTrackPublication,
} from "livekit-client";
import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";

import type { MediaStatus } from "./voice-room-config";
import { configureVoiceRoomEvents } from "./configureVoiceRoomEvents";
import { playVoiceRoomSound } from "./voice-room-sounds";

export function useVoiceRoomEventConfigurator(input: {
  roomRef: MutableRefObject<Room | null>;
  roomSoundsEnabled: () => boolean;
  attachAudio: (track: RemoteTrack, participant: RemoteParticipant) => void;
  attachRemoteVideo: (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => void;
  detachRemoteVideo: (track: RemoteTrack, publication: RemoteTrackPublication) => void;
  attachLocalVideo: (publication: LocalTrackPublication, participantId: string) => void;
  detachLocalVideo: (publication: LocalTrackPublication) => void;
  stopDesktopScreenAudio: () => void | Promise<void>;
  setMicMuted: Dispatch<SetStateAction<boolean>>;
  setRemoteMicMutedById: Dispatch<SetStateAction<Record<string, boolean>>>;
  setActiveSpeakerIds: Dispatch<SetStateAction<ReadonlySet<string>>>;
  setConnectionQuality: Dispatch<SetStateAction<ConnectionQuality>>;
  setAudioBlocked: Dispatch<SetStateAction<boolean>>;
  setMediaStatus: Dispatch<SetStateAction<MediaStatus>>;
  setMediaError: Dispatch<SetStateAction<string | null>>;
  syncRemotePublication: Parameters<typeof configureVoiceRoomEvents>[0]["onRemotePublication"];
  removeRemotePublication: Parameters<typeof configureVoiceRoomEvents>[0]["onRemotePublicationRemoved"];
  onDataReceived: Parameters<typeof configureVoiceRoomEvents>[0]["onDataReceived"];
  handleDisconnected: (room: Room, reason?: DisconnectReason) => void;
}) {
  return useCallback((liveRoom: Room) => {
    configureVoiceRoomEvents({
      room: liveRoom,
      isCurrent: () => input.roomRef.current === liveRoom,
      onRemoteTrack: (track, publication, participant) => {
        if (track.kind === Track.Kind.Audio) input.attachAudio(track, participant);
        else input.attachRemoteVideo(track, publication, participant);
      },
      onRemoteTrackDetached: input.detachRemoteVideo,
      onLocalVideoPublished: input.attachLocalVideo,
      onLocalVideoUnpublished: (publication) => {
        input.detachLocalVideo(publication);
        if (publication.source === Track.Source.ScreenShare) void input.stopDesktopScreenAudio();
      },
      onMicrophonesChange: (localMuted, remoteMutedById) => {
        input.setMicMuted(localMuted);
        input.setRemoteMicMutedById(remoteMutedById);
      },
      onActiveSpeakersChange: input.setActiveSpeakerIds,
      onConnectionQualityChange: input.setConnectionQuality,
      onAudioBlockedChange: input.setAudioBlocked,
      onReconnecting: () => input.setMediaStatus("reconnecting"),
      onReconnected: () => {
        input.setMediaStatus("connected");
        input.setMediaError(null);
      },
      onParticipantConnected: () => input.roomSoundsEnabled() && void playVoiceRoomSound("join"),
      onParticipantDisconnected: () => input.roomSoundsEnabled() && void playVoiceRoomSound("leave"),
      onRemotePublication: input.syncRemotePublication,
      onRemotePublicationRemoved: input.removeRemotePublication,
      onDataReceived: input.onDataReceived,
    });
    liveRoom.on(RoomEvent.Disconnected, (reason) => input.handleDisconnected(liveRoom, reason));
  }, [input]);
}
