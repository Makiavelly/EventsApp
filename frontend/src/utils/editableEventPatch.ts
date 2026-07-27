import type {
  Event,
  EventMarker,
  PatchEventPayload,
} from "../api/types";

export type EditableEventValue = {
  title: string;
  description: string | null;
  marker: EventMarker | null;
  date_meeting: string | null;
};

export function buildEditableEventPatch(
  initial: Event,
  value: EditableEventValue,
): PatchEventPayload {
  const patch: PatchEventPayload = {};

  if (value.title !== initial.title) {
    patch.title = value.title;
  }
  if (value.description !== (initial.description ?? null)) {
    patch.description = value.description;
  }
  if (!sameMarker(value.marker, initial.marker ?? null)) {
    patch.marker = value.marker;
  }
  if (!sameDate(value.date_meeting, initial.date_meeting ?? null)) {
    patch.date_meeting = value.date_meeting;
  }

  return patch;
}

function sameMarker(
  first: EventMarker | null,
  second: EventMarker | null,
) {
  if (first === null || second === null) {
    return first === second;
  }

  return first.kind === second.kind && first.value === second.value;
}

function sameDate(first: string | null, second: string | null) {
  if (first === null || second === null) {
    return first === second;
  }

  const firstTime = new Date(first).getTime();
  const secondTime = new Date(second).getTime();
  if (!Number.isFinite(firstTime) || !Number.isFinite(secondTime)) {
    return first === second;
  }

  return firstTime === secondTime;
}
