import { FormEvent, useState } from "react";
import { LogOut, Mail, Save, Trash2, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { errorMessage } from "../utils/format";

export function ProfilePage() {
  const { user, logout, updateProfile, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name ?? "");
  const [password, setPassword] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"save" | "logout" | "delete" | null>(null);

  if (!user) return null;
  const currentUser = user;

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionError(null);
    setSuccessMessage(null);
    const payload = {
      ...(name.trim() !== currentUser.name ? { name: name.trim() } : {}),
      ...(password ? { password } : {}),
    };
    if (Object.keys(payload).length === 0) {
      setSuccessMessage("Изменений нет.");
      return;
    }

    setPendingAction("save");
    try {
      await updateProfile(payload);
      setPassword("");
      setSuccessMessage("Профиль обновлён.");
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  async function handleLogout() {
    setActionError(null);
    setPendingAction("logout");
    try {
      await logout();
      navigate("/", { replace: true });
    } catch (error) {
      setActionError(errorMessage(error));
      setPendingAction(null);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Удалить аккаунт, созданные события и все данные участия? Это действие необратимо.")) return;

    setActionError(null);
    setPendingAction("delete");
    try {
      await deleteAccount();
      navigate("/", { replace: true });
    } catch (error) {
      setActionError(errorMessage(error));
      setPendingAction(null);
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

        <form onSubmit={handleSave} className="mt-7 grid gap-4 border-t border-ink/10 pt-5">
          <Input
            label="Имя"
            name="name"
            required
            minLength={1}
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Input
            label="Новый пароль"
            name="password"
            type="password"
            minLength={6}
            maxLength={72}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            hint="Оставьте поле пустым, чтобы не менять пароль."
          />
          <div className="flex justify-end">
            <Button type="submit" icon={<Save size={17} />} disabled={pendingAction !== null}>
              {pendingAction === "save" ? "Сохраняем..." : "Сохранить изменения"}
            </Button>
          </div>
        </form>

        {actionError ? <p className="mt-4 text-sm text-clay">{actionError}</p> : null}
        {successMessage ? <p className="mt-4 text-sm font-medium text-meadow">{successMessage}</p> : null}

        <div className="mt-7 flex flex-wrap gap-3 border-t border-ink/10 pt-5">
          <Button variant="secondary" icon={<LogOut size={17} />} onClick={handleLogout} disabled={pendingAction !== null}>
            {pendingAction === "logout" ? "Выходим..." : "Выйти"}
          </Button>
          <Button variant="danger" icon={<Trash2 size={17} />} onClick={handleDelete} disabled={pendingAction !== null}>
            {pendingAction === "delete" ? "Удаляем..." : "Удалить аккаунт"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
