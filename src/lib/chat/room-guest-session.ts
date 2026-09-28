export const ROOM_GUEST_COOKIE = "voople_room_guest";
export const ROOM_GUEST_COOKIE_MAX_AGE_SECONDS = 6 * 60 * 60;

export function roomGuestAccessToken(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const value = cookie.split(";").map((part) => part.trim()).find((part) =>
    part.startsWith(`${ROOM_GUEST_COOKIE}=`),
  )?.slice(ROOM_GUEST_COOKIE.length + 1);
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export function roomGuestCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/api/room-guests",
    maxAge: ROOM_GUEST_COOKIE_MAX_AGE_SECONDS,
    priority: "high" as const,
  };
}
