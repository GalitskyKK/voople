import { expireGroupRoomGrace } from "@/server/services/chat.service";
import { expireCoreDirectCalls } from "@/server/services/chat-core-direct-calls.service";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await expireGroupRoomGrace(100);
    const coreEnabled = (process.env.VOOPLE_SERVER_CAPABILITIES ?? "")
      .split(",").some((value) => value.trim().toLowerCase() === "core_direct_calls");
    const core = coreEnabled ? await expireCoreDirectCalls() : null;
    return Response.json({ ...result, coreDirectCalls: core?.expired ?? 0 });
  } catch {
    return Response.json({ error: "Room maintenance failed" }, { status: 500 });
  }
}
