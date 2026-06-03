import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { assertRateLimit } from "@/lib/ratelimit-guard";
import { rateLimits } from "@/lib/ratelimit";
import { getProfileByUsername } from "@/server/services/profile.service";
import {
  createTrackFromUpload,
  deleteTrack,
  getPlaylistByUsername,
  getPlaylistForUser,
  setAnthem,
} from "@/server/services/playlist.service";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../init";

export const playlistRouter = createTRPCRouter({
  listByUsername: publicProcedure
    .input(z.object({ username: z.string().min(1).max(30) }))
    .query(async ({ input }) => {
      try {
        return await getPlaylistByUsername(input.username);
      } catch (e) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: e instanceof Error ? e.message : "Плейлист недоступен",
        });
      }
    }),

  listMine: protectedProcedure.query(({ ctx }) => getPlaylistForUser(ctx.user.id)),

  createFromUpload: protectedProcedure
    .input(
      z.object({
        fileKey: z.string().min(10).max(500),
        title: z.string().min(1).max(100),
        artist: z.string().min(1).max(100),
        durationSeconds: z.number().int().min(0).nullable(),
        pinToProfile: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.uploadTrack, ctx.user.id);
      try {
        return await createTrackFromUpload(ctx.user.id, input);
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Не удалось добавить трек",
        });
      }
    }),

  setAnthem: protectedProcedure
    .input(z.object({ trackId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await setAnthem(ctx.user.id, input.trackId);
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Не удалось закрепить трек",
        });
      }
    }),

  remove: protectedProcedure
    .input(z.object({ trackId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await deleteTrack(ctx.user.id, input.trackId);
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Не удалось удалить трек",
        });
      }
    }),

  resolveOwner: publicProcedure
    .input(z.object({ username: z.string().min(1).max(30) }))
    .query(async ({ input }) => {
      const profile = await getProfileByUsername(input.username);
      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Профиль не найден" });
      }
      return { userId: profile.id, username: profile.username };
    }),
});
