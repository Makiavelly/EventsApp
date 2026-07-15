import { FormEvent, lazy, Suspense, useCallback, useMemo, useState } from "react";
import { Filter, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useEvents } from "../api/queries";
import type { EventBounds, EventsFilters } from "../api/types";
import { Button } from "../components/Button";
import { EventCard } from "../components/EventCard";
import { Input } from "../components/Input";
import { StatusView } from "../components/StatusView";
import { errorMessage, toOptionalNumber } from "../utils/format";

const EventMap = lazy(() =>
  import("../components/EventMap").then((module) => ({ default: module.EventMap })),
);

type FilterForm = {
  latitude: string;
  longitude: string;
  radius: string;
};

export function EventsPage() {
  const [form, setForm] = useState<FilterForm>({ latitude: "", longitude: "", radius: "" });
  const [filters, setFilters] = useState<EventsFilters>({ limit: 500, offset: 0 });
  const [mapBounds, setMapBounds] = useState<EventBounds>();

  const queryFilters = useMemo(
    () => ({ ...filters, bounds: mapBounds }),
    [filters, mapBounds],
  );

  const { data: events = [], isLoading, isError, error, isFetching } = useEvents(queryFilters, mapBounds !== undefined);

  const activeFilterCount = useMemo(
    () => [filters.latitude, filters.longitude, filters.radius].filter((value) => value !== undefined).length,
    [filters],
  );

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters({
      limit: 500,
      offset: 0,
      latitude: toOptionalNumber(form.latitude),
      longitude: toOptionalNumber(form.longitude),
      radius: toOptionalNumber(form.radius),
    });
  }

  function resetFilters() {
    setForm({ latitude: "", longitude: "", radius: "" });
    setFilters({ limit: 500, offset: 0 });
  }

  const updateMapBounds = useCallback((bounds: EventBounds) => {
    setMapBounds((currentBounds) => {
      if (
        currentBounds?.west === bounds.west &&
        currentBounds.south === bounds.south &&
        currentBounds.east === bounds.east &&
        currentBounds.north === bounds.north
      ) {
        return currentBounds;
      }

      return bounds;
    });
  }, []);

  return (
    <div className="grid gap-6">
      <section className="grid gap-5 rounded-lg border border-ink/10 bg-white px-5 py-6 shadow-[0_10px_28px_rgba(23,23,23,0.05)] lg:grid-cols-[1fr_360px] lg:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-meadow">Афиша людей рядом</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
            Найдите событие, компанию и повод выйти из дома
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-ink/60">
            Футбол во дворе, настолки вечером, концерт после работы или встреча по интересам. Фильтруйте события по
            координатам и радиусу.
          </p>
        </div>
        <Link
          to="/create"
          className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-black"
        >
          <Plus size={18} />
          Создать событие
        </Link>
      </section>

      <form
        onSubmit={submitFilters}
        className="grid gap-4 rounded-lg border border-ink/10 bg-white p-4 shadow-[0_10px_28px_rgba(23,23,23,0.05)] md:grid-cols-[1fr_1fr_1fr_auto_auto] md:items-end"
      >
        <Input
          label="Широта"
          name="latitude"
          inputMode="decimal"
          placeholder="57.34456"
          value={form.latitude}
          onChange={(event) => setForm((current) => ({ ...current, latitude: event.target.value }))}
        />
        <Input
          label="Долгота"
          name="longitude"
          inputMode="decimal"
          placeholder="-30.34560"
          value={form.longitude}
          onChange={(event) => setForm((current) => ({ ...current, longitude: event.target.value }))}
        />
        <Input
          label="Радиус"
          name="radius"
          inputMode="numeric"
          placeholder="5000"
          value={form.radius}
          onChange={(event) => setForm((current) => ({ ...current, radius: event.target.value }))}
        />
        <Button type="submit" icon={<Filter size={17} />}>
          Фильтровать
        </Button>
        <Button type="button" variant="secondary" onClick={resetFilters}>
          Сбросить
        </Button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink/60">
          {mapBounds === undefined
            ? "Определяем видимую область карты..."
            : isFetching
              ? "Обновляем события в области карты..."
              : `Найдено в области карты: ${events.length}`}
        </p>
        {activeFilterCount > 0 ? (
          <span className="rounded-full bg-meadow/10 px-3 py-1 text-xs font-semibold text-meadow">
            Активных фильтров: {activeFilterCount}
          </span>
        ) : null}
      </div>

      <Suspense
        fallback={
          <StatusView
            title="Загружаем карту"
            description="Подготавливаем интерактивную карту событий."
            tone="loading"
          />
        }
      >
        <EventMap events={events} isLoading={isFetching} onBoundsChange={updateMapBounds} />
      </Suspense>

      {mapBounds === undefined ? (
        <StatusView title="Инициализируем карту" description="Определяем область для первого поиска." tone="loading" />
      ) : isLoading ? (
        <StatusView title="Загружаем события" description="Запрашиваем список у Go backend." tone="loading" />
      ) : isError ? (
        <StatusView title="Не удалось загрузить события" description={errorMessage(error)} tone="error" />
      ) : events.length === 0 ? (
        <StatusView
          title="Событий пока нет"
          description="В этой области событий нет. Переместите карту или измените фильтры поиска."
          action={
            <Link to="/create">
              <Button>Создать событие</Button>
            </Link>
          }
        />
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </section>
      )}
    </div>
  );
}
