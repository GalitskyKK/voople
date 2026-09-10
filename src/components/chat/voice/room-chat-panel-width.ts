export const ROOM_CHAT_PANEL_DEFAULT_WIDTH = 360;
export const ROOM_CHAT_PANEL_MIN_WIDTH = 320;
export const ROOM_CHAT_PANEL_MAX_WIDTH = 480;

export const clampRoomChatPanelWidth = (value: number) =>
  Math.min(
    ROOM_CHAT_PANEL_MAX_WIDTH,
    Math.max(ROOM_CHAT_PANEL_MIN_WIDTH, Math.round(value)),
  );
