export const PRESENCE_VISIBILITY_EVENT = "voople:presence-visibility";

export function shouldPublishPresence(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return true;
  return (metadata as { show_online_status?: unknown }).show_online_status !== false;
}

export function announcePresenceVisibility(enabled: boolean) {
  window.dispatchEvent(
    new CustomEvent<boolean>(PRESENCE_VISIBILITY_EVENT, { detail: enabled }),
  );
}
