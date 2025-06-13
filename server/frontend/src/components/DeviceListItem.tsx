import usePersistedState from "@/utils/usePersistedState";
import { CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import clsx from "clsx";
import {
  ChevronDown,
  Clock,
  Loader2,
  Monitor,
  MoreVertical,
  Network,
  Shield,
  ShieldCheck,
  Terminal,
  Trash2,
} from "lucide-react";
import { type Dispatch, type SetStateAction, useContext } from "react";
import { type Connection, ConnectionContext } from "../context/connection.ctx";
import { type Device, trpc } from "../utils/trpc";
import DeviceApproveForm from "./DeviceApproveForm";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Collapsible } from "./ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Switch } from "./ui/switch";

interface Props {
  device: Device;
  setActiveConnection: Dispatch<SetStateAction<Connection | null>>;
}

export default function DeviceListItem({ device, setActiveConnection }: Props) {
  const [collapsed, setCollapsed] = usePersistedState<boolean>(`${device.id}-collapse`, true);
  const sshMutation = trpc.admin.device.toggleConnection.useMutation();
  const unregisterMutation = trpc.admin.device.unregister.useMutation();
  const { connections, addConnection, removeConnection } = useContext(ConnectionContext) || {};

  const vncTunnelRunning = connections?.some(
    conn => conn.connectionId === device.guacVncConnectionId && conn.type === "vnc",
  );

  const sshTunnelRunning = connections?.some(
    conn => conn.connectionId === device.guacSshConnectionId && conn.type === "ssh",
  );

  const formatLastSeen = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  return (
    <Card
      onClick={() => {
        if (collapsed) {
          setCollapsed(false);
        }
      }}
      className={clsx(device.listening ? "border-green-400 bg-secondary" : "border-orange-400")}
    >
      <CardHeader className="pb-3 px-3 pt-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm font-medium">
              {device.name || `Device ${device.id}`}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{device.ip}</p>
          </div>
          <div className="flex items-center gap-2">
            {device.approved ? (
              <ShieldCheck className="h-4 w-4 text-green-500" />
            ) : (
              <Shield className="h-4 w-4 text-orange-500" />
            )}
            <Badge variant={device.approved ? "default" : "secondary"} className="text-xs">
              {device.approved ? "Approved" : "Pending"}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="center">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem
                  className="text-center"
                  onClick={() => {
                    unregisterMutation.mutate({ deviceId: device.id });
                    removeConnection?.(device.id);
                  }}
                >
                  <Trash2 />
                  Unregister Device
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 px-3 pb-3">
        <Collapsible
          open={!collapsed}
          onOpenChange={open => {
            setCollapsed(!open);
          }}
          className="flex flex-col"
        >
          <div className="flex items-center content-between gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Last seen: {formatLastSeen(device.lastSeen)}</span>
          </div>
          <CollapsibleTrigger asChild className="ml-auto">
            <Button variant="ghost">
              {collapsed ? "Show Details" : "Hide Details"}
              <ChevronDown
                className={clsx("h-4 w-4 ml-1 transition-transform", !collapsed && "rotate-180")}
              />
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            {device.approved ? (
              <>
                {/* SSH Section */}
                <div className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Terminal className="h-4 w-4" />
                      <span className="text-sm font-medium">SSH</span>
                      <span className="text-xs text-muted-foreground">:{device.sshPort}</span>
                    </div>
                    {sshMutation.isPending && (
                      <Loader2 className="h-4 w-4 ml-auto mr-2 animate-spin text-blue-500" />
                    )}
                    <Switch
                      checked={device.sshOn}
                      onCheckedChange={checked => {
                        removeConnection?.(device.guacSshConnectionId!);
                        sshMutation.mutate({
                          deviceId: device.id,
                          type: "ssh",
                          enable: checked,
                        });
                      }}
                    />
                  </div>
                  {device.sshOn && (
                    <>
                      {device.runningTunnels.length ? (
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">Ports:</span>
                          {device.runningTunnels.map(tunnel => (
                            <span className="text-xs text-green-500" key={tunnel.pid}>
                              {tunnel.local}:{tunnel.remote}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-red-500">SSH Tunnel Not Running</span>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs"
                        disabled={sshTunnelRunning}
                        onClick={() => {
                          const connection: Connection = {
                            deviceName: device.name || `Device ${device.id}`,
                            connectionId: device.guacSshConnectionId!,
                            deviceId: device.id,
                            localPort: device.sshLocalPort,
                            port: device.sshPort,
                            connectedAt: new Date().toISOString(),
                            type: "ssh",
                          };

                          addConnection?.(connection);
                          setActiveConnection(connection);
                        }}
                      >
                        <Network className="h-3 w-3 mr-1" />
                        {sshTunnelRunning ? "SSH Active" : "Connect SSH"}
                      </Button>
                    </>
                  )}
                </div>

                {/* VNC Section */}
                {device.vncEnabled && (
                  <div className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        <span className="text-sm font-medium">VNC</span>
                        <span className="text-xs text-muted-foreground">:{device.vncPort}</span>
                      </div>
                      {sshMutation.isPending && (
                        <Loader2 className="h-4 w-4 ml-auto mr-2 animate-spin text-blue-500" />
                      )}
                      <Switch
                        checked={device.vncOn}
                        onCheckedChange={checked => {
                          removeConnection?.(device.guacVncConnectionId!);
                          sshMutation.mutate({
                            deviceId: device.id,
                            type: "vnc",
                            enable: checked,
                          });
                        }}
                      />
                    </div>
                    {device.vncOn && (
                      <>
                        <div>
                          {device.vncServerRunning ? (
                            <span className="text-xs text-green-500">VNC Server Running</span>
                          ) : (
                            <span className="text-xs text-red-500">VNC Server Not Running</span>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs"
                          disabled={vncTunnelRunning}
                          onClick={() => {
                            const connection: Connection = {
                              deviceName: device.name || `Device ${device.id}`,
                              connectionId: device.guacVncConnectionId!,
                              deviceId: device.id,
                              localPort: undefined, // VNC doesn't use local port
                              port: device.vncPort,
                              connectedAt: new Date().toISOString(),
                              type: "vnc",
                            };

                            addConnection?.(connection);
                            setActiveConnection(connection);
                          }}
                        >
                          <Monitor className="h-3 w-3 mr-1" />
                          {vncTunnelRunning ? "VNC Active" : "Connect VNC"}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </>
            ) : (
              !!device.pin && <DeviceApproveForm deviceId={device.id} pin={device.pin} />
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
