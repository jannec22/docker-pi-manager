interface BaseMessage {
	to: "device";
	deviceId: string;
}

export interface DeviceApproveMessage extends BaseMessage {
	type: "device:approve";
	token: string;
}

export interface DeviceSshMessage extends BaseMessage {
	type: "device:ssh";
	ssh: boolean;
	port: number;
	user: string;
	host: string;
}

export interface UnauthorizedMessage extends BaseMessage {
	type: "device:unauthorized";
}

export type WebsocketMessage = DeviceApproveMessage | DeviceSshMessage | UnauthorizedMessage;
