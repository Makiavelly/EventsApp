import { LogIn, Menu, UserRound } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "./Button";
import { useAuth } from "../auth/useAuth";

const titles: Record<string, string> = {
  "/": "События рядом",
  "/create": "Создать событие",
  "/profile": "Профиль",
	"/auth": "Вход",
};

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const location = useLocation();
  const title = titles[location.pathname] ?? "EventsApp";
	const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-ink/10 bg-mist/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" className="h-10 w-10 shrink-0 px-0" onClick={onMenuClick} aria-label="Открыть меню">
            <Menu size={22} />
          </Button>
          <div className="min-w-0">
            <Link to="/" className="block text-sm font-bold uppercase tracking-[0.22em] text-meadow">
              EventsApp
            </Link>
            <p className="truncate text-sm text-ink/60">{title}</p>
          </div>
        </div>
		<div className="flex items-center gap-2">
		  <Link to="/create" className="focus-ring hidden rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-black sm:inline-flex">Новое событие</Link>
		  <Link to={user ? "/profile" : "/auth"} className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-ink transition hover:bg-ink/[0.06]">
			{user ? <UserRound size={18} /> : <LogIn size={18} />}
			<span className="hidden sm:inline">{user ? user.name : "Войти"}</span>
		  </Link>
		</div>
      </div>
    </header>
  );
}
