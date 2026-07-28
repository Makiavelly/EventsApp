import { lazy, Suspense, useCallback, useMemo, useRef, useState } from "react";
import { MapPin, RefreshCw } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useEvents } from "../api/queries";
import type { Event, EventBounds, EventsFilters } from "../api/types";
import { LiquidEventPanel } from "../components/LiquidEventPanel";
import { useUserLocation } from "../hooks/useUserLocation";
import { getDiscoverReturnState } from "../utils/discoverReturnState";
import type { MapCameraState } from "../utils/discoverReturnState";
import { distanceMeters, errorMessage } from "../utils/format";

const EventMap = lazy(() => import("../components/EventMap").then((module) => ({ default: module.EventMap })));
const ALL_EVENTS_FILTERS: EventsFilters = { limit: 500, offset: 0 };
const EMPTY_EVENTS: Event[] = [];

export function EventsPage() {
  const routeLocation = useLocation();
  const restoredStateRef = useRef(getDiscoverReturnState(routeLocation.state));
  const restoredState = restoredStateRef.current;
  const restoredEvents = restoredState?.events ?? [];
  const [mapBounds, setMapBounds] = useState<EventBounds>();
  const [mapCamera, setMapCamera] = useState<MapCameraState | undefined>(restoredState?.mapCamera);
  const [expandedEventId, setExpandedEventId] = useState(restoredState?.activeEventId);
  const [selectedEvents, setSelectedEvents] = useState<Event[]>(restoredEvents);
  const [focusRequestVersion, setFocusRequestVersion] = useState(0);
  const [panelOpenRequest, setPanelOpenRequest] = useState(restoredEvents.length > 0 ? 1 : 0);
  const { location, status: locationStatus, message: locationMessage, retry } = useUserLocation();

  const mapFilters = useMemo<EventsFilters>(
    () => ({ bounds: mapBounds, limit: 500, offset: 0 }),
    [mapBounds],
  );
  const mapQuery = useEvents(mapFilters, mapBounds !== undefined);
  const allEventsQuery = useEvents(ALL_EVENTS_FILTERS);
  const allEvents = allEventsQuery.data ?? EMPTY_EVENTS;
  const carouselEvents = useMemo(() => {
    const values = [...allEvents];
    if (!location) {
      return values.sort((left, right) => Number(Boolean(right.location)) - Number(Boolean(left.location)));
    }
    return values.sort((left, right) => {
      const leftDistance = left.location ? distanceMeters(location, left.location) : Number.POSITIVE_INFINITY;
      const rightDistance = right.location ? distanceMeters(location, right.location) : Number.POSITIVE_INFINITY;
      return leftDistance - rightDistance;
    });
  }, [allEvents, location]);
  const focusedEvent = carouselEvents.find((event) => event.id === expandedEventId)
    ?? selectedEvents.find((event) => event.id === expandedEventId)
    ?? restoredEvents.find((event) => event.id === expandedEventId);
  const mapEvents = mapQuery.data ?? allEvents;

  const updateBounds = useCallback((bounds: EventBounds) => setMapBounds((current) => {
    if (current && JSON.stringify(current) === JSON.stringify(bounds)) return current;
    return bounds;
  }), []);

  const expandEvent = useCallback((event?: Event) => {
    setExpandedEventId(event?.id);
    if (event?.location) setFocusRequestVersion((current) => current + 1);
  }, []);

  const selectEvents = useCallback((events: Event[]) => {
    setExpandedEventId(events[0]?.id);
    setSelectedEvents(events);
    setPanelOpenRequest((current) => current + 1);
  }, []);

  const closeSelectedEvents = useCallback(() => {
    setExpandedEventId(undefined);
    setSelectedEvents([]);
  }, []);

  const locationStatusView = locationStatus !== "granted" ? (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface/95 p-3 text-sm text-ink shadow-float backdrop-blur-xl">
      <MapPin size={18} className="shrink-0 text-meadow" />
      <p className="min-w-0 flex-1 leading-5">{locationMessage}</p>
      {locationStatus !== "loading" ? (
        <button type="button" onClick={retry} className="focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-soft text-cocoa" aria-label="Повторить геолокацию">
          <RefreshCw size={18} />
        </button>
      ) : null}
    </div>
  ) : null;

  const queryError = allEventsQuery.error ?? mapQuery.error;

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <h1 className="sr-only">Карта событий</h1>

      <div className="pointer-events-none absolute inset-x-3 top-3 z-40 grid gap-2 sm:inset-x-auto sm:left-3 sm:w-[430px]">
        {locationStatusView ? <div className="pointer-events-auto">{locationStatusView}</div> : null}
        {queryError ? (
          <p className="pointer-events-auto rounded-2xl bg-clay p-3 text-sm font-semibold text-white shadow-float">
            {errorMessage(queryError)}
          </p>
        ) : null}
      </div>

      <div className="absolute inset-0 z-0">
        <Suspense fallback={<div className="grid h-full place-items-center bg-soft text-sm font-bold text-ink/55" role="status">Загружаем карту…</div>}>
          <EventMap
            fullScreen
            events={mapEvents}
            focusedEvent={focusedEvent}
            focusRequestVersion={focusRequestVersion}
            initialCamera={mapCamera ?? restoredState?.mapCamera}
            isLoading={mapQuery.isFetching || allEventsQuery.isLoading}
            userLocation={location}
            onBoundsChange={updateBounds}
            onCameraChange={setMapCamera}
            onSelectEvents={selectEvents}
          />
        </Suspense>
      </div>

      <LiquidEventPanel
        events={selectedEvents.length > 0 ? selectedEvents : carouselEvents}
        initialEventId={expandedEventId}
        mapCamera={mapCamera}
        onActiveEventChange={expandEvent}
        onClosed={closeSelectedEvents}
        openOnMount={restoredEvents.length > 0}
        openRequestVersion={panelOpenRequest}
      />
    </div>
  );
}
