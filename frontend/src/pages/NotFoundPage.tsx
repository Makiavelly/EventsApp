import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import { StatusView } from "../components/StatusView";

export function NotFoundPage() {
  return (
    <StatusView
      title="Страница не найдена"
      description="Такого маршрута во frontend-приложении нет."
      action={
        <Link to="/">
          <Button>К событиям</Button>
        </Link>
      }
      tone="error"
    />
  );
}
