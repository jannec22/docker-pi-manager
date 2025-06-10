import argon2 from "argon2";
import { z } from "zod";
import { prisma } from "../../../prisma-client";
import { generateAdminToken } from "../../../token";
import { publicProcedure, router } from "../../trpc";

export const adminAuthRouter = router({
  login: publicProcedure
    .input(z.object({ username: z.string(), password: z.string() }))
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

      return { token, userId: user.id };
    }),
});
