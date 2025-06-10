import { exec, spawn } from "child_process";
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);
const pidFile = path.join(os.tmpdir(), "managed_autossh.pid");

const savePid = async (pid: number): Promise<void> => {
	await fs.writeFile(pidFile, pid.toString(), "utf8");
};

const getPid = async (): Promise<number | null> => {
	try {
		const content = await fs.readFile(pidFile, "utf8");
		const pid = parseInt(content.trim(), 10);
		return Number.isNaN(pid) ? null : pid;
	} catch {
		return null;
	}
};

const isPidSsh = async (pid: number): Promise<boolean> => {
	try {
		const { stdout } = await execAsync(`ps -p ${pid} -o comm=`);
		const name = stdout.trim();
		return name === "ssh" || name === "autossh";
	} catch {
		return false;
	}
};

const killSsh = async (pid: number): Promise<void> => {
	if (await isPidSsh(pid)) {
		try {
			process.kill(pid, "SIGTERM");
			await fs.unlink(pidFile).catch(() => {});
		} catch {}
	}
};

const startSsh = async (
	port: number,
	user: string,
	host: string,
): Promise<number> => {
	console.log(`Starting autossh -f -i ~/.ssh/id_ed25519 -p 2244 -N -R ${port}:localhost:22 ${user}@${host}`);
	const sshProcess = spawn(
		"autossh",
		[
			"-f",
			"-i",
			`${os.homedir()}/.ssh/id_ed25519`,
			"-p",
			"2244",
			"-o",
			"StrictHostKeyChecking=accept-new",
			"-N",
			"-R",
			`${port}:localhost:22`,
			`${user}@${host}`,
		],
		{ stdio: "ignore", detached: true },
	);

	sshProcess.unref(); // allow it to run independently
	await new Promise((resolve) => setTimeout(resolve, 500)); // give it a moment to fork

	// find the real autossh PID (the forked one)
	const { stdout } = await execAsync(
		`pgrep -f "autossh.*${port}:localhost:22"`,
	);
	const lines = stdout.trim().split("\n").map(Number);
	const pid = lines[0]; // get the first match

	if (!pid || Number.isNaN(pid)) throw new Error("Failed to get autossh PID");

	await savePid(pid);
	return pid;
};

export const isSshRunning = async (): Promise<number | null> => {
	const pid = await getPid();
	if (!pid || !(await isPidSsh(pid))) return null;
	return pid;
};

export const ensureSshRunning = async (
	port: number,
	user: string,
	host: string,
): Promise<number> => {
	const runningPid = await isSshRunning();
	if (runningPid) return runningPid;
	return await startSsh(port, user, host);
};

export const ensureSshStopped = async (): Promise<void> => {
	const pid = await getPid();
	if (pid) await killSsh(pid);
};
