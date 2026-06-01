import { createTRPCRouter, protectedProcedure } from "../init";

export const playlistRouter = createTRPCRouter({
  list: protectedProcedure.query(() => {
    throw new Error("Not implemented");
  }),
});
