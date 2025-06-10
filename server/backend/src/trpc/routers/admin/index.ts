import { router } from "../../trpc";
import { adminAuthRouter } from "./auth";
import { adminDeviceRouter } from "./device";

export const adminRouter = router({
  device: adminDeviceRouter,
  auth: adminAuthRouter,
});
