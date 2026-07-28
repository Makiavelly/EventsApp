export const CLUSTER_SELECTION_ZOOM = 16;
export const CLUSTER_ZOOM_STEP = 2;

export function clusterClickTargetZoom(currentZoom: number, eventCount: number) {
  if (eventCount <= 1 || currentZoom >= CLUSTER_SELECTION_ZOOM - 0.01) return undefined;
  return Math.min(CLUSTER_SELECTION_ZOOM, currentZoom + CLUSTER_ZOOM_STEP);
}
