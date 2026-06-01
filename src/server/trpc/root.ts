import { createTRPCRouter } from "./init";
import { chatRouter } from "./routers/chat";
import { customizationRouter } from "./routers/customization";
import { feedRouter } from "./routers/feed";
import { healthRouter } from "./routers/health";
import { notificationsRouter } from "./routers/notifications";
import { playlistRouter } from "./routers/playlist";
import { postRouter } from "./routers/post";
import { profileCanvasRouter } from "./routers/profile-canvas";
import { profileRouter } from "./routers/profile";
import { searchRouter } from "./routers/search";
import { shopRouter } from "./routers/shop";
import { statusRouter } from "./routers/status";
import { uploadRouter } from "./routers/upload";
import { userRouter } from "./routers/user";

export const appRouter = createTRPCRouter({
  health: healthRouter,
  user: userRouter,
  post: postRouter,
  feed: feedRouter,
  profile: profileRouter,
  profileCanvas: profileCanvasRouter,
  search: searchRouter,
  status: statusRouter,
  playlist: playlistRouter,
  chat: chatRouter,
  customization: customizationRouter,
  shop: shopRouter,
  upload: uploadRouter,
  notifications: notificationsRouter,
});

export type AppRouter = typeof appRouter;
