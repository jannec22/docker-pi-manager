import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import ReactDOM from "react-dom/client";
import App from "./App";
import AuthProvider from "./components/AuthProvider";
import { trpc } from "./utils/trpc";
import "./index.css";

const queryClient = new QueryClient();
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "http://localhost:5000/trpc",
      headers() {
        const token = localStorage.getItem("authToken");
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </trpc.Provider>,
);
