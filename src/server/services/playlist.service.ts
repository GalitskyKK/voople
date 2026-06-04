import { getProfileByUsername } from "@/server/services/profile.service";
import {
  addTrackFromChatMessageRest,
  addTrackFromChatRest,
  createTrackFromUploadRest,
  deletePlaylistTrackRest,
  listPlaylistForUserRest,
  setUserAnthemRest,
} from "@/server/data/playlist-rest";

export async function getPlaylistByUsername(username: string) {
  const profile = await getProfileByUsername(username);
  if (!profile) throw new Error("Профиль не найден");
  return listPlaylistForUserRest(profile.id);
}

export async function getPlaylistForUser(userId: string) {
  return listPlaylistForUserRest(userId);
}

export {
  addTrackFromChatMessageRest as addTrackFromChatMessage,
  addTrackFromChatRest as addTrackFromChat,
  createTrackFromUploadRest as createTrackFromUpload,
  deletePlaylistTrackRest as deleteTrack,
  setUserAnthemRest as setAnthem,
};
