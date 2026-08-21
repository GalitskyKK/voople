import { getHomeOverview } from "@/server/services/home.service";

import { createTRPCRouter, protectedProcedure } from "../init";

export const homeRouter = createTRPCRouter({
  overview: protectedProcedure.query(({ ctx }) => getHomeOverview(ctx.user.id)),
});
