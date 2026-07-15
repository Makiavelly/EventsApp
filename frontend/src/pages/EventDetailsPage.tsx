import type { ReactNode } from "react";
import { CalendarDays, MapPin, Pencil, Trash2, UserPlus, UsersRound } from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  useDeleteEvent,
  useEvent,
  useJoinEvent,
  useLeaveEvent,
  useParticipants,
  useUpdateParticipation,
} from "../api/queries";
import type { EventParticipant, ParticipantStatus } from "../api/types";
import { useAuth } from "../auth/useAuth";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { StatusView } from "../components/StatusView";
import { Table } from "../components/Table";
import { errorMessage, formatDateTime, formatLocation } from "../utils/format";

const participantStatusLabels: Record<ParticipantStatus, string> = {
  planned: "Планирует",
  underway: "Участвует",
  over: "Завершил",
};

export function EventDetailsPage() {
  const { id } = useParams();
  const eventId = Number(id);
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const eventQuery = useEvent(eventId);
  const participantsQuery = useParticipants(eventId);
  const joinEvent = useJoinEvent();
  const updateParticipation = useUpdateParticipation(eventId);
  const leaveEvent = useLeaveEvent(eventId);
  const deleteEvent = useDeleteEvent();
  const participants = participantsQuery.data ?? [];
  const currentParticipation = participants.find((participant) => participant.participant_id === user?.id);

  if (!Number.isFinite(eventId) || eventId <= 0) {
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
  const isCreator = event.creator_user_id === user?.id;
  const participationError = joinEvent.error ?? updateParticipation.error ?? leaveEvent.error;

  function handleDelete() {
    if (!window.confirm("Удалить событие вместе со списком участников?")) return;

    deleteEvent.mutate(eventId, {
      onSuccess: () => navigate("/", { replace: true }),
    });
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/" className="focus-ring w-fit rounded-lg px-1 text-sm font-semibold text-meadow">
          Вернуться к событиям
        </Link>
        {isCreator ? (
          <div className="flex gap-2">
            <Link
              to={`/events/${event.id}/edit`}
              className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-ink/12 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-ink/25"
            >
              <Pencil size={16} />
              Редактировать
            </Link>
            <Button variant="danger" icon={<Trash2 size={16} />} disabled={deleteEvent.isPending} onClick={handleDelete}>
              {deleteEvent.isPending ? "Удаляем..." : "Удалить"}
            </Button>
          </div>
        ) : null}
      </div>

      {deleteEvent.isError ? <p className="text-sm text-clay">{errorMessage(deleteEvent.error)}</p> : null}

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
          <h2 className="text-lg font-semibold text-ink">Участие</h2>
          <p className="mt-2 text-sm leading-6 text-ink/60">
            {!user
              ? "Войдите в аккаунт, чтобы стать участником."
              : currentParticipation
                ? "Вы уже в списке участников и можете изменить свой статус."
                : "Ваш аккаунт будет добавлен в список участников."}
          </p>
          <div className="mt-5 grid gap-3">
            {!user ? (
              <Link
                to="/auth"
                state={{ from: location.pathname }}
                className="focus-ring inline-flex min-h-10 items-center justify-center rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white"
              >
                Войти
              </Link>
            ) : participantsQuery.isLoading ? (
              <Button disabled>Проверяем участие...</Button>
            ) : participantsQuery.isError ? (
              <p className="text-sm text-clay">Нельзя изменить участие, пока список недоступен.</p>
            ) : currentParticipation ? (
              <>
                <label className="grid gap-2 text-sm font-medium text-ink">
                  Статус
                  <select
                    className="focus-ring min-h-11 rounded-lg border border-ink/12 bg-white px-3"
                    value={currentParticipation.status}
                    disabled={updateParticipation.isPending}
                    onChange={(changeEvent) => updateParticipation.mutate(changeEvent.target.value as ParticipantStatus)}
                  >
                    {Object.entries(participantStatusLabels).map(([status, label]) => (
                      <option key={status} value={status}>{label}</option>
                    ))}
                  </select>
                </label>
                <Button variant="secondary" disabled={leaveEvent.isPending} onClick={() => leaveEvent.mutate()}>
                  {leaveEvent.isPending ? "Выходим..." : "Покинуть событие"}
                </Button>
              </>
            ) : (
              <Button
                icon={<UserPlus size={17} />}
                disabled={joinEvent.isPending}
                onClick={() => joinEvent.mutate({ event_id: eventId })}
              >
                {joinEvent.isPending ? "Добавляем..." : "Стать участником"}
              </Button>
            )}
            {participationError ? <p className="text-sm text-clay">{errorMessage(participationError)}</p> : null}
          </div>
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
          <Table<EventParticipant>
            data={participants}
            getRowKey={(participant) => participant.participant_id}
            emptyText="У этого события пока нет участников"
            columns={[
              { key: "id", title: "ID", render: (participant) => participant.participant_id },
              { key: "name", title: "Имя", render: (participant) => participant.name },
              { key: "status", title: "Статус", render: (participant) => participantStatusLabels[participant.status] },
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
