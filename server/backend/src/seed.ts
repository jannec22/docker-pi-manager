import argon2 from "argon2";
import { prisma } from "./prisma-client";

async function main() {
  // drop existing data
  await prisma.device.deleteMany();

  const defaultUser = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      id: "admin-id",
      username: "admin",
      hash: await argon2.hash("password"),
    },
  });

  console.log("Default user created:", defaultUser);
}

try {
  await main();
} catch (e) {
  console.error("Error during seeding:", e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
