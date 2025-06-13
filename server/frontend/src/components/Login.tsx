import { useContext, useState } from "react";
import { AuthContext } from "../context/auth.ctx";
import { trpc } from "../utils/trpc";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const login = useContext(AuthContext)?.login;
  const loginMutation = trpc.admin.auth.login.useMutation({
    onSuccess: data => {
      const token = data.token;

      if (login) {
        login(token, data.guacAuth);
      }
    },
    onError: error => {
      console.error("Login failed:", error);
      setError(`Login failed: ${error.message}`);
    },
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-90">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Device Manager Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={e => {
              e.preventDefault();
              if (username.trim() === "" || password.trim() === "") {
                setError("Username and password cannot be empty.");
                return;
              }
              setError(null);
              loginMutation.mutate({ username, password });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username"
                disabled={loginMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={loginMutation.isPending}
              />
            </div>

            {error && <div className="text-red-500 text-sm">{error}</div>}

            <Button
              type="submit"
              className="w-full mt-3"
              disabled={loginMutation.isPending}
              loading={loginMutation.isPending}
            >
              Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
