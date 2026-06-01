import type { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@/server/trpc/root";

export type RouterOutputs = inferRouterOutputs<AppRouter>;
