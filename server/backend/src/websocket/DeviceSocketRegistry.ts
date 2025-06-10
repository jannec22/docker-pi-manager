import type { WebsocketMessage as ToAdmin } from "@shared/massages-to-admin";
import type { WebsocketMessage as ToDevice } from "@shared/massages-to-device";
import WebSocket from "ws";

type WebsocketMessage = ToAdmin | ToDevice;

class DeviceWebSocketManager {
  private sockets = new Map<`${string}:${string}`, WebSocket>();

  register(id: `${string}:${string}`, stream: WebSocket) {
    this.sockets.set(id, stream);
  }

  unregister(id: `${string}:${string}`) {
    this.sockets.delete(id);
  }

  sendTo(id: `${string}:${string}`, message: WebsocketMessage): boolean {
    const socket = this.sockets.get(id);
    if (socket?.readyState === WebSocket.OPEN) {
      socket?.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  isConnected(id: `${string}:${string}`): boolean {
    return this.sockets.get(id)?.readyState === WebSocket.OPEN;
  }

  listActive(): string[] {
    return Array.from(this.sockets.keys());
  }

  registerAdminConnection(connection: WebSocket) {
    const id = `admin:${Date.now()}` as const; // Unique ID for admin connection
    this.register(id, connection);

    connection.on("close", () => {
      this.unregister(id);
    });

    connection.on("message", message => {
      console.log(`Admin message received: ${message?.toString()}`);
      // Handle admin messages if needed
    });

    console.log(`Admin connection registered with ID: ${id}`);
  }

  sendToAdmin(message: WebsocketMessage): boolean {
    const adminSockets = Array.from(this.sockets.entries())
      .filter(([id, socket]) => id.startsWith("admin:") && socket.readyState === WebSocket.OPEN)
      .map(([_, socket]) => socket);

    if (adminSockets.length > 0) {
      const str = JSON.stringify(message);
      console.log(`Sending message ${str} to ${adminSockets.length} admin sockets`);

      for (const socket of adminSockets) {
        socket.send(str);
      }

      return true;
    }

    return false;
  }
}

export const deviceSocketStore = new DeviceWebSocketManager();
