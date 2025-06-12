import path from "node:path";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import websocket from "@fastify/websocket";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import Fastify from "fastify";
import { createContext } from "./trpc/context";
import { appRouter } from "./trpc/router";
import { registerAdminWS } from "./websocket/admin-handler";
import { registerDeviceWS } from "./websocket/device-handler";

const fastify = Fastify();

await fastify.register(cors, { origin: true });

fastify.register(fastifyStatic, {
  root: path.resolve("./public"),
  prefix: "/",
});

fastify.setNotFoundHandler((_req, reply) => {
  reply.sendFile("index.html");
});

await fastify.register(websocket);

await fastify.register(fastifyTRPCPlugin, {
  prefix: "/trpc",
  useWSS: false,
  trpcOptions: {
    router: appRouter,
    createContext,
  },
});

await registerDeviceWS(fastify);
await registerAdminWS(fastify);

fastify.listen({ port: 5000, host: "::" }, (err, address) => {
  if (err) throw err;
  console.log(`Server running on ${address}`);
});
