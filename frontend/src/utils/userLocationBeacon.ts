import OpenLayersMap from "ol/Map.js";
import Overlay from "ol/Overlay.js";
import { fromLonLat } from "ol/proj.js";
import type { Coordinate } from "ol/coordinate.js";
import type { Location } from "../api/types";

export type BeaconCollisionTarget = {
  coordinate: Coordinate;
  radius: number;
};

const USER_BEACON_RADIUS = 19;

export function createUserLocationOverlay(map: OpenLayersMap, location: Location) {
  const element = document.createElement("div");
  element.className = "user-beacon";
  element.textContent = "Я";
  element.setAttribute("role", "img");
  element.setAttribute("aria-label", "Ваше местоположение");

  const overlay = new Overlay({
    element,
    position: fromLonLat([location.longitude, location.latitude]),
    positioning: "center-center",
    stopEvent: false,
  });
  map.addOverlay(overlay);
  return overlay;
}

export function syncUserBeaconCollision(
  map: OpenLayersMap,
  overlay: Overlay | null,
  targets: BeaconCollisionTarget[],
) {
  if (!overlay) return;
  const element = overlay.getElement();
  const position = overlay.getPosition();
  if (!element || !position) return;

  const userPixel = map.getPixelFromCoordinate(position);
  if (!userPixel) {
    element.dataset.overEvent = "false";
    return;
  }

  const overlapsEvent = targets.some(({ coordinate, radius }) => {
    const eventPixel = map.getPixelFromCoordinate(coordinate);
    if (!eventPixel) return false;
    const distance = Math.hypot(userPixel[0] - eventPixel[0], userPixel[1] - eventPixel[1]);
    return distance <= USER_BEACON_RADIUS + radius;
  });
  element.dataset.overEvent = String(overlapsEvent);
}
