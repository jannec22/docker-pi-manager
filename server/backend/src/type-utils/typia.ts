import type { WebsocketMessage } from "@shared/massages-to-device";
import type { DeviceStatusMessage } from "@shared/messages-from-device";
import typia from "typia";

export const parseDeviceStatusMessage = typia.json.createValidateParse<DeviceStatusMessage>();

export const stringifyWebsocketMessage = typia.json.createStringify<WebsocketMessage>();
