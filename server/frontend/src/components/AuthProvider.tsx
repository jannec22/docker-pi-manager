import { type ReactNode, useEffect, useMemo, useState } from "react";
import typia from "typia";
import { AuthContext, type GuacAuth } from "../context/auth.ctx";
import { trpc } from "../utils/trpc";

interface Props {
  children?: ReactNode;
}

const parseGuacAuth = typia.json.createValidateParse<GuacAuth>();
const stringifyGuacAuth = typia.json.createStringify<GuacAuth>();

function AuthProvider({ children }: Props) {
  const [token, setToken] = useState<string | undefined>(() => {
    const storedToken = localStorage.getItem("authToken");
    return storedToken || undefined;
  });

  const [guacAuth, setGuacAuth] = useState<GuacAuth | undefined>(() => {
    const storedGuacAuth = localStorage.getItem("guacAuth");
    if (!storedGuacAuth) return undefined;

    const result = parseGuacAuth(storedGuacAuth);

    if (result.success) {
      return result.data;
    }

    console.error("Failed to parse guacAuth from localStorage", result.errors);

    return undefined;
  });

  const getNewGuacAuth = trpc.admin.auth.getGuacAuth.useMutation({
    onSuccess: (data: GuacAuth) => {
      console.log("Fetched new GuacAuth");
      setGuacAuth(data);
      localStorage.setItem("guacAuth", stringifyGuacAuth(data));
    },
  });

  useEffect(() => {
    //set timer for guacAuth expiration
    if (token) {
      const expirationTime = !guacAuth ? Date.now() : new Date(guacAuth.expiration).getTime();
      const currentTime = Date.now();

      const timeout = expirationTime - currentTime;
      console.log(
        `GuacAuth will expire in ${timeout} ms, at ${new Date(expirationTime).toLocaleString()}`,
      );
      
      const timer = setTimeout(
        () => {
          console.log("GuacAuth expired, fetching new one...");
          getNewGuacAuth.mutate();
        },
        Math.max(timeout, 5000),
      );

      return () => clearTimeout(timer);
    }
  }, [token, guacAuth, getNewGuacAuth]);

  return (
    <AuthContext.Provider
      value={useMemo(
        () => ({
          isAuthenticated: !!token,
          guacAuth,
          login: (newToken: string, guacAuth: GuacAuth) => {
            setToken(newToken);
            setGuacAuth(guacAuth);
            localStorage.setItem("guacAuth", stringifyGuacAuth(guacAuth));
            localStorage.setItem("authToken", newToken);
          },
          logout: () => {
            setToken(undefined);
            setGuacAuth(undefined);
            localStorage.removeItem("guacAuth");
            localStorage.removeItem("authToken");
          },
        }),
        [token, guacAuth],
      )}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
