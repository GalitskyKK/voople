import { getHomeOverview } from "@/server/services/home.service";
import { getHomeActiveRooms } from "@/server/services/home-active-rooms.service";

import { createTRPCRouter, protectedProcedure } from "../init";

export const homeRouter = createTRPCRouter({
  overview: protectedProcedure.query(({ ctx }) => getHomeOverview(ctx.user.id)),
  activeRooms: protectedProcedure.query(({ ctx }) => getHomeActiveRooms(ctx.user.id)),
});
