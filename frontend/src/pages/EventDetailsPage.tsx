import { FormEvent, useState } from "react";
import type { ReactNode } from "react";
import { CalendarDays, MapPin, UserPlus, UsersRound } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useEvent, useJoinEvent, useParticipants } from "../api/queries";
import type { ParticipantUser } from "../api/types";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { StatusView } from "../components/StatusView";
import { Table } from "../components/Table";
import { errorMessage, formatDateTime, formatLocation } from "../utils/format";

export function EventDetailsPage() {
  const { id } = useParams();
  const eventId = Number(id);
  const [participantId, setParticipantId] = useState("");

  const eventQuery = useEvent(eventId);
  const participantsQuery = useParticipants(eventId);
  const joinEvent = useJoinEvent();

  const participants =
    participantsQuery.data?.find((item) => item.event_id === eventId)?.users ?? participantsQuery.data?.[0]?.users ?? [];

  function submitJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedParticipantId = Number(participantId);

    if (!Number.isFinite(parsedParticipantId)) {
      return;
    }

    joinEvent.mutate({ event_id: eventId, participant_id: parsedParticipantId });
  }

  if (!Number.isFinite(eventId)) {
    return <StatusView title="Некорректный ID события" description="Проверьте адрес страницы." tone="error" />;
  }

  if (eventQuery.isLoading) {
    return <StatusView title="Загружаем событие" description="Получаем детали и участников." tone="loading" />;
  }

  if (eventQuery.isError || !eventQuery.data) {
    return (
      <StatusView
        title="Не удалось открыть событие"
        description={eventQuery.isError ? errorMessage(eventQuery.error) : "Событие не найдено"}
        tone="error"
      />
    );
  }

  const event = eventQuery.data;

  return (
    <div className="grid gap-6">
      <Link to="/" className="focus-ring w-fit rounded-lg px-1 text-sm font-semibold text-meadow">
        Вернуться к событиям
      </Link>

      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="p-5 sm:p-7">
          <div className="mb-5 inline-flex items-center rounded-full bg-meadow/10 px-3 py-1 text-xs font-semibold text-meadow">
            Событие #{event.id}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-5xl">{event.title}</h1>
          <p className="mt-5 text-base leading-8 text-ink/65">
            {event.description ?? "Организатор пока не добавил описание."}
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <InfoTile icon={<CalendarDays size={20} />} title="Дата и время" value={formatDateTime(event.date_meeting)} />
            <InfoTile icon={<MapPin size={20} />} title="Место" value={formatLocation(event.location)} />
            <InfoTile icon={<UsersRound size={20} />} title="Создатель" value={`Пользователь #${event.creator_user_id}`} />
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold text-ink">Присоединиться</h2>
          <p className="mt-2 text-sm leading-6 text-ink/60">
            Авторизации нет, поэтому backend ожидает ID пользователя.
          </p>
          <form onSubmit={submitJoin} className="mt-5 grid gap-3">
            <Input
              label="ID пользователя"
              name="participant_id"
              inputMode="numeric"
              required
              value={participantId}
              onChange={(event) => setParticipantId(event.target.value)}
              placeholder="1"
            />
            <Button type="submit" icon={<UserPlus size={17} />} disabled={joinEvent.isPending}>
              {joinEvent.isPending ? "Добавляем..." : "Стать участником"}
            </Button>
            {joinEvent.isError ? <p className="text-sm text-clay">{errorMessage(joinEvent.error)}</p> : null}
            {joinEvent.isSuccess ? <p className="text-sm font-medium text-meadow">Участник добавлен.</p> : null}
          </form>
        </Card>
      </section>

      <section className="grid gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">Участники</h2>
          <p className="mt-1 text-sm text-ink/55">
            {participantsQuery.isFetching ? "Обновляем список..." : `Всего участников: ${participants.length}`}
          </p>
        </div>

        {participantsQuery.isError ? (
          <StatusView title="Не удалось загрузить участников" description={errorMessage(participantsQuery.error)} tone="error" />
        ) : (
          <Table<ParticipantUser>
            data={participants}
            getRowKey={(user) => user.id}
            emptyText="У этого события пока нет участников"
            columns={[
              { key: "id", title: "ID", render: (user) => user.id },
              { key: "name", title: "Имя", render: (user) => user.name },
              { key: "email", title: "Email", render: (user) => user.email },
            ]}
          />
        )}
      </section>
    </div>
  );
}

function InfoTile({ icon, title, value }: { icon: ReactNode; title: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-mist p-4">
      <div className="mb-3 text-meadow">{icon}</div>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink/45">{title}</p>
      <p className="mt-1 break-words text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}
