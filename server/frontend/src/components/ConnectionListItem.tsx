import Guacamole from "guacamole-client";
import { useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "../context/auth.ctx";
import { type Connection, ConnectionContext } from "../context/connection.ctx";

interface Props {
  connection: Connection;
}

const SUPER_L = 65511;
const CTRL_L = 65507;
const SHIFT_L = 65505;

export default function ConnectionListItem({ connection }: Props) {
  const tunnelDomRef = useRef<HTMLDivElement | null>(null);
  const clientRef = useRef<Guacamole.Client | null>(null);
  const { removeConnection } = useContext(ConnectionContext) || {};
  const { guacAuth } = useContext(AuthContext) || {};

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (clientRef.current) {
      // Disconnect existing client if it exists
      clientRef.current.disconnect();
    }

    if (!guacAuth?.authToken) {
      console.error("No Guacamole auth token available");
      return;
    }

    console.log("Connecting to Guacamole server with auth token:", guacAuth.authToken);
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
        removeConnection?.(connection.connectionId);
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
      token: guacAuth.authToken,
      GUAC_ID: connection.connectionId,
      GUAC_TYPE: "c",
      GUAC_DATA_SOURCE: guacAuth.dataSource,
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

    let isCtrlPressed = false;
    let isShiftPressed = false;

    keyboard.onkeydown = (keysym: number) => {
      const wasSuperPressed = isCtrlPressed && isShiftPressed;

      if (keysym === SUPER_L || keysym === CTRL_L) {
        isCtrlPressed = true;
      }
      if (keysym === SHIFT_L) {
        isShiftPressed = true;
      }

      if (
        (keysym === SHIFT_L || keysym === CTRL_L || keysym === SUPER_L) &&
        !wasSuperPressed &&
        isCtrlPressed &&
        isShiftPressed
      ) {
        console.log("Sending super key press");
        clientRef.current?.sendKeyEvent(1, SUPER_L); // ctrl shift is super
      } else {
        console.log("Sending key press:", keysym);
        clientRef.current?.sendKeyEvent(1, keysym);
      }
    };

    keyboard.onkeyup = (keysym: number) => {
      const wasSuperPressed = isCtrlPressed && isShiftPressed;

      if (keysym === SUPER_L || keysym === CTRL_L) {
        isCtrlPressed = false;
      }
      if (keysym === SHIFT_L) {
        isShiftPressed = false;
      }

      if (
        wasSuperPressed &&
        (keysym === SUPER_L || keysym === CTRL_L || keysym === SHIFT_L)
      ) {
        console.log("Sending super key release");
        clientRef.current?.sendKeyEvent(0, SUPER_L); // ctrl shift is super
      } else {
        console.log("Sending key release:", keysym);
        clientRef.current?.sendKeyEvent(0, keysym);
      }
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
  }, [guacAuth?.authToken, guacAuth?.dataSource, connection.connectionId, removeConnection]);

  return (
    <>
      <button
        type="button"
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={() => removeConnection?.(connection.connectionId)}
      >
        Stop Tunnel
      </button>
      <div
        ref={tunnelDomRef}
        className="mt-2 w-full flex h-[50%] border rounded-md overflow-hidden"
      >
        <p className="text-center m-auto text-gray-500">Loading Guacamole connection...</p>
      </div>

      {error && (
        <div className="mt-2 text-red-600">
          <strong>Error:</strong> {error}
        </div>
      )}
    </>
  );
}
