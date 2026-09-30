import type { IncomingCallView } from "@/types/chat";
import { incomingCallKey } from "@/lib/chat/direct-call-state";

import {
  notificationId,
  showDesktopNotification,
} from "./native";

export { prepareDesktopNotifications } from "./native";

export async function notifyIncomingCall(
  call: IncomingCallView,
  sound = true,
) {
  await showDesktopNotification({
    id: notificationId(`call:${incomingCallKey(call)}`),
    title: "Входящий звонок",
    body: `${call.caller.displayName} звонит вам в Voople`,
    href: `/messages/${call.chatId}`,
    group: `call:${call.chatId}`,
    sound,
  });
}
