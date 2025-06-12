import { useContext } from "react";
import { ConnectionContext } from "../context/connection.ctx";
import ConnectionListItem from "./ConnectionListItem";

export default function ConnectionList() {
  const { connections } = useContext(ConnectionContext) || {};

  return (
    <div className="mt-4 grow flex flex-col">
      <strong className="text-xl">Connections:</strong>

      <ul className="grow">
        {connections?.map(connection => (
          <ConnectionListItem key={connection.deviceId} connection={connection} />
        ))}

        {!connections ||
          (connections.length === 0 && (
            <li className="text-gray-500">No connections available.</li>
          ))}
      </ul>
    </div>
  );
}
