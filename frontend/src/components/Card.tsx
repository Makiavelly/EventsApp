import type { HTMLAttributes } from "react";
import { clsx } from "clsx";

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-lg border border-ink/10 bg-white shadow-[0_10px_28px_rgba(23,23,23,0.05)]",
        className,
      )}
      {...props}
    />
  );
}
