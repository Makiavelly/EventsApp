import { CalendarDays, MapPin, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import type { Event } from "../api/types";
import { formatDateTime, formatLocation } from "../utils/format";
import { Card } from "./Card";

type EventCardProps = {
  event: Event;
};

export function EventCard({ event }: EventCardProps) {
  return (
    <Link to={`/events/${event.id}`} className="focus-ring block rounded-lg">
      <Card className="h-full p-5 transition hover:-translate-y-0.5 hover:border-meadow/45 hover:shadow-panel">
        <div className="flex h-full flex-col gap-5">
          <div>
            <div className="mb-3 inline-flex items-center rounded-full bg-meadow/10 px-3 py-1 text-xs font-semibold text-meadow">
              Событие #{event.id}
            </div>
            <h2 className="line-clamp-2 text-xl font-semibold tracking-tight text-ink">{event.title}</h2>
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-ink/60">
              {event.description ?? "Описание пока не добавлено. Можно открыть событие и посмотреть детали."}
            </p>
          </div>

          <div className="mt-auto grid gap-2 text-sm text-ink/65">
            <span className="flex items-center gap-2">
              <CalendarDays size={16} className="text-meadow" />
              {formatDateTime(event.date_meeting)}
            </span>
            <span className="flex items-center gap-2">
              <MapPin size={16} className="text-meadow" />
              {formatLocation(event.location)}
            </span>
            <span className="flex items-center gap-2">
              <UsersRound size={16} className="text-meadow" />
              Создатель: пользователь #{event.creator_user_id}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
