import { useEffect } from "react";

import { reportProductEvent } from "@/lib/telemetry/client";

export function useChatOpenedTelemetry(chatId: string) {
  useEffect(() => reportProductEvent("chat_opened", { surface: "conversation" }), [chatId]);
}
