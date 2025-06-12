interface BaseMessage {
	to: "admin";
	deviceId: string;
}

export interface DeviceAddMessage extends BaseMessage {
	type: "device:add";
}

export interface DeviceApproveMessage extends BaseMessage {
	type: "device:approve";
}

export interface DeviceConnectMessage extends BaseMessage {
	type: "device:connect";
}

export interface DeviceDisconnectMessage extends BaseMessage {
	type: "device:disconnect";
}

export interface DeviceUpdateMessage extends BaseMessage {
	type: "device:update";
}

export interface DeviceUnregisterMessage extends BaseMessage {
	type: "device:unregister";
}

export type WebsocketMessage =
	| DeviceAddMessage
	| DeviceApproveMessage
	| DeviceConnectMessage
	| DeviceUpdateMessage
	| DeviceDisconnectMessage
	| DeviceUnregisterMessage;
