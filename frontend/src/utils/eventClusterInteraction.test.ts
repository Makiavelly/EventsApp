import { describe, expect, it } from "vitest";
import {
  CLUSTER_SELECTION_ZOOM,
  clusterClickTargetZoom,
} from "./eventClusterInteraction";

describe("event cluster interaction", () => {
  it("zooms clustered events in steps until the selection limit", () => {
    expect(clusterClickTargetZoom(10, 4)).toBe(12);
    expect(clusterClickTargetZoom(15, 4)).toBe(CLUSTER_SELECTION_ZOOM);
    expect(clusterClickTargetZoom(CLUSTER_SELECTION_ZOOM, 4)).toBeUndefined();
  });

  it("selects a single event without forcing another zoom", () => {
    expect(clusterClickTargetZoom(10, 1)).toBeUndefined();
  });
});
