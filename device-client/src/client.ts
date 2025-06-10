import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import type { AppRouter } from "@server/src/trpc/router";
import type { WebsocketMessage } from "@shared/massages-to-device";
import type { DeviceStatusMessage } from "@shared/messages-from-device";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { inferRouterInputs } from "@trpc/server";
import typia from "typia";
import WebSocket from "ws";
import {
	ensureSshRunning,
	ensureSshStopped,
	isSshRunning,
} from "./ssh-manager";

const SERVER = "http://localhost:5000/trpc";
const WS_UNAUTHORIZED = "ws://localhost:5000/ws/device/pending";
const WS_AUTHORIZED = "ws://localhost:5000/ws/device";
const TOKEN_FILE = "./device-token.txt";

let token: string | null = null;
let startingSsh = false;

const parseWebsocketMessage =
	typia.json.createValidateParse<WebsocketMessage>();

const stringifyDeviceStatusMessage =
	typia.json.createStringify<DeviceStatusMessage>();

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
				.filter((iface) => iface && !iface.internal && iface.mac)
				.map((iface) => iface?.mac)
				.filter<string>((mac): mac is string => typeof mac === "string")
		: [];

	const ip =
		Object.values(os.networkInterfaces())
			.flat()
			.find((iface) => iface && !iface.internal && iface.family === "IPv4")
			?.address || "unknown";

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

	return await new Promise<string>((resolve) => {
		const ws = new WebSocket(`${WS_UNAUTHORIZED}/${info.id}`);
		ws.on("message", (data) => {
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
	const sshRunning = (await isSshRunning()) !== null;

	const payload = stringifyDeviceStatusMessage({
		to: "admin",
		type: "device:status",
		sshRunning,
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
	const sshRunning = (await isSshRunning()) !== null;
	let interval: NodeJS.Timeout;

	return await new Promise<void>((_resolve, reject) => {
		const ws = new WebSocket(
			`${WS_AUTHORIZED}/${id}?token=${token}&sshRunning=${sshRunning}`,
		);

		ws.on("open", () => {
			console.log("Connected to authorized WebSocket");

			heartbeat(ws);
			interval = setInterval(() => {
				heartbeat(ws);
			}, 10_000);
		});

		ws.on("message", (data) => {
			const result = parseWebsocketMessage(data.toString());

			if (result.success) {
				if (result.data.type === "device:ssh") {
					try {
						handleSshCommand({
							enable: result.data.ssh,
							port: result.data.port,
							user: result.data.user,
							host: result.data.host,
						});
					} catch (error) {
						console.error("Error handling SSH command:", error);
					}
				}
			} else {
				console.error("Could not parse message:", ...result.errors);
			}
		});

		ws.on("close", () => {
			console.log("WebSocket closed.");
			clearInterval(interval);
			reject(new Error("WebSocket connection closed"));
		});

		ws.on("error", (err) => {
			clearInterval(interval);
			console.error("WebSocket error:", err);
			reject(err);
		});
	});
}

async function handleSshCommand(cmd: {
	enable: boolean;
	port: number;
	user: string;
	host: string;
}) {
	console.log(
		`Handling SSH command: ${cmd.enable ? "Enable" : "Disable"} SSH tunnel on port ${cmd.port} for user ${cmd.user} at host ${cmd.host}`,
	);
	if (startingSsh) {
		console.log("SSH command is already being processed, skipping...");
		return;
	}

	startingSsh = true;

	if (!cmd.enable) {
		await ensureSshStopped();
	} else {
		await ensureSshRunning(cmd.port, cmd.user, cmd.host);
	}

	startingSsh = false;
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
		await new Promise((resolve) => setTimeout(resolve, 5000));
	}
}
