export type PlaylistTrackView = {
  id: string;
  title: string;
  artist: string;
  streamUrl: string;
  durationSeconds: number | null;
};

export type UserPlaylistView = {
  userId: string;
  anthemTrackId: string | null;
  tracks: PlaylistTrackView[];
};
