import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { List, LocateOff, Map as MapIcon, MapPin, Navigation, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { useEvents } from "../api/queries";
import type { Event, EventBounds, EventsFilters } from "../api/types";
import { EventCard } from "../components/EventCard";
import { MapEventCarousel } from "../components/MapEventCarousel";
import { SlidingSelector } from "../components/SlidingSelector";
import { StatusView } from "../components/StatusView";
import { useUserLocation } from "../hooks/useUserLocation";
import { distanceMeters, errorMessage } from "../utils/format";

const EventMap = lazy(() => import("../components/EventMap").then((module) => ({ default: module.EventMap })));
type ViewMode = "map" | "list";
type LocationFilter = "nearby" | "without-location";

export function EventsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [locationFilter, setLocationFilter] = useState<LocationFilter>("nearby");
  const [radiusKm, setRadiusKm] = useState(10);
  const [mapBounds, setMapBounds] = useState<EventBounds>();
  const [selectedEvents, setSelectedEvents] = useState<Event[]>([]);
  const { location, status: locationStatus, message: locationMessage, retry } = useUserLocation();

  const mapFilters = useMemo<EventsFilters>(() => ({ bounds: mapBounds, limit: 500, offset: 0 }), [mapBounds]);
  const listFilters = useMemo<EventsFilters>(() => {
    if (locationFilter === "without-location") return { withoutLocation: true, limit: 500, offset: 0 };
    return location
      ? { latitude: location.latitude, longitude: location.longitude, radius: radiusKm * 1000, limit: 500, offset: 0 }
      : { limit: 500, offset: 0 };
  }, [location, locationFilter, radiusKm]);

  const mapQuery = useEvents(mapFilters, viewMode === "map" && locationFilter === "nearby" && mapBounds !== undefined);
  const listQuery = useEvents(listFilters, viewMode === "list" || locationFilter === "without-location");
  const mapEvents = mapQuery.data ?? [];
  const listEvents = useMemo(() => {
    const values = (listQuery.data ?? []).filter((event) => locationFilter === "without-location" ? !event.location : Boolean(event.location));
    if (!location) return values;
    return [...values].sort((left, right) => {
      const leftDistance = left.location ? distanceMeters(location, left.location) : Number.POSITIVE_INFINITY;
      const rightDistance = right.location ? distanceMeters(location, right.location) : Number.POSITIVE_INFINITY;
      return leftDistance - rightDistance;
    });
  }, [listQuery.data, location, locationFilter]);

  const updateBounds = useCallback((bounds: EventBounds) => setMapBounds((current) => {
    if (current && JSON.stringify(current) === JSON.stringify(bounds)) return current;
    return bounds;
  }), []);

  function setFilter(filter: LocationFilter) {
    setLocationFilter(filter);
    setSelectedEvents([]);
    if (filter === "without-location") setViewMode("list");
  }

  const controls = (
    <DiscoverControls
      viewMode={viewMode}
      locationFilter={locationFilter}
      onMap={() => { setViewMode("map"); setLocationFilter("nearby"); }}
      onList={() => { setViewMode("list"); setSelectedEvents([]); }}
      onNearby={() => setFilter("nearby")}
      onWithoutLocation={() => setFilter("without-location")}
      showLocationFilters={viewMode === "list"}
    />
  );

  const locationStatusView = locationFilter === "nearby" && locationStatus !== "granted" ? (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface/95 p-3 text-sm text-ink shadow-float backdrop-blur-xl">
      <MapPin size={18} className="shrink-0 text-meadow" />
      <p className="min-w-0 flex-1 leading-5">{locationMessage}</p>
      {locationStatus !== "loading" ? (
        <button type="button" onClick={retry} className="focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-soft text-cocoa" aria-label="Повторить геолокацию"><RefreshCw size={18} /></button>
      ) : null}
    </div>
  ) : null;

  return (
    <div className={`relative h-dvh w-full ${viewMode === "map" ? "overflow-hidden" : "overflow-y-auto px-3 pb-28 pt-3 sm:px-6 lg:px-8"}`}>
      <h1 className="sr-only">{viewMode === "map" ? "Карта событий" : "Список событий"}</h1>

      <div className={viewMode === "map"
        ? "pointer-events-none absolute inset-x-3 top-3 z-20 grid gap-2 sm:inset-x-auto sm:left-3 sm:w-[430px]"
        : "sticky top-0 z-20 mx-auto grid max-w-6xl gap-2 bg-mist/92 pb-3 backdrop-blur-xl"}
      >
        <div className={viewMode === "map" ? "pointer-events-auto" : undefined}>{controls}</div>
        {viewMode === "list" && locationFilter === "nearby" ? (
          <label className="grid gap-2 rounded-2xl border border-line bg-surface/95 px-4 py-3 shadow-panel">
            <span className="flex items-center justify-between gap-3 text-sm font-extrabold text-ink"><span>Радиус</span><output htmlFor="search-radius" className="text-cocoa">{radiusKm} км</output></span>
            <input id="search-radius" type="range" min="1" max="50" step="1" value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))} className="range-control w-full" />
          </label>
        ) : null}
        {locationStatusView ? <div className={viewMode === "map" ? "pointer-events-auto" : undefined}>{locationStatusView}</div> : null}
        {viewMode === "map" && mapQuery.isError ? <p className="pointer-events-auto rounded-2xl bg-clay p-3 text-sm font-semibold text-white shadow-float">{errorMessage(mapQuery.error)}</p> : null}
      </div>

      {viewMode === "map" ? (
        <div className="absolute inset-0 z-0">
          <Suspense fallback={<div className="grid h-full place-items-center bg-soft text-sm font-bold text-ink/55" role="status">Загружаем карту…</div>}>
            <EventMap fullScreen events={mapEvents} isLoading={mapQuery.isFetching} userLocation={location} onBoundsChange={updateBounds} onSelectEvents={setSelectedEvents} />
          </Suspense>
        </div>
      ) : (
        <section className="view-enter mx-auto mt-3 grid max-w-6xl gap-4">
          {listQuery.isLoading ? (
            <StatusView title="Загружаем события" tone="loading" />
          ) : listQuery.isError ? (
            <StatusView title="Не удалось загрузить события" description={errorMessage(listQuery.error)} tone="error" />
          ) : listEvents.length === 0 ? (
            <StatusView title={locationFilter === "without-location" ? "Событий без локации пока нет" : "Рядом ничего не найдено"} action={<Link to="/create" className="focus-ring inline-flex min-h-11 items-center justify-center rounded-2xl bg-cocoa px-4 text-sm font-bold text-surface">Создать событие</Link>} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {listEvents.map((event) => <EventCard key={event.id} event={event} distanceMeters={location && event.location ? distanceMeters(location, event.location) : undefined} />)}
            </div>
          )}
        </section>
      )}

      {viewMode === "map" && selectedEvents.length > 0 ? (
        <MapEventCarousel events={selectedEvents} userLocation={location} onClose={() => setSelectedEvents([])} />
      ) : null}
    </div>
  );
}

