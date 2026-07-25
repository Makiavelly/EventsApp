import { useEffect, useRef } from "react";
import Feature from "ol/Feature.js";
import OpenLayersMap from "ol/Map.js";
import View from "ol/View.js";
import { defaults as defaultControls } from "ol/control/defaults.js";
import { boundingExtent } from "ol/extent.js";
import Point from "ol/geom/Point.js";
import { defaults as defaultInteractions } from "ol/interaction/defaults.js";
import TileLayer from "ol/layer/Tile.js";
import VectorLayer from "ol/layer/Vector.js";
import { fromLonLat } from "ol/proj.js";
import OSM from "ol/source/OSM.js";
import VectorSource from "ol/source/Vector.js";
import type { EventMarker, EventMarkerSize, Location } from "../api/types";
import { useUserLocation } from "../hooks/useUserLocation";
import { eventMarkerRadius, eventMarkerStyle } from "../utils/eventMarkerStyle";
import { createUserLocationOverlay, syncUserBeaconCollision } from "../utils/userLocationBeacon";

type EventMiniMapProps = {
  location: Location;
  marker?: EventMarker | null;
  markerSize: EventMarkerSize;
};

export function EventMiniMap({ location, marker, markerSize }: EventMiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { location: userLocation } = useUserLocation();

  useEffect(() => {
    if (!containerRef.current) return;
    const center = fromLonLat([location.longitude, location.latitude]);
    const userCoordinate = userLocation
      ? fromLonLat([userLocation.longitude, userLocation.latitude])
      : undefined;
    const map = new OpenLayersMap({
      target: containerRef.current,
      controls: defaultControls({ zoom: false, rotate: false, attributionOptions: { collapsible: true } }),
      interactions: defaultInteractions({ onFocusOnly: false }),
      layers: [
        new TileLayer({ className: "map-tiles", source: new OSM({ url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png" }) }),
        new VectorLayer({
          source: new VectorSource({ features: [new Feature({ geometry: new Point(center) })] }),
          style: eventMarkerStyle({ marker, marker_size: markerSize }),
        }),
      ],
      view: new View({ center, zoom: 15, maxZoom: 19 }),
    });
    const userOverlay = userLocation ? createUserLocationOverlay(map, userLocation) : null;
    const syncCollision = () => syncUserBeaconCollision(map, userOverlay, [{
      coordinate: center,
      radius: eventMarkerRadius({ marker, marker_size: markerSize }),
    }]);
    map.on("moveend", syncCollision);
    const frame = window.requestAnimationFrame(() => {
      map.updateSize();
      if (userCoordinate) {
        map.getView().fit(boundingExtent([center, userCoordinate]), {
          padding: [38, 38, 38, 38],
          maxZoom: 15,
        });
      }
      syncCollision();
    });
    return () => {
      window.cancelAnimationFrame(frame);
      map.un("moveend", syncCollision);
      map.setTarget(undefined);
      map.dispose();
    };
  }, [location.latitude, location.longitude, marker, markerSize, userLocation]);

  return <div ref={containerRef} className="base-map h-52 w-full" role="region" aria-label="Место события на карте" tabIndex={0} />;
}
