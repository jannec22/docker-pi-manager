import { adminRouter } from "./routers/admin";
import { deviceRouter } from "./routers/device";
import { router } from "./trpc";

export const appRouter = router({
  device: deviceRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
