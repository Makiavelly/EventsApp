import clsx from "clsx";
import { useLayoutEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";

export type SlidingSelectorItem<T extends string> = {
  value: T;
  label: string;
  icon: ReactNode;
  disabled?: boolean;
};

type SlidingSelectorProps<T extends string> = {
  value: T;
  items: readonly SlidingSelectorItem<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
};

type SelectorStyle = CSSProperties & { "--selector-count": number };

export function SlidingSelector<T extends string>({ value, items, onChange, ariaLabel, className }: SlidingSelectorProps<T>) {
  const activeIndex = Math.max(0, items.findIndex((item) => item.value === value));
  const style: SelectorStyle = { "--selector-count": items.length };

  return (
    <div className={clsx("animated-selector", className)} style={style} role="group" aria-label={ariaLabel}>
      <SlidingSelectorIndicator activeIndex={activeIndex} />
      {items.map((item, index) => {
        const active = index === activeIndex;
        return (
          <button
            key={item.value}
            type="button"
            disabled={item.disabled}
            aria-label={item.label}
            aria-pressed={active}
            data-active={active ? "true" : "false"}
            className="animated-selector__button focus-ring"
            onClick={() => onChange(item.value)}
          >
            <SlidingSelectorContent active={active} icon={item.icon} label={item.label} />
          </button>
        );
      })}
    </div>
  );
}

export function SlidingSelectorIndicator({ activeIndex }: { activeIndex: number }) {
  const previousIndex = useRef(activeIndex);
  const direction = activeIndex >= previousIndex.current ? 1 : -1;

  useLayoutEffect(() => {
    previousIndex.current = activeIndex;
  }, [activeIndex]);

  return (
    <span
      className="animated-selector__indicator"
      style={{ transform: `translate3d(${activeIndex * 100}%, 0, 0)` }}
      aria-hidden="true"
    >
      <span
        key={activeIndex}
        className="animated-selector__indicator-surface"
        style={{ transformOrigin: direction > 0 ? "left center" : "right center" }}
      />
    </span>
  );
}

export function SlidingSelectorContent({ active, icon, label }: { active: boolean; icon: ReactNode; label: string }) {
  return (
    <span className="animated-selector__content" data-active={active ? "true" : "false"} aria-hidden="true">
      <span className="animated-selector__icon">{icon}</span>
      <span className="animated-selector__label-clip"><span className="animated-selector__label">{label}</span></span>
    </span>
  );
}
