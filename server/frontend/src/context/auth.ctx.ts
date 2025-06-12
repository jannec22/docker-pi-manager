import { createContext } from "react";

export interface GuacAuth {
  authToken: string;
  dataSource: string;
  expiration: string;
}

interface AuthContext {
  isAuthenticated: boolean;
  guacAuth?: GuacAuth;
  login: (token: string, guacAuth: GuacAuth) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContext | undefined>(undefined);
