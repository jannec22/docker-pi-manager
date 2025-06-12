import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import type { AppRouter } from "@server/src/trpc/router";
import type { DeviceSshMessage, WebsocketMessage } from "@shared/massages-to-device";
import type { DeviceStatusMessage } from "@shared/messages-from-device";
import type { TunnelInfo } from "@shared/utils";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { inferRouterInputs } from "@trpc/server";
import typia from "typia";
import WebSocket from "ws";
import { getActiveSshTunnels, killSsh, startSsh } from "./ssh-manager";
import { ensureVncRunning, ensureVncStopped, isVncRunning } from "./vnc-manager";

const SERVER = "http://localhost:5000/trpc";
const WS_UNAUTHORIZED = "ws://localhost:5000/ws/device/pending";
const WS_AUTHORIZED = "ws://localhost:5000/ws/device";
const TOKEN_FILE = "./device-token.txt";

let token: string | null = null;
let lastRequestedTunnels: TunnelInfo[] = [];
let lastDeviceSshMessage: DeviceSshMessage | null = null;
let pendingSshPromise: Promise<void> | null = null;
let ws: WebSocket | null = null;

const parseWebsocketMessage = typia.json.createValidateParse<WebsocketMessage>();
const stringifyDeviceStatusMessage = typia.json.createStringify<DeviceStatusMessage>();

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: SERVER,
    }),
  ],
});

type RouterInputs = inferRouterInputs<AppRouter>;
type Info = RouterInputs["device"]["register"];

function getVitals(): Record<string, number | string> {
  const cpus = os.cpus();
  const loadAvg = os.loadavg();
  const mem = os.totalmem();
  const freeMem = os.freemem();
  const uptime = os.uptime();
  return {
    cpuCount: cpus.length,
    cpuModel: cpus[0]?.model || "unknown",
    cpuSpeed: cpus[0]?.speed || 0,
    load1: loadAvg[0],
    load5: loadAvg[1],
    load15: loadAvg[2],
    totalMem: mem,
    freeMem: freeMem,
    usedMem: mem - freeMem,
    uptime: uptime,
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    hostname: os.hostname(),
  };
}

function getDeviceInfo(): Info {
  const id = os.hostname();
  const machineId = existsSync("/etc/machine-id")
    ? readFileSync("/etc/machine-id", "utf-8").trim()
    : existsSync("/var/lib/dbus/machine-id")
      ? readFileSync("/var/lib/dbus/machine-id", "utf-8").trim()
      : "unknown";

  const macAddrs = os.networkInterfaces()
    ? Object.values(os.networkInterfaces())
        .flat()
        .filter(iface => iface && !iface.internal && iface.mac)
        .map(iface => iface?.mac)
        .filter<string>((mac): mac is string => typeof mac === "string")
    : [];

  const ip =
    Object.values(os.networkInterfaces())
      .flat()
      .find(iface => iface && !iface.internal && iface.family === "IPv4")?.address || "unknown";

  const publicKey = existsSync(`${os.homedir()}/.ssh/id_ed25519.pub`)
    ? readFileSync(`${os.homedir()}/.ssh/id_ed25519.pub`, "utf-8")
    : "";

  if (!publicKey) {
    throw new Error("Public key not found. Please generate an SSH key pair.");
  }

  return { id, ip, publicKey, machineId, macAddrs, stats: getVitals() };
}

function loadToken(): string | null {
  if (existsSync(TOKEN_FILE)) {
    return readFileSync(TOKEN_FILE, "utf-8").trim();
  }
  return null;
}

function saveToken(t: string) {
  writeFileSync(TOKEN_FILE, t);
}

function removeToken() {
  if (existsSync(TOKEN_FILE)) unlinkSync(TOKEN_FILE);
}

async function registerAndWait(info: Info): Promise<string> {
  console.info(`Registering device... at  ${SERVER}/device/register`);
  const res = await trpc.device.register.mutate(info);

  if ("token" in res) {
    console.log("Device registered successfully. Token received.");
    return res.token;
  }

  const pin = res.pin;
  console.log(`Please approve this device using PIN: ${pin}`);

  return await new Promise<string>(resolve => {
    const ws = new WebSocket(`${WS_UNAUTHORIZED}/${info.id}`);
    ws.on("message", data => {
      const result = parseWebsocketMessage(data.toString());

      if (result.success) {
        if (result.data?.type === "device:approve") {
          ws.close();
          console.log("Device approved. Token received via websocket.");
          resolve(result.data.token);
        }
      } else {
        console.error("Could not parse message:", ...result.errors);
      }
    });
  });
}

