/** Local-only media diagnostics. Never include credentials or media URLs. */
export function traceVoiceMic(phase: string, details: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "development") return;
  console.info("[voople:mic]", phase, details);
}
