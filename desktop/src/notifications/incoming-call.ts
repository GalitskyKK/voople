import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

import type { IncomingCallView } from "@/types/chat";

let permissionRequest: Promise<boolean> | null = null;

export function prepareDesktopNotifications() {
  permissionRequest ??= resolveNotificationPermission();
  return permissionRequest;
}

export async function notifyIncomingCall(call: IncomingCallView) {
  try {
    if (!(await prepareDesktopNotifications())) return;
    sendNotification({
      title: "Входящий звонок",
      body: `${call.caller.displayName} звонит вам в Voople`,
    });
  } catch {
    permissionRequest = null;
  }
}

async function resolveNotificationPermission() {
  try {
    if (await isPermissionGranted()) return true;
    return (await requestPermission()) === "granted";
  } catch {
    permissionRequest = null;
    return false;
  }
}
