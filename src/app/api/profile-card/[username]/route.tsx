import { ImageResponse } from "next/og";
import sharp from "sharp";

/* eslint-disable @next/next/no-img-element -- ImageResponse/Satori renders remote assets from plain img nodes. */

import { getProfileByUsername } from "@/server/services/profile.service";
import { listProfileReactions } from "@/server/services/profile-reactions.service";
import { listUserBadges } from "@/server/services/engagement.service";
import { getBadge } from "@/lib/badges/registry";

export const dynamic = "force-dynamic";

function initial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "V";
}

type ImageFit = "cover" | "contain" | "fill";

async function imageAsPngDataUrl(
  url: string | null | undefined,
  width: number,
  height: number,
  fit: ImageFit,
): Promise<string | null> {
  if (!url) return null;
  try {
    const response = await fetch(url, { next: { revalidate: 300 } });
    if (!response.ok) return null;
    const input = Buffer.from(await response.arrayBuffer());
    const png = await sharp(input, { animated: false })
      .resize(width, height, { fit, withoutEnlargement: false })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    // A broken cosmetic asset must not prevent the user from exporting a card.
    return null;
  }
}

async function frameAsNineSliceDataUrl(
  url: string | null | undefined,
  sourceSlice: number | null | undefined,
  width: number,
  height: number,
  border: number,
): Promise<string | null> {
  if (!url) return null;
  try {
    const response = await fetch(url, { next: { revalidate: 300 } });
    if (!response.ok) return null;
    const input = Buffer.from(await response.arrayBuffer());
    const metadata = await sharp(input, { animated: false }).metadata();
    if (!metadata.width || !metadata.height) return null;
    const slice = Math.max(1, Math.min(Math.round(sourceSlice ?? 96), Math.floor(metadata.width / 2), Math.floor(metadata.height / 2)));
    const middleWidth = Math.max(1, metadata.width - slice * 2);
    const middleHeight = Math.max(1, metadata.height - slice * 2);
    const targetMiddleWidth = Math.max(1, width - border * 2);
    const targetMiddleHeight = Math.max(1, height - border * 2);
    const piece = (left: number, top: number, partWidth: number, partHeight: number, targetWidth: number, targetHeight: number) =>
      sharp(input, { animated: false }).extract({ left, top, width: partWidth, height: partHeight }).resize(targetWidth, targetHeight, { fit: "fill" }).png().toBuffer();
    const [topLeft, top, topRight, left, right, bottomLeft, bottom, bottomRight] = await Promise.all([
      piece(0, 0, slice, slice, border, border),
      piece(slice, 0, middleWidth, slice, targetMiddleWidth, border),
      piece(metadata.width - slice, 0, slice, slice, border, border),
      piece(0, slice, slice, middleHeight, border, targetMiddleHeight),
      piece(metadata.width - slice, slice, slice, middleHeight, border, targetMiddleHeight),
      piece(0, metadata.height - slice, slice, slice, border, border),
      piece(slice, metadata.height - slice, middleWidth, slice, targetMiddleWidth, border),
      piece(metadata.width - slice, metadata.height - slice, slice, slice, border, border),
    ]);
    const png = await sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([
        { input: topLeft, left: 0, top: 0 }, { input: top, left: border, top: 0 }, { input: topRight, left: width - border, top: 0 },
        { input: left, left: 0, top: border }, { input: right, left: width - border, top: border },
        { input: bottomLeft, left: 0, top: height - border }, { input: bottom, left: border, top: height - border }, { input: bottomRight, left: width - border, top: height - border },
      ])
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ username: string }> },
) {
  const { username } = await context.params;
  const profile = await getProfileByUsername(decodeURIComponent(username));
  if (!profile) return new Response("Profile not found", { status: 404 });

  const [reactions, badgeIds] = await Promise.all([
    listProfileReactions(profile.id, null),
    listUserBadges(profile.id),
  ]);
  const { customization } = profile;
  const scene = new URL(request.url).searchParams.get("scene") ?? "midnight";
  const bannerSource = customization.assets.bannerMedia.kind === "video"
    ? customization.assets.bannerMedia.posterUrl
    : customization.assets.bannerMedia.kind === "image"
      ? customization.assets.bannerMedia.imageUrl
      : customization.assets.bannerUrl;
  const cardWidth = 830;
  const cardHeight = 970;
  const [avatarUrl, decorationUrl, bannerUrl, frameUrl, dividerUrl] = await Promise.all([
    imageAsPngDataUrl(customization.assets.animatedAvatarUrl, 176, 176, "cover"),
    imageAsPngDataUrl(customization.assets.avatarDecorationUrl, 244, 244, "contain"),
    imageAsPngDataUrl(bannerSource, cardWidth, 280, "cover"),
    frameAsNineSliceDataUrl(customization.assets.frame?.imageUrl, customization.assets.frame?.imageSlice, cardWidth, cardHeight, 16),
    imageAsPngDataUrl(customization.assets.frame?.dividerUrl, cardWidth, 90, "contain"),
  ]);
  const primary = customization.themePrimary || "#17151f";
  const accent = customization.themeAccent || "#8b7ec8";
  const nameColor = customization.displayName.color || "#ffffff";
  const totalReactions = reactions.reduce((sum, reaction) => sum + reaction.count, 0);
  const badges = badgeIds.map(getBadge).filter((badge) => badge !== null).slice(0, 6);
  const sceneBackground = scene === "aurora"
    ? "radial-gradient(circle at 75% 18%, #58d8bd 0%, transparent 34%), radial-gradient(circle at 8% 80%, #7464ef 0%, transparent 40%), #10141e"
    : scene === "paper"
      ? "radial-gradient(circle at 72% 18%, #d4c4ff 0%, transparent 35%), linear-gradient(145deg, #f5f2fa, #dfe7f1)"
      : `radial-gradient(circle at 15% 10%, ${accent}55, transparent 38%), linear-gradient(145deg, #09090d, ${primary})`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 64,
          color: "#f7f7fb",
          fontFamily: "sans-serif",
          background: sceneBackground,
        }}
      >
        <div style={{ position: "absolute", left: 72, top: 62, display: "flex", fontSize: 20, fontWeight: 700, letterSpacing: 3, color: "#ffffff77" }}>
          VOOPLE / PROFILE
        </div>
        <div
          style={{
            position: "relative",
            width: cardWidth,
            height: cardHeight,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRadius: 48,
            background: "transparent",
            boxShadow: "0 34px 82px #00000055",
          }}
        >
          <div
            style={{
              height: 280,
              width: "100%",
              display: "flex",
              backgroundImage: bannerUrl
                ? `linear-gradient(180deg, transparent 45%, #0c0c12cc), url("${bannerUrl}")`
                : `radial-gradient(circle at 75% 15%, ${accent}, transparent 38%), linear-gradient(135deg, ${primary}, ${accent}88)`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />

          {dividerUrl ? <img src={dividerUrl} alt="" width={cardWidth} height={90} style={{ position: "absolute", left: 0, top: 254, width: cardWidth, height: 90, objectFit: "contain" }} /> : null}

          <div style={{ display: "flex", flex: 1, flexDirection: "column", marginTop: 18, padding: "0 54px 34px", borderRadius: 38, background: "#0c0c12ee" }}>
            <div style={{ position: "relative", zIndex: 3, width: 176, height: 176, marginTop: -60, display: "flex" }}>
              <div
                style={{
                  width: 176,
                  height: 176,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  borderRadius: 999,
                  border: `8px solid ${accent}`,
                  background: `linear-gradient(135deg, ${accent}, ${primary})`,
                  fontSize: 72,
                  fontWeight: 800,
                }}
              >
                {avatarUrl ? <img src={avatarUrl} alt="" width={176} height={176} style={{ width: 176, height: 176, objectFit: "cover" }} /> : initial(profile.displayName)}
              </div>
              {decorationUrl ? (
                <img
                  src={decorationUrl}
                  alt=""
                  width={244}
                  height={244}
                  style={{ position: "absolute", left: -34, top: -34, width: 244, height: 244, objectFit: "contain" }}
                />
              ) : null}
            </div>

            <div style={{ position: "relative", zIndex: 3, display: "flex", flexDirection: "column", marginTop: 20 }}>
              <div style={{ fontSize: 48, fontWeight: 850, letterSpacing: -1.5, color: nameColor }}>
                {profile.displayName}
              </div>
              <div style={{ display: "flex", marginTop: 3, fontSize: 24, color: "#ffffff88" }}>@{profile.username}</div>
              {badges.length > 0 ? <div style={{ display: "flex", gap: 8, marginTop: 12 }}>{badges.map((badge) => <span key={badge.id} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 999, background: "#ffffff10", fontSize: 17 }}>{badge.emoji}</span>)}</div> : null}
            </div>

            {profile.status.thought ? (
              <div
                style={{
                  display: "flex",
                  position: "relative",
                  zIndex: 3,
                  marginTop: 24,
                  padding: "18px 22px",
                  borderRadius: 24,
                  background: "#ffffff0d",
                  border: "1px solid #ffffff1a",
                  fontSize: 25,
                  lineHeight: 1.35,
                }}
              >
                “{profile.status.thought.slice(0, 120)}”
              </div>
            ) : null}

            {profile.status.trackTitle || profile.status.trackArtist ? (
              <div style={{ position: "relative", zIndex: 3, display: "flex", alignItems: "center", marginTop: 14, padding: "14px 18px", borderRadius: 16, background: "#ffffff0d", fontSize: 21, color: "#ffffffaa" }}>
                <span style={{ marginRight: 12, color: accent }}>♪</span>
                <span>{[profile.status.trackArtist, profile.status.trackTitle].filter(Boolean).join(" — ")}</span>
              </div>
            ) : null}

            <div style={{ position: "relative", zIndex: 3, display: "flex", gap: 14, marginTop: "auto" }}>
              {[
                [profile.stats.posts, "постов"],
                [profile.stats.followers, "читателей"],
                [totalReactions, "реакций"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    padding: "16px 18px",
                    borderRadius: 22,
                    background: "#ffffff0b",
                  }}
                >
                  <span style={{ fontSize: 30, fontWeight: 800 }}>{value}</span>
                  <span style={{ marginTop: 3, fontSize: 17, color: "#ffffff77" }}>{label}</span>
                </div>
              ))}
            </div>
            <div style={{ position: "relative", zIndex: 3, display: "flex", justifyContent: "space-between", marginTop: 24, fontSize: 18, color: "#ffffff66" }}>
              <span>Мой вайб в Voople</span>
              <span>voople.ru/{profile.username}</span>
            </div>
          </div>
          {frameUrl ? (
            <img
              src={frameUrl}
              alt=""
              width={830}
              height={1120}
              style={{ position: "absolute", inset: 0, zIndex: 2, width: "100%", height: "100%", objectFit: "fill" }}
            />
          ) : null}
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
      emoji: "twemoji",
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        "Content-Disposition": `inline; filename="voople-${profile.username}.png"`,
      },
    },
  );
}
