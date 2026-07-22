import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useEvent, useUpdateEvent } from "../api/queries";
import type { PatchEventPayload } from "../api/types";
import { useAuth } from "../auth/useAuth";
import { EventForm } from "../components/EventForm";
import type { EventFormValue } from "../components/EventForm";
import { StatusView } from "../components/StatusView";
import { useToast } from "../toast/useToast";
import { errorMessage } from "../utils/format";

export function EditEventPage() {
  const eventId = Number(useParams().id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const eventQuery = useEvent(eventId);
  const updateEvent = useUpdateEvent(eventId);
  const toast = useToast();

  if (!Number.isFinite(eventId) || eventId <= 0) return <StatusView title="Некорректное событие" tone="error" />;
  if (eventQuery.isLoading) return <StatusView title="Загружаем событие" tone="loading" />;
  if (eventQuery.isError || !eventQuery.data) return <StatusView title="Не удалось загрузить событие" description={eventQuery.isError ? errorMessage(eventQuery.error) : undefined} tone="error" />;
  if (eventQuery.data.creator_user_id !== user?.id) return <StatusView title="Недостаточно прав" description="Редактировать событие может только его создатель." tone="error" />;

  function submit(value: EventFormValue) {
    const payload: PatchEventPayload = {
      title: value.title,
      description: value.description,
      location: value.location,
      date_meeting: value.date_meeting,
      auto_delete_policy: value.auto_delete_policy,
      auto_delete_after_seconds: value.auto_delete_after_seconds,
    };
    updateEvent.mutate(payload, {
      onSuccess: () => {
        toast({ message: "Изменения сохранены." });
        navigate(`/events/${eventId}`, { replace: true });
      },
    });
  }

  return (
    <div className="grid gap-5">
      <header>
        <button type="button" onClick={() => navigate(`/events/${eventId}`)} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-2xl px-2 text-sm font-bold text-meadow"><ArrowLeft size={18} />К событию</button>
        <p className="eyebrow mt-3">Управление</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-ink sm:text-5xl">Редактировать событие</h1>
      </header>
      <EventForm initial={eventQuery.data} submitLabel="Сохранить" pending={updateEvent.isPending} serverError={updateEvent.isError ? errorMessage(updateEvent.error) : undefined} onSubmit={submit} onCancel={() => navigate(`/events/${eventId}`)} />
    </div>
  );
}
