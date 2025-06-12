import { useContext, useState } from "react";
import { AuthContext } from "../context/auth.ctx";
import { trpc } from "../utils/trpc";

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
    <div className="grow flex p-4 flex-col">
      <h2>Login</h2>
      <form
        className="flex flex-col gap-4 max-w-[400px] m-auto"
        onSubmit={e => {
          e.preventDefault();

          if (username.trim() === "" || password.trim() === "") {
            setError("Username and password cannot be empty.");
            return;
          }

          setError(null);
          loginMutation.mutate({ username, password });
        }}
      >
        <label>
          Username:
          <input
            type="text"
            name="username"
            required
            value={username}
            onChange={e => {
              setUsername(e.target.value);
            }}
          />
        </label>

        <label>
          Password:
          <input
            type="password"
            name="password"
            required
            value={password}
            onChange={e => {
              setPassword(e.target.value);
            }}
          />
        </label>

        <button type="submit" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? "Logging in..." : "Login"}
        </button>
      </form>

      {error && <div style={{ color: "red" }}>{error}</div>}
    </div>
  );
}