async function heartbeat(ws: WebSocket) {
  const info = getDeviceInfo();
  const vncRunning = lastDeviceSshMessage ? await isVncRunning(lastDeviceSshMessage) : false;
  const activeTunnels = await getActiveSshTunnels();

  let handleSsh = false;

  if (activeTunnels.length !== lastRequestedTunnels.length && lastDeviceSshMessage) {
    console.warn("SSH tunnels were requested but are not running. This may indicate an issue.");

    handleSsh = true;
  }

  if (!vncRunning && lastDeviceSshMessage?.vnc) {
    handleSsh = true;
  }

  const cmd = lastDeviceSshMessage;
  if (handleSsh && cmd) {
    if (pendingSshPromise) {
      pendingSshPromise.then(() => {
        console.log("Handling SSH command after previous one completed...");
        pendingSshPromise = handleSshCommand(cmd);
      });
    } else {
      pendingSshPromise = handleSshCommand(cmd);
    }
  }

  const payload = stringifyDeviceStatusMessage({
    to: "admin",
    type: "device:status",
    runningTunnels: activeTunnels,
    vncServerRunning: vncRunning,
    deviceId: info.id,
    ...info.stats,
  });

  if (ws.readyState === WebSocket.OPEN) {
    console.log("Sending heartbeat...");
    ws.send(payload);
  } else {
    console.error("WebSocket is not open. Cannot send heartbeat.");
  }
}

async function connectAuthorized(id: string, token: string) {
  let interval: NodeJS.Timeout;

  if (ws) {
    console.log("Closing existing WebSocket connection...");
    ws.close();
    ws = null;
  }

  return await new Promise<void>((_resolve, reject) => {
    const websocket = new WebSocket(`${WS_AUTHORIZED}/${id}?token=${token}`);
    ws = websocket;

    websocket.on("open", () => {
      console.log("Connected to authorized WebSocket");

      heartbeat(websocket);
      interval = setInterval(() => {
        heartbeat(websocket);
      }, 10_000);
    });

    websocket.on("message", data => {
      const result = parseWebsocketMessage(data.toString());

      if (result.success) {
        if (result.data.type === "device:ssh") {
          try {
            const data = result.data;
            if (pendingSshPromise) {
              console.log("Waiting for previous SSH command to complete...");
              pendingSshPromise.then(() => {
                console.log("Handling new SSH command after previous one completed...");
                pendingSshPromise = handleSshCommand(data);
              });
            } else {
              console.log("Handling new SSH command...");
              pendingSshPromise = handleSshCommand(data);
            }
          } catch (error) {
            console.error("Error handling SSH command:", error);
          }
        }
      } else {
        console.error("Could not parse message:", ...result.errors);
      }
    });

    websocket.on("close", () => {
      console.log("WebSocket closed.");
      clearInterval(interval);
      reject(new Error("WebSocket connection closed"));
    });

    websocket.on("error", err => {
      clearInterval(interval);
      console.error("WebSocket error:", err);
      reject(err);
    });
  });
}

