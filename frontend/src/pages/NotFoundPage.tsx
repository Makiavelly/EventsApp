import { Link } from "react-router-dom";
import { StatusView } from "../components/StatusView";

export function NotFoundPage() {
  return (
    <StatusView
      title="Страница не найдена"
      description="Такого маршрута во frontend-приложении нет."
      action={
        <Link to="/" className="focus-ring inline-flex min-h-11 items-center justify-center rounded-2xl bg-cocoa px-4 text-sm font-bold text-surface">На главную</Link>
      }
      tone="error"
    />
  );
}
