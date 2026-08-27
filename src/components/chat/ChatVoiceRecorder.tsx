"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Mic, Square, X } from "lucide-react";

import { IconButton } from "@/components/ui/IconButton";

export type ChatRecordMode = "voice" | "circle";

function bestMime(mode: ChatRecordMode) {
  const candidates = mode === "circle"
    ? ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]
    : ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/webm"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

export function ChatVoiceRecorder({ disabled, onRecorded, onError }: {
  disabled?: boolean;
  onRecorded: (file: File, durationSeconds: number, mode: ChatRecordMode) => void;
  onError: (message: string) => void;
}) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const meterTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressingRef = useRef(false);
  const cancelledRef = useRef(false);
  const [mode, setMode] = useState<ChatRecordMode>("voice");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState(() => Array.from({ length: 9 }, () => 0.18));

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (meterTimerRef.current) clearInterval(meterTimerRef.current);
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    timerRef.current = null;
    meterTimerRef.current = null;
    holdTimerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (audioContextRef.current) void audioContextRef.current.close();
    audioContextRef.current = null;
  };

  useEffect(() => () => cleanup(), []);

  useEffect(() => {
    const preview = previewRef.current;
    if (!recording || mode !== "circle" || !preview || !streamRef.current) return;
    preview.srcObject = streamRef.current;
    void preview.play().catch(() => undefined);
    return () => { preview.srcObject = null; };
  }, [mode, recording]);

  const startMeter = (stream: MediaStream) => {
    const AudioContextClass = window.AudioContext;
    const context = new AudioContextClass();
    const analyser = context.createAnalyser();
    analyser.fftSize = 64;
    context.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    audioContextRef.current = context;
    meterTimerRef.current = setInterval(() => {
      analyser.getByteFrequencyData(data);
      setLevels(Array.from({ length: 9 }, (_, index) => Math.max(0.14, (data[index * 2] ?? 0) / 255)));
    }, 90);
  };

  const start = async (recordMode: ChatRecordMode) => {
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") throw new Error("Запись не поддерживается этим браузером");
      const stream = await navigator.mediaDevices.getUserMedia(recordMode === "circle"
        ? { audio: { echoCancellation: true, noiseSuppression: true }, video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 480 }, aspectRatio: 1 } }
        : { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });

      if (!pressingRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const mimeType = bestMime(recordMode);
      const recorder = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), ...(recordMode === "circle" ? { videoBitsPerSecond: 650_000 } : { audioBitsPerSecond: 48_000 }) });
      streamRef.current = stream;
      setMode(recordMode);
      recorderRef.current = recorder;
      chunksRef.current = [];
      cancelledRef.current = false;
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const type = (recorder.mimeType || mimeType || (recordMode === "circle" ? "video/webm" : "audio/webm")).split(";")[0];
        const extension = type.includes("mp4") ? "mp4" : type.includes("ogg") ? "ogg" : "webm";
        const duration = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
        const file = new File(chunksRef.current, `${recordMode}-${Date.now()}.${extension}`, { type });
        const cancelled = cancelledRef.current;
        cleanup();
        setRecording(false);
        setElapsed(0);
        if (!cancelled && file.size > 0) onRecorded(file, duration, recordMode);
      };
      startedAtRef.current = Date.now();
      recorder.start(200);
      try {
        startMeter(stream);
      } catch {
        // Meter is decorative; recording must continue if Web Audio is unavailable.
      }
      setRecording(true);
      timerRef.current = setInterval(() => {
        const seconds = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setElapsed(seconds);
        if (seconds >= (recordMode === "circle" ? 60 : 120) && recorder.state === "recording") recorder.stop();
      }, 250);
    } catch (error) {
      cleanup();
      onError(error instanceof Error ? error.message : "Не удалось начать запись");
    }
  };

  const stop = () => {
    pressingRef.current = false;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  const cancel = () => {
    pressingRef.current = false;
    cancelledRef.current = true;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    else cleanup();
    setRecording(false);
    setElapsed(0);
  };

  if (recording) {
    return (
      <div className="relative flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-red-500/25 bg-[color-mix(in_srgb,var(--app-surface)_92%,#ef4444)] px-2 text-red-400 shadow-[var(--app-shadow-sm)]">
        {mode === "circle" ? (
          <div className="absolute bottom-12 right-0 h-28 w-28 overflow-hidden rounded-full border-2 border-red-400/70 bg-black shadow-[0_12px_38px_rgba(0,0,0,.42)]">
            <video ref={previewRef} muted playsInline className="h-full w-full -scale-x-100 object-cover" />
            <span className="absolute inset-x-0 bottom-2 text-center text-[10px] font-medium text-white/80">идёт запись</span>
          </div>
        ) : null}
        <span className="ml-1 h-2 w-2 animate-pulse rounded-full bg-red-500" />
        {mode === "circle" ? <Camera className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
        {mode === "voice" ? (
          <span className="flex h-6 w-[4.5rem] items-center justify-center gap-[3px]" aria-hidden>
            {levels.map((level, index) => <span key={index} className="w-[3px] rounded-full bg-red-400 transition-[height] duration-75" style={{ height: `${Math.round(5 + level * 17)}px` }} />)}
          </span>
        ) : null}
        <span className="min-w-10 text-xs tabular-nums">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}</span>
        <IconButton label="Отменить запись" onClick={cancel} className="rounded-lg p-1.5 hover:bg-red-500/10"><X className="h-4 w-4" /></IconButton>
        <IconButton label="Завершить запись" onClick={stop} className="rounded-lg bg-red-500 p-1.5 text-white"><Square className="h-4 w-4 fill-current" /></IconButton>
      </div>
    );
  }

  const Icon = mode === "voice" ? Mic : Camera;
  return (
    <IconButton
      label={mode === "voice" ? "Удерживайте: голосовое · нажмите: кружок" : "Удерживайте: кружок · нажмите: голосовое"}
      disabled={disabled}
      onPointerDown={(event) => {
        if (disabled || event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        pressingRef.current = true;
        holdTimerRef.current = setTimeout(() => {
          holdTimerRef.current = null;
          void start(mode);
        }, 260);
      }}
      onPointerUp={() => {
        pressingRef.current = false;
        if (holdTimerRef.current) {
          clearTimeout(holdTimerRef.current);
          holdTimerRef.current = null;
          setMode((value) => value === "voice" ? "circle" : "voice");
        } else {
          stop();
        }
      }}
      onPointerCancel={cancel}
      onContextMenu={(event) => event.preventDefault()}
      className="relative rounded-[var(--app-radius-sm)] p-2 text-[var(--app-muted)] transition hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)] disabled:opacity-40"
    >
      <Icon className="h-5 w-5" />
      <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[var(--theme-accent)]" />
    </IconButton>
  );
}
