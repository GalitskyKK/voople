const INSTALLER_ENV_NAME = "DESKTOP_INSTALLER_URL";

function getInstallerUrl() {
  const configuredUrl = process.env[INSTALLER_ENV_NAME]?.trim();
  if (!configuredUrl) return null;

  try {
    const url = new URL(configuredUrl);
    const allowsInsecureLocalUrl =
      process.env.NODE_ENV !== "production" &&
      url.protocol === "http:" &&
      ["127.0.0.1", "localhost"].includes(url.hostname);

    if (url.protocol !== "https:" && !allowsInsecureLocalUrl) return null;
    return url;
  } catch {
    return null;
  }
}

function unavailableResponse() {
  return Response.json(
    { error: "Desktop installer is temporarily unavailable." },
    {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export const dynamic = "force-dynamic";

export function GET() {
  const installerUrl = getInstallerUrl();
  if (!installerUrl) return unavailableResponse();

  return new Response(null, {
    status: 307,
    headers: {
      "Cache-Control": "no-store",
      Location: installerUrl.toString(),
    },
  });
}

export function HEAD() {
  return GET();
}
