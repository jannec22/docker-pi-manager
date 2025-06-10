import { execSync } from "child_process";
import {
	ensureSshRunning,
	ensureSshStopped,
	isSshRunning,
} from "./ssh-manager"; // adjust path if needed

const port = 10000;
const remotePort = 22;
const user = "tunneluser";
const host = "localhost";

const countAutosshProcesses = (): number => {
	try {
		const output = execSync(`ps -C autossh -o pid=`, { encoding: 'utf8' }).trim();
		if (!output) return 0;
		return output.split('\n').filter(Boolean).length;
	} catch {
		return 0;
	}
};

const runTest = async () => {
	console.log("--- Starting autossh test ---");

	console.log("[1] Ensuring autossh is running...");
	const pid1 = await ensureSshRunning(port, user, host);
	console.log(`   → Started SSH with PID: ${pid1}`);

	console.log("[2] Running ensureSshRunning() again...");
	const pid2 = await ensureSshRunning(port, user, host);
	console.log(`   → PID from second call: ${pid2}`);

	console.log("[3] Running ensureSshRunning() a third time...");
	const pid3 = await ensureSshRunning(port, user, host);
	console.log(`   → PID from third call: ${pid3}`);

	const count = countAutosshProcesses();
	console.log(`   → Autossh process count: ${count}`);
	if (count !== 1) {
		throw new Error(`❌ Expected 1 autossh process, found ${count}`);
	}

	console.log("[4] Verifying isSshRunning()...");
	const activePid = await isSshRunning();
	console.log(`   → Detected running SSH PID: ${activePid}`);
	if (activePid !== pid1) {
		throw new Error(
			`❌ Detected PID mismatch. Expected ${pid1}, got ${activePid}`,
		);
	}

	console.log("[5] Stopping SSH tunnel...");
	await ensureSshStopped();

	const finalCheck = await isSshRunning();
	if (finalCheck !== null) {
		throw new Error(
			`❌ SSH tunnel still running after stop! PID: ${finalCheck}`,
		);
	}

	const remaining = countAutosshProcesses();
	if (remaining !== 0) {
		throw new Error(
			`❌ Still ${remaining} autossh processes running after stop`,
		);
	}

	console.log("✅ All tests passed.");
};

runTest().catch((err) => {
	console.error("❌ Test failed:", err);
	process.exit(1);
});
