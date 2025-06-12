import { useContext, useEffect, useState } from "react";
import ConnectionList from "./components/ConnectionList";
import DeviceList from "./components/DeviceList";
import { ConnectionContext } from "./context/connection.ctx";

const Tabs = () => {
  const { connections } = useContext(ConnectionContext) || {};
  const [tab, setTab] = useState<"devices" | "connections">("devices");

  useEffect(() => {
    if (tab === "connections" && !connections?.length) {
      setTab("devices");
    }
  }, [connections, tab]);

  return (
    <>
      <div>
        <button
          type="button"
          className={`px-4 py-2 rounded ${tab === "devices" ? "text-white" : "bg-gray-200 text-gray-400"}`}
          onClick={() => setTab("devices")}
        >
          Devices
        </button>
        <button
          type="button"
          disabled={!connections?.length}
          className={`ml-2 relative px-4 py-2 rounded ${tab === "connections" ? "text-white" : "bg-gray-200 text-gray-400"}`}
          onClick={() => setTab("connections")}
        >
          Connections
          {!!connections?.length && (
            <span className="absolute -top-2 -right-2 text-sm text-gray-500">
              ({connections.length})
            </span>
          )}
        </button>
      </div>

      {tab === "devices" && <DeviceList />}
      <div
        style={{
          display: tab === "connections" ? "block" : "none",
        }}
      >
        <ConnectionList />
      </div>
    </>
  );
};

export default Tabs;
