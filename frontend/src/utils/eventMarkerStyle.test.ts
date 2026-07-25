import { Circle as CircleStyle, Style } from "ol/style.js";
import { describe, expect, it } from "vitest";
import { eventMarkerStyle } from "./eventMarkerStyle";

describe("eventMarkerStyle", () => {
  it("scales enamel markers for promoted events", () => {
    const normal = eventMarkerStyle({ marker: null, marker_size: "normal" }) as Style[];
    const large = eventMarkerStyle({ marker: null, marker_size: "large" }) as Style[];

    expect((normal[0].getImage() as CircleStyle).getRadius()).toBe(15);
    expect((large[0].getImage() as CircleStyle).getRadius()).toBe(22.5);
  });

  it("scales emoji markers for promoted events", () => {
    const normal = eventMarkerStyle({ marker: { kind: "emoji", value: "🚀" }, marker_size: "normal" }) as Style;
    const large = eventMarkerStyle({ marker: { kind: "emoji", value: "🚀" }, marker_size: "large" }) as Style;

    expect(normal.getText()?.getFont()).toContain("28px");
    expect(large.getText()?.getFont()).toContain("42px");
  });
});
