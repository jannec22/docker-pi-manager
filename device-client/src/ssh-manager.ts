import { exec, spawn } from "node:child_process";
import * as os from "node:os";
import { promisify } from "node:util";
import type { TunnelInfo } from "@shared/utils";

const execAsync = promisify(exec);

// const isPidSsh = async (pid: number): Promise<boolean> => {
//   try {
//     const { stdout } = await execAsync(`ps -p ${pid} -o comm=`);
//     const name = stdout.trim();
//     return name === "ssh" || name === "autossh";
//   } catch {
//     return false;
//   }
// };

export const killSsh = async (pid: number): Promise<void> => {
  // if (await isPidSsh(pid)) {
  try {
    process.kill(pid, "SIGTERM");
  } catch {}
  // }
};

export const getActiveSshTunnels = async (): Promise<TunnelInfo[]> => {
  /**
	 * pgrep -af autossh | while read -r pid cmd; do
  echo "PID: $pid"
  echo "  Command: $cmd"
  echo "$cmd" | grep -oE '\-R [0-9]+:[^ ]+' | while read -r tunnel; do
    port=$(echo $tunnel | cut -d' ' -f2 | cut -d: -f1)
    dest=$(echo $tunnel | cut -d' ' -f2 | cut -d: -f2-)
    echo "  Reverse Tunnel: remote_port=$port → $dest"
  done
done
	 */

  const { stdout } = await execAsync("pgrep -af autossh");
  const lines = stdout.trim().split("\n");
  const tunnels: TunnelInfo[] = [];
  for (const line of lines) {
    const parts = line.split(" ");
    const pid = parts[0];
    const cmd = parts.slice(1).join(" ");

    const userHostMatch = cmd.match(/(\w+)@([^ ]+)/);
    if (!userHostMatch) continue; // skip if no user@host found
    const user = userHostMatch[1];
    const host = userHostMatch[2];

    // remote:localhost:local
    const regex = /-R\s+(?<remote>\d+):localhost:(?<local>\d+)/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(cmd)) !== null) {
      const remote = Number.parseInt(match.groups?.remote || "0", 10);
      const local = Number.parseInt(match.groups?.local || "0", 10);
      if (remote > 0 && local > 0) {
        tunnels.push({
          remote,
          local,
          user,
          host,
          pid: Number.parseInt(pid, 10),
        });
      }
    }
  }

  return tunnels;
};

export const startSsh = async (tunnels: TunnelInfo[]): Promise<void> => {
  if (tunnels.length === 0) {
    throw new Error("No SSH tunnels provided to start.");
  }

  const user = tunnels[0].user;
  const host = tunnels[0].host;

  const params = [
    "-f",
    "-i",
    `${os.homedir()}/.ssh/id_ed25519`,
    "-p",
    "2244",
    "-o",
    "StrictHostKeyChecking=accept-new",
    "-N",
  ];

  for (const tunnel of tunnels) {
    params.push("-R", `${tunnel.remote}:localhost:${tunnel.local}`);
  }

  params.push(`${user}@${host}`);

  const sshProcess = spawn("autossh", params, {
    stdio: "ignore",
    detached: true,
  });

  sshProcess.unref(); // allow it to run independently
  await new Promise(resolve => setTimeout(resolve, 500)); // give it a moment to fork

  let i = 0;

  while (++i <= 5) {
    const activeTunnels = await getActiveSshTunnels();

    // check if all tunnels are running
    if (
      tunnels.every(tunnel =>
        activeTunnels.some(
          activeTunnel =>
            activeTunnel.remote === tunnel.remote &&
            activeTunnel.local === tunnel.local &&
            activeTunnel.user === tunnel.user &&
            activeTunnel.host === tunnel.host,
        ),
      )
    ) {
      return;
    }

    console.log(`Waiting for SSH tunnels to start... Attempt ${i}/5`);
    await new Promise(resolve => setTimeout(resolve, 1000)); // wait for 1 second
  }

  throw new Error("Failed to start some SSH tunnels after 5 seconds.");
};
