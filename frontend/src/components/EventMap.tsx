import { useEffect, useMemo, useRef } from "react";
import OpenLayersMap from "ol/Map.js";
import Overlay from "ol/Overlay.js";
import View from "ol/View.js";
import { defaults as defaultControls } from "ol/control/defaults.js";
import TileLayer from "ol/layer/Tile.js";
import "ol/ol.css";
import { fromLonLat, transformExtent } from "ol/proj.js";
import OSM from "ol/source/OSM.js";
import { useNavigate } from "react-router-dom";
import type { Event, EventBounds, Location } from "../api/types";
import { formatDateTime } from "../utils/format";

type EventMapProps = {
  events: Event[];
  isLoading: boolean;
  onBoundsChange: (bounds: EventBounds) => void;
};

type MappableEvent = Event & {
  location: Location;
};

const INITIAL_CENTER = fromLonLat([37.6176, 55.7558]);
const WORLD_EXTENT = transformExtent([-180, -85.05112878, 180, 85.05112878], "EPSG:4326", "EPSG:3857");
const BOUNDS_CHANGE_DELAY_MS = 300;

function roundCoordinate(value: number) {
  return Number(value.toFixed(5));
}

function visibleBounds(map: OpenLayersMap): EventBounds | undefined {
  const size = map.getSize();
  if (!size) {
    return undefined;
  }

  const [rawWest, rawSouth, rawEast, rawNorth] = transformExtent(
    map.getView().calculateExtent(size),
    "EPSG:3857",
    "EPSG:4326",
  );

  const west = Math.max(-180, rawWest);
  const south = Math.max(-90, rawSouth);
  const east = Math.min(180, rawEast);
  const north = Math.min(90, rawNorth);

  if (west >= east || south >= north) {
    return undefined;
  }

  return {
    west: roundCoordinate(west),
    south: roundCoordinate(south),
    east: roundCoordinate(east),
    north: roundCoordinate(north),
  };
}

function hasValidLocation(event: Event): event is MappableEvent {
  const location = event.location;

  return (
    location !== null &&
    location !== undefined &&
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude) &&
    location.latitude >= -90 &&
    location.latitude <= 90 &&
    location.longitude >= -180 &&
    location.longitude <= 180
  );
}

function createMarkerElement(event: MappableEvent, openEvent: () => void) {
  const marker = document.createElement("button");
  marker.type = "button";
  marker.className = "event-map-marker";
  marker.setAttribute("aria-label", `Открыть событие «${event.title}»`);
  marker.addEventListener("click", openEvent);

  const pin = document.createElement("span");
  pin.className = "event-map-marker__pin";
  pin.setAttribute("aria-hidden", "true");

  const dot = document.createElement("span");
  dot.className = "event-map-marker__dot";
  pin.append(dot);

  const tooltip = document.createElement("span");
  tooltip.className = "event-map-tooltip";
  tooltip.setAttribute("role", "tooltip");

  const content = document.createElement("span");
  content.className = "event-map-tooltip__content";

  const title = document.createElement("strong");
  title.className = "event-map-tooltip__title";
  title.textContent = event.title;

  const date = document.createElement("span");
  date.className = "event-map-tooltip__date";
  date.textContent = formatDateTime(event.date_meeting);

  const action = document.createElement("span");
  action.className = "event-map-tooltip__action";
  action.textContent = "Открыть событие";

  content.append(title, date, action);
  tooltip.append(content);
  marker.append(pin, tooltip);

  return marker;
}

export function EventMap({ events, isLoading, onBoundsChange }: EventMapProps) {
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<OpenLayersMap | null>(null);
  const markerOverlaysRef = useRef<Overlay[]>([]);
  const onBoundsChangeRef = useRef(onBoundsChange);
  const mappableEvents = useMemo(() => events.filter(hasValidLocation), [events]);

  useEffect(() => {
    onBoundsChangeRef.current = onBoundsChange;
  }, [onBoundsChange]);

  useEffect(() => {
    if (!mapContainerRef.current) {
      return;
    }

    const map = new OpenLayersMap({
      controls: defaultControls({
        attributionOptions: { collapsible: false },
        rotate: false,
        zoomOptions: {
          zoomInTipLabel: "Приблизить",
          zoomOutTipLabel: "Отдалить",
        },
      }),
      layers: [
        new TileLayer({
          source: new OSM({
            attributions:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          }),
        }),
      ],
      target: mapContainerRef.current,
      view: new View({
        center: INITIAL_CENTER,
        extent: WORLD_EXTENT,
        maxZoom: 19,
        zoom: 9,
      }),
    });
    mapRef.current = map;

    let boundsChangeTimeout: number | undefined;

    const publishBounds = () => {
      const bounds = visibleBounds(map);
      if (bounds) {
        onBoundsChangeRef.current(bounds);
      }
    };

    const scheduleBoundsChange = () => {
      window.clearTimeout(boundsChangeTimeout);
      boundsChangeTimeout = window.setTimeout(publishBounds, BOUNDS_CHANGE_DELAY_MS);
    };

    map.on("moveend", scheduleBoundsChange);

    const resizeFrame = window.requestAnimationFrame(() => {
      map.updateSize();
      publishBounds();
    });

    return () => {
      window.cancelAnimationFrame(resizeFrame);
      window.clearTimeout(boundsChangeTimeout);
      map.un("moveend", scheduleBoundsChange);
      markerOverlaysRef.current = [];
      map.getOverlays().clear();
      map.setTarget(undefined);
      map.dispose();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    markerOverlaysRef.current.forEach((overlay) => map.removeOverlay(overlay));
    markerOverlaysRef.current = [];

    mappableEvents.forEach((event) => {
      const coordinate = fromLonLat([event.location.longitude, event.location.latitude]);
      const marker = createMarkerElement(event, () => navigate(`/events/${event.id}`));
      const overlay = new Overlay({
        element: marker,
        insertFirst: true,
        position: coordinate,
        positioning: "bottom-center",
        stopEvent: true,
      });

      map.addOverlay(overlay);
      markerOverlaysRef.current.push(overlay);
    });
  }, [mappableEvents, navigate]);

  return (
    <section className="overflow-hidden rounded-lg border border-ink/10 bg-white shadow-[0_10px_28px_rgba(23,23,23,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">События на карте</h2>
          <p className="mt-1 text-sm text-ink/55">
            {isLoading ? "Обновляем события в этой области..." : "Перемещайте карту для поиска событий."}
          </p>
        </div>
        <span className="rounded-full bg-meadow/10 px-3 py-1 text-xs font-semibold text-meadow">
          На карте: {mappableEvents.length}
        </span>
      </div>
      <div
        ref={mapContainerRef}
        className="h-[360px] w-full border-t border-ink/10 sm:h-[440px]"
        role="region"
        aria-label="Интерактивная карта событий"
        aria-busy={isLoading}
        tabIndex={0}
      />
    </section>
  );
}
