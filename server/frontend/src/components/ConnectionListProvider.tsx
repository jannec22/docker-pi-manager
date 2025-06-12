import { type ReactNode, useMemo, useState } from "react";
import { type Connection, ConnectionContext } from "../context/connection.ctx";

interface Props {
  children?: ReactNode;
}

function ConnectionListProvider({ children }: Props) {
  const [connections, setConnections] = useState<Connection[]>();

  return (
    <ConnectionContext.Provider
      value={useMemo(
        () => ({
          connections,
          addConnection: (connection: Connection) => {
            setConnections(prev => [...(prev || []), connection]);
          },
          removeConnection: (connectionId: string) => {
            setConnections(prev => (prev ? prev.filter(c => c.connectionId !== connectionId) : []));
          },
        }),
        [connections],
      )}
    >
      {children}
    </ConnectionContext.Provider>
  );
}

export default ConnectionListProvider;
