import { LocateFixed, MapPin, MapPinOff } from "lucide-react";
import { useEffect, useRef } from "react";
import Feature from "ol/Feature.js";
import OpenLayersMap from "ol/Map.js";
import Overlay from "ol/Overlay.js";
import View from "ol/View.js";
import { defaults as defaultControls } from "ol/control/defaults.js";
import Point from "ol/geom/Point.js";
import { defaults as defaultInteractions } from "ol/interaction/defaults.js";
import Modify from "ol/interaction/Modify.js";
import TileLayer from "ol/layer/Tile.js";
import VectorLayer from "ol/layer/Vector.js";
import { fromLonLat, toLonLat } from "ol/proj.js";
import OSM from "ol/source/OSM.js";
import VectorSource from "ol/source/Vector.js";
import type { EventMarker, Location } from "../api/types";
import { useUserLocation } from "../hooks/useUserLocation";
import { eventMarkerRadius, eventMarkerStyle } from "../utils/eventMarkerStyle";
import { formatLocation } from "../utils/format";
import { createUserLocationOverlay, syncUserBeaconCollision } from "../utils/userLocationBeacon";
import { Button } from "./Button";

type LocationPickerProps = {
  value?: Location;
  marker?: EventMarker | null;
  omitted: boolean;
  onChange: (location?: Location) => void;
  onOmittedChange: (omitted: boolean) => void;
};

const fallbackCenter = fromLonLat([37.6176, 55.7558]);

