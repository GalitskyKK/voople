import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0A0A0F",
          color: "#7B3AED",
          fontSize: 48,
          fontWeight: 700,
        }}
      >
        Voople
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
