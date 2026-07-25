import { describe, expect, it, vi } from "vitest";
import type OpenLayersMap from "ol/Map.js";
import type Overlay from "ol/Overlay.js";
import { syncUserBeaconCollision } from "./userLocationBeacon";

function overlay(element: { dataset: Record<string, string> }) {
  return {
    getElement: () => element,
    getPosition: () => [0, 0],
  } as unknown as Overlay;
}

describe("syncUserBeaconCollision", () => {
  it("does not calculate a collision before the map renders its first frame", () => {
    const element = { dataset: {} as Record<string, string> };
    const map = {
      getPixelFromCoordinate: vi.fn(() => null),
    } as unknown as OpenLayersMap;

    expect(() => syncUserBeaconCollision(map, overlay(element), [{ coordinate: [1, 1], radius: 15 }])).not.toThrow();
    expect(element.dataset.overEvent).toBe("false");
  });

  it("ignores an event coordinate that is not rendered yet", () => {
    const element = { dataset: {} as Record<string, string> };
    const getPixelFromCoordinate = vi.fn()
      .mockReturnValueOnce([10, 10])
      .mockReturnValueOnce(null);
    const map = { getPixelFromCoordinate } as unknown as OpenLayersMap;

    syncUserBeaconCollision(map, overlay(element), [{ coordinate: [1, 1], radius: 15 }]);

    expect(element.dataset.overEvent).toBe("false");
  });
});
