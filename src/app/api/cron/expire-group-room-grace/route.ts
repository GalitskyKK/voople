import { expireGroupRoomGrace } from "@/server/services/chat.service";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await expireGroupRoomGrace(100);
    return Response.json(result);
  } catch {
    return Response.json({ error: "Room maintenance failed" }, { status: 500 });
  }
}
