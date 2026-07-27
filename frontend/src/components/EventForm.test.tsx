import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Event } from "../api/types";
import { EventForm } from "./EventForm";

const event: Event = {
  id: 9,
  creator_user_id: 1,
  title: "Existing event",
  description: "Existing description",
  location: { latitude: 55.75, longitude: 37.61 },
  marker: { kind: "emoji", value: "🎲" },
  marker_size: "normal",
  date_meeting: "2026-08-10T18:00:00Z",
  auto_delete_policy: "after_interval",
  auto_delete_after_seconds: 7200,
};

describe("event wizard steps", () => {
  it("renders four steps for create", () => {
    const markup = renderToStaticMarkup(
      <EventForm
        submitLabel="Создать"
        pending={false}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(markup).toContain(">Данные<");
    expect(markup).toContain(">Маячок<");
    expect(markup).toContain(">Место<");
    expect(markup).toContain(">Удаление<");
  });

  it("renders only two steps for edit and initializes current values", () => {
    const markup = renderToStaticMarkup(
      <EventForm
        initial={event}
        mode="edit"
        submitLabel="Сохранить"
        pending={false}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(markup).toContain(">Данные<");
    expect(markup).toContain(">Маячок<");
    expect(markup).not.toContain(">Место<");
    expect(markup).not.toContain(">Удаление<");
    expect(markup).toContain('value="Existing event"');
    expect(markup).toContain("Existing description");
    const date = new Date(event.date_meeting ?? "");
    const localDate = new Date(
      date.getTime() - date.getTimezoneOffset() * 60_000,
    ).toISOString().slice(0, 16);
    expect(markup).toContain(`value="${localDate}"`);
  });
});
