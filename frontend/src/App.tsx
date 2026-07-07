import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { CreateEventPage } from "./pages/CreateEventPage";
import { EventDetailsPage } from "./pages/EventDetailsPage";
import { EventsPage } from "./pages/EventsPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ProfilePage } from "./pages/ProfilePage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <EventsPage /> },
      { path: "events/:id", element: <EventDetailsPage /> },
      { path: "create", element: <CreateEventPage /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