function DiscoverControls({ viewMode, locationFilter, onMap, onList, onNearby, onWithoutLocation, showLocationFilters }: { viewMode: ViewMode; locationFilter: LocationFilter; onMap: () => void; onList: () => void; onNearby: () => void; onWithoutLocation: () => void; showLocationFilters: boolean }) {
  return (
    <div className="flex flex-wrap gap-2" aria-label="Режим и фильтр событий">
      <SlidingSelector
        value={viewMode}
        ariaLabel="Режим отображения"
        className="min-w-[220px] flex-1 sm:flex-none"
        items={[
          { value: "map", label: "Карта", icon: <MapIcon size={17} /> },
          { value: "list", label: "Список", icon: <List size={17} /> },
        ]}
        onChange={(value) => value === "map" ? onMap() : onList()}
      />
      {showLocationFilters ? (
        <SlidingSelector
          value={locationFilter}
          ariaLabel="Фильтр локации"
          className="min-w-[220px] flex-1 sm:flex-none"
          items={[
            { value: "nearby", label: "Рядом", icon: <Navigation size={16} /> },
            { value: "without-location", label: "Без локации", icon: <LocateOff size={16} /> },
          ]}
          onChange={(value) => value === "nearby" ? onNearby() : onWithoutLocation()}
        />
      ) : null}
    </div>
  );
}
