export type LinkSafetyStatus = "safe" | "unsafe" | "unknown";

export type LinkSafetyVerdict = {
  status: LinkSafetyStatus;
  normalizedUrl: string;
  displayHost: string;
  asciiHost: string;
  threats: string[];
  expiresAt: string;
  provider: "google-web-risk" | "unavailable";
};
