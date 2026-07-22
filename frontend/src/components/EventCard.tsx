import { CalendarDays, MapPin, Navigation } from "lucide-react";
import { Link } from "react-router-dom";
import type { Event } from "../api/types";
import { formatDateTime, formatDistance } from "../utils/format";
import { Card } from "./Card";

type EventCardProps = {
  event: Event;
  distanceMeters?: number;
  compact?: boolean;
};

export function EventCard({ event, distanceMeters, compact = false }: EventCardProps) {
  return (
    <Link to={`/events/${event.id}`} className="focus-ring block rounded-app">
      <Card className="h-full overflow-hidden p-5 transition hover:-translate-y-0.5 hover:border-peach hover:shadow-float">
        <div className="flex h-full flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="line-clamp-2 break-words text-lg font-extrabold leading-snug tracking-tight text-ink">{event.title}</h2>
            </div>
            {distanceMeters !== undefined ? (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-soft px-2.5 py-1 text-xs font-bold text-cocoa">
                <Navigation size={13} />
                {formatDistance(distanceMeters)}
              </span>
            ) : null}
          </div>

          {!compact && event.description ? (
            <p className="line-clamp-3 break-words text-sm leading-6 text-ink/60">
              {event.description}
            </p>
          ) : null}

          <div className="mt-auto grid gap-2 text-sm text-ink/65">
            <span className="flex min-w-0 items-center gap-2">
              <CalendarDays size={16} className="shrink-0 text-meadow" />
              <span className="truncate">{formatDateTime(event.date_meeting)}</span>
            </span>
            <span className="flex min-w-0 items-center gap-2">
              <MapPin size={16} className="shrink-0 text-meadow" />
              <span className="truncate">{event.location ? "На карте" : "Без локации"}</span>
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
