import { CalendarDays, LogOut, Mail, Save, Settings2, Trash2, UsersRound } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useEvents, useUpdateProfile } from "../api/queries";
import { useAuth } from "../auth/useAuth";
import { Button } from "../components/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EventCard } from "../components/EventCard";
import { Input } from "../components/Input";
import { SlidingSelector } from "../components/SlidingSelector";
import { StatusView } from "../components/StatusView";
import { useToast } from "../toast/useToast";
import { errorMessage } from "../utils/format";

type Tab = "created" | "participating";

export function ProfilePage() {
  const { user, logout, syncUser, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("created");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [password, setPassword] = useState("");
  const [pendingAction, setPendingAction] = useState<"save" | "logout" | "delete" | null>(null);
  const [actionError, setActionError] = useState<string>();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const createdQuery = useEvents({ creatorId: user?.id, limit: 500, offset: 0 }, Boolean(user));
  const participatingQuery = useEvents({ participantId: user?.id, limit: 500, offset: 0 }, Boolean(user));
  const updateProfile = useUpdateProfile(user?.id ?? 0, syncUser);

  if (!user) return null;
  const currentUser = user;
  const activeQuery = tab === "created" ? createdQuery : participatingQuery;
  const events = activeQuery.data ?? [];

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionError(undefined);
    const payload = {
      ...(name.trim() !== currentUser.name ? { name: name.trim() } : {}),
      ...(password ? { password } : {}),
    };
    if (!Object.keys(payload).length) {
      setEditing(false);
      return;
    }
    setPendingAction("save");
    try {
      await updateProfile.mutateAsync(payload);
      setPassword("");
      setEditing(false);
      if (password) {
        try {
          await logout();
        } catch {
          // Password change already revoked every server session. The logout
          // attempt still cleared the in-memory access token.
        }
        navigate("/auth", {
          replace: true,
          state: {
            message: "Пароль изменён. Войдите снова с новым паролем.",
          },
        });
        return;
      }
      toast({ message: "Профиль обновлён." });
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  async function signOut() {
    setPendingAction("logout");
    try {
      await logout();
      navigate("/", { replace: true });
    } catch (error) {
      setActionError(errorMessage(error));
      setPendingAction(null);
    }
  }

  async function removeAccount() {
    setPendingAction("delete");
    try {
      await deleteAccount();
      navigate("/", { replace: true });
    } catch (error) {
      setActionError(errorMessage(error));
      setPendingAction(null);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="app-card overflow-hidden p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-[1.7rem] bg-peach/45 text-3xl font-black text-cocoa">{user.name.trim().charAt(0).toUpperCase() || "?"}</div>
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-3xl font-black tracking-tight text-ink">{user.name}</h1>
            <p className="mt-2 flex items-center gap-2 break-all text-sm text-ink/58"><Mail size={16} className="shrink-0 text-meadow" />{user.email}</p>
          </div>
          <Button variant="secondary" icon={<Settings2 size={17} />} onClick={() => setEditing((value) => !value)}>Настройки</Button>
        </div>

        {editing ? (
          <form onSubmit={save} className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
            <Input label="Имя" name="name" required minLength={1} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} />
            <Input label="Новый пароль" name="password" type="password" minLength={6} maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} hint="Оставьте пустым, чтобы не менять." />
            <div className="flex flex-wrap gap-2 sm:col-span-2 sm:justify-end">
              <Button variant="secondary" onClick={() => setEditing(false)}>Отмена</Button>
              <Button type="submit" icon={<Save size={17} />} disabled={pendingAction !== null}>{pendingAction === "save" ? "Сохраняем…" : "Сохранить"}</Button>
            </div>
          </form>
        ) : null}
        {actionError ? <p role="alert" className="mt-4 rounded-2xl bg-clay/10 p-3 text-sm font-semibold text-clay">{actionError}</p> : null}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
          <Button variant="ghost" icon={<LogOut size={17} />} onClick={signOut} disabled={pendingAction !== null}>{pendingAction === "logout" ? "Выходим…" : "Выйти"}</Button>
          <Button variant="ghost" className="text-clay" icon={<Trash2 size={17} />} onClick={() => setConfirmDelete(true)} disabled={pendingAction !== null}>Удалить аккаунт</Button>
        </div>
      </section>

      <section>
        <div className="mb-4 flex justify-end">
          <SlidingSelector
            value={tab}
            ariaLabel="Списки событий профиля"
            className="w-full sm:w-auto sm:min-w-[360px]"
            items={[
              { value: "created", label: `Созданные · ${createdQuery.data?.length ?? 0}`, icon: <CalendarDays size={17} /> },
              { value: "participating", label: `Участвую · ${participatingQuery.data?.length ?? 0}`, icon: <UsersRound size={17} /> },
            ]}
            onChange={setTab}
          />
        </div>

        <div key={tab} className="view-enter">
          {activeQuery.isLoading ? (
            <StatusView title="Загружаем события" tone="loading" />
          ) : activeQuery.isError ? (
            <StatusView title="Не удалось загрузить события" description={errorMessage(activeQuery.error)} tone="error" />
          ) : events.length === 0 ? (
            <StatusView title={tab === "created" ? "Вы ещё ничего не создали" : "Вы пока никуда не присоединились"} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{events.map((event) => <EventCard key={event.id} event={event} />)}</div>
          )}
        </div>
      </section>

      <ConfirmDialog open={confirmDelete} title="Удалить аккаунт?" description="Будут удалены профиль, созданные события и все записи участия. Это действие необратимо." confirmLabel="Удалить аккаунт" pending={pendingAction === "delete"} onClose={() => setConfirmDelete(false)} onConfirm={removeAccount} />
    </div>
  );
}
