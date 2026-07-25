import { Circle as CircleStyle, Fill, Icon, Stroke, Style, Text } from "ol/style.js";
import type { Event } from "../api/types";

const LARGE_MARKER_SCALE = 1.5;

function shadeHex(color: string, factor: number) {
  const value = Number.parseInt(color.slice(1), 16);
  const red = Math.max(0, Math.min(255, Math.round(((value >> 16) & 255) * factor)));
  const green = Math.max(0, Math.min(255, Math.round(((value >> 8) & 255) * factor)));
  const blue = Math.max(0, Math.min(255, Math.round((value & 255) * factor)));
  return `rgb(${red} ${green} ${blue})`;
}

function enamelMarkerStyle(color: string, scale: number) {
  return [
    new Style({
      image: new CircleStyle({
        radius: 15 * scale,
        fill: new Fill({ color: shadeHex(color, 0.72) }),
        stroke: new Stroke({ color: "#fff8ee", width: 2.5 * scale }),
      }),
    }),
    new Style({
      image: new CircleStyle({
        radius: 12 * scale,
        displacement: [0, 1 * scale],
        fill: new Fill({ color }),
      }),
    }),
    new Style({
      image: new CircleStyle({
        radius: 3 * scale,
        displacement: [-4 * scale, 5 * scale],
        fill: new Fill({ color: "rgba(255, 255, 255, 0.72)" }),
      }),
    }),
  ];
}

export function eventMarkerStyle(event: Pick<Event, "marker" | "marker_size">) {
  const marker = event.marker;
  const scale = event.marker_size === "large" ? LARGE_MARKER_SCALE : 1;

  if (!marker) {
    return enamelMarkerStyle("#D8BCA0", scale);
  }
  if (marker.kind === "emoji") {
    return new Style({
      text: new Text({
        text: marker.value,
        font: `${Math.round(28 * scale)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`,
        textBaseline: "middle",
        offsetY: scale,
      }),
    });
  }
  if (marker.kind === "image") {
    const size = Math.round(36 * scale);
    return new Style({
      image: new Icon({
        src: marker.value,
        width: size,
        height: size,
      }),
    });
  }

  return enamelMarkerStyle(marker.value, scale);
}

export function eventMarkerRadius(event: Pick<Event, "marker" | "marker_size">) {
  const scale = event.marker_size === "large" ? LARGE_MARKER_SCALE : 1;
  if (event.marker?.kind === "image") return 18 * scale;
  if (event.marker?.kind === "emoji") return 16 * scale;
  return 15 * scale;
}
