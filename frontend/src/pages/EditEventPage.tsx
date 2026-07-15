import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useEvent, useUpdateEvent } from "../api/queries";
import type { PatchEventPayload } from "../api/types";
import { useAuth } from "../auth/useAuth";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { FormField } from "../components/FormField";
import { Input, Textarea } from "../components/Input";
import { StatusView } from "../components/StatusView";
import { errorMessage } from "../utils/format";

type EventForm = {
  title: string;
  description: string;
  latitude: string;
  longitude: string;
  dateMeeting: string;
};

const emptyForm: EventForm = {
  title: "",
  description: "",
  latitude: "",
  longitude: "",
  dateMeeting: "",
};

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export function EditEventPage() {
  const eventId = Number(useParams().id);
  const { user } = useAuth();
  const eventQuery = useEvent(eventId);
  const updateEvent = useUpdateEvent(eventId);
  const navigate = useNavigate();
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [formError, setFormError] = useState<string>();

  useEffect(() => {
    if (!eventQuery.data) return;
    setForm({
      title: eventQuery.data.title,
      description: eventQuery.data.description ?? "",
      latitude: eventQuery.data.location ? String(eventQuery.data.location.latitude) : "",
      longitude: eventQuery.data.location ? String(eventQuery.data.location.longitude) : "",
      dateMeeting: toDateTimeLocal(eventQuery.data.date_meeting),
    });
  }, [eventQuery.data]);

  function updateField(field: keyof EventForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setFormError(undefined);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const currentEvent = eventQuery.data;
    if (!currentEvent) return;

    const hasLatitude = form.latitude.trim() !== "";
    const hasLongitude = form.longitude.trim() !== "";

    if (hasLatitude !== hasLongitude) {
      setFormError("Укажите обе координаты или очистите обе.");
      return;
    }

    const payload: PatchEventPayload = {};
    const title = form.title.trim();
    if (title !== currentEvent.title) payload.title = title;

    const description = form.description.trim() || null;
    if (description !== (currentEvent.description ?? null)) payload.description = description;

    const location = hasLatitude
      ? { latitude: Number(form.latitude), longitude: Number(form.longitude) }
      : null;
    if (
      location?.latitude !== currentEvent.location?.latitude ||
      location?.longitude !== currentEvent.location?.longitude ||
      (location === null) !== (currentEvent.location == null)
    ) {
      payload.location = location;
    }

    if (form.dateMeeting) {
      const parsedDate = new Date(form.dateMeeting);
      const unchanged = currentEvent.date_meeting != null &&
        parsedDate.getTime() === new Date(currentEvent.date_meeting).getTime();
      const now = new Date();
      const maxDate = new Date(now);
      maxDate.setFullYear(maxDate.getFullYear() + 1);
      if (!unchanged && (Number.isNaN(parsedDate.getTime()) || parsedDate <= now || parsedDate > maxDate)) {
        setFormError("Дата встречи должна быть в будущем и не позднее чем через год.");
        return;
      }
      if (!unchanged) payload.date_meeting = parsedDate.toISOString();
    } else if (currentEvent.date_meeting != null) {
      payload.date_meeting = null;
    }

    if (Object.keys(payload).length === 0) {
      setFormError("Изменений нет.");
      return;
    }

    updateEvent.mutate(payload, {
      onSuccess: () => navigate(`/events/${eventId}`, { replace: true }),
    });
  }

  if (!Number.isFinite(eventId) || eventId <= 0) {
    return <StatusView title="Некорректный ID события" description="Проверьте адрес страницы." tone="error" />;
  }

  if (eventQuery.isLoading) {
    return <StatusView title="Загружаем событие" description="Подготавливаем форму редактирования." tone="loading" />;
  }

  if (eventQuery.isError || !eventQuery.data) {
    return <StatusView title="Не удалось загрузить событие" description={errorMessage(eventQuery.error)} tone="error" />;
  }

  if (eventQuery.data.creator_user_id !== user?.id) {
    return <StatusView title="Недостаточно прав" description="Редактировать событие может только его создатель." tone="error" />;
  }

  return (
    <div className="grid gap-6">
      <div>
        <Link to={`/events/${eventId}`} className="focus-ring rounded-lg px-1 text-sm font-semibold text-meadow">
          Вернуться к событию
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-5xl">Редактировать событие</h1>
      </div>

      <Card className="p-5 sm:p-7">
        <form onSubmit={submit} className="grid gap-0">
          <FormField title="Основное" description="Название обязательно, остальные поля можно очистить.">
            <Input
              label="Название события"
              name="title"
              required
              maxLength={50}
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
            />
          </FormField>

          <FormField title="Описание" description="До 300 символов.">
            <Textarea
              label="Описание"
              name="description"
              maxLength={300}
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
            />
          </FormField>

          <FormField title="Место и время" description="Оба поля координат заполняются вместе.">
            <div className="grid gap-4 md:grid-cols-3">
              <Input
                label="Широта"
                name="latitude"
                type="number"
                step="any"
                min={-90}
                max={90}
                inputMode="decimal"
                value={form.latitude}
                onChange={(event) => updateField("latitude", event.target.value)}
              />
              <Input
                label="Долгота"
                name="longitude"
                type="number"
                step="any"
                min={-180}
                max={180}
                inputMode="decimal"
                value={form.longitude}
                onChange={(event) => updateField("longitude", event.target.value)}
              />
              <Input
                label="Дата и время"
                name="date_meeting"
                type="datetime-local"
                value={form.dateMeeting}
                onChange={(event) => updateField("dateMeeting", event.target.value)}
              />
            </div>
          </FormField>

          {formError ? <p className="mt-5 text-sm text-clay">{formError}</p> : null}
          {updateEvent.isError ? <p className="mt-5 text-sm text-clay">{errorMessage(updateEvent.error)}</p> : null}

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => navigate(`/events/${eventId}`)}>Отмена</Button>
            <Button type="submit" disabled={updateEvent.isPending}>
              {updateEvent.isPending ? "Сохраняем..." : "Сохранить"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
