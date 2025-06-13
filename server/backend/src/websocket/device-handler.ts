import type { FastifyInstance } from "fastify";
import { prisma } from "../prisma-client";
import { validateDeviceToken } from "../token";
import { parseDeviceStatusMessage, stringifyWebsocketMessage } from "../type-utils/typia";
import { deviceSocketStore } from "../websocket/DeviceSocketRegistry";
import { deviceStatusStore } from "../websocket/DeviceStatusStore";

export async function registerDeviceWS(fastify: FastifyInstance) {
  fastify.get<{ Params: { id: string } }>(
    "/ws/device/:id",
    { websocket: true },
    async (connection, req) => {
      const deviceId = req.params.id;
      const url = new URL(req.url ?? "", `http://${req.headers.host}`);
      const token = url.searchParams.get("token");

      if (!token) {
        connection.send(
          stringifyWebsocketMessage({
            to: "device",
            type: "device:unauthorized",
            deviceId,
          }),
        );
        console.error("No token provided for device connection");
        return connection.close();
      }

      const idFromToken = validateDeviceToken(token); // Your logic here
      if (!deviceId || !idFromToken || idFromToken !== deviceId) return connection.close();

      const device = await prisma.device.findUnique({
        where: { id: deviceId },
      });

      if (!device) {
        connection.send(
          stringifyWebsocketMessage({
            to: "device",
            type: "device:unauthorized",
            deviceId,
          }),
        );
        console.error("Device not found:", deviceId);
        return connection.close();
      }

      if (device.approved === false) {
        connection.send(
          stringifyWebsocketMessage({
            to: "device",
            type: "device:unauthorized",
            deviceId,
          }),
        );
        console.error("Device not approved:", deviceId);
        return connection.close();
      }

      connection.send(
        stringifyWebsocketMessage({
          to: "device",
          deviceId,
          type: "device:ssh",
          ssh: device.sshOn,
          vnc: device.vncOn,
          sshPort: device.sshPort,
          vncPort: device.vncPort,
          sshLocalPort: device.sshLocalPort,
          vncServerPassword: device.vncServerPassword,
          vncServerParams: device.vncServerParams ? JSON.parse(device.vncServerParams) : {},
          user: process.env.SSH_USER ?? "tunneluser",
          host: process.env.SSH_HOST_FOR_DEVICE ?? "localhost",
        }),
      );

      deviceSocketStore.register(`active:${deviceId}`, connection);
      console.log("Connected with token:", token);

      deviceSocketStore.sendToAdmin({
        to: "admin",
        type: "device:connect",
        deviceId,
      });

      connection.on("message", async message => {
        const result = parseDeviceStatusMessage(message.toString());

        const device = await prisma.device.findUnique({
          where: { id: deviceId },
        });

        if (!device) {
          connection.send(
            stringifyWebsocketMessage({
              to: "device",
              type: "device:unauthorized",
              deviceId,
            }),
          );
          console.error("Device not found:", deviceId);
          return connection.close();
        }

        if (result.success) {
          if (result.data.type === "device:status") {
            console.log("Received device status:", result.data);
            deviceStatusStore.update(deviceId, {
              ...result.data,
              lastSeen: new Date(),
            });

            deviceSocketStore.sendToAdmin({
              to: "admin",
              type: "device:update",
              deviceId,
            });
          }

          return;
        }

        console.error("Could not parse message:", ...result.errors);

        connection.send(
          JSON.stringify({
            message: "Invalid message format",
            errors: result.errors,
          }),
        );
      });

      connection.on("close", () => {
        deviceSocketStore.unregister(`active:${deviceId}`);
        console.log("Device disconnected:", deviceId);

        deviceSocketStore.sendToAdmin({
          to: "admin",
          type: "device:disconnect",
          deviceId,
        });
      });
    },
  );

  fastify.get<{ Params: { id: string } }>(
    "/ws/device/pending/:id",
    { websocket: true },
    (connection, req) => {
      const deviceId = req.params.id;
      if (!deviceId) return connection.close();

      deviceSocketStore.register(`pending:${deviceId}`, connection);

      connection.on("close", () => {
        deviceSocketStore.unregister(`pending:${deviceId}`);
      });
    },
  );
}
