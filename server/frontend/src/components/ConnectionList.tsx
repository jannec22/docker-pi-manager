import { Clock, Monitor, Network, Terminal, Unplug } from "lucide-react";
import { type Dispatch, type SetStateAction, useContext } from "react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { type Connection, ConnectionContext } from "../context/connection.ctx";

interface Props {
  setActive: Dispatch<SetStateAction<Connection | null>>;
}

const ConnectionList = ({ setActive }: Props) => {
  const { connections, removeConnection } = useContext(ConnectionContext) || {};

  if (!connections?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Network className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No connections</p>
        <p className="text-xs mt-1">Enable services to connect</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {connections?.map(connection => (
        <Card
          onClick={() => {
            setActive(connection);
          }}
          key={connection.connectionId}
          className="border-green-400 bg-secondary"
        >
          <CardContent className="p-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {connection.type === "ssh" ? (
                    <Terminal className="h-4 w-4 text-blue-500" />
                  ) : (
                    <Monitor className="h-4 w-4 text-purple-500" />
                  )}
                  <span className="text-sm font-medium">{connection.type.toUpperCase()}</span>
                  <Badge variant="default" className="text-xs">
                    Active
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    removeConnection?.(connection.connectionId);
                  }}
                  className="h-6 px-2 text-xs border-red-200 text-red-600 hover:bg-red-50"
                >
                  <Unplug className="h-3 w-3" />
                </Button>
              </div>

              <div className="text-xs text-muted-foreground">
                <div>{connection.deviceName}</div>
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(connection.connectedAt).toLocaleTimeString()}</span>
                </div>
                <div>Port: {connection.port}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ConnectionList;
