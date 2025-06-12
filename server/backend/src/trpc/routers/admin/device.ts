import { unlink, writeFile } from "node:fs/promises";
import type { Device } from "@prisma/client";
import { approveDeviceInputSchema } from "@shared/input/device";
import type { TunnelInfo } from "@shared/utils";
import { z } from "zod";
import { createGuacConnection, deleteGuacConnection } from "../../../guacamole/connection";
import { prisma } from "../../../prisma-client";
import { generateDeviceToken } from "../../../token";
import { deviceSocketStore } from "../../../websocket/DeviceSocketRegistry";
import { deviceStatusStore } from "../../../websocket/DeviceStatusStore";
import { adminProcedure } from "../../middleware";
import { router } from "../../trpc";

interface DeviceListItem extends Device {
  listening: boolean;
  vncServerRunning: boolean;
  runningTunnels: TunnelInfo[];
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
          const cp = { ...d };

          const device: DeviceListItem = {
            ...cp,
            listening: deviceSocketStore.isConnected(`active:${d.id}`),
            runningTunnels: deviceStatusStore.get(d.id)?.runningTunnels ?? [],
            vncServerRunning: deviceStatusStore.get(d.id)?.vncServerRunning ?? false,
          };

          return device;
        }),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  unregister: adminProcedure
    .input(z.object({ deviceId: z.string() }))
    .mutation(async ({ input }) => {
      const device = await prisma.device.findUnique({
        where: { id: input.deviceId },
      });
      if (!device) {
        throw new Error("Device not found");
      }

      if (!device.approved) {
        throw new Error("Cannot unregister unapproved device");
      }

      await prisma.device.delete({
        where: { id: input.deviceId },
      });

      deviceSocketStore.sendToAdmin({
        to: "admin",
        type: "device:unregister",
        deviceId: input.deviceId,
      });

      deviceSocketStore.sendTo(`pending:${input.deviceId}`, {
        to: "device",
        type: "device:unregister",
        deviceId: input.deviceId,
      });
      return device;
    }),

  approve: adminProcedure.input(approveDeviceInputSchema).mutation(async ({ input }) => {
    const maxPort = await prisma.device.aggregate({
      _max: { sshPort: true },
    });

    const maxVncPort = await prisma.device.aggregate({
      _max: { vncPort: true },
    });

    const nextPort = (maxPort._max.sshPort ?? 10000) + 1;
    const nextVncPort = (maxVncPort._max.vncPort ?? 11000) + 1;

    const sshConn = await createGuacConnection(
      input.deviceId,
      nextPort,
      "ssh",
      process.env.SSH_LISTENER_HOST ?? "localhost",
    );
    const vncConn = await createGuacConnection(
      input.deviceId,
      nextVncPort,
      "vnc",
      process.env.SSH_LISTENER_HOST ?? "localhost",
      input.vncServerPassword,
    );

    try {
      const device = await prisma.device.findUnique({
        where: { id: input.deviceId },
      });

      if (!device) {
        throw new Error("Device not found");
      }

      const pubkeyPath = `/mnt/keys/${input.deviceId}.pub`;
      const commentStripped = device.publicKey.split(" ").slice(0, 2).join(" ");

      console.log(
        `Writing public key for device ${input.deviceId} to ${pubkeyPath}`,
        commentStripped,
      );

      await writeFile(pubkeyPath, `${commentStripped} ${input.deviceId}\n`);

      try {
        const device = await prisma.device.update({
          where: { id: input.deviceId },
          data: {
            name: input.name,

            approved: true,
            pin: null,

            sshPort: nextPort,
            sshLocalPort: input.localSshPort,
            guacSshConnectionId: sshConn?.identifier,
            vncEnabled: input.vncEnabled,
            vncServerPassword: input.vncServerPassword ?? "",
            sshPrivateKey: input.privateKey ?? null,
            sshPrivateKeyPassphrase: input.privateKeyPassphrase ?? null,

            vncPort: nextVncPort,
            guacVncConnectionId: vncConn?.identifier,
            vncServerParams: input.vncServerParams ? JSON.stringify(input.vncServerParams) : null,
            vncClientParams: input.vncClientParams ? JSON.stringify(input.vncClientParams) : null,
          },
        });

        deviceSocketStore.sendToAdmin({
          to: "admin",
          type: "device:approve",
          deviceId: input.deviceId,
        });

        if (deviceSocketStore.isConnected(`pending:${input.deviceId}`)) {
          deviceSocketStore.sendTo(`pending:${input.deviceId}`, {
            to: "device",
            type: "device:approve",
            token: generateDeviceToken(input.deviceId),
            deviceId: input.deviceId,
          });
        } else {
          console.warn(`Device ${input.deviceId} was not waiting for approval`);
        }

        return device;
      } catch (error) {
        // remove the file
        await unlink(pubkeyPath);
        throw error;
      }
    } catch (error) {
      await deleteGuacConnection(sshConn.identifier);
      await deleteGuacConnection(vncConn.identifier);
      throw error;
    }
  }),

  toggleConnection: adminProcedure
    .input(
      z.object({
        deviceId: z.string(),
        type: z.enum(["ssh", "vnc"]),
      }),
    )
    .mutation(async ({ input }) => {
      const device = await prisma.device.findUnique({
        where: { id: input.deviceId },
      });

      if (!device) {
        throw new Error("Device not found");
      }

      const updated = await prisma.device.update({
        where: { id: input.deviceId },
        data: input.type === "ssh" ? { sshOn: !device.sshOn } : { vncOn: !device.vncOn },
      });

      deviceSocketStore.sendToAdmin({
        to: "admin",
        type: "device:update",
        deviceId: input.deviceId,
      });

      if (deviceSocketStore.isConnected(`active:${updated.id}`)) {
        deviceSocketStore.sendTo(`active:${updated.id}`, {
          to: "device",
          type: "device:ssh",
          deviceId: input.deviceId,
          ssh: updated.sshOn,
          vnc: updated.vncOn,
          sshPort: updated.sshPort,
          vncPort: updated.vncPort,
          sshLocalPort: updated.sshLocalPort,
          vncServerParams: updated.vncServerParams ? JSON.parse(updated.vncServerParams) : {},
          user: process.env.SSH_USER ?? "tunneluser",
          host: process.env.SSH_HOST_FOR_DEVICE ?? "localhost",
        });
      } else {
        console.warn(`Device ${input.deviceId} is not connected, will enable SSH later`);
      }

      return updated;
    }),
});
