import { CalendarPlus, Home, Map, UserRound } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { SlidingSelectorContent, SlidingSelectorIndicator } from "./SlidingSelector";
import type { CSSProperties } from "react";

const items = [
  { to: "/", label: "Главная", icon: Home },
  { to: "/discover", label: "Поиск", icon: Map },
  { to: "/create", label: "Создать", icon: CalendarPlus },
  { to: "/profile", label: "Профиль", icon: UserRound },
];

export function BottomNavigation({ placement = "bottom" }: { placement?: "bottom" | "inline" }) {
  const { pathname } = useLocation();
  const activeIndex = pathname === "/" ? 0 : pathname === "/create" ? 2 : pathname === "/profile" ? 3 : 1;
  const selectorStyle = { "--selector-count": items.length } as CSSProperties;

  return (
    <nav
      className={placement === "bottom"
        ? "fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        : "w-full"}
      aria-label="Основная навигация"
      data-placement={placement}
    >
      <div className="animated-selector animated-selector--navigation mx-auto max-w-md" style={selectorStyle}>
        <SlidingSelectorIndicator activeIndex={activeIndex} />
        {items.map(({ to, label, icon: Icon }, index) => (
          <NavLink
            key={to}
            to={to}
            aria-label={label}
            data-active={activeIndex === index ? "true" : "false"}
            className="animated-selector__button focus-ring"
          >
            <SlidingSelectorContent active={activeIndex === index} icon={<Icon size={19} strokeWidth={2.2} />} label={label} />
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
