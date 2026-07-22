import { useEffect, useRef } from "react";
import Feature from "ol/Feature.js";
import OpenLayersMap from "ol/Map.js";
import View from "ol/View.js";
import { defaults as defaultControls } from "ol/control/defaults.js";
import Point from "ol/geom/Point.js";
import TileLayer from "ol/layer/Tile.js";
import VectorLayer from "ol/layer/Vector.js";
import { fromLonLat } from "ol/proj.js";
import OSM from "ol/source/OSM.js";
import VectorSource from "ol/source/Vector.js";
import { Circle as CircleStyle, Fill, RegularShape, Stroke, Style } from "ol/style.js";
import type { Location } from "../api/types";

const markerStyle = [
  new Style({
    image: new RegularShape({
      points: 4,
      radius: 13,
      angle: Math.PI / 4,
      fill: new Fill({ color: "#6f4636" }),
      stroke: new Stroke({ color: "#fff8ee", width: 3 }),
    }),
  }),
  new Style({ image: new CircleStyle({ radius: 3, fill: new Fill({ color: "#f7b892" }) }) }),
];

export function EventMiniMap({ location }: { location: Location }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const center = fromLonLat([location.longitude, location.latitude]);
    const map = new OpenLayersMap({
      target: containerRef.current,
      controls: defaultControls({ zoom: false, rotate: false, attributionOptions: { collapsible: true } }),
      layers: [
        new TileLayer({ className: "map-tiles", source: new OSM({ url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png" }) }),
        new VectorLayer({
          source: new VectorSource({ features: [new Feature({ geometry: new Point(center) })] }),
          style: markerStyle,
        }),
      ],
      view: new View({ center, zoom: 15, maxZoom: 19 }),
    });
    const frame = window.requestAnimationFrame(() => map.updateSize());
    return () => {
      window.cancelAnimationFrame(frame);
      map.setTarget(undefined);
      map.dispose();
    };
  }, [location.latitude, location.longitude]);

  return <div ref={containerRef} className="base-map h-52 w-full" role="region" aria-label="Место события на карте" tabIndex={0} />;
}
