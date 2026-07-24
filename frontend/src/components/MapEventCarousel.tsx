import { CalendarDays, Navigation } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AnimationEvent as ReactAnimationEvent, CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { Link } from "react-router-dom";
import { useJoinEvent, useParticipants } from "../api/queries";
import type { Event, Location } from "../api/types";
import { useAuth } from "../auth/useAuth";
import { useToast } from "../toast/useToast";
import type { DiscoverLocationState, MapCameraState } from "../utils/discoverReturnState";
import { distanceMeters, errorMessage, formatDateTime, formatDistance } from "../utils/format";

const HORIZONTAL_SWIPE_THRESHOLD = 64;
const VERTICAL_SWIPE_THRESHOLD = 52;
const AXIS_LOCK_THRESHOLD = 8;
const MAX_HORIZONTAL_DRAG = 88;
const MAX_VERTICAL_DRAG = 104;
const DISMISS_FALLBACK_MS = 800;

type GestureAxis = "horizontal" | "vertical";

type GestureStart = {
  x: number;
  y: number;
};

type StackEntry = {
  event: Event;
  depth: number;
};

export function MapEventCarousel({ events, initialEventId, mapCamera, userLocation, onClose }: { events: Event[]; initialEventId?: number; mapCamera?: MapCameraState; userLocation?: Location; onClose: () => void }) {
  const { user } = useAuth();
  const toast = useToast();
  const [index, setIndex] = useState(() => eventIndex(events, initialEventId));
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [closing, setClosing] = useState(false);
  const startRef = useRef<GestureStart>();
  const axisRef = useRef<GestureAxis>();
  const rawDragRef = useRef<GestureStart>({ x: 0, y: 0 });
  const stackRef = useRef<HTMLDivElement>(null);
  const dismissTimerRef = useRef<number>();
  const eventsKey = events.map((event) => event.id).join(":");
  const previousEventsKeyRef = useRef(eventsKey);
  const event = events[Math.min(index, Math.max(0, events.length - 1))];
  const participantsQuery = useParticipants(event?.id);
  const joinEvent = useJoinEvent();

  useEffect(() => {
    if (previousEventsKeyRef.current !== eventsKey) {
      previousEventsKeyRef.current = eventsKey;
      setIndex(eventIndex(events, initialEventId));
      setDragX(0);
      setDragY(0);
      joinEvent.reset();
    }
  }, [events, eventsKey, initialEventId, joinEvent]);

  useEffect(() => {
    setIndex((current) => Math.min(current, Math.max(0, events.length - 1)));
  }, [events.length]);

  useEffect(() => {
    stackRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => () => {
    if (dismissTimerRef.current !== undefined) window.clearTimeout(dismissTimerRef.current);
  }, []);

  const stackEntries = useMemo<StackEntry[]>(() => {
    if (events.length === 0) return [];

    return events.flatMap((item, eventIndex) => {
      const depth = getStackDepth(eventIndex, index, events.length);
      return depth >= -1 && depth <= 2 ? [{ event: item, depth }] : [];
    });
  }, [events, index]);

  if (!event) return null;

  const currentParticipation = participantsQuery.data?.some((participant) => participant.participant_id === user?.id) ?? false;
  const isCreator = event.creator_user_id === user?.id;
  const canJoin = !isCreator && !currentParticipation && participantsQuery.isSuccess && !joinEvent.isPending;

  function show(nextIndex: number) {
    setIndex((nextIndex + events.length) % events.length);
    joinEvent.reset();
  }

  function join() {
    if (!canJoin) return;
    joinEvent.mutate({ event_id: event.id }, {
      onSuccess: () => toast({ message: "Вы присоединились к событию." }),
    });
  }

  function resetGesture() {
    startRef.current = undefined;
    axisRef.current = undefined;
    rawDragRef.current = { x: 0, y: 0 };
    setDragging(false);
    setDragX(0);
    setDragY(0);
  }

  function dismiss() {
    if (closing) return;
    resetGesture();
    setClosing(true);
    dismissTimerRef.current = window.setTimeout(onClose, DISMISS_FALLBACK_MS);
  }

  function finishDismiss(animationEvent: ReactAnimationEvent<HTMLDivElement>) {
    if (!closing || animationEvent.target !== animationEvent.currentTarget || animationEvent.animationName !== "event-card-stack-dismiss") return;
    if (dismissTimerRef.current !== undefined) window.clearTimeout(dismissTimerRef.current);
    onClose();
  }

  function pointerDown(pointerEvent: ReactPointerEvent<HTMLElement>) {
    if ((pointerEvent.target as HTMLElement).closest("a, button")) return;
    startRef.current = { x: pointerEvent.clientX, y: pointerEvent.clientY };
    axisRef.current = undefined;
    rawDragRef.current = { x: 0, y: 0 };
    setDragging(true);
    pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);
  }

  function pointerMove(pointerEvent: ReactPointerEvent<HTMLElement>) {
    const start = startRef.current;
    if (!start) return;

    const rawX = pointerEvent.clientX - start.x;
    const rawY = pointerEvent.clientY - start.y;
    rawDragRef.current = { x: rawX, y: rawY };

    if (!axisRef.current && Math.max(Math.abs(rawX), Math.abs(rawY)) >= AXIS_LOCK_THRESHOLD) {
      axisRef.current = Math.abs(rawX) > Math.abs(rawY) ? "horizontal" : "vertical";
    }

    if (axisRef.current === "horizontal") {
      setDragX(resistedDrag(rawX, MAX_HORIZONTAL_DRAG, 0.42));
      setDragY(0);
    } else if (axisRef.current === "vertical") {
      setDragX(0);
      setDragY(resistedDrag(rawY, MAX_VERTICAL_DRAG, 0.58));
    }
  }

  function pointerEnd(pointerEvent: ReactPointerEvent<HTMLElement>) {
    if (!startRef.current) return;
    const axis = axisRef.current;
    const rawDrag = rawDragRef.current;
    resetGesture();

    if (pointerEvent.currentTarget.hasPointerCapture(pointerEvent.pointerId)) {
      pointerEvent.currentTarget.releasePointerCapture(pointerEvent.pointerId);
    }

    if (axis === "horizontal" && Math.abs(rawDrag.x) >= HORIZONTAL_SWIPE_THRESHOLD) {
      join();
      return;
    }

    if (axis === "vertical" && events.length > 1) {
      if (rawDrag.y <= -VERTICAL_SWIPE_THRESHOLD) show(index + 1);
      else if (rawDrag.y >= VERTICAL_SWIPE_THRESHOLD) show(index - 1);
    }
  }

  function pointerCancel(pointerEvent: ReactPointerEvent<HTMLElement>) {
    resetGesture();
    if (pointerEvent.currentTarget.hasPointerCapture(pointerEvent.pointerId)) {
      pointerEvent.currentTarget.releasePointerCapture(pointerEvent.pointerId);
    }
  }

  function keyDown(keyboardEvent: KeyboardEvent<HTMLDivElement>) {
    if (keyboardEvent.key === "Escape") {
      keyboardEvent.preventDefault();
      dismiss();
      return;
    }
    if (events.length <= 1) return;
    if (keyboardEvent.key === "ArrowUp") {
      keyboardEvent.preventDefault();
      show(index - 1);
    } else if (keyboardEvent.key === "ArrowDown") {
      keyboardEvent.preventDefault();
      show(index + 1);
    }
  }

  return (
    <div
      className="map-event-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={events.length > 1 ? "События в выбранной точке" : "Выбранное событие"}
      data-closing={closing ? "true" : "false"}
      onPointerDown={(pointerEvent) => {
        if (pointerEvent.target === pointerEvent.currentTarget) dismiss();
      }}
    >
      <div
        ref={stackRef}
        className="event-card-stack focus-ring"
        data-closing={closing ? "true" : "false"}
        data-single={events.length === 1 ? "true" : "false"}
        role="group"
        aria-label={events.length > 1 ? `Карточки событий, выбрана ${index + 1} из ${events.length}` : "Карточка события"}
        aria-live="polite"
        tabIndex={0}
        onKeyDown={keyDown}
        onAnimationEnd={finishDismiss}
      >
        {stackEntries.map(({ event: stackEvent, depth }) => {
          const active = depth === 0;
          const distance = userLocation && stackEvent.location ? distanceMeters(userLocation, stackEvent.location) : undefined;
          return (
            <article
              key={stackEvent.id}
              className="event-card-stack__card flex select-none flex-col p-5"
              data-active={active ? "true" : "false"}
              data-stack-depth={depth}
              aria-hidden={active ? undefined : "true"}
              aria-current={active ? "true" : undefined}
              style={stackCardStyle(depth, active ? dragX : 0, active ? dragY : 0, active && dragging)}
              onPointerDown={active ? pointerDown : undefined}
              onPointerMove={active ? pointerMove : undefined}
              onPointerUp={active ? pointerEnd : undefined}
              onPointerCancel={active ? pointerCancel : undefined}
            >
              {distance !== undefined ? <span className="event-card-stack__distance ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold"><Navigation size={13} />{formatDistance(distance)}</span> : <span className="h-6" />}
              <h3 className="mt-3 line-clamp-2 break-words text-2xl font-black tracking-tight">{stackEvent.title}</h3>
              <div className="event-card-stack__feature mt-4 grid min-h-28 place-items-center rounded-[1.4rem] p-4 text-center">
                <CalendarDays size={24} aria-hidden="true" />
                <span className="mt-2 text-sm font-extrabold">{formatDateTime(stackEvent.date_meeting)}</span>
              </div>
              {stackEvent.description ? <p className="event-card-stack__description mt-4 line-clamp-3 break-words text-sm leading-6">{stackEvent.description}</p> : null}

              {active ? (
                <div className="mt-auto pt-3">
                  {joinEvent.isError ? <p role="alert" className="mb-3 text-sm font-semibold text-clay">{errorMessage(joinEvent.error)}</p> : null}
                  <div className="grid">
                    <Link
                      to={`/events/${stackEvent.id}`}
                      state={{
                        discover: {
                          activeEventId: stackEvent.id,
                          events,
                          ...(mapCamera ? { mapCamera } : {}),
                        },
                      } satisfies DiscoverLocationState}
                      className="event-card-stack__details focus-ring flex min-h-12 items-center justify-center rounded-2xl px-4 text-sm font-extrabold"
                    >
                      Подробнее
                    </Link>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function eventIndex(events: Event[], eventId?: number) {
  const index = events.findIndex((event) => event.id === eventId);
  return index >= 0 ? index : 0;
}

function getStackDepth(eventIndex: number, activeIndex: number, eventCount: number) {
  if (eventIndex === activeIndex) return 0;
  const forward = (eventIndex - activeIndex + eventCount) % eventCount;
  if (eventCount > 3 && forward === eventCount - 1) return -1;
  return forward;
}

function resistedDrag(value: number, maximum: number, resistance: number) {
  return Math.sign(value) * Math.min(maximum, Math.abs(value) * resistance);
}

function stackCardStyle(depth: number, dragX: number, dragY: number, dragging: boolean): CSSProperties {
  const configurations: Record<number, { x: number; y: number; rotation: number; scale: number; opacity: number; zIndex: number }> = {
    [-1]: { x: 0, y: -44, rotation: 0, scale: 1.02, opacity: 0, zIndex: 5 },
    0: { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, zIndex: 20 },
    1: { x: -12, y: 10, rotation: -3.2, scale: 0.974, opacity: 0.78, zIndex: 19 },
    2: { x: -23, y: 19, rotation: -5.8, scale: 0.948, opacity: 0.55, zIndex: 18 },
  };
  const configuration = configurations[depth] ?? configurations[2];
  const active = depth === 0;
  const rotation = active ? dragX * 0.018 : configuration.rotation;

  return {
    opacity: configuration.opacity,
    pointerEvents: active ? "auto" : "none",
    transform: `translate3d(${active ? dragX : configuration.x}px, ${active ? dragY : configuration.y}px, 0) rotate(${rotation}deg) scale(${configuration.scale})`,
    transition: dragging ? "none" : undefined,
    zIndex: configuration.zIndex,
  };
}
