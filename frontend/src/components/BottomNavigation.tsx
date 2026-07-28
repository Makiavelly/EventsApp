import { CalendarPlus, Home, Map, UserRound } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { SlidingSelectorContent, SlidingSelectorIndicator } from "./SlidingSelector";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import { useRef } from "react";
import {
  createLiquidTabExitGhost,
  LIQUID_TAB_REVEAL_STATE_KEY,
} from "../utils/liquidPanelNavigation";

const items = [
  { to: "/", label: "Главная", icon: Home },
  { to: "/discover", label: "Поиск", icon: Map },
  { to: "/create", label: "Создать", icon: CalendarPlus },
  { to: "/profile", label: "Профиль", icon: UserRound },
];

export function BottomNavigation({ liquid = false }: { liquid?: boolean }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const navigationPendingRef = useRef(false);
  const activeIndex = pathname === "/" ? 0 : pathname === "/create" ? 2 : pathname === "/profile" ? 3 : 1;
  const selectorStyle = { "--selector-count": items.length } as CSSProperties;

  function navigateFromLiquidPanel(event: ReactMouseEvent<HTMLAnchorElement>, to: string) {
    if (
      to === pathname
      || event.button !== 0
      || event.metaKey
      || event.ctrlKey
      || event.shiftKey
      || event.altKey
    ) return;

    event.preventDefault();
    if (navigationPendingRef.current) return;
    navigationPendingRef.current = true;

    if (pathname === "/discover") {
      createLiquidTabExitGhost();
      navigationPendingRef.current = false;
      navigate(to);
      return;
    }

    navigationPendingRef.current = false;
    navigate(to, {
      state: to === "/discover" ? { [LIQUID_TAB_REVEAL_STATE_KEY]: true } : undefined,
    });
  }

  return (
    <nav
      className="bottom-navigation fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      aria-label="Основная навигация"
      data-placement="bottom"
      data-surface={liquid ? "liquid" : "default"}
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
            onClick={(event) => navigateFromLiquidPanel(event, to)}
          >
            <SlidingSelectorContent active={activeIndex === index} icon={<Icon size={19} strokeWidth={2.2} />} label={label} />
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
