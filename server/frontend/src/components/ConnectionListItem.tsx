import { trpc } from "@/utils/trpc";
import Guacamole from "guacamole-client";
import { useEffect, useRef, useState } from "react";

interface Props {
  connection: {
    deviceId: string;
    token: string;
    tokenExpiration: string;
    connectionId: string;
  };
}

export default function ConnectionListItem({ connection }: Props) {
  const utils = trpc.useUtils();
  const tunnelDomRef = useRef<HTMLDivElement | null>(null);
  const clientRef = useRef<Guacamole.Client | null>(null);

  const [error, setError] = useState<string | null>(null);

  const tunnelMutation = trpc.admin.device.toggleTunnel.useMutation({
    onSuccess: () => {
      utils.admin.device.listTunnels.invalidate();
    },
  });

  useEffect(() => {
    if (clientRef.current) {
      // Disconnect existing client if it exists
      clientRef.current.disconnect();
    }

    if (!connection.token || !connection.connectionId) {
      return;
    }

    const tunnel = new Guacamole.ChainedTunnel(
      new Guacamole.WebSocketTunnel("ws://localhost:8081/websocket-tunnel"),
    );

    clientRef.current = new Guacamole.Client(tunnel);

    clientRef.current.onstatechange = (state: Guacamole.Client.State) => {
      //   export type State =
      //     | 0 // IDLE
      //     | 1 // CONNECTING
      //     | 2 // WAITING
      //     | 3 // CONNECTED
      //     | 4 //  DISCONNECTING
      //     | 5; // DISCONNECTED
      if (state === 5) {
        console.log("Disconnected from Guacamole server");
        setError("Disconnected from Guacamole server");
      }
      if (state === 1) {
        // Handle connecting logic here if needed
        console.log("Connecting to Guacamole server...");
      }
      if (state === 3) {
        // Handle connected logic here if needed
        console.log("Connected to Guacamole server");
        setError(null); // Clear any previous errors
      }
    };

    clientRef.current.onerror = (error: Guacamole.Status) => {
      console.error("Guacamole error:", error.message);
      setError(error.message || null);
    };

    // Attach display to DOM
    if (tunnelDomRef.current) {
      tunnelDomRef.current.innerHTML = "";
      const displayEl = clientRef.current.getDisplay().getElement();
      tunnelDomRef.current.appendChild(displayEl);

      displayEl.tabIndex = 1; // Make it focusable
      displayEl.focus();
    }

    // Connect
    const params = new URLSearchParams({
      token: connection.token,
      GUAC_ID: connection.connectionId,
      GUAC_TYPE: "c",
      GUAC_DATA_SOURCE: "postgresql",
      GUAC_WIDTH: tunnelDomRef.current?.clientWidth.toString() || "1409",
      GUAC_HEIGHT: tunnelDomRef.current?.clientHeight.toString() || "1457",
      GUAC_DPI: "128",
      GUAC_TIMEZONE: "Asia/Nicosia",
      GUAC_AUDIO: "audio/L8",
      GUAC_IMAGE: "image/jpeg,image/png,image/webp",
    });

    clientRef.current.connect(params.toString());

    const mouse = new Guacamole.Mouse(clientRef.current.getDisplay().getElement());

    mouse.onmousedown =
      mouse.onmouseup =
      mouse.onmousemove =
        (mouseState: Guacamole.Mouse.State) => {
          clientRef.current?.sendMouseState(mouseState);
        };

    // Keyboard
    const keyboard = new Guacamole.Keyboard(tunnelDomRef.current || document);

    keyboard.onkeydown = (keysym: number) => {
      clientRef.current?.sendKeyEvent(1, keysym);
    };

    keyboard.onkeyup = (keysym: number) => {
      clientRef.current?.sendKeyEvent(0, keysym);
    };

    return () => {
      console.log("cleaning up connection");
      mouse.onmousedown = null;
      mouse.onmouseup = null;
      mouse.onmousemove = null;
      keyboard.onkeydown = null;
      keyboard.onkeyup = null;
      clientRef.current?.disconnect();
      clientRef.current = null;
    };
  }, [connection.token, connection.connectionId]);

  return (
    <>
      <div ref={tunnelDomRef} className="mt-2 w-full h-64 border rounded-md overflow-hidden">
        {/*  */}
      </div>

      {error && (
        <div className="mt-2 text-red-600">
          <strong>Error:</strong> {error}
        </div>
      )}

      <button
        type="button"
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={() => tunnelMutation.mutate(connection.deviceId)}
      >
        X
      </button>
    </>
  );
}
