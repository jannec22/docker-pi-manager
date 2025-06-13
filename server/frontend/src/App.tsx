import { useContext } from "react";
import MainPage from "./MainPage";
import WithAdminWebsocket from "./WithAdminWebsocket";
import ConnectionListProvider from "./components/ConnectionListProvider";
import Login from "./components/Login";
import { ThemeProvider } from "./components/theme-provider";
import { AuthContext } from "./context/auth.ctx";

function App() {
  const isAuthenticated = useContext(AuthContext)?.isAuthenticated;

  return (
    <>
      {isAuthenticated ? (
        <ThemeProvider>
          <ConnectionListProvider>
            <WithAdminWebsocket>
              <MainPage />
            </WithAdminWebsocket>
          </ConnectionListProvider>
        </ThemeProvider>
      ) : (
        <Login />
      )}
    </>
  );
}

export default App;
