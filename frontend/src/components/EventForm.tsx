import { ArrowLeft, ArrowRight, Check, Clock3, Infinity as InfinityIcon, TimerReset } from "lucide-react";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { AutoDeletePolicy, Event, EventMarker, Location } from "../api/types";
import { Button } from "./Button";
import { EventMarkerPicker } from "./EventMarkerPicker";
import { Input, Textarea } from "./Input";
import { LocationPicker } from "./LocationPicker";

export type EventFormValue = {
  title: string;
  description: string | null;
  location: Location | null;
  marker: EventMarker | null;
  date_meeting: string | null;
  auto_delete_policy: AutoDeletePolicy;
  auto_delete_after_seconds: number | null;
};

type EventFormProps = {
  initial?: Event;
  submitLabel: string;
  pending: boolean;
  serverError?: string;
  onSubmit: (value: EventFormValue) => void;
  onCancel: () => void;
};

type FormStep = 1 | 2 | 3 | 4;

const steps: Array<{ id: FormStep; label: string }> = [
  { id: 1, label: "Данные" },
  { id: 2, label: "Маячок" },
  { id: 3, label: "Место" },
  { id: 4, label: "Удаление" },
];

function localDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function EventForm({ initial, submitLabel, pending, serverError, onSubmit, onCancel }: EventFormProps) {
  const initialSeconds = initial?.auto_delete_after_seconds ?? 7200;
  const useDays = initialSeconds >= 86400 && initialSeconds % 86400 === 0;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [location, setLocation] = useState<Location | undefined>(initial?.location ?? undefined);
  const [marker, setMarker] = useState<EventMarker | null>(initial?.marker ?? null);
  const [markerProcessing, setMarkerProcessing] = useState(false);
  const [dateMeeting, setDateMeeting] = useState(localDateTime(initial?.date_meeting));
  const [policy, setPolicy] = useState<AutoDeletePolicy>(initial?.auto_delete_policy ?? "never");
  const [intervalAmount, setIntervalAmount] = useState(String(useDays ? initialSeconds / 86400 : initialSeconds / 3600));
  const [intervalUnit, setIntervalUnit] = useState<"hours" | "days">(useDays ? "days" : "hours");
  const [step, setStep] = useState<FormStep>(1);
  const [furthestStep, setFurthestStep] = useState<FormStep>(1);
  const [formError, setFormError] = useState<string>();
  const dateMax = new Date();
  dateMax.setFullYear(dateMax.getFullYear() + 1);

  function validateDetails() {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    if (!trimmedTitle || [...trimmedTitle].length > 50) {
      setFormError("Название должно содержать от 1 до 50 символов.");
      return undefined;
    }
    if ([...trimmedDescription].length > 300) {
      setFormError("Описание не должно превышать 300 символов.");
      return undefined;
    }

    let dateIso: string | null = null;
    if (dateMeeting) {
      const date = new Date(dateMeeting);
      const now = new Date();
      const max = new Date(now);
      max.setFullYear(max.getFullYear() + 1);
      if (Number.isNaN(date.getTime()) || date <= now || date > max) {
        setFormError("Дата должна быть в будущем и не позднее чем через год.");
        return undefined;
      }
      dateIso = date.toISOString();
    }

    return { trimmedTitle, trimmedDescription, dateIso };
  }

  function openStep(nextStep: FormStep) {
    if (nextStep > 1 && !validateDetails()) return;
    setFormError(undefined);
    setStep(nextStep);
    setFurthestStep((current) => Math.max(current, nextStep) as FormStep);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(undefined);
    const details = validateDetails();
    if (!details) return;

    if (step < 4) {
      openStep((step + 1) as FormStep);
      return;
    }

    if (policy !== "never" && !details.dateIso) {
      setFormError("Укажите дату события.");
      setStep(1);
      return;
    }

    let afterSeconds: number | null = null;
    if (policy === "after_interval") {
      const amount = Number(intervalAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        setFormError("Укажите положительный интервал автоудаления.");
        return;
      }
      afterSeconds = Math.round(amount * (intervalUnit === "days" ? 86400 : 3600));
      if (afterSeconds < 60 || afterSeconds > 31_536_000) {
        setFormError("Интервал должен быть от одной минуты до одного года.");
        return;
      }
    }

    onSubmit({
      title: details.trimmedTitle,
      description: details.trimmedDescription || null,
      location: location ?? null,
      marker,
      date_meeting: details.dateIso,
      auto_delete_policy: policy,
      auto_delete_after_seconds: afterSeconds,
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-6">
      <nav className="grid grid-cols-4 gap-2" aria-label="Шаги формы">
        {steps.map((item) => {
          const active = item.id === step;
          const available = item.id <= furthestStep;
          return (
            <button key={item.id} type="button" disabled={!available || pending || markerProcessing} onClick={() => openStep(item.id)} aria-current={active ? "step" : undefined} className={`focus-ring flex min-h-14 items-center justify-center gap-2 rounded-2xl border px-2 text-xs font-extrabold transition ${active ? "border-cocoa bg-cocoa text-surface" : available ? "border-line bg-surface text-ink" : "border-line/60 bg-soft/60 text-ink/35"}`}>
              <span className="grid h-6 w-6 place-items-center rounded-full bg-current/10">{item.id < step ? <Check size={14} /> : item.id}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {formError || serverError ? <p role="alert" className="rounded-2xl bg-clay/10 p-4 text-sm font-semibold text-clay">{formError ?? serverError}</p> : null}

      {step === 1 ? (
        <section className="view-enter app-card grid gap-4 p-5 sm:p-6" aria-label="Данные события">
          <Input label="Название" name="title" required maxLength={50} placeholder="Название события" value={title} onChange={(event) => setTitle(event.target.value)} />
          <Textarea label="Описание" name="description" maxLength={300} placeholder="Описание" value={description} onChange={(event) => setDescription(event.target.value)} hint={`${[...description].length}/300`} />
          <Input label="Дата и время" name="date_meeting" type="datetime-local" min={localDateTime(new Date().toISOString())} max={localDateTime(dateMax.toISOString())} value={dateMeeting} onChange={(event) => setDateMeeting(event.target.value)} />
        </section>
      ) : null}

      {step === 2 ? (
        <section className="view-enter app-card p-4 sm:p-5" aria-label="Маячок события">
          <EventMarkerPicker value={marker} onChange={setMarker} onProcessingChange={setMarkerProcessing} disabled={pending} />
        </section>
      ) : null}

      {step === 3 ? (
        <section className="view-enter app-card p-4 sm:p-5" aria-label="Место события">
          <LocationPicker value={location} onChange={setLocation} />
        </section>
      ) : null}

      {step === 4 ? (
        <section className="view-enter app-card grid gap-4 p-5 sm:p-6" aria-label="Автоматическое удаление">
          <div className="grid gap-2 sm:grid-cols-3">
            <PolicyOption value="at_start" selected={policy} onChange={setPolicy} icon={<Clock3 size={20} />} title="После начала" />
            <PolicyOption value="after_interval" selected={policy} onChange={setPolicy} icon={<TimerReset size={20} />} title="Через время" />
            <PolicyOption value="never" selected={policy} onChange={setPolicy} icon={<InfinityIcon size={20} />} title="Не удалять" />
          </div>
          {policy === "after_interval" ? (
            <div className="grid grid-cols-[1fr_130px] gap-3 rounded-2xl bg-soft p-4">
              <Input label="Интервал" name="auto_delete_interval" type="number" min="0.02" step="0.01" value={intervalAmount} onChange={(event) => setIntervalAmount(event.target.value)} />
              <label className="grid gap-2 text-sm font-bold text-ink">Единица
                <select className="focus-ring min-h-12 rounded-2xl border border-line bg-surface px-3 text-ink" value={intervalUnit} onChange={(event) => setIntervalUnit(event.target.value as "hours" | "days")}>
                  <option value="hours">Часы</option>
                  <option value="days">Дни</option>
                </select>
              </label>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="sticky bottom-24 z-20 grid grid-cols-2 gap-3 rounded-app border border-line bg-surface/95 p-3 shadow-float backdrop-blur-xl sm:static sm:ml-auto sm:flex sm:bg-transparent sm:p-0 sm:shadow-none">
        {step === 1 ? <Button variant="secondary" onClick={onCancel} disabled={pending || markerProcessing}>Отмена</Button> : <Button variant="secondary" icon={<ArrowLeft size={18} />} onClick={() => openStep((step - 1) as FormStep)} disabled={pending || markerProcessing}>Назад</Button>}
        <Button type="submit" icon={step < 4 ? <ArrowRight size={18} /> : undefined} disabled={pending || markerProcessing}>{pending ? "Сохраняем…" : markerProcessing ? "Готовим…" : step === 3 ? (location ? "Продолжить" : "Пропустить") : step < 4 ? "Продолжить" : submitLabel}</Button>
      </div>
    </form>
  );
}

function PolicyOption({ value, selected, onChange, icon, title }: { value: AutoDeletePolicy; selected: AutoDeletePolicy; onChange: (value: AutoDeletePolicy) => void; icon: ReactNode; title: string }) {
  const active = value === selected;
  return (
    <label className={`focus-within:ring-2 focus-within:ring-leaf flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-2xl border p-4 text-center transition ${active ? "border-cocoa bg-peach/25" : "border-line bg-surface hover:bg-soft"}`}>
      <input type="radio" name="auto_delete_policy" value={value} checked={active} onChange={() => onChange(value)} className="sr-only" />
      <span className="text-cocoa">{icon}</span>
      <span className="mt-3 text-sm font-extrabold text-ink">{title}</span>
    </label>
  );
}
