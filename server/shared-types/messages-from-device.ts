import type { DeviceStatus } from "../backend/src/websocket/DeviceStatusStore";

interface BaseMessage {
	to: "admin";
	deviceId: string;
}

export type DeviceStatusMessage = BaseMessage &
	Omit<DeviceStatus, "lastSeen"> & {
		type: "device:status";
	};
