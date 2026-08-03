"use client"

import { useCallback, useEffect, useRef } from "react"

import { throttle } from "@/lib/canvas/throttle"
import { createClient } from "@/lib/supabase/client"
import type { Point, Stroke } from "@/types/canvas"

const EMIT_DRAWING_INTERVAL_MS = 50

type CanvasBroadcastPayload =
  | {
      type: "drawing"
      strokeId: string
      userId: string
      points: Point[]
      color: string
      size: number
    }
  | { type: "stroke_end"; stroke: Stroke }
  | { type: "clear"; ownerId: string }
  | { type: "stroke_undo"; strokeId: string; userId: string }

type StrokeRowPayload = {
  id: string
  profile_user_id: string
  author_id: string
  color: string
  size: number
  points: Point[]
}

type StrokeDeletePayload = {
  id: string
}

type UseCanvasRealtimeOptions = {
  enabled?: boolean
  profileUserId: string
  profileOwnerId: string
  viewerId: string | null | undefined
  onIncomingStroke: (stroke: Stroke) => void
  onIncomingDrawing?: (
    strokeId: string,
    userId: string,
    points: Point[],
    color: string,
    size: number,
  ) => void
  onRemoveStroke?: (strokeId: string) => void
  /** После broadcast clear — перечитать холст из БД (защита от поддельного clear) */
  onSyncFromServer?: () => void
}

function mapStrokeRow(row: StrokeRowPayload): Stroke {
  return {
    id: row.id,
    userId: row.author_id,
    color: row.color,
    size: row.size,
    points: row.points
  }
}

export function useCanvasRealtime({
  enabled = true,
  profileUserId,
  profileOwnerId,
  viewerId,
  onIncomingStroke,
  onIncomingDrawing,
  onRemoveStroke,
  onSyncFromServer
}: UseCanvasRealtimeOptions) {
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null)
  const channelReadyRef = useRef(false)
  const onIncomingStrokeRef = useRef(onIncomingStroke)
  const onIncomingDrawingRef = useRef(onIncomingDrawing)
  const onRemoveStrokeRef = useRef(onRemoveStroke)
  const onSyncFromServerRef = useRef(onSyncFromServer)
  const emitDrawingRef = useRef<
    (strokeId: string, points: Point[], color: string, size: number) => void
  >(() => {})

  const isProfileOwner = Boolean(viewerId && viewerId === profileOwnerId)

  useEffect(() => {
    onIncomingStrokeRef.current = onIncomingStroke
  }, [onIncomingStroke])

  useEffect(() => {
    onIncomingDrawingRef.current = onIncomingDrawing
  }, [onIncomingDrawing])

  useEffect(() => {
    onRemoveStrokeRef.current = onRemoveStroke
  }, [onRemoveStroke])

  useEffect(() => {
    onSyncFromServerRef.current = onSyncFromServer
  }, [onSyncFromServer])

  useEffect(() => {
    if (!enabled) return

    const supabase = createClient()
    channelReadyRef.current = false
    const channel = supabase
      .channel(`profile-canvas:${profileUserId}`, {
        config: { broadcast: { self: false } }
      })
      .on("broadcast", { event: "canvas" }, ({ payload }) => {
        const data = payload as CanvasBroadcastPayload | undefined
        if (!data) return

        if (data.type === "drawing") {
          onIncomingDrawingRef.current?.(
            data.strokeId,
            data.userId,
            data.points,
            data.color,
            data.size
          )
          return
        }

        if (data.type === "stroke_end") {
          onIncomingStrokeRef.current(data.stroke)
          return
        }

        if (data.type === "stroke_undo") {
          onRemoveStrokeRef.current?.(data.strokeId)
          return
        }

        if (data.type === "clear") {
          if (data.ownerId !== profileOwnerId) return
          void onSyncFromServerRef.current?.()
        }
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "profile_canvas_strokes",
          filter: `profile_user_id=eq.${profileUserId}`
        },
        (payload) => {
          const row = payload.new as StrokeRowPayload | null
          if (!row?.id) return
          onIncomingStrokeRef.current(mapStrokeRow(row))
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "profile_canvas_strokes",
          filter: `profile_user_id=eq.${profileUserId}`
        },
        (payload) => {
          const row = payload.old as StrokeDeletePayload | null
          if (!row?.id) return
          onRemoveStrokeRef.current?.(row.id)
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channelReadyRef.current = true
          void onSyncFromServerRef.current?.()
          return
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          channelReadyRef.current = false
        }
      })

    channelRef.current = channel

    return () => {
      channelReadyRef.current = false
      void supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [enabled, profileOwnerId, profileUserId])

  const broadcast = useCallback(
    (payload: CanvasBroadcastPayload) => {
      const channel = channelRef.current
      if (!channel || !viewerId) return

      if (channelReadyRef.current) {
        void channel.send({
          type: "broadcast",
          event: "canvas",
          payload
        })
        return
      }

      void channel.httpSend("canvas", payload).catch(() => undefined)
    },
    [viewerId]
  )

  const emitDrawingRaw = useCallback(
    (strokeId: string, points: Point[], color: string, size: number) => {
      if (!viewerId || points.length === 0) return
      broadcast({ type: "drawing", strokeId, userId: viewerId, points, color, size })
    },
    [broadcast, viewerId]
  )

  useEffect(() => {
    emitDrawingRef.current = throttle(emitDrawingRaw, EMIT_DRAWING_INTERVAL_MS)
  }, [emitDrawingRaw])

  const emitDrawing = useCallback(
    (strokeId: string, points: Point[], color: string, size: number) => {
      emitDrawingRef.current(strokeId, points, color, size)
    },
    []
  )

  const emitStrokeEnd = useCallback(
    (stroke: Stroke) => {
      if (!viewerId) return
      broadcast({ type: "stroke_end", stroke })
    },
    [broadcast, viewerId]
  )

  const emitClear = useCallback(() => {
    if (!isProfileOwner || !viewerId) return
    broadcast({ type: "clear", ownerId: viewerId })
  }, [broadcast, isProfileOwner, viewerId])

  const emitUndo = useCallback(
    (strokeId: string) => {
      if (!viewerId) return
      broadcast({ type: "stroke_undo", strokeId, userId: viewerId })
    },
    [broadcast, viewerId]
  )

  return {
    emitDrawing,
    emitStrokeEnd,
    emitClear,
    emitUndo,
    canDraw: Boolean(viewerId),
    isProfileOwner
  }
}
