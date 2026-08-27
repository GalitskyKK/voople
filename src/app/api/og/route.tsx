import { ImageResponse } from "next/og";

const BG = "#0C0C11";
const ACCENT = "#8B7EC8";
const MAX_TITLE = 60;
const MAX_SUBTITLE = 120;

function clamp(value: string | null, max: number): string {
  if (!value) return "";
  const trimmed = value.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

/**
 * Динамическая OG-картинка для шаринга (1200×630).
 * Параметры: `title` (имя/заголовок), `subtitle` (@username / подпись),
 * `badge` (мелкая плашка-категория, напр. «Анонимные вопросы»).
 */
export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = clamp(searchParams.get("title"), MAX_TITLE) || "Voople";
  const subtitle = clamp(searchParams.get("subtitle"), MAX_SUBTITLE);
  const badge = clamp(searchParams.get("badge"), 40);

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: `radial-gradient(120% 120% at 80% 0%, ${ACCENT}33 0%, ${BG} 55%)`,
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: ACCENT,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 800,
            }}
          >
            V
          </div>
          <span style={{ fontSize: 30, fontWeight: 700, color: "#ffffffcc" }}>Voople</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {badge ? (
            <span
              style={{
                alignSelf: "flex-start",
                padding: "8px 18px",
                borderRadius: 9999,
                background: `${ACCENT}33`,
                color: ACCENT,
                fontSize: 26,
                fontWeight: 600,
              }}
            >
              {badge}
            </span>
          ) : null}
          <span style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05 }}>{title}</span>
          {subtitle ? (
            <span style={{ fontSize: 38, color: "#ffffff99", fontWeight: 500 }}>{subtitle}</span>
          ) : null}
        </div>

        <span style={{ fontSize: 28, color: "#ffffff66" }}>voople.ru</span>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
