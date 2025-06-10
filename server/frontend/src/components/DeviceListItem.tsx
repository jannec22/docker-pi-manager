import { type Device, trpc } from "@/utils/trpc";
import clsx from "clsx";

interface Props {
  device: Device;
}

export default function DeviceListItem({ device }: Props) {
	const utils = trpc.useUtils();
  const approveMutation = trpc.admin.device.approve.useMutation();
  const sshMutation = trpc.admin.device.toggleSsh.useMutation();
  const tunnelMutation = trpc.admin.device.toggleTunnel.useMutation({
	onSuccess: () => {
		utils.admin.device.listTunnels.invalidate(); // Invalidate the device list query to refresh data
	}
  });

  return (
    <li className="p-4 border rounded-md shadow-sm mb-2 bg-white flex flex-wrap gap-2 text-sm text-gray-800">
      <div className="flex flex-col grow">
        <div className="flex items-center gap-2">
          <span className="font-mono font-semibold text-gray-900">{device.id}</span>
          {device.pin && !device.approved && (
            <span className="text-gray-500">PIN: {device.pin}</span>
          )}
          {device.listening && <span className="text-green-600 font-medium">[online]</span>}
        </div>

        <div>
          {device.sshOn ? (
            <span
              className={clsx(
                "font-semibold",
                device.sshRunning ? "text-green-500" : "text-orange-600",
              )}
            >
              SSH enabled {device.sshRunning ? "and running" : "but not running"}
            </span>
          ) : (
            <span
              className={clsx(
                "font-semibold",
                device.sshRunning ? "text-orange-600" : "text-gray-500",
              )}
            >
              SSH disabled {device.sshRunning ? "but running" : "and not running"}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-2 ml-auto">
        {!device.approved && (
          <button
            type="button"
            disabled={approveMutation.isPending}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded disabled:opacity-50"
            onClick={() => approveMutation.mutate(device.id)}
          >
            {approveMutation.isPending ? "Approving..." : "Approve"}
          </button>
        )}

        {device.approved && (
          <button
            type="button"
            disabled={sshMutation.isPending}
            className={`${
              device.sshOn ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
            } text-white px-3 py-1 rounded disabled:opacity-50`}
            onClick={() => sshMutation.mutate(device.id)}
          >
            {sshMutation.isPending
              ? "Updating SSH..."
              : device.sshOn
                ? "Disable SSH"
                : "Enable SSH"}
          </button>
        )}

        {device.sshRunning && (
          <button
            type="button"
            disabled={tunnelMutation.isPending || device.sshOn === false}
            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded disabled:opacity-50"
            onClick={() => tunnelMutation.mutate(device.id)}
          >
            {tunnelMutation.isPending ? "Loading..." : device.tunnelActive ? "Stop Tunnel" : "Start Tunnel"}
          </button>
        )}
      </div>
    </li>
  );
}
