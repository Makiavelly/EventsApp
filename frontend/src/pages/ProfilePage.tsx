import { FormEvent, useMemo, useState } from "react";
import { Search, UserRound } from "lucide-react";
import { useUser, useUsers } from "../api/queries";
import type { User } from "../api/types";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { StatusView } from "../components/StatusView";
import { Table } from "../components/Table";
import { errorMessage } from "../utils/format";

export function ProfilePage() {
  const [userIdInput, setUserIdInput] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>();
  const userQuery = useUser(selectedUserId);
  const usersQuery = useUsers();

  const visibleUsers = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedId = Number(userIdInput);
    setSelectedUserId(Number.isFinite(parsedId) ? parsedId : undefined);
  }

  return (
    <div className="grid gap-6">
      <section>
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-meadow">Профиль</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
          Информация о пользователе
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-ink/60">
          Авторизация в backend не предусмотрена, поэтому профиль открывается по ID пользователя.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card className="p-5">
          <form onSubmit={submit} className="grid gap-4">
            <Input
              label="ID пользователя"
              name="user_id"
              inputMode="numeric"
              value={userIdInput}
              onChange={(event) => setUserIdInput(event.target.value)}
              placeholder="1"
              required
            />
            <Button type="submit" icon={<Search size={17} />}>
              Показать профиль
            </Button>
          </form>
        </Card>

        {selectedUserId === undefined ? (
          <StatusView title="Введите ID" description="После отправки формы здесь появится карточка пользователя." />
        ) : userQuery.isLoading ? (
          <StatusView title="Загружаем профиль" description="Запрашиваем пользователя у backend." tone="loading" />
        ) : userQuery.isError ? (
          <StatusView title="Не удалось загрузить профиль" description={errorMessage(userQuery.error)} tone="error" />
        ) : userQuery.data ? (
          <UserProfileCard user={userQuery.data} />
        ) : null}
      </section>

      <section className="grid gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">Пользователи</h2>
          <p className="mt-1 text-sm text-ink/55">
            Можно выбрать ID из списка, если backend уже содержит пользователей.
          </p>
        </div>

        {usersQuery.isLoading ? (
          <StatusView title="Загружаем пользователей" tone="loading" />
        ) : usersQuery.isError ? (
          <StatusView title="Не удалось загрузить пользователей" description={errorMessage(usersQuery.error)} tone="error" />
        ) : (
          <Table<User>
            data={visibleUsers}
            getRowKey={(user) => user.id}
            emptyText="Пользователей пока нет"
            columns={[
              { key: "id", title: "ID", render: (user) => user.id },
              { key: "name", title: "Имя", render: (user) => user.name },
              { key: "email", title: "Email", render: (user) => user.email },
              {
                key: "action",
                title: "Действие",
                render: (user) => (
                  <Button
                    variant="secondary"
                    className="min-h-9 px-3 py-1"
                    onClick={() => {
                      setUserIdInput(String(user.id));
                      setSelectedUserId(user.id);
                    }}
                  >
                    Открыть
                  </Button>
                ),
              },
            ]}
          />
        )}
      </section>
    </div>
  );
}

function UserProfileCard({ user }: { user: User }) {
  return (
    <Card className="p-5 sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-meadow/10 text-meadow">
          <UserRound size={30} />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-ink/55">Пользователь #{user.id}</p>
          <h2 className="truncate text-2xl font-semibold tracking-tight text-ink">{user.name}</h2>
          <p className="mt-1 break-words text-sm text-ink/65">{user.email}</p>
        </div>
      </div>
    </Card>
  );
}
