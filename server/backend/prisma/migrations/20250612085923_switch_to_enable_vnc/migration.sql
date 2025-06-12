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
    "name" TEXT,
    "sshOn" BOOLEAN NOT NULL DEFAULT false,
    "sshPort" INTEGER NOT NULL DEFAULT 10000,
    "sshLocalPort" INTEGER NOT NULL DEFAULT 22,
    "guacSshConnectionId" TEXT,
    "sshPrivateKey" TEXT,
    "sshPrivateKeyPassphrase" TEXT,
    "vncOn" BOOLEAN NOT NULL DEFAULT false,
    "vncPort" INTEGER NOT NULL DEFAULT 11000,
    "vncEnabled" BOOLEAN NOT NULL DEFAULT false,
    "vncServerPassword" TEXT NOT NULL DEFAULT '',
    "vncServerParams" TEXT,
    "vncClientParams" TEXT,
    "guacVncConnectionId" TEXT,
    "lastSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Device" ("approved", "guacSshConnectionId", "guacVncConnectionId", "id", "ip", "lastSeen", "macAddrs", "machineId", "name", "pin", "publicKey", "registeredAt", "sshLocalPort", "sshOn", "sshPort", "sshPrivateKey", "sshPrivateKeyPassphrase", "vncClientParams", "vncOn", "vncPort", "vncServerParams", "vncServerPassword") SELECT "approved", "guacSshConnectionId", "guacVncConnectionId", "id", "ip", "lastSeen", "macAddrs", "machineId", "name", "pin", "publicKey", "registeredAt", "sshLocalPort", "sshOn", "sshPort", "sshPrivateKey", "sshPrivateKeyPassphrase", "vncClientParams", "vncOn", "vncPort", "vncServerParams", "vncServerPassword" FROM "Device";
DROP TABLE "Device";
ALTER TABLE "new_Device" RENAME TO "Device";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
