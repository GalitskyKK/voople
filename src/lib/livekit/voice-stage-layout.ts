export type VoiceStageSelection = { screenKey: string; focusedMediaId: string | null; layout: "focus" | "grid" };

export function resolveVoiceStageLayout(screenKey: string, screenOwner: string | null, cameras: ReadonlySet<string>, selection: VoiceStageSelection | null) {
  const current = selection?.screenKey === screenKey ? selection : null;
  const requested = current?.focusedMediaId;
  const focusedMediaId = requested === "screen" && screenOwner ? "screen"
    : requested && cameras.has(requested) ? requested : screenOwner ? "screen" : [...cameras][0] ?? null;
  return { focusedMediaId, layout: current?.layout ?? (screenOwner ? "focus" : "grid") } as const;
}
