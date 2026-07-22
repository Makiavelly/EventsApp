import { CalendarPlus, MapPinned, Moon, Sun, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "../theme/useTheme";

type Action = {
  title: string;
  to: string;
  icon: LucideIcon;
};

export function HomePage() {
  const { theme, toggleTheme } = useTheme();
  const actions: Action[] = [
    { title: "Найти событие", to: "/discover", icon: MapPinned },
    { title: "Создать событие", to: "/create", icon: CalendarPlus },
    { title: "Профиль", to: "/profile", icon: UserRound },
  ];

  return (
    <section className="relative mx-auto grid min-h-[calc(100dvh-2.5rem)] max-w-4xl place-items-center" aria-label="Главное меню">
      <h1 className="sr-only">Главное меню</h1>
      <button
        type="button"
        onClick={toggleTheme}
        className="focus-ring absolute right-0 top-0 grid h-12 w-12 place-items-center rounded-2xl border border-line bg-surface text-cocoa shadow-panel transition hover:-translate-y-0.5"
        aria-label={theme === "light" ? "Включить тёмную тему" : "Включить светлую тему"}
        title={theme === "light" ? "Тёмная тема" : "Светлая тема"}
      >
        <span key={theme} className="toggle-icon-enter">{theme === "light" ? <Moon size={21} /> : <Sun size={21} />}</span>
      </button>

      <div className="grid w-full gap-4 pt-16 sm:grid-cols-3 sm:pt-0">
        {actions.map(({ title, to, icon: Icon }) => (
          <Link key={title} to={to} className="focus-ring group app-card flex min-h-40 flex-col items-center justify-center gap-5 p-6 text-center transition hover:-translate-y-1 hover:border-peach hover:shadow-float sm:min-h-60">
            <span className="grid h-16 w-16 place-items-center rounded-[1.4rem] bg-peach/40 text-cocoa transition group-hover:scale-105"><Icon size={30} /></span>
            <span className="break-words text-xl font-extrabold text-ink">{title}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
