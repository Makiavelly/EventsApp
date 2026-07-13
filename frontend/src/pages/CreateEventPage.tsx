import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateEvent } from "../api/queries";
import type { CreateEventPayload } from "../api/types";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { FormField } from "../components/FormField";
import { Input, Textarea } from "../components/Input";
import { Modal } from "../components/Modal";
import { errorMessage } from "../utils/format";

type CreateEventForm = {
  title: string;
  creatorUserId: string;
  latitude: string;
  longitude: string;
  description: string;
  dateMeeting: string;
};

const initialForm: CreateEventForm = {
  title: "",
  creatorUserId: "",
  latitude: "",
  longitude: "",
  description: "",
  dateMeeting: "",
};

export function CreateEventPage() {
  const [form, setForm] = useState<CreateEventForm>(initialForm);
  const [createdId, setCreatedId] = useState<number | null>(null);
  const createEvent = useCreateEvent();
  const navigate = useNavigate();

  function updateField(field: keyof CreateEventForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload: CreateEventPayload = {
      title: form.title.trim(),
      creator_user_id: Number(form.creatorUserId),
    };

    if (form.description.trim()) {
      payload.description = form.description.trim();
    }

    if (form.latitude.trim() && form.longitude.trim()) {
      payload.location = {
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
      };
    }

    if (form.dateMeeting) {
      payload.date_meeting = new Date(form.dateMeeting).toISOString();
    }

    createEvent.mutate(payload, {
      onSuccess: (createdEvent) => {
        setCreatedId(createdEvent.id);
        setForm(initialForm);
      },
    });
  }

  return (
    <>
      <div className="grid gap-6">
        <section>
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-meadow">Новое событие</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
            Соберите людей вокруг идеи
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-ink/60">
            Заполните базовые детали. Поля с координатами, описанием и временем можно оставить пустыми, если событие
            ещё уточняется.
          </p>
        </section>

        <Card className="p-5 sm:p-7">
          <form onSubmit={submit} className="grid gap-0">
            <FormField title="Основное" description="Название и ID пользователя-создателя обязательны для backend.">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Название события"
                  name="title"
                  required
                  maxLength={50}
                  value={form.title}
                  onChange={(event) => updateField("title", event.target.value)}
                  placeholder="Футбол 5 на 5"
                />
                <Input
                  label="ID пользователя"
                  name="creator_user_id"
                  required
                  inputMode="numeric"
                  value={form.creatorUserId}
                  onChange={(event) => updateField("creatorUserId", event.target.value)}
                  placeholder="1"
                />
              </div>
            </FormField>

            <FormField title="Описание" description="Коротко расскажите, что будет происходить и кого ждёте.">
              <Textarea
                label="Описание"
                name="description"
                maxLength={300}
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
                placeholder="Ищем компанию для вечерней игры, уровень любой."
              />
            </FormField>

            <FormField title="Место и время" description="Backend принимает координаты и дату встречи в ISO-формате.">
              <div className="grid gap-4 md:grid-cols-3">
                <Input
                  label="Широта"
                  name="latitude"
                  inputMode="decimal"
                  value={form.latitude}
                  onChange={(event) => updateField("latitude", event.target.value)}
                  placeholder="57.34456"
                />
                <Input
                  label="Долгота"
                  name="longitude"
                  inputMode="decimal"
                  value={form.longitude}
                  onChange={(event) => updateField("longitude", event.target.value)}
                  placeholder="-30.34560"
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

            {createEvent.isError ? <p className="mt-5 text-sm text-clay">{errorMessage(createEvent.error)}</p> : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={() => setForm(initialForm)}>
                Очистить
              </Button>
              <Button type="submit" disabled={createEvent.isPending}>
                {createEvent.isPending ? "Создаём..." : "Создать событие"}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <Modal open={createdId !== null} title="Событие создано" onClose={() => setCreatedId(null)}>
        <p className="text-sm leading-6 text-ink/65">Готово. Можно открыть страницу события или вернуться к списку.</p>
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => navigate("/")}>
            К списку
          </Button>
          <Button onClick={() => createdId && navigate(`/events/${createdId}`)}>Открыть событие</Button>
        </div>
      </Modal>
    </>
  );
}
