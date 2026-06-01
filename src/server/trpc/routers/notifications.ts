import { TRPCError } from "@trpc/server";

import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
} from "@/server/services/notifications.service";

import { createTRPCRouter, protectedProcedure } from "../init";

export const notificationsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await listNotifications(ctx.user.id);
    } catch (e) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: e instanceof Error ? e.message : "Не удалось загрузить уведомления",
      });
    }
  }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    try {
      return { count: await getUnreadCount(ctx.user.id) };
    } catch {
      return { count: 0 };
    }
  }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      await markAllNotificationsRead(ctx.user.id);
      return { ok: true };
    } catch (e) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: e instanceof Error ? e.message : "Не удалось обновить",
      });
    }
  }),
});
