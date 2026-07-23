"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check, Circle, Loader2, RefreshCw, RotateCcw, Square } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";

const MAX_DURATION_SECONDS = 60;

function recorderMimeType() {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function fileExtension(type: string) {
  return type.startsWith("video/mp4") ? "mp4" : "webm";
}

export function CircleRecorder({
  open,
  onClose,
  onUse,
}: {
  open: boolean;
  onClose: () => void;
  onUse: (file: File) => void;
}) {
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [phase, setPhase] = useState<"starting" | "ready" | "recording" | "preview" | "error">("starting");
  const [elapsed, setElapsed] = useState(0);
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (liveVideoRef.current) liveVideoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async (mode: "user" | "environment") => {
    stopStream();
    setPhase("starting");
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        throw new Error("Этот браузер не поддерживает запись. Выберите готовое видео.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 720 },
          height: { ideal: 720 },
          aspectRatio: { ideal: 1 },
        },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        await liveVideoRef.current.play();
      }
      setPhase("ready");
    } catch (cameraError) {
      setError(cameraError instanceof Error ? cameraError.message : "Не удалось открыть камеру");
      setPhase("error");
    }
  }, [stopStream]);

  useEffect(() => {
    if (!open) return;
    const startTimer = window.setTimeout(() => void startCamera(facingMode), 0);
    return () => {
      window.clearTimeout(startTimer);
      clearTimer();
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      recorderRef.current = null;
      stopStream();
    };
  }, [clearTimer, facingMode, open, startCamera, stopStream]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const stopRecording = useCallback(() => {
    clearTimer();
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, [clearTimer]);

  const startRecording = () => {
    const stream = streamRef.current;
    if (!stream) return;
    const mimeType = recorderMimeType();
    try {
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: 2_500_000,
        audioBitsPerSecond: 128_000,
      });
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const actualType = recorder.mimeType || mimeType || "video/webm";
        const blob = new Blob(chunksRef.current, { type: actualType });
        const file = new File(
          [blob],
          `voople-circle-${Date.now()}.${fileExtension(actualType)}`,
          { type: actualType.split(";")[0] },
        );
        setRecordedFile(file);
        setPreviewUrl((previous) => {
          if (previous) URL.revokeObjectURL(previous);
          return URL.createObjectURL(file);
        });
        stopStream();
        setPhase("preview");
      };
      recorder.start(250);
      setElapsed(0);
      setPhase("recording");
      const startedAt = Date.now();
      timerRef.current = setInterval(() => {
        const next = Math.min(MAX_DURATION_SECONDS, Math.floor((Date.now() - startedAt) / 1000));
        setElapsed(next);
        if (next >= MAX_DURATION_SECONDS) stopRecording();
      }, 250);
    } catch (recordError) {
      setError(recordError instanceof Error ? recordError.message : "Не удалось начать запись");
      setPhase("error");
    }
  };

  const retake = () => {
    setRecordedFile(null);
    setPreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
    setElapsed(0);
    void startCamera(facingMode);
  };

  const switchCamera = () => {
    if (phase === "recording") return;
    setFacingMode((current) => current === "user" ? "environment" : "user");
  };

  const close = () => {
    clearTimer();
    stopRecording();
    stopStream();
    onClose();
  };

  return (
    <Sheet open={open} onClose={close} className="max-w-md overflow-hidden p-4 sm:p-5" placement="bottom">
      <header className="mb-4 pr-10">
        <h2 className="text-lg font-semibold">Записать кружок</h2>
        <p className="mt-1 text-sm text-[var(--app-muted)]">До 60 секунд. Перед публикацией запись можно посмотреть или переснять.</p>
      </header>

      <div className="relative mx-auto aspect-square w-full max-w-[360px] overflow-hidden rounded-full border border-white/15 bg-black shadow-[0_18px_60px_rgba(0,0,0,.35)]">
        {phase === "preview" && previewUrl ? (
          <video src={previewUrl} className="h-full w-full object-cover" controls playsInline autoPlay loop />
        ) : (
          <video
            ref={liveVideoRef}
            className={`h-full w-full object-cover ${facingMode === "user" ? "-scale-x-100" : ""}`}
            muted
            playsInline
            autoPlay
          />
        )}
        {phase === "starting" ? (
          <div className="absolute inset-0 grid place-items-center bg-black/35 text-white"><Loader2 className="h-7 w-7 animate-spin" /></div>
        ) : null}
        {phase === "recording" ? (
          <div className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/65 px-3 py-1.5 text-sm font-medium text-white backdrop-blur">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            0:{String(elapsed).padStart(2, "0")} / 1:00
          </div>
        ) : null}
        {phase === "error" ? (
          <div className="absolute inset-0 grid place-items-center bg-black/75 p-8 text-center text-sm text-white/85"><div><Camera className="mx-auto mb-3 h-8 w-8" />{error}</div></div>
        ) : null}
      </div>

      <div className="mt-5 flex items-center justify-center gap-3">
        {phase === "ready" ? (
          <>
            <Button type="button" variant="secondary" className="h-10 w-10 p-0" onClick={switchCamera} aria-label="Сменить камеру"><RefreshCw className="h-4 w-4" /></Button>
            <button type="button" onClick={startRecording} className="grid h-16 w-16 place-items-center rounded-full border-4 border-[var(--foreground)]/80 bg-red-500 text-white transition hover:scale-105" aria-label="Начать запись"><Circle className="h-7 w-7 fill-current" /></button>
            <span className="h-10 w-10" aria-hidden />
          </>
        ) : null}
        {phase === "recording" ? (
          <button type="button" onClick={stopRecording} className="grid h-16 w-16 place-items-center rounded-full border-4 border-white/80 bg-red-500 text-white" aria-label="Остановить запись"><Square className="h-6 w-6 fill-current" /></button>
        ) : null}
        {phase === "preview" ? (
          <>
            <Button type="button" variant="secondary" onClick={retake}><RotateCcw className="h-4 w-4" />Переснять</Button>
            <Button type="button" onClick={() => { if (recordedFile) onUse(recordedFile); }}><Check className="h-4 w-4" />Использовать</Button>
          </>
        ) : null}
        {phase === "error" ? (
          <Button type="button" variant="secondary" onClick={() => void startCamera(facingMode)}><RotateCcw className="h-4 w-4" />Повторить</Button>
        ) : null}
      </div>
    </Sheet>
  );
}
