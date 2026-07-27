/* eslint-disable react-refresh/only-export-components */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReactDOM from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import type { Event } from "../src/api/types";
import { AuthContext } from "../src/auth/useAuth";
import { MapEventCarousel } from "../src/components/MapEventCarousel";
import { ToastProvider } from "../src/toast/ToastProvider";
import "../src/index.css";

const events: Event[] = [
  {
    id: 1,
    creator_user_id: 7,
    title: "First card",
    marker_size: "normal",
    auto_delete_policy: "never",
  },
  {
    id: 2,
    creator_user_id: 7,
    title: "Second card",
    marker_size: "normal",
    auto_delete_policy: "never",
  },
];

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function Harness() {
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ToastProvider>
          <AuthContext.Provider
            value={{
              user: { id: 3, name: "Tester", email: "tester@gmail.com" },
              isLoading: false,
              login: async () => {},
              register: async () => {},
              logout: async () => {},
              syncUser: () => {},
              deleteAccount: async () => {},
            }}
          >
            <MapEventCarousel
              events={events}
              onClose={() => {
                const root = document.getElementById("root");
                if (root) root.textContent = "closed";
              }}
            />
          </AuthContext.Provider>
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <Harness />,
);
