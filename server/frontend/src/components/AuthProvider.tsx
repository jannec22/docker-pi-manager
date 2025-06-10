import { AuthContext } from "@/context/auth.ctx";
import { type ReactNode, useMemo, useState } from "react";

interface Props {
  children?: ReactNode;
}

function AuthProvider({ children }: Props) {
  const [token, setToken] = useState<string | undefined>(() => {
    const storedToken = localStorage.getItem("authToken");
    return storedToken || undefined;
  });

  return (
    <AuthContext.Provider
      value={useMemo(
        () => ({
          isAuthenticated: !!token,
          login: (newToken: string) => {
            setToken(newToken);
            localStorage.setItem("authToken", newToken);
          },
          logout: () => {
            setToken(undefined);
            localStorage.removeItem("authToken");
          },
        }),
        [token],
      )}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
