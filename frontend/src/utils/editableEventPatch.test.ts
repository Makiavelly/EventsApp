import { describe, expect, it } from "vitest";
import type { Event } from "../api/types";
import { buildEditableEventPatch } from "./editableEventPatch";

const initialEvent: Event = {
  id: 1,
  creator_user_id: 7,
  title: "Initial title",
  description: "Initial description",
  location: { latitude: 55.75, longitude: 37.61 },
  marker: { kind: "emoji", value: "🎉" },
  marker_size: "large",
  date_meeting: "2026-08-10T18:00:00.000Z",
  auto_delete_policy: "after_interval",
  auto_delete_after_seconds: 7200,
};

it("sends explicit null when editable nullable fields are cleared", () => {
  const patch = buildEditableEventPatch(initialEvent, {
    title: initialEvent.title,
    description: null,
    marker: null,
    date_meeting: null,
  });

  expect(patch).toEqual({
    description: null,
    marker: null,
    date_meeting: null,
  });
  expect(patch).not.toHaveProperty("location");
  expect(patch).not.toHaveProperty("auto_delete_policy");
  expect(patch).not.toHaveProperty("auto_delete_after_seconds");
  expect(patch).not.toHaveProperty("marker_size");
});

it("patches one changed field without overwriting the others", () => {
  const patch = buildEditableEventPatch(initialEvent, {
    title: "Changed title",
    description: initialEvent.description ?? null,
    marker: initialEvent.marker ?? null,
    date_meeting: "2026-08-10T21:00:00+03:00",
  });

  expect(patch).toEqual({ title: "Changed title" });
});

describe("two-step edit payload boundary", () => {
  it("does not send location, lifecycle, or server-owned marker size", () => {
    const patch = buildEditableEventPatch(initialEvent, {
      title: initialEvent.title,
      description: initialEvent.description ?? null,
      marker: initialEvent.marker ?? null,
      date_meeting: initialEvent.date_meeting ?? null,
    });

    expect(patch).toEqual({});
    expect(Object.keys(patch)).toEqual([]);
  });
});
