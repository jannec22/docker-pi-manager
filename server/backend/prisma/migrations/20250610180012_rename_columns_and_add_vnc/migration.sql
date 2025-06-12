/*
  Warnings:

  - You are about to drop the column `port` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `token` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `tokenExpiration` on the `Device` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Device" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicKey" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "macAddrs" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "pin" TEXT,
    "sshOn" BOOLEAN NOT NULL DEFAULT false,
    "sshPort" INTEGER NOT NULL DEFAULT 10000,
    "sshLocalPort" INTEGER NOT NULL DEFAULT 22,
    "vncOn" BOOLEAN NOT NULL DEFAULT false,
    "vncPort" INTEGER NOT NULL DEFAULT 11000,
    "vncLocalPort" INTEGER NOT NULL DEFAULT 5900,
    "vncPassword" TEXT,
    "guacConnectionId" TEXT,
    "guacToken" TEXT,
    "guacTokenExpiration" DATETIME,
    "lastSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Device" ("approved", "guacConnectionId", "id", "ip", "lastSeen", "macAddrs", "machineId", "pin", "publicKey", "registeredAt", "sshOn") SELECT "approved", "guacConnectionId", "id", "ip", "lastSeen", "macAddrs", "machineId", "pin", "publicKey", "registeredAt", "sshOn" FROM "Device";
DROP TABLE "Device";
ALTER TABLE "new_Device" RENAME TO "Device";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
