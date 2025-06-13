import { createContext } from "react";

export interface Connection {
  deviceName: string;
  connectionId: string;
  deviceId: string;
  localPort?: number;
  port: number;
  connectedAt: string; // ISO date string
  type: "ssh" | "vnc";
}

interface ConnectionContext {
  connections?: Connection[];
  addConnection: (connection: Connection) => void;
  removeConnection: (connectionId: string) => void;
}

export const ConnectionContext = createContext<ConnectionContext | undefined>(undefined);
