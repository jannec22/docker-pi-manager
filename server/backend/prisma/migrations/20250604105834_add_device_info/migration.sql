/*
  Warnings:

  - Added the required column `macAddrs` to the `Device` table without a default value. This is not possible if the table is not empty.
  - Added the required column `machineId` to the `Device` table without a default value. This is not possible if the table is not empty.

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
    "lastSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Device" ("approved", "id", "ip", "lastSeen", "pin", "publicKey", "sshOn") SELECT "approved", "id", "ip", "lastSeen", "pin", "publicKey", "sshOn" FROM "Device";
DROP TABLE "Device";
ALTER TABLE "new_Device" RENAME TO "Device";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
