import {
  PRODUCT_SOUND_IDS, SOUND_POLICY, productSoundAsset,
  type LoopSoundId, type ProductSoundId, type SoundPackId,
} from "./sound-catalog";

type ActiveSound = { source: AudioBufferSourceNode; gain: GainNode };
type LastSound = { id: ProductSoundId; at: number; priority: number };
export type SoundSession = { stop: () => void };

export class SoundEngine {
  private context: AudioContext | null = null;
  private buffers = new Map<string, Promise<AudioBuffer>>();
  private lastPlayed = new Map<string, LastSound>();
  private active = new Map<string, ActiveSound>();
  private generation = new Map<string, number>();
  private loops = new Map<string, { id: LoopSoundId; pack: SoundPackId; session: SoundSession }>();

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

  async preload(pack: SoundPackId = "default") {
    try {
      const context = this.getContext();
      if (!context) return;
      await Promise.allSettled(PRODUCT_SOUND_IDS.map((id) => this.load(productSoundAsset(pack, id), context)));
    } catch { /* Decoding is optional. */ }
  }

  private stopActive(group: string) {
    const active = this.active.get(group);
    if (!active) return;
    this.active.delete(group);
    try { active.source.stop(); } catch { /* Already ended. */ }
    active.source.disconnect();
    active.gain.disconnect();
  }

  private startSource(context: AudioContext, group: string, buffer: AudioBuffer, level: number) {
    this.stopActive(group);
    if (this.active.size >= 3 && group.startsWith("call.")) {
      const lowerPriority = [...this.active.keys()].find((key) => !key.startsWith("call."));
      if (lowerPriority) this.stopActive(lowerPriority);
    }
    if (this.active.size >= 3) return;
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    gain.gain.value = level;
    source.connect(gain);
    gain.connect(context.destination);
    const active = { source, gain };
    this.active.set(group, active);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      if (this.active.get(group) === active) this.active.delete(group);
    };
    source.start();
  }

  async play(id: ProductSoundId, pack: SoundPackId = "default"): Promise<void> {
    const sound = SOUND_POLICY[id];
    if (sound.repeatMs) return;
    try {
      const context = this.getContext();
      if (!context) return;
      const now = performance.now();
      const previous = this.lastPlayed.get(sound.group);
      if (previous && now - previous.at < sound.cooldownMs) {
        if (sound.coalesce === "group") return;
        if (sound.coalesce === "same" && previous.id === id) return;
        if (sound.coalesce === "priority" && previous.priority >= (sound.priority ?? 0)) return;
      }
      this.lastPlayed.set(sound.group, { id, at: now, priority: sound.priority ?? 0 });
      const generation = (this.generation.get(sound.group) ?? 0) + 1;
      this.generation.set(sound.group, generation);
      if (sound.category === "call") this.loops.get("call.ring")?.session.stop();
      const buffer = await this.load(productSoundAsset(pack, id), context);
      if (this.generation.get(sound.group) !== generation) return;
      if (context.state === "suspended") await context.resume();
      if (context.state !== "running") return;
      if (this.generation.get(sound.group) === generation) this.startSource(context, sound.group, buffer, sound.gain);
    } catch {
      // Earcons are optional. Autoplay and network failures cannot block an action.
    }
  }

  startLoop(id: LoopSoundId, pack: SoundPackId = "default"): SoundSession {
    const sound = SOUND_POLICY[id];
    const existing = this.loops.get(sound.group);
    if (existing?.id === id && existing.pack === pack) return existing.session;
    existing?.session.stop();
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const session: SoundSession = { stop: () => {
      if (!alive) return;
      alive = false;
      if (timer) clearTimeout(timer);
      if (this.loops.get(sound.group)?.session === session) this.loops.delete(sound.group);
      this.stopActive(sound.group);
    } };
    this.loops.set(sound.group, { id, pack, session });
    const tick = async () => {
      try {
        const context = this.getContext();
        if (!context || !alive) return;
        const buffer = await this.load(productSoundAsset(pack, id), context);
        if (!alive) return;
        if (context.state === "suspended") await context.resume();
        if (!alive) return;
        if (context.state === "running") this.startSource(context, sound.group, buffer, sound.gain);
      } catch { /* A blocked ringtone cannot interrupt call UI. */ }
      if (alive) timer = setTimeout(() => { void tick(); }, sound.repeatMs);
    };
    void tick();
    return session;
  }

  stopLoop(id: LoopSoundId) {
    const current = this.loops.get(SOUND_POLICY[id].group);
    if (current?.id === id) current.session.stop();
  }
}

export const soundEngine = new SoundEngine();
