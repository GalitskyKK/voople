export const ROOM_GUEST_COOKIE = "voople_room_guest";
export const ROOM_GUEST_COOKIE_MAX_AGE_SECONDS = 6 * 60 * 60;

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
