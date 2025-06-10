import { TRPCError, initTRPC } from "@trpc/server";
import { validateAdminToken, validateDeviceToken } from "../token";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create();

export const middleware = t.middleware;

export const isAdmin = middleware(({ ctx, next }) => {
  const token = ctx.token;
  const id = token && validateAdminToken(token);
  if (!id) throw new TRPCError({ code: "UNAUTHORIZED" });

  return next({ ctx: { ...ctx, adminId: id } });
});

export const isDevice = middleware(({ ctx, next }) => {
  const token = ctx.token;
  const id = token && validateDeviceToken(token);
  if (!id) throw new TRPCError({ code: "UNAUTHORIZED" });

  return next({ ctx: { ...ctx, deviceId: id } });
});

export const publicProcedure = t.procedure;
export const adminProcedure = t.procedure.use(isAdmin);
export const deviceProcedure = t.procedure.use(isDevice);
