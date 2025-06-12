import { useContext } from "react";
import Tabs from "./Tabs";
import WithAdminWebsocket from "./WithAdminWebsocket";
import ConnectionListProvider from "./components/ConnectionListProvider";
import Login from "./components/Login";
import { AuthContext } from "./context/auth.ctx";

function App() {
  const isAuthenticated = useContext(AuthContext)?.isAuthenticated;
  const { logout } = useContext(AuthContext) || {};

  return (
    <>
      {isAuthenticated ? (
        <ConnectionListProvider>
          <WithAdminWebsocket>
            <div className="flex items-center justify-between mb-4">
              <strong className="text-2xl">Iot ssh Manager</strong>

              <button
                type="button"
                className="ml-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                onClick={() => logout?.()}
              >
                Logout
              </button>
            </div>

            <Tabs />
          </WithAdminWebsocket>
        </ConnectionListProvider>
      ) : (
        <Login />
      )}
    </>
  );
}

export default App;
