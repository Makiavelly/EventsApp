import { CalendarDays, ChevronDown } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from "react";
import { Link } from "react-router-dom";
import type { Event } from "../api/types";
import type { DiscoverLocationState, MapCameraState } from "../utils/discoverReturnState";
import { formatDateTime } from "../utils/format";

const CARD_FADE_START_PX = 64;
const CARD_FADE_END_PX = 8;
const GESTURE_AXIS_THRESHOLD_PX = 7;
const END_SETTLE_DELAY_MS = 150;
const TAIL_RESET_FALLBACK_MS = 900;

type GestureAxis = "pending" | "horizontal" | "vertical";

type CarouselGesture = {
  axis: GestureAxis;
  moved: boolean;
  pointerId: number;
  startScrollTop: number;
  startX: number;
  startY: number;
};

type DiscoverEventCarouselProps = {
  activeEventId?: number;
  enabled: boolean;
  events: Event[];
  mapCamera?: MapCameraState;
  onActiveEventChange: (event: Event) => void;
};

export function DiscoverEventCarousel({
  activeEventId,
  enabled,
  events,
  mapCamera,
  onActiveEventChange,
}: DiscoverEventCarouselProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef(new Map<number, HTMLElement>());
  const gestureRef = useRef<CarouselGesture>();
  const effectsFrameRef = useRef<number>();
  const endSettleTimerRef = useRef<number>();
  const tailResetTimerRef = useRef<number>();
  const suppressClickRef = useRef(false);
  const latestActiveEventIdRef = useRef(activeEventId);
  const [dragging, setDragging] = useState(false);
  const [expandedEventId, setExpandedEventId] = useState<number>();
  const eventsKey = events.map((event) => event.id).join(":");
  latestActiveEventIdRef.current = activeEventId;

  const updateCardEffects = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const viewportRect = viewport.getBoundingClientRect();
    const list = viewport.querySelector<HTMLElement>(".liquid-vertical-carousel__list");
    if (!list) return;

    viewport.querySelectorAll<HTMLElement>("[data-liquid-event-id]").forEach((card) => {
      const naturalCardTop = viewportRect.top + list.offsetTop + card.offsetTop - viewport.scrollTop;
      const progress = clamp(
        (viewportRect.top + CARD_FADE_START_PX - naturalCardTop)
          / (CARD_FADE_START_PX - CARD_FADE_END_PX),
        0,
        1,
      );
      card.style.setProperty("--carousel-card-scale", String(1 - progress * 0.16));
      card.style.setProperty("--carousel-card-opacity", String(1 - progress));
      card.style.setProperty("--carousel-card-shift", `${progress * -6}px`);
      card.style.pointerEvents = progress >= 0.92 ? "none" : "";
    });
  }, []);

  const scheduleCardEffects = useCallback(() => {
    if (effectsFrameRef.current !== undefined) window.cancelAnimationFrame(effectsFrameRef.current);
    effectsFrameRef.current = window.requestAnimationFrame(() => {
      effectsFrameRef.current = undefined;
      updateCardEffects();
    });
  }, [updateCardEffects]);

  const resetTail = useCallback(() => {
    const tail = viewportRef.current?.querySelector<HTMLElement>(".liquid-vertical-carousel__tail");
    if (tail) tail.style.height = "";
    if (tailResetTimerRef.current !== undefined) {
      window.clearTimeout(tailResetTimerRef.current);
      tailResetTimerRef.current = undefined;
    }
  }, []);

  const settleEndPosition = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const endScrollTop = alignedEndScrollTop(viewport);
    if (viewport.scrollTop <= endScrollTop + 1) {
      resetTail();
      return;
    }

    viewport.scrollTo({
      top: endScrollTop,
      behavior: reducedMotion() ? "auto" : "smooth",
    });
    if (tailResetTimerRef.current !== undefined) window.clearTimeout(tailResetTimerRef.current);
    tailResetTimerRef.current = window.setTimeout(() => {
      const currentViewport = viewportRef.current;
      if (currentViewport) currentViewport.scrollTop = alignedEndScrollTop(currentViewport);
      resetTail();
    }, reducedMotion() ? 0 : TAIL_RESET_FALLBACK_MS);
  }, [resetTail]);

  const scheduleEndSettle = useCallback(() => {
    if (gestureRef.current) return;
    if (endSettleTimerRef.current !== undefined) window.clearTimeout(endSettleTimerRef.current);
    endSettleTimerRef.current = window.setTimeout(settleEndPosition, END_SETTLE_DELAY_MS);
  }, [settleEndPosition]);

  const scrollWithTail = useCallback((requestedScrollTop: number) => {
    const viewport = viewportRef.current;
    const tail = viewport?.querySelector<HTMLElement>(".liquid-vertical-carousel__tail");
    if (!viewport || !tail) return;

    const endScrollTop = alignedEndScrollTop(viewport);
    if (requestedScrollTop > endScrollTop) {
      const requiredTailHeight = requestedScrollTop - endScrollTop;
      if (tail.offsetHeight < requiredTailHeight + viewport.clientHeight) {
        tail.style.height = `${requiredTailHeight + viewport.clientHeight * 2}px`;
      }
    }
    viewport.scrollTop = Math.max(0, requestedScrollTop);
    scheduleCardEffects();
  }, [scheduleCardEffects]);

  useEffect(() => {
    setExpandedEventId(undefined);
    resetTail();
    const frame = window.requestAnimationFrame(() => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      viewport.scrollTop = 0;

      const initialEventId = latestActiveEventIdRef.current;
      const initialCard = initialEventId === undefined ? undefined : cardRefs.current.get(initialEventId);
      if (initialCard) {
        const targetTop = initialCard.getBoundingClientRect().top
          - viewport.getBoundingClientRect().top
          - CARD_FADE_START_PX;
        viewport.scrollTop = Math.min(alignedEndScrollTop(viewport), Math.max(0, targetTop));
      }
      updateCardEffects();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [eventsKey, resetTail, updateCardEffects]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const resizeObserver = new ResizeObserver(() => {
      scheduleCardEffects();
      if (!gestureRef.current && expandedEventId === undefined) settleEndPosition();
    });
    resizeObserver.observe(viewport);
    cardRefs.current.forEach((card) => resizeObserver.observe(card));
    scheduleCardEffects();
    return () => resizeObserver.disconnect();
  }, [eventsKey, expandedEventId, scheduleCardEffects, settleEndPosition]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (expandedEventId === undefined) {
        settleEndPosition();
      } else {
        cardRefs.current.get(expandedEventId)?.scrollIntoView({
          behavior: reducedMotion() ? "auto" : "smooth",
          block: "nearest",
        });
      }
      scheduleCardEffects();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [expandedEventId, scheduleCardEffects, settleEndPosition]);

  useEffect(() => () => {
    if (effectsFrameRef.current !== undefined) window.cancelAnimationFrame(effectsFrameRef.current);
    if (endSettleTimerRef.current !== undefined) window.clearTimeout(endSettleTimerRef.current);
    if (tailResetTimerRef.current !== undefined) window.clearTimeout(tailResetTimerRef.current);
  }, []);

  if (events.length === 0) return null;

  function pointerDown(pointerEvent: ReactPointerEvent<HTMLDivElement>) {
    if (!enabled || pointerEvent.button !== 0) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    suppressClickRef.current = false;
    gestureRef.current = {
      axis: "pending",
      moved: false,
      pointerId: pointerEvent.pointerId,
      startScrollTop: viewport.scrollTop,
      startX: pointerEvent.clientX,
      startY: pointerEvent.clientY,
    };
    if (endSettleTimerRef.current !== undefined) window.clearTimeout(endSettleTimerRef.current);
    if (tailResetTimerRef.current !== undefined) window.clearTimeout(tailResetTimerRef.current);
    pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);
  }

  function pointerMove(pointerEvent: ReactPointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== pointerEvent.pointerId) return;
    const deltaX = pointerEvent.clientX - gesture.startX;
    const deltaY = pointerEvent.clientY - gesture.startY;

    if (gesture.axis === "pending") {
      if (Math.hypot(deltaX, deltaY) < GESTURE_AXIS_THRESHOLD_PX) return;
      gesture.axis = Math.abs(deltaY) >= Math.abs(deltaX) ? "vertical" : "horizontal";
      gesture.moved = true;
      suppressClickRef.current = true;
      if (gesture.axis === "vertical") setDragging(true);
    }
    if (gesture.axis !== "vertical") return;

    pointerEvent.preventDefault();
    scrollWithTail(gesture.startScrollTop - deltaY);
  }

  function pointerEnd(pointerEvent: ReactPointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== pointerEvent.pointerId) return;
    gestureRef.current = undefined;
    if (pointerEvent.currentTarget.hasPointerCapture(pointerEvent.pointerId)) {
      pointerEvent.currentTarget.releasePointerCapture(pointerEvent.pointerId);
    }
    setDragging(false);
    if (gesture.axis === "vertical") settleEndPosition();
  }

  function wheel(wheelEvent: ReactWheelEvent<HTMLDivElement>) {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const endScrollTop = alignedEndScrollTop(viewport);
    if (wheelEvent.deltaY > 0 && viewport.scrollTop >= endScrollTop - 1) {
      wheelEvent.preventDefault();
      scrollWithTail(viewport.scrollTop + wheelEvent.deltaY);
    }
    scheduleEndSettle();
  }

  function keyDown(keyboardEvent: ReactKeyboardEvent<HTMLDivElement>) {
    if (keyboardEvent.key !== "ArrowUp" && keyboardEvent.key !== "ArrowDown") return;
    keyboardEvent.preventDefault();
    const focusedCard = (document.activeElement as HTMLElement | null)
      ?.closest<HTMLElement>("[data-liquid-event-id]");
    const focusedIndex = focusedCard
      ? events.findIndex((event) => String(event.id) === focusedCard.dataset.liquidEventId)
      : nearestCardIndex(events, cardRefs.current, viewportRef.current);
    const direction = keyboardEvent.key === "ArrowDown" ? 1 : -1;
    const nextIndex = clamp(focusedIndex + direction, 0, events.length - 1);
    const nextEvent = events[nextIndex];
    const nextCard = cardRefs.current.get(nextEvent.id);
    nextCard?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    nextCard?.scrollIntoView({
      behavior: reducedMotion() ? "auto" : "smooth",
      block: "nearest",
    });
    onActiveEventChange(nextEvent);
  }

  function toggleEvent(event: Event) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    setExpandedEventId((current) => current === event.id ? undefined : event.id);
    onActiveEventChange(event);
  }

  return (
    <div
      ref={viewportRef}
      className="liquid-vertical-carousel"
      data-dragging={dragging ? "true" : "false"}
      data-testid="liquid-event-carousel-viewport"
      role="group"
      aria-label={`Вертикальная карусель из ${events.length} карточек событий`}
      tabIndex={enabled ? 0 : -1}
      onClickCapture={(event) => {
        if (!suppressClickRef.current) return;
        suppressClickRef.current = false;
        event.preventDefault();
        event.stopPropagation();
      }}
      onKeyDown={keyDown}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerEnd}
      onPointerCancel={pointerEnd}
      onScroll={() => {
        scheduleCardEffects();
        if (!gestureRef.current) scheduleEndSettle();
      }}
      onWheel={wheel}
    >
      <div className="event-card-carousel__list liquid-vertical-carousel__list">
        {events.map((event) => {
          const expanded = expandedEventId === event.id;
          const detailsId = `liquid-event-card-details-${event.id}`;
          return (
            <article
              key={event.id}
              ref={(card) => {
                if (card) cardRefs.current.set(event.id, card);
                else cardRefs.current.delete(event.id);
              }}
              className="event-card-carousel__card liquid-vertical-carousel__card"
              data-liquid-event-id={event.id}
              data-active={activeEventId === event.id ? "true" : undefined}
              data-expanded={expanded ? "true" : "false"}
            >
              <button
                type="button"
                className="event-card-carousel__toggle focus-ring"
                aria-expanded={expanded}
                aria-controls={detailsId}
                tabIndex={enabled ? 0 : -1}
                onClick={() => toggleEvent(event)}
              >
                <span className="event-card-carousel__title">{event.title}</span>
                <ChevronDown className="event-card-carousel__chevron" size={20} aria-hidden="true" />
              </button>

              <div
                id={detailsId}
                className="event-card-carousel__details"
                aria-hidden={expanded ? undefined : "true"}
              >
                <div className="event-card-carousel__details-inner">
                  <p className="event-card-carousel__description">
                    {event.description || "Описание не указано."}
                  </p>
                  <p className="event-card-carousel__date">
                    <CalendarDays size={17} aria-hidden="true" />
                    <span>{formatDateTime(event.date_meeting)}</span>
                  </p>
                  <Link
                    to={`/events/${event.id}`}
                    state={{
                      discover: {
                        activeEventId: event.id,
                        events: [event],
                        ...(mapCamera ? { mapCamera } : {}),
                      },
                    } satisfies DiscoverLocationState}
                    className="event-card-carousel__link focus-ring"
                    tabIndex={enabled && expanded ? 0 : -1}
                  >
                    Подробнее
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <div className="liquid-vertical-carousel__tail" aria-hidden="true" />
    </div>
  );
}

function nearestCardIndex(
  events: Event[],
  cards: Map<number, HTMLElement>,
  viewport: HTMLDivElement | null,
) {
  if (!viewport) return 0;
  const viewportTop = viewport.getBoundingClientRect().top + CARD_FADE_START_PX;
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  events.forEach((event, index) => {
    const card = cards.get(event.id);
    if (!card) return;
    const distance = Math.abs(card.getBoundingClientRect().top - viewportTop);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });
  return nearestIndex;
}

function alignedEndScrollTop(viewport: HTMLDivElement) {
  const list = viewport.querySelector<HTMLElement>(".liquid-vertical-carousel__list");
  const lastCard = list?.lastElementChild as HTMLElement | null;
  if (!list || !lastCard) return 0;
  const bottomOcclusion = Number.parseFloat(getComputedStyle(viewport).paddingBottom) || 0;
  return Math.max(
    0,
    list.offsetTop
      + lastCard.offsetTop
      + lastCard.offsetHeight
      - viewport.clientHeight
      + bottomOcclusion,
  );
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
