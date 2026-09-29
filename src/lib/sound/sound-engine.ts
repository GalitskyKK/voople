import { SOUND_CATALOG, type ProductSoundId } from "./sound-catalog";

type ActiveSound = { source: AudioBufferSourceNode; gain: GainNode };

export class SoundEngine {
  private context: AudioContext | null = null;
  private buffers = new Map<string, Promise<AudioBuffer>>();
  private lastPlayed = new Map<string, number>();
  private active = new Map<string, ActiveSound>();
  private generation = new Map<string, number>();

  private getContext() {
    if (typeof window === "undefined" || typeof AudioContext === "undefined") return null;
    this.context ??= new AudioContext();
    return this.context;
  }

  private load(src: string, context: AudioContext) {
    let pending = this.buffers.get(src);
    if (!pending) {
      pending = fetch(src).then((response) => {
        if (!response.ok) throw new Error(`Sound asset unavailable: ${response.status}`);
        return response.arrayBuffer();
      }).then((data) => context.decodeAudioData(data));
      this.buffers.set(src, pending);
      void pending.catch(() => { if (this.buffers.get(src) === pending) this.buffers.delete(src); });
    }
    return pending;
  }

  async preload() {
    const context = this.getContext();
    if (!context) return;
    await Promise.allSettled(Object.values(SOUND_CATALOG).map((sound) => this.load(sound.src, context)));
  }

  async play(id: ProductSoundId): Promise<void> {
    const sound = SOUND_CATALOG[id];
    const context = this.getContext();
    if (!context) return;
    const now = performance.now();
    // A shared presence group prevents simultaneous join/leave bursts.
    if (now - (this.lastPlayed.get(sound.group) ?? -Infinity) < sound.cooldownMs) return;
    this.lastPlayed.set(sound.group, now);
    const generation = (this.generation.get(sound.group) ?? 0) + 1;
    this.generation.set(sound.group, generation);
    try {
      const buffer = await this.load(sound.src, context);
      if (this.generation.get(sound.group) !== generation) return;
      if (context.state === "suspended") await context.resume();
      if (context.state !== "running") return;
      const previous = this.active.get(sound.group);
      if (previous) {
        previous.source.stop();
        previous.source.disconnect();
        previous.gain.disconnect();
      }
      // Bound independent groups too, including rapid category changes.
      if (this.active.size >= 3 && !previous) return;
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      gain.gain.value = sound.gain;
      source.connect(gain);
      gain.connect(context.destination);
      const active = { source, gain };
      this.active.set(sound.group, active);
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
        if (this.active.get(sound.group) === active) this.active.delete(sound.group);
      };
      source.start();
    } catch {
      // Earcons are optional. Autoplay and network failures cannot block an action.
    }
  }
}

export const soundEngine = new SoundEngine();
