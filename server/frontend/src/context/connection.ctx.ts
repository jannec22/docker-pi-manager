import { createContext } from "react";

export interface Connection {
  connectionId: string;
  deviceId: string;
  type: "ssh" | "vnc";
}

interface ConnectionContext {
  connections?: Connection[];
  addConnection: (connection: Connection) => void;
  removeConnection: (connectionId: string) => void;
}

export const ConnectionContext = createContext<ConnectionContext | undefined>(undefined);
