import { LogOut, Mail, UserRound } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { errorMessage } from "../utils/format";

export function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!user) return null;

  async function handleLogout() {
    setLogoutError(null);
    setIsLoggingOut(true);
    try {
      await logout();
      navigate("/", { replace: true });
    } catch (error) {
      setLogoutError(errorMessage(error));
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="grid gap-6">
      <section>
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-meadow">Профиль</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-5xl">Ваш аккаунт</h1>
      </section>

      <Card className="max-w-2xl p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-meadow/10 text-meadow">
            <UserRound size={30} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-ink/55">Пользователь #{user.id}</p>
            <h2 className="truncate text-2xl font-semibold tracking-tight text-ink">{user.name}</h2>
            <p className="mt-2 flex items-center gap-2 break-words text-sm text-ink/65">
              <Mail size={16} />
              {user.email}
            </p>
          </div>
        </div>
        <div className="mt-7 border-t border-ink/10 pt-5">
          <Button variant="danger" icon={<LogOut size={17} />} onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? "Выходим..." : "Выйти из аккаунта"}
          </Button>
          {logoutError ? <p className="mt-3 text-sm text-clay">{logoutError}</p> : null}
        </div>
      </Card>
    </div>
  );
}
