import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { DeviceSshMessage } from "@shared/massages-to-device";

const getPid = async (display: number): Promise<number | null> => {
  const pidFile = path.join(os.homedir(), ".vnc", `${os.hostname()}:${display}.pid`);

  try {
    const content = await fs.readFile(pidFile, "utf8");
    const pid = Number.parseInt(content.trim(), 10);
    return Number.isNaN(pid) ? null : pid;
  } catch {
    return null;
  }
};

const killVnc = async (pid: number): Promise<void> => {
  try {
    // could use vncserver -kill :1

    console.log(`Killing VNC server with PID: ${pid}`);
    process.kill(pid, "SIGTERM");
  } catch {}
};

const startVnc = async (cmd: DeviceSshMessage): Promise<number> => {
  const display = cmd.vncServerParams?.display || 1;
  const password = cmd.vncServerPassword || "";

  console.log(`Starting VNC server on display :${display} with password ${password}`);

  const vncProcess = spawn("vncserver", [`:${display}`], { stdio: "ignore", detached: true });

  vncProcess.stdout?.on("data", data => {
    console.log(`VNC server output: ${data}`);
  });

  vncProcess.unref(); // allow it to run independently

  // wait untill pid is shown in ~/.vnc/<hostname>:<display>.pid

  let pid: number | null = null;
  let i = 0;
  while (i <= 10) {
    try {
      pid = await getPid(cmd.vncServerParams?.display || 1);
      if (pid) {
        console.log(`VNC server started with PID: ${pid}`);
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000)); // wait for 1 second
    } catch (error) {
      console.error("Error while checking VNC PID:", error);
      await new Promise(resolve => setTimeout(resolve, 1000)); // wait for 1 second
    }
    i++;
  }

  if (!pid || Number.isNaN(pid)) throw new Error("Failed to get vncserver PID");

  return pid;
};

export const isVncRunning = async (cmd: DeviceSshMessage): Promise<boolean> => {
  try {
    const pid = await getPid(cmd.vncServerParams?.display || 1);

    return !!pid;
  } catch (error) {
    console.error("Error checking VNC server status:", error);
    return false;
  }
};

export const ensureVncRunning = async (cmd: DeviceSshMessage): Promise<void> => {
  if (await isVncRunning(cmd)) {
    return;
  }

  console.log("VNC server is not running, starting it now...");

  await startVnc(cmd);
};

export const ensureVncStopped = async (cmd: DeviceSshMessage): Promise<void> => {
  const pid = await getPid(cmd.vncServerParams?.display || 1);

  if (pid) await killVnc(pid);
};
