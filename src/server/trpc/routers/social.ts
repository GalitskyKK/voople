import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { assertRateLimit } from "@/lib/ratelimit-guard";
import { rateLimits } from "@/lib/ratelimit";
import { MAX_GROUP_TOPICS, MAX_USER_INTERESTS } from "@/lib/social/interests";
import {
  getGroupDiscoveryProfile,
  getUserPrivacySettings,
  getUserInterestSettings,
  listVisibleOnlineUserIds,
  listContactPins,
  loadInterestCatalog,
  setGroupDiscoveryProfile,
  setUserPrivacySettings,
  toggleContactPin,
  setUserInterests,
} from "@/server/services/social.service";
import { PRIVACY_SCOPES } from "@/types/privacy";
import { recordServerProductEvent } from "@/server/services/client-telemetry.service";

import { createTRPCRouter, protectedProcedure } from "../init";

const interestSlug = z.string().regex(/^[a-z0-9-]{2,48}$/);
const privacyScope = z.enum(PRIVACY_SCOPES);
const privacySettings = z.object({
  onlineScope: privacyScope,
  gamingScope: privacyScope,
  musicScope: privacyScope,
  roomsScope: privacyScope,
  inviteScope: privacyScope,
  connectionRequestScope: privacyScope,
  appearInRecommendations: z.boolean(),
  showInterests: z.boolean(),
});

function socialError(error: unknown, fallback: string): never {
  throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : fallback });
}

export const socialRouter = createTRPCRouter({
  myPinnedContacts: protectedProcedure.query(async ({ ctx }) => ({ pinnedUserIds: await listContactPins(ctx.user.id), limit: 3 as const })),
  togglePinnedContact: protectedProcedure.input(z.object({ userId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await assertRateLimit(rateLimits.updateSocialProfile, ctx.user.id);
    try { return await toggleContactPin(ctx.user.id, input.userId); }
    catch (error) { return socialError(error, "Не удалось изменить закрепление"); }
  }),
  myPrivacy: protectedProcedure.query(({ ctx }) => getUserPrivacySettings(ctx.user.id)),
  visiblePresence: protectedProcedure.query(async ({ ctx }) => ({ userIds: await listVisibleOnlineUserIds(ctx.user.id) })),
  setMyPrivacy: protectedProcedure.input(privacySettings).mutation(async ({ ctx, input }) => {
    await assertRateLimit(rateLimits.updateSocialProfile, ctx.user.id);
    try {
      const result = await setUserPrivacySettings(ctx.user.id, input);
      await recordServerProductEvent({ name: "privacy_updated", actorId: ctx.user.id, route: "/trpc/social.setMyPrivacy", properties: { state: input.onlineScope } });
      return result;
    } catch (error) { return socialError(error, "Не удалось сохранить приватность"); }
  }),
  interestCatalog: protectedProcedure.query(() => loadInterestCatalog()),
  myInterests: protectedProcedure.query(({ ctx }) => getUserInterestSettings(ctx.user.id)),
  setMyInterests: protectedProcedure
    .input(z.object({ selectedSlugs: z.array(interestSlug).max(MAX_USER_INTERESTS) }))
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.updateSocialProfile, ctx.user.id);
      try {
        const result = await setUserInterests(ctx.user.id, input.selectedSlugs);
        for (const slug of result.added) await recordServerProductEvent({ name: "interest_added", actorId: ctx.user.id, route: "/trpc/social.setMyInterests", properties: { category: slug } });
        for (const slug of result.removed) await recordServerProductEvent({ name: "interest_removed", actorId: ctx.user.id, route: "/trpc/social.setMyInterests", properties: { category: slug } });
        return result;
      } catch (error) { return socialError(error, "Не удалось сохранить интересы"); }
    }),
  groupDiscoveryProfile: protectedProcedure
    .input(z.object({ chatId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try { return await getGroupDiscoveryProfile(input.chatId, ctx.user.id); }
      catch (error) { return socialError(error, "Не удалось загрузить темы сообщества"); }
    }),
  setGroupDiscoveryProfile: protectedProcedure
    .input(z.object({
      chatId: z.string().uuid(),
      primaryCategorySlug: z.string().regex(/^[a-z0-9-]{2,32}$/).nullable(),
      topicSlugs: z.array(interestSlug).max(MAX_GROUP_TOPICS),
      language: z.string().trim().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/).max(10),
      region: z.string().trim().max(64).nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertRateLimit(rateLimits.manageGroupChat, ctx.user.id);
      try {
        const result = await setGroupDiscoveryProfile({ ...input, userId: ctx.user.id });
        await recordServerProductEvent({ name: "group_topics_updated", actorId: ctx.user.id, route: "/trpc/social.setGroupDiscoveryProfile", properties: { count: result.topicSlugs.length } });
        return result;
      } catch (error) { return socialError(error, "Не удалось сохранить темы сообщества"); }
    }),
});
