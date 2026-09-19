"use client"

import {
  useCallback,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction
} from "react"

import { reportProductEvent } from "@/lib/telemetry/client"

import {
  VOICE_MEDIA_SURFACE_TIMEOUT_MS,
  waitForVoiceMediaConnection,
  waitForVoiceRoomLifecycle,
  type VoiceRoomSessionTransition
} from "./voice-room-surface"
import type { useVoiceMediaConnection } from "./useVoiceMediaConnection"
import type { VoiceRoomServerAdapter } from "./useVoiceRoomServerAdapter"
import type { useVoiceSessionOperation } from "./useVoiceSessionOperation"

type SurfaceSessionOptions = {
  chatType: "direct" | "group"
  inside: boolean
  active: boolean
  startedAt: string | null
  desiredMicMutedRef: MutableRefObject<boolean>
  server: VoiceRoomServerAdapter
  mediaConnection: Pick<ReturnType<typeof useVoiceMediaConnection>, "connect" | "disconnect">
  sessionOperation: ReturnType<typeof useVoiceSessionOperation>
  setMediaError: Dispatch<SetStateAction<string | null>>
}

/** Owns the optimistic Room surface phases and their server-confirmed recovery actions. */
export function useVoiceRoomSurfaceSession({
  chatType,
  inside,
  active,
  startedAt,
  desiredMicMutedRef,
  server,
  mediaConnection,
  sessionOperation,
  setMediaError
}: SurfaceSessionOptions) {
  const [transition, setTransition] = useState<VoiceRoomSessionTransition>(null)
  const [failedOperation, setFailedOperation] = useState<"connect" | "leave" | null>(null)

  const resetSurface = useCallback(() => {
    setTransition(null)
    setFailedOperation(null)
  }, [])

  const enterAndConnect = () =>
    sessionOperation.run(async ({ isCurrent }) => {
      console.log("[VOICE-4] enterAndConnect started", {
        inside,
        active,
        current: isCurrent()
      })

      setTransition("connecting")
      setFailedOperation(null)
      setMediaError(null)
      try {
        if (!inside) {
          const nextRoom = await server.enter.run(desiredMicMutedRef.current)
          if (!isCurrent()) {
            await server.leave.run().catch(() => undefined)
            return
          }
          server.room.setData(nextRoom)
          if (!active) reportProductEvent("room_created", { kind: chatType })
        }
        if (!isCurrent()) return
        console.log("[VOICE-5] calling mediaConnection.connect()")
        const mediaConnected = await waitForVoiceMediaConnection(
          mediaConnection.connect(),
          VOICE_MEDIA_SURFACE_TIMEOUT_MS,
          "Подключение к голосовой комнате не завершилось вовремя."
        )
        console.log("[VOICE-6] mediaConnection.connect returned", {
          mediaConnected
        })

        if (!isCurrent()) {
          mediaConnection.disconnect()
          return
        }

        if (!mediaConnected) {
          setFailedOperation("connect")

          setMediaError(
            (current) =>
              current ?? "Не удалось подключиться к голосовой комнате. Повторите попытку."
          )

          return
        }
        reportProductEvent("room_joined", { kind: chatType })
      } catch (error) {
        if (!isCurrent()) return

        mediaConnection.disconnect()
        setFailedOperation("connect")

        setMediaError(
          error instanceof Error ? error.message : "Не удалось подключиться к голосовой комнате."
        )
      } finally {
        if (isCurrent()) setTransition(null)
      }
    })

  const leaveRoom = async () => {
    setTransition("leaving")
    setFailedOperation(null)
    setMediaError(null)
    sessionOperation.cancel()
    mediaConnection.disconnect()
    try {
      await waitForVoiceRoomLifecycle(
        (async () => {
          await server.leave.run()
          await server.room.refetch()
        })()
      )
      setTransition("post-leave")
      reportProductEvent("room_left", {
        durationSeconds: startedAt
          ? Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1_000))
          : 0
      })
    } catch (error) {
      setFailedOperation("leave")
      setMediaError(
        error instanceof Error ? error.message : "Не удалось подтвердить выход из комнаты"
      )
      setTransition(null)
    }
  }

  return {
    transition,
    failedOperation,
    resetSurface,
    enterAndConnect,
    leaveRoom
  }
}
