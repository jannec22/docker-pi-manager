import type { WebsocketMessage } from "@shared/massages-to-admin";
import { useEffect } from "react";
import typia from "typia";
import { trpc } from "./trpc";

const parseWebsocketMessage = typia.json.createIsParse<WebsocketMessage>();

export function useAdminWebsocket() {
  const utils = trpc.useUtils();

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:5000/ws/admin");

    ws.onmessage = event => {
      const msg = parseWebsocketMessage(event.data);

      if (msg?.type.startsWith("device")) {
        // const id = msg.deviceId;
        utils.admin.device.list.invalidate(); // Invalidate the device list query to refresh data
      }
    };

    return () => ws.close();
  }, [utils]);
}
