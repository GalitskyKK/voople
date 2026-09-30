import {
  DESKTOP_UPDATE_REQUIRED,
  desktopRequestIdentity,
  desktopUpdateRequired,
} from "@/lib/http/desktop-compatibility";

/** Call only after the route has verified the authenticated user. */
export function authenticatedDesktopUpdateResponse(request: Request): Response | null {
  const identity = desktopRequestIdentity(request.headers, process.env.NODE_ENV !== "production");
  if (!desktopUpdateRequired(identity, process.env.VOOPLE_MIN_DESKTOP_VERSION)) return null;
  return Response.json({ code: DESKTOP_UPDATE_REQUIRED, error: "Требуется обновление Voople" }, {
    status: 426,
    headers: { "Cache-Control": "no-store" },
  });
}
