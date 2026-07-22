import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { lazy, Suspense } from "react";
import type { ReactNode } from "react";
import { AppLayout } from "./layouts/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";

const HomePage = lazy(() => import("./pages/HomePage").then((module) => ({ default: module.HomePage })));
const EventsPage = lazy(() => import("./pages/EventsPage").then((module) => ({ default: module.EventsPage })));
const EventDetailsPage = lazy(() => import("./pages/EventDetailsPage").then((module) => ({ default: module.EventDetailsPage })));
const EditEventPage = lazy(() => import("./pages/EditEventPage").then((module) => ({ default: module.EditEventPage })));
const CreateEventPage = lazy(() => import("./pages/CreateEventPage").then((module) => ({ default: module.CreateEventPage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then((module) => ({ default: module.ProfilePage })));
const AuthPage = lazy(() => import("./pages/AuthPage").then((module) => ({ default: module.AuthPage })));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })));

function Page({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div className="app-card grid min-h-40 place-items-center p-6 text-sm font-bold text-ink/55" role="status">Загружаем экран…</div>}>{children}</Suspense>;
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    errorElement: <Page><NotFoundPage /></Page>,
    children: [
      { index: true, element: <ProtectedRoute><Page><HomePage /></Page></ProtectedRoute> },
      { path: "discover", element: <ProtectedRoute><Page><EventsPage /></Page></ProtectedRoute> },
      { path: "events/:id", element: <ProtectedRoute><Page><EventDetailsPage /></Page></ProtectedRoute> },
      { path: "events/:id/edit", element: <ProtectedRoute><Page><EditEventPage /></Page></ProtectedRoute> },
      { path: "auth", element: <Page><AuthPage /></Page> },
      { path: "create", element: <ProtectedRoute><Page><CreateEventPage /></Page></ProtectedRoute> },
      { path: "profile", element: <ProtectedRoute><Page><ProfilePage /></Page></ProtectedRoute> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
