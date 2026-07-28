import type { Event } from "../api/types";

export function eventCardShades(events: Event[]) {
  let previousShade = -1;
  return events.map((event, index) => {
    const hash = stableHash(`${event.id}:${event.title}`);
    let shade = (hash + index * 3) % 8;
    if (shade === previousShade) shade = (shade + 1 + hash % 7) % 8;
    previousShade = shade;
    return shade;
  });
}

function stableHash(value: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}
