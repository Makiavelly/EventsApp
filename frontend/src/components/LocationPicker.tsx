import { LocateFixed, MapPin, Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";
import Feature from "ol/Feature.js";
import OpenLayersMap from "ol/Map.js";
import View from "ol/View.js";
import { defaults as defaultControls } from "ol/control/defaults.js";
import Point from "ol/geom/Point.js";
import Modify from "ol/interaction/Modify.js";
import TileLayer from "ol/layer/Tile.js";
import VectorLayer from "ol/layer/Vector.js";
import { fromLonLat, toLonLat } from "ol/proj.js";
import OSM from "ol/source/OSM.js";
import VectorSource from "ol/source/Vector.js";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style.js";
import type { Location } from "../api/types";
import { useUserLocation } from "../hooks/useUserLocation";
import { formatLocation } from "../utils/format";
import { Button } from "./Button";

type LocationPickerProps = {
  value?: Location;
  onChange: (location?: Location) => void;
};

const fallbackCenter = fromLonLat([37.6176, 55.7558]);

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<OpenLayersMap | null>(null);
  const sourceRef = useRef(new VectorSource<Feature<Point>>());
  const onChangeRef = useRef(onChange);
  const { location: userLocation, status, retry } = useUserLocation();

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    if (!containerRef.current) return;
    const markerStyle = new Style({
      image: new CircleStyle({ radius: 11, fill: new Fill({ color: "#b15b3e" }), stroke: new Stroke({ color: "#fff8ee", width: 4 }) }),
    });
    const map = new OpenLayersMap({
      target: containerRef.current,
      controls: defaultControls({ rotate: false, attributionOptions: { collapsible: true } }),
      layers: [
        new TileLayer({ className: "map-tiles", source: new OSM({ url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png" }) }),
        new VectorLayer({ source: sourceRef.current, style: markerStyle }),
      ],
      view: new View({ center: fallbackCenter, zoom: 11, maxZoom: 19 }),
    });
    const modify = new Modify({ source: sourceRef.current, pixelTolerance: 12 });
    map.addInteraction(modify);
    map.on("singleclick", (event) => {
      const [longitude, latitude] = toLonLat(event.coordinate);
      onChangeRef.current({ latitude, longitude });
    });
    modify.on("modifyend", () => {
      const coordinate = sourceRef.current.getFeatures()[0]?.getGeometry()?.getCoordinates();
      if (!coordinate) return;
      const [longitude, latitude] = toLonLat(coordinate);
      onChangeRef.current({ latitude, longitude });
    });
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
    if (!value) return;
    const coordinate = fromLonLat([value.longitude, value.latitude]);
    sourceRef.current.addFeature(new Feature({ geometry: new Point(coordinate) }));
  }, [value]);

  function useCurrentLocation() {
    if (!userLocation) {
      retry();
      return;
    }
    onChange(userLocation);
    mapRef.current?.getView().animate({ center: fromLonLat([userLocation.longitude, userLocation.latitude]), zoom: 15, duration: 300 });
  }

  return (
    <div className="grid gap-3">
      <div className="relative overflow-hidden rounded-app border border-line bg-soft">
        <div ref={containerRef} className="base-map h-72 w-full sm:h-80" role="region" aria-label="Выбор места события на карте" tabIndex={0} />
        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" icon={<LocateFixed size={17} />} onClick={useCurrentLocation} className="bg-surface/95">
            {status === "loading" && !userLocation ? "Определяем…" : "Моё место"}
          </Button>
          {value ? <Button type="button" variant="secondary" icon={<Trash2 size={17} />} onClick={() => onChange(undefined)} className="bg-surface/95">Без локации</Button> : null}
        </div>
      </div>
      <div className="flex items-start gap-2 rounded-2xl bg-soft px-4 py-3 text-sm text-ink/65">
        <MapPin size={17} className="mt-0.5 shrink-0 text-meadow" />
        <span>{value ? formatLocation(value) : "Без локации"}</span>
      </div>
    </div>
  );
}
