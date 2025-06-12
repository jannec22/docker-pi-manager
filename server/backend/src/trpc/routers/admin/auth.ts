import argon2 from "argon2";
import { z } from "zod";
import { getGuacAuth } from "../../../guacamole/connection";
import { prisma } from "../../../prisma-client";
import { generateAdminToken } from "../../../token";
import { adminProcedure } from "../../../trpc/middleware";
import { publicProcedure, router } from "../../trpc";

export const adminAuthRouter = router({
  login: publicProcedure
    .input(z.object({ username: z.string(), password: z.string() }))
    .output(
      z.object({
        token: z.string(),
        userId: z.string(),
        guacAuth: z.object({
          authToken: z.string(),
          dataSource: z.string(),
          expiration: z.date(),
        }),
      }),
    )
    .mutation(async ({ input }) => {
      const { username, password } = input;

      const user = await prisma.user.findUnique({
        where: { username },
      });

      if (!user || !(await argon2.verify(user.hash, password))) {
        throw new Error("Invalid username or password");
      }

      // Generate a token for the user (this could be a JWT or similar)
      const token = generateAdminToken(user.id);

      const guacAuth = await getGuacAuth();

      return { token, userId: user.id, guacAuth };
    }),
  getGuacAuth: adminProcedure
    .output(
      z.object({
        authToken: z.string(),
        dataSource: z.string(),
        expiration: z.date(),
      }),
    )
    .mutation(async () => {
      const guacAuth = await getGuacAuth();

      return guacAuth;
    }),
});
