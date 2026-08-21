import { createTRPCRouter } from "./init";
import { adminRouter } from "./routers/admin";
import { chatRouter } from "./routers/chat";
import { customizationRouter } from "./routers/customization";
import { engagementRouter } from "./routers/engagement";
import { feedRouter } from "./routers/feed";
import { healthRouter } from "./routers/health";
import { homeRouter } from "./routers/home";
import { linkSafetyRouter } from "./routers/link-safety";
import { notificationsRouter } from "./routers/notifications";
import { playlistRouter } from "./routers/playlist";
import { postRouter } from "./routers/post";
import { profileCanvasRouter } from "./routers/profile-canvas";
import { profileRouter } from "./routers/profile";
import { questionsRouter } from "./routers/questions";
import { searchRouter } from "./routers/search";
import { shopRouter } from "./routers/shop";
import { statusRouter } from "./routers/status";
import { uploadRouter } from "./routers/upload";
import { userRouter } from "./routers/user";

export const appRouter = createTRPCRouter({
  admin: adminRouter,
  health: healthRouter,
  home: homeRouter,
  linkSafety: linkSafetyRouter,
  user: userRouter,
  post: postRouter,
  feed: feedRouter,
  profile: profileRouter,
  profileCanvas: profileCanvasRouter,
  questions: questionsRouter,
  search: searchRouter,
  status: statusRouter,
  playlist: playlistRouter,
  chat: chatRouter,
  customization: customizationRouter,
  engagement: engagementRouter,
  shop: shopRouter,
  upload: uploadRouter,
  notifications: notificationsRouter,
});

export type AppRouter = typeof appRouter;
