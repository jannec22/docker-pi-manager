import DeviceList from "@/components/DeviceList";
import Login from "@/components/Login";
import { AuthContext } from "@/context/auth.ctx";
import { useContext } from "react";
import WithAdminWebsocket from "./WithAdminWebsocket";
import ConnectionList from "./components/ConnectionList";

function App() {
  const isAuthenticated = useContext(AuthContext)?.isAuthenticated;

  return (
    <div className="p-4 flex flex-col">
      {isAuthenticated ? (
        <WithAdminWebsocket>
          <strong className="text-2xl">Iot ssh Manager</strong>
          <div className="h-[40%] min-h-[40%] overflow-y-auto">
            <DeviceList />
          </div>
          <ConnectionList />
        </WithAdminWebsocket>
      ) : (
        <Login />
      )}
    </div>
  );
}

export default App;
