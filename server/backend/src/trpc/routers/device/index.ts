import { z } from "zod";
import { prisma } from "../../../prisma-client";
import { generateDeviceToken } from "../../../token";
import { deviceSocketStore } from "../../../websocket/DeviceSocketRegistry";
import { publicProcedure, router } from "../../trpc";

export const deviceRouter = router({
  register: publicProcedure
    .input(
      z.object({
        id: z.string(),
        ip: z.string(),
        publicKey: z.string(),
        machineId: z.string(),
        macAddrs: z.array(z.string()),
        stats: z.record(z.any()),
      }),
    )
    .mutation(async ({ input }) => {
      // check if exists
      const existingDevice = await prisma.device.findUnique({
        where: { id: input.id },
      });

      const pin = existingDevice?.pin ?? Math.floor(100000 + Math.random() * 900000).toString();

      await prisma.device.upsert({
        where: { id: input.id },
        update: {
          ip: input.ip,
          publicKey: input.publicKey,
          machineId: input.machineId,
          macAddrs: input.macAddrs.join(","),
          lastSeen: new Date(),
          pin,
        },
        create: {
          id: input.id,
          ip: input.ip,
          publicKey: input.publicKey,
          machineId: input.machineId,
          macAddrs: input.macAddrs.join(","),
          lastSeen: new Date(),
          approved: false,
          pin,
          sshOn: false,
        },
      });

      if (!existingDevice) {
        deviceSocketStore.sendToAdmin({
          to: "admin",
          type: "device:add",
          deviceId: input.id,
        });
      }

      if (existingDevice?.approved) {
        return {
          token: generateDeviceToken(input.id),
        };
      }

      return { pin };
    }),
});