function syncPickerUserBeacon(
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

export function LocationPicker({ value, marker, omitted, onChange, onOmittedChange }: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<OpenLayersMap | null>(null);
  const sourceRef = useRef(new VectorSource<Feature<Point>>());
  const userOverlayRef = useRef<Overlay | null>(null);
  const onChangeRef = useRef(onChange);
  const onOmittedChangeRef = useRef(onOmittedChange);
  const valueRef = useRef(value);
  const omittedRef = useRef(omitted);
  const { location: userLocation, status, retry } = useUserLocation();
  const initialValueRef = useRef(value);
  const initialUserLocationRef = useRef(userLocation);
  const centeredOnUserRef = useRef(Boolean(value || userLocation));

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onOmittedChangeRef.current = onOmittedChange; }, [onOmittedChange]);
  useEffect(() => { valueRef.current = value; }, [value]);
  useEffect(() => { omittedRef.current = omitted; }, [omitted]);

  useEffect(() => {
    if (!containerRef.current) return;
    const initialLocation = initialValueRef.current ?? initialUserLocationRef.current;
    const initialCenter = initialLocation
      ? fromLonLat([initialLocation.longitude, initialLocation.latitude])
      : fallbackCenter;
    const map = new OpenLayersMap({
      target: containerRef.current,
      controls: defaultControls({ rotate: false, attributionOptions: { collapsible: true } }),
      interactions: defaultInteractions({ onFocusOnly: false }),
      layers: [
        new TileLayer({ className: "map-tiles", source: new OSM({ url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png" }) }),
        new VectorLayer({ source: sourceRef.current }),
      ],
      view: new View({ center: initialCenter, zoom: initialLocation ? 15 : 11, maxZoom: 19 }),
    });
    const modify = new Modify({ source: sourceRef.current, pixelTolerance: 12 });
    map.addInteraction(modify);
    map.on("singleclick", (event) => {
      if (omittedRef.current) return;
      const [longitude, latitude] = toLonLat(event.coordinate);
      onOmittedChangeRef.current(false);
      onChangeRef.current({ latitude, longitude });
    });
    modify.on("modifyend", () => {
      if (omittedRef.current) return;
      const coordinate = sourceRef.current.getFeatures()[0]?.getGeometry()?.getCoordinates();
      if (!coordinate) return;
      const [longitude, latitude] = toLonLat(coordinate);
      onChangeRef.current({ latitude, longitude });
    });
    map.on("moveend", () => syncPickerUserBeacon(map, userOverlayRef.current, sourceRef.current));
    mapRef.current = map;
    const frame = window.requestAnimationFrame(() => map.updateSize());
    return () => {
      window.cancelAnimationFrame(frame);
      map.setTarget(undefined);
      map.dispose();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    sourceRef.current.clear();
    if (!value || omitted) {
      if (mapRef.current) syncPickerUserBeacon(mapRef.current, userOverlayRef.current, sourceRef.current);
      return;
    }
    const coordinate = fromLonLat([value.longitude, value.latitude]);
    const feature = new Feature({ geometry: new Point(coordinate) });
    feature.setStyle(eventMarkerStyle({ marker, marker_size: "normal" }));
    feature.set("markerRadius", eventMarkerRadius({ marker, marker_size: "normal" }));
    sourceRef.current.addFeature(feature);
    if (mapRef.current) syncPickerUserBeacon(mapRef.current, userOverlayRef.current, sourceRef.current);
  }, [marker, omitted, value]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (userOverlayRef.current) map.removeOverlay(userOverlayRef.current);
    userOverlayRef.current = null;
    if (!userLocation) return;

    const overlay = createUserLocationOverlay(map, userLocation);
    userOverlayRef.current = overlay;
    if (!valueRef.current && !omittedRef.current && !centeredOnUserRef.current) {
      map.getView().animate({
        center: fromLonLat([userLocation.longitude, userLocation.latitude]),
        zoom: 15,
        duration: 300,
      });
      centeredOnUserRef.current = true;
    }
    syncPickerUserBeacon(map, overlay, sourceRef.current);
  }, [userLocation]);

  function useCurrentLocation() {
    if (!userLocation) {
      retry();
      return;
    }
    onOmittedChange(false);
    onChange(userLocation);
    mapRef.current?.getView().animate({ center: fromLonLat([userLocation.longitude, userLocation.latitude]), zoom: 15, duration: 300 });
  }

  function omitLocation() {
    onChange(undefined);
    onOmittedChange(true);
  }

  function enableLocation() {
    onOmittedChange(false);
    if (userLocation) {
      mapRef.current?.getView().animate({
        center: fromLonLat([userLocation.longitude, userLocation.latitude]),
        zoom: 15,
        duration: 260,
      });
    }
  }

  return (
    <div className="grid gap-3">
      <div className="relative overflow-hidden rounded-app border border-line bg-soft">
        <div ref={containerRef} className="base-map h-72 w-full sm:h-80" role="region" aria-label="Выбор места события на карте" tabIndex={0} />
        <div className="location-picker__omitted-overlay absolute inset-0 z-10 grid place-items-center px-6 text-center" data-active={omitted} aria-hidden={!omitted}>
          <div className="location-picker__omitted-message rounded-2xl border border-line bg-surface/90 px-5 py-4 shadow-panel">
            <p className="font-black text-ink">Место не указано</p>
            <p className="mt-1 text-xs text-ink/55">Координаты не будут сохранены</p>
          </div>
        </div>
        <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap gap-2">
          {!omitted ? (
            <Button type="button" variant="secondary" icon={<LocateFixed size={17} />} onClick={useCurrentLocation} className="bg-surface/95">
              {status === "loading" && !userLocation ? "Определяем…" : "Моё место"}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            icon={omitted ? <MapPin size={17} /> : <MapPinOff size={17} />}
            onClick={omitted ? enableLocation : omitLocation}
            className="bg-surface/95"
          >
            {omitted ? "Указать место" : "Не указывать"}
          </Button>
        </div>
      </div>
      <div className="flex items-start gap-2 rounded-2xl bg-soft px-4 py-3 text-sm text-ink/65">
        <MapPin size={17} className="mt-0.5 shrink-0 text-meadow" />
        <span>{omitted ? "Место не указано" : value ? formatLocation(value) : "Нажмите на карту, чтобы выбрать место"}</span>
      </div>
    </div>
  );
}
