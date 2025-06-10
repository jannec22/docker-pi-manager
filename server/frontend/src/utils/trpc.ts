import type { AppRouter } from "@server/src/trpc/router";
import { createTRPCReact } from "@trpc/react-query";
import type { inferRouterOutputs } from "@trpc/server";

type RouterOutputs = inferRouterOutputs<AppRouter>;

export const trpc = createTRPCReact<AppRouter>();

export type Device = RouterOutputs["admin"]["device"]["list"]["items"][number];
