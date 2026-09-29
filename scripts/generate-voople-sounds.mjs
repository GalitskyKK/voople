import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const SAMPLE_RATE = 48_000;
const OUTPUT = join(dirname(fileURLToPath(import.meta.url)), "../public/sounds/packs");

export const PACK_STYLES = {
  default: { pitchRatio: 1, durationScale: 1, attackScale: 1, harmonicScale: 1, airScale: 1, echoLevel: 0, echoDelayMs: 0, lowBody: 0 },
  halo: { pitchRatio: 1.015, durationScale: 1.08, attackScale: 1.3, harmonicScale: 0.8, airScale: 1.5, echoLevel: 0.14, echoDelayMs: 18, lowBody: 0 },
  velvet: { pitchRatio: 0.91, durationScale: 1.04, attackScale: 1.8, harmonicScale: 0.42, airScale: 0.58, echoLevel: 0.06, echoDelayMs: 11, lowBody: 0.17 },
};

// Related pitches and matching envelopes make these cues a single family.
export const SOUNDS = {
  "room-join": { durationMs: 205, notes: [[392, 440, 0, 0.68], [588, 660, 48, 0.32]], attackMs: 13, airAmount: 0.015, brightness: 0.12 },
  "room-leave": { durationMs: 194, notes: [[440, 392, 0, 0.66], [330, 294, 42, 0.28]], attackMs: 14, airAmount: 0.011, brightness: 0.09 },
  "room-mute": { durationMs: 101, notes: [[392, 330, 0, 0.69]], attackMs: 7, airAmount: 0.011, brightness: 0.08 },
  "room-unmute": { durationMs: 112, notes: [[330, 392, 0, 0.67]], attackMs: 7, airAmount: 0.014, brightness: 0.12 },
  "room-deafen": { durationMs: 169, notes: [[392, 294, 0, 0.62], [294, 247, 33, 0.25]], attackMs: 12, airAmount: 0.009, brightness: 0.07 },
  "room-undeafen": { durationMs: 186, notes: [[294, 392, 0, 0.60], [440, 588, 37, 0.24]], attackMs: 12, airAmount: 0.014, brightness: 0.11 },
  "notification-message": { durationMs: 137, notes: [[440, 466, 0, 0.62]], attackMs: 9, airAmount: 0.014, brightness: 0.11 },
  "notification-mention": { durationMs: 196, notes: [[440, 466, 0, 0.56], [588, 622, 62, 0.27]], attackMs: 9, airAmount: 0.014, brightness: 0.12 },
  "notification-social": { durationMs: 105, notes: [[392, 392, 0, 0.48]], attackMs: 8, airAmount: 0.008, brightness: 0.07 },
  "call-incoming": { durationMs: 1250, notes: [[392, 440, 0, 0.52, 340], [588, 622, 410, 0.35, 310], [440, 523, 820, 0.42, 320]], attackMs: 19, airAmount: 0.012, brightness: 0.10 },
  "call-outgoing": { durationMs: 850, notes: [[330, 392, 0, 0.43, 270], [392, 440, 445, 0.30, 285]], attackMs: 22, airAmount: 0.009, brightness: 0.08 },
  "call-connected": { durationMs: 210, notes: [[392, 523, 0, 0.59], [588, 660, 62, 0.25]], attackMs: 12, airAmount: 0.012, brightness: 0.11 },
  "call-ended": { durationMs: 205, notes: [[440, 330, 0, 0.56], [330, 294, 50, 0.22]], attackMs: 15, airAmount: 0.008, brightness: 0.07 },
  "call-declined": { durationMs: 255, notes: [[440, 392, 0, 0.48, 150], [392, 294, 95, 0.33, 145]], attackMs: 17, airAmount: 0.009, brightness: 0.08 },
};

function envelope(timeMs, durationMs, attackMs) {
  if (timeMs <= 0 || timeMs >= durationMs) return 0;
  const attack = Math.min(1, timeMs / attackMs);
  const decay = Math.pow(1 - timeMs / durationMs, 2.6);
  const release = Math.min(1, (durationMs - timeMs) / 12);
  return Math.sin(attack * Math.PI / 2) * decay * release;
}

function oscillator(time, start, end, duration) {
  const slope = (end - start) / duration;
  return Math.sin(2 * Math.PI * (start * time + slope * time * time / 2));
}

export function renderSound(spec, seed, pack = "default") {
  const style = PACK_STYLES[pack];
  if (!style) throw new Error(`Unknown sound pack: ${pack}`);
  const totalMs = spec.durationMs * style.durationScale;
  const count = Math.round(SAMPLE_RATE * totalMs / 1000);
  const pcm = Buffer.alloc(count * 2);
  let randomState = seed;
  let filteredNoise = 0;
  for (let index = 0; index < count; index += 1) {
    const timeMs = index * 1000 / SAMPLE_RATE;
    let sample = 0;
    for (const [start, end, delayMs, level, noteDurationMs] of spec.notes) {
      const onset = delayMs * style.durationScale;
      const noteMs = (noteDurationMs ?? spec.durationMs - delayMs) * style.durationScale;
      for (const [offsetMs, layerLevel] of [[0, 1], [style.echoDelayMs, style.echoLevel]]) {
        if (layerLevel === 0) continue;
        const localMs = timeMs - onset - offsetMs;
        if (localMs <= 0 || localMs >= noteMs) continue;
        const localTime = localMs / 1000;
        const startHz = start * style.pitchRatio;
        const endHz = end * style.pitchRatio;
        const body = oscillator(localTime, startHz, endHz, noteMs / 1000);
        const partial = oscillator(localTime, startHz * 2, endHz * 2, noteMs / 1000);
        const lowBody = oscillator(localTime, startHz * 0.5, endHz * 0.5, noteMs / 1000);
        sample += level * layerLevel * envelope(localMs, noteMs, spec.attackMs * style.attackScale)
          * (body + spec.brightness * style.harmonicScale * partial + style.lowBody * lowBody);
      }
    }
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
    const noise = randomState / 0xffffffff * 2 - 1;
    filteredNoise += 0.16 * (noise - filteredNoise);
    const transient = Math.exp(-timeMs / 19) * Math.sin(Math.min(1, timeMs / 3) * Math.PI / 2);
    sample += spec.airAmount * style.airScale * filteredNoise * transient;
    // Ample headroom in the file; catalog gain trims it further in playback.
    pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample * 0.55)) * 32767), index * 2);
  }
  pcm.writeInt16LE(0, 0);
  pcm.writeInt16LE(0, pcm.length - 2);
  return pcm;
}

function wav(pcm) {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  for (const pack of Object.keys(PACK_STYLES)) {
    const directory = join(OUTPUT, pack);
    await mkdir(directory, { recursive: true });
    for (const [name, spec] of Object.entries(SOUNDS)) {
      const seedName = pack === "default" ? name : `${pack}:${name}`;
      const seed = [...seedName].reduce((value, letter) => Math.imul(value ^ letter.charCodeAt(0), 16777619) >>> 0, 2166136261);
      await writeFile(join(directory, `${name}.wav`), wav(renderSound(spec, seed, pack)));
    }
  }
}
