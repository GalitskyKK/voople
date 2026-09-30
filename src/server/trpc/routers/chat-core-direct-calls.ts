import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { assertRateLimit } from "@/lib/ratelimit-guard";
import { coreDirectCallerEligible } from "@/lib/http/desktop-compatibility";
import { rateLimits } from "@/lib/ratelimit";
import {
  answerCoreDirectCall,
  coreDirectCallRoomView,
  createCoreDirectCallMediaToken,
  createCoreDirectCallScreenAudioToken,
  finishCoreDirectCall,
  getActiveCoreDirectCall,
  getCoreDirectCall,
  heartbeatCoreDirectCall,
  listCoreIncomingCalls,
  startCoreDirectCall,
} from "@/server/services/chat-core-direct-calls.service";
import { assertServerFeatureAvailable, getServerFeatureAccess } from "@/server/services/product-feature-access.service";

import { protectedProcedure } from "../init";

function access(userId: string) {
  try {
    assertServerFeatureAvailable("core_direct_calls", userId);
  } catch {
    throw new TRPCError({ code: "NOT_FOUND", message: "Звонок недоступен" });
  }
}

function callError(error: unknown) {
  return new TRPCError({
    code: "BAD_REQUEST",
    message: error instanceof Error ? error.message : "Звонок недоступен",
  });
}

export const chatCoreDirectCallProcedures = {
  coreDirectCallCapability: protectedProcedure.query(async ({ ctx }) => {
    const startEnabled = getServerFeatureAccess("core_direct_calls", ctx.user.id).enabled;
    if (startEnabled && coreDirectCallerEligible(ctx.client)) return { enabled: true, startEnabled: true };
    try {
      const active = await getActiveCoreDirectCall(ctx.user.id);
      return { enabled: Boolean(active), startEnabled: false };
    } catch {
      // Code can deploy before the additive migration while rollout is off.
      return { enabled: false, startEnabled: false };
    }
  }),
  coreMyDirectCall: protectedProcedure.query(async ({ ctx }) => {
    try { return await getActiveCoreDirectCall(ctx.user.id); }
    catch (error) { throw callError(error); }
  }),
  coreDirectCall: protectedProcedure.input(z.object({ sessionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try { return await getCoreDirectCall(input.sessionId, ctx.user.id); }
      catch (error) { throw callError(error); }
    }),
  coreDirectCallRoom: protectedProcedure.input(z.object({ sessionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try { return await coreDirectCallRoomView(input.sessionId, ctx.user.id); }
      catch (error) { throw callError(error); }
    }),
  coreIncomingCalls: protectedProcedure.query(async ({ ctx }) => {
    try { return await listCoreIncomingCalls(ctx.user.id); }
    catch (error) { throw callError(error); }
  }),
  coreStartDirectCall: protectedProcedure.input(z.strictObject({
    conversationId: z.string().uuid(), requestId: z.string().uuid(),
  })).mutation(async ({ ctx, input }) => {
    access(ctx.user.id);
    if (!coreDirectCallerEligible(ctx.client)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Клиент не поддерживает Core Direct Call" });
    }
    await assertRateLimit(rateLimits.enterChatRoom, ctx.user.id);
    try { return await startCoreDirectCall({ ...input, callerId: ctx.user.id }); }
    catch (error) { throw callError(error); }
  }),
  coreAnswerDirectCall: protectedProcedure.input(z.strictObject({ sessionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.enterChatRoom, ctx.user.id);
      try { return await answerCoreDirectCall(input.sessionId, ctx.user.id); }
      catch (error) { throw callError(error); }
    }),
  coreFinishDirectCall: protectedProcedure.input(z.strictObject({ sessionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try { return await finishCoreDirectCall(input.sessionId, ctx.user.id); }
      catch (error) { throw callError(error); }
    }),
  coreDirectCallMediaToken: protectedProcedure.input(z.strictObject({ sessionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.enterChatRoom, ctx.user.id);
      try { return await createCoreDirectCallMediaToken(input.sessionId, ctx.user.id); }
      catch (error) { throw callError(error); }
    }),
  coreDirectCallScreenAudioToken: protectedProcedure.input(z.strictObject({
    sessionId: z.string().uuid(), screenSessionId: z.string().uuid(),
  })).mutation(async ({ ctx, input }) => {
    await assertRateLimit(rateLimits.enterChatRoom, ctx.user.id);
    try { return await createCoreDirectCallScreenAudioToken(input.sessionId, ctx.user.id, input.screenSessionId); }
    catch (error) { throw callError(error); }
  }),
  coreDirectCallHeartbeat: protectedProcedure.input(z.strictObject({
    sessionId: z.string().uuid(), micMuted: z.boolean(),
    cameraEnabled: z.boolean(), screenSharing: z.boolean(),
  })).mutation(async ({ ctx, input }) => {
    try { return await heartbeatCoreDirectCall({ ...input, userId: ctx.user.id }); }
    catch (error) { throw callError(error); }
  }),
};