async function handleSshCommand(cmd: DeviceSshMessage) {
  lastDeviceSshMessage = cmd;
  lastRequestedTunnels = [];

  if (cmd.ssh) {
    lastRequestedTunnels.push({
      remote: cmd.sshPort,
      local: cmd.sshLocalPort ?? 22,
      user: cmd.user,
      host: cmd.host,
      pid: -1,
    });
  }

  if (cmd.vnc) {
    lastRequestedTunnels.push({
      remote: cmd.vncPort,
      local: (cmd.vncServerParams?.display || 1) + 5900,
      user: cmd.user,
      host: cmd.host,
      pid: -1,
    });

    await ensureVncRunning(cmd);
  } else {
    ensureVncStopped(cmd);
  }

  let runningTunnels = await getActiveSshTunnels();

  console.log(
    `------running------
${runningTunnels.map(t => `${t.remote}->${t.local}\n`).join("")}
-----requested-----
${lastRequestedTunnels.map(t => `${t.remote}->${t.local}\n`).join("")}`,
  );

  const pidsToStop = runningTunnels
    .filter(
      tunnel =>
        !lastRequestedTunnels.some(
          nt => nt.remote === tunnel.remote && nt.user === tunnel.user && nt.host === tunnel.host,
        ),
    )
    .map(tunnel => tunnel.pid);

  const duplicateTunnels: TunnelInfo[] = [];
  // find all duplicated tunnels like:
  /**
   * ~/github/docker-pi-manager/server/backend  pgrep -af autossh
2615151 /usr/lib/autossh/autossh    -i /home/jannec/.ssh/id_ed25519 -p 2244 -o StrictHostKeyChecking=accept-new -N -R 11001:localhost:5901 tunneluser@localhost
2615226 /usr/lib/autossh/autossh    -i /home/jannec/.ssh/id_ed25519 -p 2244 -o StrictHostKeyChecking=accept-new -N -R 10001:localhost:22 tunneluser@localhost
2615229 /usr/lib/autossh/autossh    -i /home/jannec/.ssh/id_ed25519 -p 2244 -o StrictHostKeyChecking=accept-new -N -R 10001:localhost:22 tunneluser@localhost
2615233 /usr/lib/autossh/autossh    -i /home/jannec/.ssh/id_ed25519 -p 2244 -o StrictHostKeyChecking=accept-new -N -R 10001:localhost:22 tunneluser@localhost
~/github/docker-pi-manager/server/backend

   */

  for (const tunnel of runningTunnels) {
    const duplicates = runningTunnels.filter(
      rt =>
        rt.remote === tunnel.remote &&
        rt.user === tunnel.user &&
        rt.host === tunnel.host &&
        tunnel.pid !== rt.pid,
    );

    if (duplicates.length > 1) {
      console.warn(
        `Found duplicate running SSH tunnels for ${tunnel.remote} -> ${tunnel.local} (${duplicates.length} instances)`,
      );
      duplicateTunnels.push(...duplicates);
    }
  }

  pidsToStop.push(...duplicateTunnels.map(t => t.pid));

  if (pidsToStop.length !== 0) {
    console.log("Stopping SSH tunnels with PIDs:", pidsToStop);

    const results = await Promise.allSettled(pidsToStop.map(killSsh));

    for (const result of results) {
      if (result.status === "rejected") {
        console.error("Failed to stop SSH tunnel:", result.reason);
      } else {
        console.log("SSH tunnel stopped successfully.");
      }
    }
  }

  runningTunnels = await getActiveSshTunnels();
  const tunnelsToStart = lastRequestedTunnels.filter(
    nt =>
      !runningTunnels.some(
        rt => rt.remote === nt.remote && rt.user === nt.user && rt.host === nt.host,
      ),
  );

  if (tunnelsToStart.length === 0) {
    console.log("No new SSH tunnels to start.");
    return;
  }

  console.log(
    "Starting new SSH tunnels:",
    tunnelsToStart.map(t => `${t.remote}->${t.local}\n`).join(""),
  );

  const payload = stringifyDeviceStatusMessage({
    to: "admin",
    type: "device:status",
    runningTunnels: runningTunnels,
    requestedTunnels: lastRequestedTunnels,
    vncServerRunning: await isVncRunning(cmd),
    deviceId: cmd.deviceId,
    ...getVitals(),
  });

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(payload);
  } else {
    console.error("WebSocket is not open. Cannot send status update.");
  }

  await startSsh(tunnelsToStart);
}

async function main() {
  const info = getDeviceInfo();
  token = loadToken();

  if (!token) {
    console.log("No token, registering...");
    token = await registerAndWait(info);
    saveToken(token);
  }

  await connectAuthorized(info.id, token);
}

while (true) {
  try {
    await main();
    break; // Exit the loop if main completes successfully
  } catch (err) {
    console.error("Error in main loop:", err);
    console.log("Retrying in 5 seconds...");
    removeToken();
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}
