import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCreateEvent } from "../api/queries";
import type { CreateEventPayload } from "../api/types";
import { EventForm } from "../components/EventForm";
import type { EventFormValue } from "../components/EventForm";
import { useToast } from "../toast/useToast";
import { errorMessage } from "../utils/format";

export function CreateEventPage() {
  const createEvent = useCreateEvent();
  const navigate = useNavigate();
  const toast = useToast();

  function submit(value: EventFormValue) {
    const payload: CreateEventPayload = {
      title: value.title,
      auto_delete_policy: value.auto_delete_policy,
      ...(value.description ? { description: value.description } : {}),
      ...(value.location ? { location: value.location } : {}),
      ...(value.date_meeting ? { date_meeting: value.date_meeting } : {}),
      ...(value.auto_delete_after_seconds ? { auto_delete_after_seconds: value.auto_delete_after_seconds } : {}),
    };
    createEvent.mutate(payload, {
      onSuccess: (created) => {
        toast({ message: "Событие создано — вы уже в списке участников." });
        navigate(`/events/${created.id}`, { replace: true });
      },
    });
  }

  return (
    <div className="grid gap-5">
      <header>
        <button type="button" onClick={() => navigate(-1)} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-2xl px-2 text-sm font-bold text-meadow"><ArrowLeft size={18} />Назад</button>
        <h1 className="sr-only">Новое событие</h1>
      </header>
      <EventForm submitLabel="Создать" pending={createEvent.isPending} serverError={createEvent.isError ? errorMessage(createEvent.error) : undefined} onSubmit={submit} onCancel={() => navigate(-1)} />
    </div>
  );
}
