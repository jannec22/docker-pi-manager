import { unlink, writeFile } from "node:fs/promises";
import type { Device } from "@prisma/client";
import { z } from "zod";
import {
  createGuacConnection,
  deleteGuacConnection,
  getToken,
} from "../../../guacamole/connection";
import { prisma } from "../../../prisma-client";
import { generateDeviceToken } from "../../../token";
import { deviceSocketStore } from "../../../websocket/DeviceSocketRegistry";
import { deviceStatusStore } from "../../../websocket/DeviceStatusStore";
import { adminProcedure } from "../../middleware";
import { router } from "../../trpc";

interface DeviceListItem extends Omit<Device, "tokenExpiration" | "token"> {
  listening: boolean;
  sshRunning: boolean;
  tunnelActive: boolean;
}

interface DeviceWithOptionalToken extends Omit<Device, "tokenExpiration" | "token"> {
  token?: string | null;
  tokenExpiration?: Date | null;
}

export const adminDeviceRouter = router({
  list: adminProcedure
    .input(
      z.object({
        page: z.number().min(0).default(0),
        pageSize: z.number().min(1).max(100).default(10),
      }),
    )
    .query(async ({ input }) => {
      const { page, pageSize } = input;

      const total = await prisma.device.count();
      const items = await prisma.device.findMany({
        skip: page * pageSize,
        take: pageSize,
        orderBy: { registeredAt: "desc" },
      });

      return {
        items: items.map<DeviceListItem>(d => {
          const cp: DeviceWithOptionalToken = { ...d };
          const tunnelActive = !!(d.token && d.tokenExpiration && d.tokenExpiration > new Date());

          delete cp.tokenExpiration;
          delete cp.token;

          const device: DeviceListItem = {
            ...cp,
            listening: deviceSocketStore.isConnected(`active:${d.id}`),
            sshRunning: deviceStatusStore.get(d.id)?.sshRunning ?? false,
            tunnelActive,
          };

          return device;
        }),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  listTunnels: adminProcedure
    .input(
      z.object({
        page: z.number().min(0).default(0),
        pageSize: z.number().min(1).max(100).default(10),
      }),
    )
    .query(async ({ input }) => {
      const { page, pageSize } = input;

      const where = {
        guacConnectionId: {
          not: null,
        },
        token: {
          not: null,
        },
        tokenExpiration: {
          gt: new Date(),
        },
      };

      const [total, items] = await Promise.all([
        prisma.device.count({ where }),
        prisma.device.findMany({
          skip: page * pageSize,
          take: pageSize,
          orderBy: { registeredAt: "desc" },
          where,
        }),
      ]);

      return {
        items: items.map(d => ({
          deviceId: d.id,
          token: d.token!,
          tokenExpiration: d.tokenExpiration!,
          connectionId: d.guacConnectionId!,
        })),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  toggleTunnel: adminProcedure.input(z.string()).mutation(async ({ input }) => {
    let device = await prisma.device.findUnique({
      where: { id: input },
    });

    if (!device) {
      throw new Error("Device not found");
    }

    if (!device.guacConnectionId) {
      throw new Error("Device does not have a Guacamole connection");
    }

    if (!deviceStatusStore.get(device.id)?.sshRunning) {
      throw new Error("SSH is not running on the device. Please enable SSH first.");
    }

    if (!device.token || !device.tokenExpiration || device.tokenExpiration < new Date()) {
      const wasActive = !!(
        device.token &&
        device.tokenExpiration &&
        device.tokenExpiration > new Date()
      );
      console.info(`Activating tunnel for device ${input}`);
      const token = wasActive ? device.token : (await getToken()).authToken;

      const tokenExpiration = wasActive
        ? device.tokenExpiration
        : process.env.TOKEN_EXPIRATION
          ? new Date(Date.now() + Number.parseInt(process.env.TOKEN_EXPIRATION))
          : new Date(Date.now() + 15 * 60 * 1000);

      device = await prisma.device.update({
        where: { id: input },
        data: {
          token: token,
          tokenExpiration,
        },
      });

      deviceSocketStore.sendToAdmin({
        to: "admin",
        type: "device:update",
        deviceId: input,
      });

      return {
        token,
        tokenExpiration,
        guacConnectionId: device.guacConnectionId || "",
      };
    }

    console.info(`Disabling tunnel for device ${input}`);

    device = await prisma.device.update({
      where: { id: input },
      data: {
        token: null,
        tokenExpiration: null,
      },
    });

    deviceSocketStore.sendToAdmin({
      to: "admin",
      type: "device:update",
      deviceId: input,
    });
  }),

  approve: adminProcedure.input(z.string()).mutation(async ({ input }) => {
    const maxPort = await prisma.device.aggregate({
      _max: { port: true },
    });

    const nextPort = (maxPort._max.port ?? 10000) + 1;

    const conn = await createGuacConnection(input, nextPort, process.env.SSH_LISTENER_HOST ?? "localhost");

    try {
      const device = await prisma.device.findUnique({
        where: { id: input },
      });

      if (!device) {
        throw new Error("Device not found");
      }

      const pubkeyPath = `/mnt/keys/${input}.pub`;
      const commentStripped = device.publicKey.split(" ").slice(0, 2).join(" ");

      console.log(`Writing public key for device ${input} to ${pubkeyPath}`, commentStripped);

      await writeFile(pubkeyPath, `${commentStripped} ${input}\n`);

      try {
        const device = await prisma.device.update({
          where: { id: input },
          data: {
            approved: true,
            pin: null,
            port: nextPort,
            guacConnectionId: conn?.identifier,
          },
        });

        deviceSocketStore.sendToAdmin({
          to: "admin",
          type: "device:approve",
          deviceId: input,
        });

        if (deviceSocketStore.isConnected(`pending:${input}`)) {
          deviceSocketStore.sendTo(`pending:${input}`, {
            to: "device",
            type: "device:approve",
            token: generateDeviceToken(input),
            deviceId: input,
          });
        } else {
          console.warn(`Device ${input} was not waiting for approval`);
        }

        return device;
      } catch (error) {
        // remove the file
        await unlink(pubkeyPath);
        throw error;
      }
    } catch (error) {
      await deleteGuacConnection(conn.identifier);
      throw error;
    }
  }),

  toggleSsh: adminProcedure.input(z.string()).mutation(async ({ input }) => {
    const device = await prisma.device.findUnique({
      where: { id: input },
    });

    if (!device) {
      throw new Error("Device not found");
    }

    const updated = await prisma.device.update({
      where: { id: input },
      data: { sshOn: !device.sshOn },
    });

    deviceSocketStore.sendToAdmin({
      to: "admin",
      type: "device:update",
      deviceId: input,
    });

    if (deviceSocketStore.isConnected(`active:${device.id}`)) {
      deviceSocketStore.sendTo(`active:${device.id}`, {
        to: "device",
        type: "device:ssh",
        deviceId: input,
        ssh: updated.sshOn,
        port: updated.port,
        host: process.env.SSH_HOST_FOR_DEVICE ?? "localhost",
        user: process.env.SSH_USER ?? "tunneluser",
      });
    } else {
      console.warn(`Device ${input} is not connected, will enable SSH later`);
    }

    return updated;
  }),
});
