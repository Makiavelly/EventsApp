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
    description: "First description",
    date_meeting: "2030-01-01T12:00:00Z",
    marker_size: "normal",
    auto_delete_policy: "never",
  },
  {
    id: 2,
    creator_user_id: 7,
    title: "Second card",
    description: "Second description",
    date_meeting: "2030-02-02T12:00:00Z",
    marker_size: "normal",
    auto_delete_policy: "never",
  },
  ...Array.from({ length: 5 }, (_, index) => ({
    id: index + 3,
    creator_user_id: 7,
    title: `${["Third", "Fourth", "Fifth", "Sixth", "Seventh"][index]} card`,
    description: `Description ${index + 3}`,
    date_meeting: `2030-0${index + 3}-03T12:00:00Z`,
    marker_size: "normal" as const,
    auto_delete_policy: "never" as const,
  })),
];

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function Harness() {
  const carouselEvents = new URLSearchParams(window.location.search).has("few") ? events.slice(0, 2) : events;

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
              events={carouselEvents}
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
