import { describe, expect, it } from "vitest";
import {
  DEFORMATION_ZONE_WIDTH_PX,
  liquidPanelPath,
  HANDLE_TAB_HEIGHT_PX,
  MAX_DEFORMATION_PX,
  panelHandleRotation,
  panelTarget,
} from "./liquidPanelMotion";

describe("liquid panel motion", () => {
  it("uses position and gesture velocity to choose the settle target", () => {
    expect(panelTarget(0.41, 0)).toBe(0);
    expect(panelTarget(0.42, 0)).toBe(1);
    expect(panelTarget(0.2, -0.7)).toBe(1);
    expect(panelTarget(0.8, 0.7)).toBe(0);
  });

  it("keeps the bezier tip aligned with the centered handle", () => {
    const path = liquidPanelPath({
      bottomY: 832,
      deformation: 1,
      edgeY: 700,
      progress: 0.4,
      reducedMotion: false,
      width: 390,
    });

    expect(path).toContain(`195 ${700 - (HANDLE_TAB_HEIGHT_PX * (1 - smoothstep(0.4)) + MAX_DEFORMATION_PX)}`);
    expect(path).not.toContain("NaN");
  });

  it("uses a wider deformation zone and one smooth symmetric bump", () => {
    const path = liquidPanelPath({
      bottomY: 832,
      deformation: 1,
      edgeY: 700,
      progress: 0,
      reducedMotion: false,
      width: 448,
    });

    expect(DEFORMATION_ZONE_WIDTH_PX).toBe(300);
    expect(path.match(/C /g)).toHaveLength(2);
  });

  it("rotates the handle through a clamped half turn", () => {
    expect(panelHandleRotation(-0.2)).toBe(0);
    expect(panelHandleRotation(0.5)).toBe(90);
    expect(panelHandleRotation(1.2)).toBe(180);
  });

  it("removes strong deformation for reduced motion", () => {
    const regular = liquidPanelPath({
      bottomY: 832,
      deformation: 1,
      edgeY: 700,
      progress: 0.5,
      reducedMotion: false,
      width: 390,
    });
    const reduced = liquidPanelPath({
      bottomY: 832,
      deformation: 1,
      edgeY: 700,
      progress: 0.5,
      reducedMotion: true,
      width: 390,
    });

    expect(regular).not.toBe(reduced);
    expect(reduced).toContain("195 696");
  });
});

function smoothstep(value: number) {
  return value * value * (3 - 2 * value);
}
