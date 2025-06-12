import clsx from "clsx";
import { useContext } from "react";
import { ConnectionContext } from "../context/connection.ctx";
import { type Device, trpc } from "../utils/trpc";
import DeviceApproveForm from "./DeviceApproveForm";

interface Props {
  device: Device;
}

export default function DeviceListItem({ device }: Props) {
  const sshMutation = trpc.admin.device.toggleConnection.useMutation();
  const unregisterMutation = trpc.admin.device.unregister.useMutation();
  const { connections, addConnection, removeConnection } = useContext(ConnectionContext) || {};

  const vncTunnelRunning = connections?.some(
    conn => conn.connectionId === device.guacVncConnectionId && conn.type === "vnc",
  );

  const sshTunnelRunning = connections?.some(
    conn => conn.connectionId === device.guacSshConnectionId && conn.type === "ssh",
  );

  return (
    <li className="p-4 border rounded-md shadow-sm mb-2 bg-white flex flex-wrap gap-2 text-sm text-gray-800">
      <div className="flex flex-col grow">
        <div className="flex items-center gap-2">
          <strong className="my-auto text-lg font-semibold text-gray-900">
            {device.name || "Unnamed Device"}
          </strong>
          <span className="my-auto font-mono font-semibold text-gray-900">[{device.id}]</span>
          {device.pin && !device.approved && (
            <span className="my-auto text-gray-500">PIN: {device.pin}</span>
          )}
          {device.listening && <span className="text-green-600 font-medium">[online]</span>}
        </div>

        <div className="flex flex-col">
          <span>
            Mapped ports:
          </span>
          {
            device.runningTunnels.map(tunnel => (
              <span
                key={tunnel.remote + tunnel.local}
                className={clsx(
                  "inline-block text-xs font-semibold",
                  device.sshOn ? "text-blue-800" : "bg-gray-100 text-gray-800",
                )}
              >
                <i className="font-mono">[{tunnel.local}]</i>
                {"→"}
                <i className="font-mono">[{tunnel.remote}]</i>
              </span>
            ))
          }
        </div>

        <div>
          {device.vncOn ? (
            <span
              className={clsx(
                "font-semibold",
                device.vncServerRunning ? "text-green-500" : "text-orange-600",
              )}
            >
              VNC enabled {device.vncServerRunning ? "and running" : "but not running"}
            </span>
          ) : (
            <span
              className={clsx(
                "font-semibold",
                device.vncServerRunning ? "text-orange-600" : "text-gray-500",
              )}
            >
              VNC disabled {device.vncServerRunning ? "but running" : "and not running"}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-2 ml-auto">
        {!device.approved && !!device.pin && (
          <DeviceApproveForm deviceId={device.id} pin={device.pin} />
        )}

        {device.approved && !sshTunnelRunning && (
          <button
            type="button"
            disabled={sshMutation.isPending}
            className={`${
              device.sshOn ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
            } text-white px-3 py-1 rounded disabled:opacity-50`}
            onClick={() =>
              sshMutation.mutate({
                deviceId: device.id,
                type: "ssh",
              })
            }
          >
            {device.sshOn ? "Disable SSH" : "Enable SSH"}
          </button>
        )}

        {device.approved && !vncTunnelRunning && (
          <button
            type="button"
            disabled={sshMutation.isPending}
            className={`${
              device.sshOn ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
            } text-white px-3 py-1 rounded disabled:opacity-50`}
            onClick={() =>
              sshMutation.mutate({
                deviceId: device.id,
                type: "vnc",
              })
            }
          >
            {device.vncOn ? "Disable VNC" : "Enable VNC"}
          </button>
        )}

        {!!device.guacSshConnectionId && (
          <button
            type="button"
            disabled={device.sshOn === false}
            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded disabled:opacity-50"
            onClick={() => {
              if (!sshTunnelRunning) {
                addConnection?.({
                  connectionId: device.guacSshConnectionId!,
                  deviceId: device.id,
                  type: "ssh",
                });
              } else if (device.guacSshConnectionId) {
                removeConnection?.(device.guacSshConnectionId);
              }
            }}
          >
            {sshTunnelRunning
              ? "Stop SSH Tunnel"
              : "Start SSH Tunnel"}
          </button>
        )}

        {device.vncServerRunning && !!device.guacVncConnectionId && (
          <button
            type="button"
            disabled={device.sshOn === false}
            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded disabled:opacity-50"
            onClick={() => {
              if (!vncTunnelRunning) {
                addConnection?.({
                  connectionId: device.guacVncConnectionId!,
                  deviceId: device.id,
                  type: "vnc",
                });
              } else if (device.guacVncConnectionId) {
                removeConnection?.(device.guacVncConnectionId);
              }
            }}
          >
            {vncTunnelRunning
              ? "Stop VNC Tunnel"
              : "Start VNC Tunnel"}
          </button>
        )}

        {device.approved && (
          <button
            type="button"
            disabled={unregisterMutation.isPending}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded disabled:opacity-50"
            onClick={() => unregisterMutation.mutate({ deviceId: device.id })}
          >
            Unregister Device
          </button>
        )}
      </div>
    </li>
  );
}
