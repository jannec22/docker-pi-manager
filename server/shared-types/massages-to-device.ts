import type { VncServerParams } from "./utils";

interface BaseMessage {
  to: "device";
  deviceId: string;
}

export interface DeviceApproveMessage extends BaseMessage {
  type: "device:approve";
  token: string;
}

export interface DeviceUnregisterMessage extends BaseMessage {
  type: "device:unregister";
}

export interface DeviceSshMessage extends BaseMessage {
  type: "device:ssh";
  ssh: boolean;
  vnc: boolean;
  sshPort: number;
  sshLocalPort?: number;

  vncPort: number;
  vncServerPassword: string;
  vncServerParams?: VncServerParams;

  user: string;
  host: string;
}

export interface UnauthorizedMessage extends BaseMessage {
  type: "device:unauthorized";
}

export type WebsocketMessage = DeviceApproveMessage | DeviceSshMessage | UnauthorizedMessage | DeviceUnregisterMessage;
