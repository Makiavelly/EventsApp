import { LocateFixed, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import Feature from "ol/Feature.js";
import type { FeatureLike } from "ol/Feature.js";
import OpenLayersMap from "ol/Map.js";
import Overlay from "ol/Overlay.js";
import View from "ol/View.js";
import { defaults as defaultControls } from "ol/control/defaults.js";
import Point from "ol/geom/Point.js";
import { defaults as defaultInteractions } from "ol/interaction/defaults.js";
import TileLayer from "ol/layer/Tile.js";
import VectorLayer from "ol/layer/Vector.js";
import "ol/ol.css";
import { fromLonLat, transformExtent } from "ol/proj.js";
import Cluster from "ol/source/Cluster.js";
import OSM from "ol/source/OSM.js";
import VectorSource from "ol/source/Vector.js";
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from "ol/style.js";
import type { Event, EventBounds, Location } from "../api/types";
import type { MapCameraState } from "../utils/discoverReturnState";
import { clusterClickTargetZoom } from "../utils/eventClusterInteraction";
import { eventMarkerRadius, eventMarkerStyle } from "../utils/eventMarkerStyle";
import { createUserLocationOverlay, syncUserBeaconCollision } from "../utils/userLocationBeacon";

type EventMapProps = {
  fullScreen?: boolean;
  events: Event[];
  focusedEvent?: Event;
  focusRequestVersion?: number;
  initialCamera?: MapCameraState;
  isLoading: boolean;
  userLocation?: Location;
  onBoundsChange: (bounds: EventBounds) => void;
  onCameraChange?: (camera: MapCameraState) => void;
  onSelectEvents: (events: Event[]) => void;
};

type MappableEvent = Event & { location: Location };

const FALLBACK_CENTER = fromLonLat([37.6176, 55.7558]);
const WORLD_EXTENT = transformExtent([-180, -85.05112878, 180, 85.05112878], "EPSG:4326", "EPSG:3857");
const BOUNDS_CHANGE_DELAY_MS = 280;

function isMappable(event: Event): event is MappableEvent {
  return Boolean(event.location
    && Number.isFinite(event.location.latitude)
    && Number.isFinite(event.location.longitude)
    && event.location.latitude >= -90
    && event.location.latitude <= 90
    && event.location.longitude >= -180
    && event.location.longitude <= 180);
}

function visibleBounds(map: OpenLayersMap): EventBounds | undefined {
  const size = map.getSize();
  if (!size) return undefined;
  const [rawWest, rawSouth, rawEast, rawNorth] = transformExtent(map.getView().calculateExtent(size), "EPSG:3857", "EPSG:4326");
  const west = Math.max(-180, rawWest);
  const south = Math.max(-90, rawSouth);
  const east = Math.min(180, rawEast);
  const north = Math.min(90, rawNorth);
  if (west >= east || south >= north) return undefined;
  return {
    west: Number(west.toFixed(5)),
    south: Number(south.toFixed(5)),
    east: Number(east.toFixed(5)),
    north: Number(north.toFixed(5)),
  };
}

function clusterStyle(feature: FeatureLike, focusedEventId?: number) {
  const features = feature.get("features") as Feature<Point>[] | undefined;
  const focusedFeature = focusedEventId === undefined
    ? undefined
    : features?.find((candidate) => (candidate.get("event") as Event | undefined)?.id === focusedEventId);
  if (focusedFeature) {
    return focusedFeature.get("markerStyle") as Style | Style[] | undefined;
  }
  const count = features?.length ?? 1;
  const clustered = count > 1;
  if (!clustered) {
    return features?.[0]?.get("markerStyle") as Style | Style[] | undefined;
  }

  return new Style({
    image: new CircleStyle({
      radius: Math.min(22, 14 + Math.log2(count) * 2.5),
      fill: new Fill({ color: "#6f4636" }),
      stroke: new Stroke({ color: "#fff8ee", width: 3 }),
    }),
    text: new Text({
      text: String(count),
      fill: new Fill({ color: "#fff8ee" }),
      font: "700 12px ui-sans-serif, system-ui",
    }),
  });
}

function syncMapUserBeacon(
  map: OpenLayersMap,
  overlay: Overlay | null,
  source: VectorSource<Feature<Point>>,
) {
  syncUserBeaconCollision(
    map,
    overlay,
    source.getFeatures().flatMap((feature) => {
      const coordinate = feature.getGeometry()?.getCoordinates();
      if (!coordinate) return [];
      return [{ coordinate, radius: feature.get("markerRadius") as number }];
    }),
  );
}

export function EventMap({
  fullScreen = false,
  events,
  focusedEvent,
  focusRequestVersion,
  initialCamera,
  isLoading,
  userLocation,
  onBoundsChange,
  onCameraChange,
  onSelectEvents,
}: EventMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<OpenLayersMap | null>(null);
  const eventLayerRef = useRef<VectorLayer | null>(null);
  const sourceRef = useRef(new VectorSource<Feature<Point>>());
  const userOverlayRef = useRef<Overlay | null>(null);
  const initialCameraRef = useRef(initialCamera);
  const onBoundsChangeRef = useRef(onBoundsChange);
  const onCameraChangeRef = useRef(onCameraChange);
  const onSelectEventsRef = useRef(onSelectEvents);
  const focusedEventIdRef = useRef(focusedEvent?.id);
  const centeredOnUserRef = useRef(Boolean(initialCamera));
  const mappableEvents = useMemo(() => events.filter(isMappable), [events]);

  useEffect(() => { onBoundsChangeRef.current = onBoundsChange; }, [onBoundsChange]);
  useEffect(() => { onCameraChangeRef.current = onCameraChange; }, [onCameraChange]);
  useEffect(() => { onSelectEventsRef.current = onSelectEvents; }, [onSelectEvents]);

  useEffect(() => {
    if (!containerRef.current) return;

    const clusterSource = new Cluster({ distance: 46, minDistance: 14, source: sourceRef.current });
    const restoredCamera = initialCameraRef.current;
    const eventLayer = new VectorLayer({
      source: clusterSource,
      style: (feature) => clusterStyle(feature, focusedEventIdRef.current),
    });
    eventLayerRef.current = eventLayer;
    const map = new OpenLayersMap({
      target: containerRef.current,
      controls: defaultControls({ rotate: false, attributionOptions: { collapsible: true } }),
      interactions: defaultInteractions({ onFocusOnly: false }),
      layers: [
        new TileLayer({
          className: "map-tiles",
          source: new OSM({
            attributions: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          }),
        }),
        eventLayer,
      ],
      view: new View({
        center: restoredCamera ? [...restoredCamera.center] : FALLBACK_CENTER,
        extent: WORLD_EXTENT,
        zoom: restoredCamera?.zoom ?? 10,
        maxZoom: 19,
      }),
    });
    mapRef.current = map;

    let boundsTimeout: number | undefined;
    const publishBounds = () => {
      const bounds = visibleBounds(map);
      if (bounds) onBoundsChangeRef.current(bounds);
    };
    const publishCamera = () => {
      const center = map.getView().getCenter();
      const zoom = map.getView().getZoom();
      if (!center || zoom === undefined) return;
      onCameraChangeRef.current?.({ center: [center[0], center[1]], zoom });
    };
    const scheduleBounds = () => {
      window.clearTimeout(boundsTimeout);
      boundsTimeout = window.setTimeout(publishBounds, BOUNDS_CHANGE_DELAY_MS);
    };
    const handleMoveEnd = () => {
      publishCamera();
      scheduleBounds();
      syncMapUserBeacon(map, userOverlayRef.current, sourceRef.current);
    };

    map.on("moveend", handleMoveEnd);
    map.on("pointermove", (event) => {
      map.getTargetElement().style.cursor = map.hasFeatureAtPixel(event.pixel) ? "pointer" : "";
    });
    map.on("singleclick", (browserEvent) => {
      const clicked = map.forEachFeatureAtPixel(
        browserEvent.pixel,
        (feature) => feature as Feature,
        { hitTolerance: 16 },
      );
      const clusteredFeatures = clicked?.get("features") as Feature<Point>[] | undefined;
      if (!clusteredFeatures?.length) return;
      const selected = clusteredFeatures
        .map((feature) => feature.get("event") as Event | undefined)
        .filter((event): event is Event => event !== undefined);
      const view = map.getView();
      const currentZoom = view.getZoom() ?? 10;
      const targetZoom = clusterClickTargetZoom(currentZoom, selected.length);
      if (targetZoom !== undefined) {
        const clusterCoordinate = (clicked?.getGeometry() as Point | undefined)?.getCoordinates()
          ?? browserEvent.coordinate;
        const target = map.getTargetElement();
        target.dataset.clusterClickAction = "zooming";
        target.dataset.clusterTargetZoom = String(targetZoom);
        view.animate(
          {
            center: clusterCoordinate,
            zoom: targetZoom,
            duration: reducedMotion() ? 0 : 320,
          },
          (completed) => {
            if (completed) target.dataset.clusterClickAction = "zoomed";
          },
        );
        return;
      }
      map.getTargetElement().dataset.clusterClickAction = "select";
      onSelectEventsRef.current(selected);
    });

    const frame = window.requestAnimationFrame(() => {
      map.updateSize();
      publishBounds();
      publishCamera();
    });

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(boundsTimeout);
      map.setTarget(undefined);
      map.dispose();
      mapRef.current = null;
      eventLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    sourceRef.current.clear();
    sourceRef.current.addFeatures(mappableEvents.map((event) => {
      const feature = new Feature({
        geometry: new Point(fromLonLat([event.location.longitude, event.location.latitude])),
      });
      feature.set("event", event);
      feature.set("markerStyle", eventMarkerStyle(event));
      feature.set("markerRadius", eventMarkerRadius(event));
      return feature;
    }));
    if (mapRef.current) syncMapUserBeacon(mapRef.current, userOverlayRef.current, sourceRef.current);
  }, [mappableEvents]);

  useEffect(() => {
    focusedEventIdRef.current = focusedEvent?.id;
    eventLayerRef.current?.changed();
  }, [focusedEvent]);

  useEffect(() => {
    const map = mapRef.current;
    if (map && userOverlayRef.current) map.removeOverlay(userOverlayRef.current);
    userOverlayRef.current = null;
    if (!map || !userLocation) return;
    const coordinate = fromLonLat([userLocation.longitude, userLocation.latitude]);
    const overlay = createUserLocationOverlay(map, userLocation);
    userOverlayRef.current = overlay;
    syncMapUserBeacon(map, overlay, sourceRef.current);
    if (!centeredOnUserRef.current) {
      map.getView().animate({ center: coordinate, zoom: Math.max(13, map.getView().getZoom() ?? 10), duration: 350 });
      centeredOnUserRef.current = true;
    }
  }, [userLocation]);

  useEffect(() => {
    const map = mapRef.current;
    const target = containerRef.current;
    if (!map || !target || !focusedEvent || !isMappable(focusedEvent)) {
      if (target) {
        delete target.dataset.focusedMarkerX;
        delete target.dataset.focusedMarkerY;
      }
      return;
    }
    delete target.dataset.focusedMarkerX;
    delete target.dataset.focusedMarkerY;
    const size = map.getSize();
    if (!size) return;

    const view = map.getView();
    const zoom = Math.max(14, view.getZoom() ?? 10);
    const resolution = view.getResolutionForZoom(zoom);
    const eventCoordinate = fromLonLat([
      focusedEvent.location.longitude,
      focusedEvent.location.latitude,
    ]);
    const markerPixelY = size[1] * 0.28;
    const center = [
      eventCoordinate[0],
      eventCoordinate[1] - (size[1] / 2 - markerPixelY) * resolution,
    ];
    view.animate({ center, zoom, duration: reducedMotion() ? 0 : 360 }, (completed) => {
      if (!completed) return;
      const markerPixel = map.getPixelFromCoordinate(eventCoordinate);
      if (!markerPixel) return;
      target.dataset.focusedMarkerX = String(markerPixel[0]);
      target.dataset.focusedMarkerY = String(markerPixel[1]);
    });
  }, [focusedEvent, focusRequestVersion]);

  function recenter() {
    if (!userLocation || !mapRef.current) return;
    mapRef.current.getView().animate({ center: fromLonLat([userLocation.longitude, userLocation.latitude]), zoom: 14, duration: 320 });
  }

  return (
    <section
      className={fullScreen ? "event-map relative h-full overflow-hidden bg-surface" : "relative overflow-hidden rounded-app border border-line bg-surface shadow-panel"}
      data-focused-event-id={focusedEvent?.id}
    >
      <div ref={containerRef} className={fullScreen ? "base-map h-full w-full" : "base-map h-[58vh] min-h-[420px] w-full sm:h-[620px]"} role="region" aria-label="Карта событий" tabIndex={0} />
      {isLoading ? (
        <span className={`pointer-events-none absolute left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-surface/95 px-3 py-2 text-xs font-bold text-ink shadow-panel ${fullScreen ? "bottom-24" : "top-3"}`}>
          <Loader2 size={15} className="animate-spin" /> Обновляем события
        </span>
      ) : null}
      {userLocation ? (
        <button type="button" onClick={recenter} className={`focus-ring absolute right-3 grid h-12 w-12 place-items-center rounded-2xl border border-line bg-surface text-cocoa shadow-float ${fullScreen ? "bottom-24" : "bottom-8"}`} aria-label="Показать моё местоположение">
          <LocateFixed size={21} />
        </button>
      ) : null}
    </section>
  );
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
