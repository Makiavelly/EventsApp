import type { Event } from "../api/types";

export type MapCameraState = {
  center: [number, number];
  zoom: number;
};

export type DiscoverReturnState = {
  activeEventId?: number;
  events: Event[];
  mapCamera?: MapCameraState;
};

export type DiscoverLocationState = {
  discover: DiscoverReturnState;
};

export function getDiscoverReturnState(state: unknown): DiscoverReturnState | undefined {
  if (!isRecord(state) || !isRecord(state.discover)) return undefined;

  const { activeEventId, events, mapCamera } = state.discover;
  if (activeEventId !== undefined && !Number.isFinite(activeEventId)) return undefined;
  if (!Array.isArray(events) || !events.every(isEventReference)) return undefined;
  if (mapCamera !== undefined && !isMapCameraState(mapCamera)) return undefined;

  return {
    events: events as Event[],
    ...(activeEventId !== undefined ? { activeEventId: Number(activeEventId) } : {}),
    ...(mapCamera ? { mapCamera } : {}),
  };
}

function isMapCameraState(value: unknown): value is MapCameraState {
  if (!isRecord(value) || !Array.isArray(value.center) || value.center.length !== 2) return false;
  return value.center.every((coordinate) => Number.isFinite(coordinate)) && Number.isFinite(value.zoom);
}

function isEventReference(value: unknown) {
  return isRecord(value) && Number.isFinite(value.id);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
