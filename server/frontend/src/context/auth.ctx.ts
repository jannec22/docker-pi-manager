import { createContext } from "react";

interface AuthContext {
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContext | undefined>(undefined);
