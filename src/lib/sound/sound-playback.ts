import { readAppPreferences } from "@/lib/app-preferences";
import { soundEngine } from "./sound-engine";
import type { LoopSoundId, ProductSoundId, SoundPackId } from "./sound-catalog";

export function playProductSound(id: ProductSoundId) {
  return soundEngine.play(id, readAppPreferences().soundPack);
}

export function startProductSoundLoop(id: LoopSoundId) {
  return soundEngine.startLoop(id, readAppPreferences().soundPack);
}

export function stopProductSoundLoop(id: LoopSoundId) {
  soundEngine.stopLoop(id);
}

export function preloadProductSounds(pack?: SoundPackId) {
  return soundEngine.preload(pack ?? readAppPreferences().soundPack);
}

/** External Group media remains an HTML media element and never enters the trusted buffer cache. */
export function playExternalSound(url: string, options: { category: "soundboard"; gain?: number }) {
  if (options.category !== "soundboard") throw new Error("Unsupported external sound category");
  const audio = new Audio(url);
  audio.volume = Math.min(1, Math.max(0, options.gain ?? 0.8));
  let settled = false;
  let resolveCompletion!: () => void;
  let rejectCompletion!: (reason: Error) => void;
  const completed = new Promise<void>((resolve, reject) => { resolveCompletion = resolve; rejectCompletion = reject; });
  const cleanup = () => {
    audio.removeEventListener("ended", onEnded);
    audio.removeEventListener("error", onError);
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  };
  const onEnded = () => { if (!settled) { settled = true; cleanup(); resolveCompletion(); } };
  const onError = () => { if (!settled) { settled = true; cleanup(); rejectCompletion(new Error("Не удалось воспроизвести звук группы")); } };
  audio.addEventListener("ended", onEnded);
  audio.addEventListener("error", onError);
  void audio.play().catch(onError);
  return {
    completed,
    stop: () => { if (!settled) { settled = true; cleanup(); resolveCompletion(); } },
  };
}
