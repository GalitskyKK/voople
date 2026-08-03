import {
  LocalAudioTrack,
  Track,
  type AudioProcessorOptions,
  type Room,
  type TrackProcessor,
} from "livekit-client";

const PROCESSOR_NAME = "voople-rnnoise";
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

class RnnoiseTrackProcessor
  implements TrackProcessor<Track.Kind.Audio, AudioProcessorOptions>
{
  readonly name = PROCESSOR_NAME;
  processedTrack?: MediaStreamTrack;
  private source?: MediaStreamAudioSourceNode;
  private node?: AudioWorkletNode & { destroy: () => void };
  private destination?: MediaStreamAudioDestinationNode;

  async init(options: AudioProcessorOptions) {
    if (options.audioContext.sampleRate !== 48_000) {
      throw new Error("RNNoise требует частоту звука 48 кГц");
    }
    const [binary, , { RnnoiseWorkletNode }] = await Promise.all([
      loadWasm(),
      loadWorklet(options.audioContext),
      loadRnnoiseModule(),
    ]);
    this.source = options.audioContext.createMediaStreamSource(
      new MediaStream([options.track]),
    );
    this.node = new RnnoiseWorkletNode(options.audioContext, {
      maxChannels: 1,
      wasmBinary: binary,
    });
    this.destination = options.audioContext.createMediaStreamDestination();
    this.source.connect(this.node).connect(this.destination);
    this.processedTrack = this.destination.stream.getAudioTracks()[0];
  }

  async restart(options: AudioProcessorOptions) {
    await this.destroy();
    await this.init(options);
  }

  async destroy() {
    this.source?.disconnect();
    this.node?.disconnect();
    this.node?.destroy();
    this.destination?.disconnect();
    this.source = undefined;
    this.node = undefined;
    this.destination = undefined;
    this.processedTrack = undefined;
  }
}

export async function syncRnnoiseProcessor(room: Room, enabled: boolean) {
  const publication = room.localParticipant.getTrackPublication(
    Track.Source.Microphone,
  );
  if (!(publication?.track instanceof LocalAudioTrack)) return null;
  const current = publication.track.getProcessor();
  if (!enabled) {
    if (current?.name === PROCESSOR_NAME) await publication.track.stopProcessor();
    return null;
  }
  if (current?.name === PROCESSOR_NAME) return null;

  try {
    await publication.track.setProcessor(new RnnoiseTrackProcessor());
    return null;
  } catch (error) {
    return error instanceof Error
      ? `RNNoise недоступен: ${error.message}`
      : "RNNoise недоступен на этом устройстве";
  }
}
