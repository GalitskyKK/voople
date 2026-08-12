import { invoke } from "@tauri-apps/api/core";
import {
  isPermissionGranted,
  onAction,
  registerActionTypes,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

const OPEN_ACTION_TYPE = "voople-open";
let permissionRequest: Promise<boolean> | null = null;
let actionsRegistered = false;

export type DesktopNotificationInput = {
  id?: number;
  title: string;
  body: string;
  href: string;
  group?: string;
  sound?: boolean;
};

export function prepareDesktopNotifications() {
  permissionRequest ??= resolveNotificationPermission();
  return permissionRequest;
}

/** Re-check after the user changes Windows notification permissions. */
export function refreshDesktopNotificationPermission() {
  permissionRequest = null;
  return prepareDesktopNotifications();
}

export async function showDesktopNotification(input: DesktopNotificationInput) {
  try {
    if (!(await prepareDesktopNotifications())) return false;
    sendNotification({
      id: input.id,
      title: truncate(input.title, 80),
      body: truncate(input.body, 240),
      actionTypeId: actionsRegistered ? OPEN_ACTION_TYPE : undefined,
      group: input.group,
      extra: { href: input.href },
      autoCancel: true,
      silent: input.sound === false,
    });
    return true;
  } catch {
    permissionRequest = null;
    return false;
  }
}

export async function listenForDesktopNotificationActions(
  onNavigate: (href: string) => void,
) {
  const listener = await onAction((notification) => {
    const href = notification.extra?.href;
    if (typeof href !== "string" || !isSafeInternalHref(href)) return;
    void invoke<void>("show_main_window").catch(() => undefined);
    onNavigate(href);
  });
  return () => listener.unregister();
}

export function notificationId(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (Math.imul(hash, 31) + value.charCodeAt(index)) | 0;
  }
  return hash;
}

async function resolveNotificationPermission() {
  try {
    const granted = (await isPermissionGranted()) || (await requestPermission()) === "granted";
    if (granted && !actionsRegistered) {
      await registerActionTypes([
        {
          id: OPEN_ACTION_TYPE,
          actions: [{ id: "open", title: "Открыть", foreground: true }],
        },
      ]).then(
        () => { actionsRegistered = true; },
        () => undefined,
      );
    }
    return granted;
  } catch {
    permissionRequest = null;
    return false;
  }
}

function truncate(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength
    ? `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
    : normalized;
}

function isSafeInternalHref(value: string) {
  return /^\/(?:feed|explore|messages(?:\/[0-9a-f-]+)?|notifications|post\/[0-9a-f-]+|settings|shop|[a-z0-9_]+)$/i.test(value);
}
