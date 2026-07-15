import { CalendarPlus, LogIn, UserRound, X, ListChecks } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Button } from "./Button";
import { useAuth } from "../auth/useAuth";

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

const commonItems = [
  { to: "/create", label: "Создать событие", icon: CalendarPlus },
  { to: "/", label: "Посмотреть события", icon: ListChecks },
];

export function Sidebar({ open, onClose }: SidebarProps) {
	const { user } = useAuth();
	const items = [...commonItems, user
	  ? { to: "/profile", label: "Профиль", icon: UserRound }
	  : { to: "/auth", label: "Войти", icon: LogIn }];
  return (
    <div className={open ? "pointer-events-auto fixed inset-0 z-40" : "pointer-events-none fixed inset-0 z-40"}>
      <div
        className={`absolute inset-0 bg-ink/35 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <aside
        className={`absolute inset-y-0 left-0 flex w-full flex-col bg-mist p-5 shadow-panel transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-meadow">EventsApp</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-5xl">Куда идём?</h2>
            </div>
            <Button variant="ghost" className="h-10 w-10 px-0" onClick={onClose} aria-label="Закрыть меню">
              <X size={22} />
            </Button>
          </div>

          <nav className="mt-12 grid gap-3 sm:max-w-xl">
            {items.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `focus-ring flex items-center gap-4 rounded-lg border px-5 py-4 text-lg font-semibold transition sm:text-2xl ${
                      isActive
                        ? "border-meadow bg-white text-meadow"
                        : "border-ink/10 bg-white/65 text-ink hover:border-ink/20 hover:bg-white"
                    }`
                  }
                >
                  <Icon size={24} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <p className="mt-auto max-w-2xl pt-10 text-sm leading-6 text-ink/55">
            Создавайте дворовой футбол, вечер настолок, поход на концерт или любое событие, куда нужны люди рядом.
          </p>
        </div>
      </aside>
    </div>
  );
}
