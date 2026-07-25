import { ArrowLeft, CalendarDays, Clock3, Edit3, MapPin, Trash2, UsersRound } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useDeleteEvent, useEvent, useJoinEvent, useLeaveEvent, useParticipants, usePublicUser } from "../api/queries";
import { useAuth } from "../auth/useAuth";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { StatusView } from "../components/StatusView";
import { useToast } from "../toast/useToast";
import { getDiscoverReturnState } from "../utils/discoverReturnState";
import type { DiscoverLocationState } from "../utils/discoverReturnState";
import { errorMessage, formatAutoDelete, formatDateTime, formatLocation } from "../utils/format";

const EventMiniMap = lazy(() => import("../components/EventMiniMap").then((module) => ({ default: module.EventMiniMap })));

export function EventDetailsPage() {
  const eventId = Number(useParams().id);
  const { user } = useAuth();
  const routeLocation = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const eventQuery = useEvent(eventId);
  const participantsQuery = useParticipants(eventId);
  const creatorQuery = usePublicUser(eventQuery.data?.creator_user_id ?? 0);
  const joinEvent = useJoinEvent();
  const leaveEvent = useLeaveEvent(eventId);
  const deleteEvent = useDeleteEvent();
  const discoverReturnState = getDiscoverReturnState(routeLocation.state);

  if (!Number.isFinite(eventId) || eventId <= 0) return <StatusView title="Некорректный ID события" tone="error" />;
  if (eventQuery.isLoading) return <StatusView title="Загружаем событие" description="Получаем детали и участников." tone="loading" />;
  if (eventQuery.isError || !eventQuery.data) return <StatusView title="Событие недоступно" description={eventQuery.isError ? errorMessage(eventQuery.error) : "Возможно, оно уже удалено."} tone="error" />;

  const event = eventQuery.data;
  const participants = participantsQuery.data ?? [];
  const currentParticipation = participants.find((participant) => participant.participant_id === user?.id);
  const isCreator = event.creator_user_id === user?.id;
  const actionError = joinEvent.error ?? leaveEvent.error ?? deleteEvent.error;

  function join() {
    joinEvent.mutate({ event_id: eventId }, { onSuccess: () => toast({ message: "Вы присоединились к событию." }) });
  }

  function leave() {
    leaveEvent.mutate(undefined, { onSuccess: () => toast({ message: "Вы вышли из события.", tone: "info" }) });
  }

  function removeEvent() {
    deleteEvent.mutate(eventId, {
      onSuccess: () => {
        toast({ message: "Событие удалено." });
        navigate("/discover", { replace: true });
      },
    });
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/discover"
          state={discoverReturnState ? { discover: discoverReturnState } satisfies DiscoverLocationState : undefined}
          className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-2xl px-2 text-sm font-bold text-meadow"
        >
          <ArrowLeft size={18} />К событиям
        </Link>
        {isCreator ? (
          <div className="flex gap-2">
            <Link to={`/events/${event.id}/edit`} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-2xl border border-line bg-surface px-4 text-sm font-bold text-ink"><Edit3 size={17} />Изменить</Link>
            <Button variant="danger" className="w-11 px-0 sm:w-auto sm:px-4" icon={<Trash2 size={17} />} onClick={() => setConfirmDelete(true)}><span className="sr-only sm:not-sr-only">Удалить</span></Button>
          </div>
        ) : null}
      </div>

      <section className="grid gap-4 lg:grid-cols-[1.45fr_0.75fr]">
        <Card className="overflow-hidden p-5 sm:p-8">
          <h1 className="break-words text-3xl font-black leading-tight tracking-[-0.025em] text-ink sm:text-5xl">{event.title}</h1>
          {event.description ? <p className="mt-5 whitespace-pre-wrap break-words text-base leading-8 text-ink/65">{event.description}</p> : null}

          {event.location ? (
            <div className="mt-7 overflow-hidden rounded-2xl border border-line bg-soft">
              <Suspense fallback={<div className="grid h-52 place-items-center text-sm font-bold text-ink/45">Загружаем карту…</div>}>
                <EventMiniMap location={event.location} marker={event.marker} markerSize={event.marker_size} />
              </Suspense>
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Info icon={<CalendarDays size={19} />} label="Дата и время" value={formatDateTime(event.date_meeting)} />
            {!event.location ? <Info icon={<MapPin size={19} />} label="Место" value="Без локации" /> : null}
            <Info icon={<UsersRound size={19} />} label="Организатор" value={creatorQuery.data?.name ?? "Неизвестен"} />
            {isCreator && event.location ? <Info icon={<MapPin size={19} />} label="Координаты" value={formatLocation(event.location)} /> : null}
            {isCreator ? <Info icon={<Clock3 size={19} />} label="Автоудаление" value={formatAutoDelete(event.auto_delete_policy, event.auto_delete_after_seconds)} /> : null}
          </div>
        </Card>

        <Card className="h-fit p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black text-ink">Участие</h2>
            <span className="rounded-full bg-soft px-3 py-1 text-xs font-extrabold text-cocoa">{participants.length}</span>
          </div>
          <div className="mt-5 grid gap-3">
            {participantsQuery.isLoading ? (
              <Button disabled>Проверяем участие…</Button>
            ) : participantsQuery.isError ? (
              <p className="text-sm text-clay">Список участников сейчас недоступен.</p>
            ) : currentParticipation ? (
              !isCreator ? <Button variant="secondary" onClick={leave} disabled={leaveEvent.isPending}>{leaveEvent.isPending ? "Выходим…" : "Выйти из события"}</Button> : null
            ) : (
              <Button onClick={join} disabled={joinEvent.isPending}>{joinEvent.isPending ? "Добавляем…" : "Присоединиться"}</Button>
            )}
            {actionError ? <p role="alert" className="text-sm font-semibold text-clay">{errorMessage(actionError)}</p> : null}
          </div>
        </Card>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-black tracking-tight text-ink">Участники · {participants.length}</h2>
        {participantsQuery.isError ? (
          <StatusView title="Не удалось загрузить участников" description={errorMessage(participantsQuery.error)} tone="error" />
        ) : participants.length === 0 ? (
          <StatusView title="Участников пока нет" />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {participants.map((participant) => (
              <Card key={participant.participant_id} className="flex items-center gap-3 p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-peach/35 font-black text-cocoa">{participant.name.trim().charAt(0).toUpperCase() || "?"}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-extrabold text-ink">{participant.name}</span>
                {participant.participant_id === event.creator_user_id ? <span className="rounded-full bg-soft px-2 py-1 text-[10px] font-extrabold text-cocoa">Автор</span> : null}
              </Card>
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog open={confirmDelete} title="Удалить событие?" description="Событие и весь список участников будут удалены без возможности восстановления." confirmLabel="Удалить" pending={deleteEvent.isPending} onClose={() => setConfirmDelete(false)} onConfirm={removeEvent} />
    </div>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl bg-soft p-4"><div className="text-meadow">{icon}</div><p className="mt-3 text-[10px] font-extrabold uppercase tracking-wider text-ink/42">{label}</p><p className="mt-1 break-words text-sm font-bold text-ink">{value}</p></div>;
}
