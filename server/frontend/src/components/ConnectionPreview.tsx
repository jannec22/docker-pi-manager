import clsx from "clsx";
import Guacamole from "guacamole-client";
import { Unplug } from "lucide-react";
import { type Dispatch, type SetStateAction, useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "../context/auth.ctx";
import { type Connection, ConnectionContext } from "../context/connection.ctx";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useSidebar } from "./ui/sidebar";

interface Props {
  connection: Connection;
  setActiveConnection: Dispatch<SetStateAction<Connection | null>>;
}

const SUPER_L = 65511;
const CTRL_L = 65507;
const SHIFT_L = 65505;

export default function ConnectionPreview({ connection, setActiveConnection }: Props) {
  const tunnelDomRef = useRef<HTMLDivElement | null>(null);
  const clientRef = useRef<Guacamole.Client | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const { removeConnection } = useContext(ConnectionContext) || {};
  const { guacAuth } = useContext(AuthContext) || {};

  const [error, setError] = useState<string | null>(null);
  const { open } = useSidebar();

  useEffect(() => {
    if (clientRef.current) {
      // Disconnect existing client if it exists
      clientRef.current.disconnect();
    }

    setConnected(false);

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
        setActiveConnection(null); // Clear active connection
      }
      if (state === 1) {
        // Handle connecting logic here if needed
        console.log("Connecting to Guacamole server...");
      }
      if (state === 3) {
        // Handle connected logic here if needed
        console.log("Connected to Guacamole server");
        setError(null); // Clear any previous errors
        setConnected(true);
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

      if (wasSuperPressed && (keysym === SUPER_L || keysym === CTRL_L || keysym === SHIFT_L)) {
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
  }, [
    guacAuth?.authToken,
    guacAuth?.dataSource,
    connection.connectionId,
    removeConnection,
    setActiveConnection,
  ]);

  useEffect(() => {
    let timer: number | null = null;

    // assign on resize handlers to resize the tunnel
    const handleResize = () => {
      if (timer) {
        clearTimeout(timer);
      }
      timer = window.setTimeout(() => {
        const mainView = document.getElementById("main-view");

        if (tunnelDomRef.current && clientRef.current && mainView) {
          const rect = mainView.getBoundingClientRect();
          const tunnelRect = tunnelDomRef.current.getBoundingClientRect();

          // get tunnel rect distances to parent rect
          const originalDistToBottom = rect.bottom - tunnelRect.bottom;
          const originalDistToRight = rect.right - tunnelRect.right;
          const originalDistToLeft = tunnelRect.left - rect.left;
          const originalDistToTop = tunnelRect.top - rect.top;

          const width = Math.floor(rect.width - originalDistToLeft - originalDistToRight);
          const height = Math.floor(rect.height - originalDistToBottom - originalDistToTop);

          clientRef.current.sendSize(width, height);
        }
      }, 100);
    };

    timer = window.setTimeout(() => {
      handleResize(); // Initial resize
      console.log("resize", open);
    }, 500);
    window.addEventListener("resize", handleResize);

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      window.removeEventListener("resize", handleResize);
    };
  }, [open]);

  return (
    <Card className="grow flex flex-col">
      <CardHeader className="flex flex-row justify-between p-2">
        <CardTitle className="text-lg">
          {connection.type.toUpperCase()} - {connection.deviceName}
        </CardTitle>

        <Button
          size="icon"
          variant="ghost"
          onClick={() => {
            removeConnection?.(connection.connectionId);
            setActiveConnection(null);
          }}
        >
          <Unplug className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="grow relative flex flex-col p-0 rounded-b-md">
        <div
          ref={tunnelDomRef}
          className={clsx(
            "flex grow bg-secondary max-w-screen max-h-full overflow-auto",
            !connected && "invisible",
          )}
        />

        {!connected && (
          <div className="absolute inset-0 flex items-center justify-center bg-secondary/50">
            <div className="text-muted-foreground text-center">
              <p className="text-lg">Connecting...</p>
              <p className="text-sm mt-2">Please wait while we establish the connection.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-secondary/50">
            <div className="text-muted-foreground text-center">
              <p className="text-lg">Error...</p>
              <p className="text-sm text-rose-500 mt-2">{error}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
