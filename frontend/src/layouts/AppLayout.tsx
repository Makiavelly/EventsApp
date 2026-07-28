import { Outlet, useLocation } from "react-router-dom";
import { BottomNavigation } from "../components/BottomNavigation";
import { clsx } from "clsx";
import { useAuth } from "../auth/useAuth";

export function AppLayout() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const isHome = pathname === "/";
  const isAuth = pathname === "/auth";
  const isDiscover = pathname === "/discover";
  const showBottomNavigation = Boolean(user) && !isHome && !isAuth && !isDiscover;

  return (
    <div className="min-h-screen bg-mist text-ink">
      <main className={clsx(
        "w-full",
        isDiscover ? "h-dvh overflow-hidden" : "mx-auto min-h-screen max-w-6xl px-4 pb-28 pt-5 sm:px-6 sm:pt-7 lg:px-8",
        (isHome || isAuth) && "pb-5",
      )}>
        <div key={pathname} className={clsx("route-enter", isDiscover && "h-full")}><Outlet /></div>
      </main>
      {showBottomNavigation ? <BottomNavigation /> : null}
    </div>
  );
}
