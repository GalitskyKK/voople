import {
  LocalAudioTrack,
  Track,
  type AudioProcessorOptions,
  type Room,
  type TrackProcessor,
} from "livekit-client";

const PROCESSOR_NAME = "voople-voice-processor";
const WORKLET_URL = "/audio/rnnoise-worklet.js";
const WASM_URL = "/audio/rnnoise.wasm";
const WASM_SIMD_URL = "/audio/rnnoise-simd.wasm";
const workletLoads = new WeakMap<AudioContext, Promise<void>>();
let wasmBinary: Promise<ArrayBuffer> | null = null;
let rnnoiseModule: Promise<typeof import("@sapphi-red/web-noise-suppressor")> | null = null;

function loadRnnoiseModule() {
  rnnoiseModule ??= import("@sapphi-red/web-noise-suppressor");
  return rnnoiseModule;
}

function loadWorklet(context: AudioContext) {
  const existing = workletLoads.get(context);
  if (existing) return existing;
  const loading = context.audioWorklet.addModule(WORKLET_URL);
  workletLoads.set(context, loading);
  return loading;
}

function loadWasm() {
  wasmBinary ??= loadRnnoiseModule().then(({ loadRnnoise }) =>
    loadRnnoise({ url: WASM_URL, simdUrl: WASM_SIMD_URL }),
  );
  return wasmBinary;
}

class VoiceTrackProcessor
  implements TrackProcessor<Track.Kind.Audio, AudioProcessorOptions>
{
  readonly name = PROCESSOR_NAME;
  processedTrack?: MediaStreamTrack;
  private source?: MediaStreamAudioSourceNode;
  private node?: AudioWorkletNode & { destroy: () => void };
  private gain?: GainNode;
  private destination?: MediaStreamAudioDestinationNode;

  constructor(
    private rnnoiseEnabled: boolean,
    private microphoneGain: number,
  ) {}

  async init(options: AudioProcessorOptions) {
    if (options.audioContext.sampleRate !== 48_000) {
      throw new Error("RNNoise требует частоту звука 48 кГц");
    }
    this.source = options.audioContext.createMediaStreamSource(
      new MediaStream([options.track]),
    );
    this.gain = options.audioContext.createGain();
    this.gain.gain.value = this.microphoneGain / 100;
    this.destination = options.audioContext.createMediaStreamDestination();
    if (this.rnnoiseEnabled) {
      const [binary, , { RnnoiseWorkletNode }] = await Promise.all([
        loadWasm(),
        loadWorklet(options.audioContext),
        loadRnnoiseModule(),
      ]);
      this.node = new RnnoiseWorkletNode(options.audioContext, {
        maxChannels: 1,
        wasmBinary: binary,
      });
      this.source.connect(this.node).connect(this.gain).connect(this.destination);
    } else {
      this.source.connect(this.gain).connect(this.destination);
    }
    this.processedTrack = this.destination.stream.getAudioTracks()[0];
  }

  matches(rnnoiseEnabled: boolean) {
    return this.rnnoiseEnabled === rnnoiseEnabled;
  }

  setMicrophoneGain(value: number) {
    this.microphoneGain = value;
    this.gain?.gain.setTargetAtTime(value / 100, this.gain.context.currentTime, 0.015);
  }

  async restart(options: AudioProcessorOptions) {
    await this.destroy();
    await this.init(options);
  }

  async destroy() {
    this.source?.disconnect();
    this.node?.disconnect();
    this.node?.destroy();
    this.gain?.disconnect();
    this.destination?.disconnect();
    this.source = undefined;
    this.node = undefined;
    this.gain = undefined;
    this.destination = undefined;
    this.processedTrack = undefined;
  }
}

export async function syncVoiceTrackProcessor(
  room: Room,
  options: { rnnoiseEnabled: boolean; microphoneGain: number },
) {
  const publication = room.localParticipant.getTrackPublication(
    Track.Source.Microphone,
  );
  if (!(publication?.track instanceof LocalAudioTrack)) return null;
  const current = publication.track.getProcessor();
  const needsProcessor = options.rnnoiseEnabled || options.microphoneGain !== 100;
  if (!needsProcessor) {
    if (current?.name === PROCESSOR_NAME) await publication.track.stopProcessor();
    return null;
  }
  if (current instanceof VoiceTrackProcessor && current.matches(options.rnnoiseEnabled)) {
    current.setMicrophoneGain(options.microphoneGain);
    return null;
  }

  try {
    await publication.track.setProcessor(
      new VoiceTrackProcessor(options.rnnoiseEnabled, options.microphoneGain),
    );
    return null;
  } catch (error) {
    return error instanceof Error
      ? `RNNoise недоступен: ${error.message}`
      : "RNNoise недоступен на этом устройстве";
  }
}

export function syncRnnoiseProcessor(room: Room, enabled: boolean) {
  return syncVoiceTrackProcessor(room, { rnnoiseEnabled: enabled, microphoneGain: 100 });
}
