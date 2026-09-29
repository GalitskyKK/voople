import type { ProductSoundId } from "@/lib/sound/sound-catalog";

/** Native sound owns background events; the focused renderer owns its own cues. */
export function notificationAudioPolicy(input: {
  enabled: boolean;
  focused: boolean;
  visible: boolean;
  sound: ProductSoundId;
}) {
  if (!input.enabled) return { nativeSound: false, customSound: null };
  if (input.focused && input.visible) return { nativeSound: false, customSound: input.sound };
  return { nativeSound: true, customSound: null };
}
