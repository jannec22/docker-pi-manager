import { deviceSocketStore } from "@/websocket/DeviceSocketRegistry";
import type { FastifyInstance } from "fastify";

export async function registerAdminWS(fastify: FastifyInstance) {
  fastify.get("/ws/admin", { websocket: true }, connection => {
    console.log("Admin connection established");
    deviceSocketStore.registerAdminConnection(connection);

    connection.on("close", message => {
      console.log("Admin connection closed:", message);
      deviceSocketStore.registerAdminConnection(connection);
    });
  });
}
