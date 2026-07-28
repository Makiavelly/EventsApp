import { CalendarDays, ChevronDown } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AnimationEvent as ReactAnimationEvent, KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import type { Event } from "../api/types";
import type { DiscoverLocationState, MapCameraState } from "../utils/discoverReturnState";
import { eventCardShades } from "../utils/eventCardShades";
import { formatDateTime } from "../utils/format";

const DISMISS_FALLBACK_MS = 800;
const CARD_FADE_START_PX = 64;
const CARD_FADE_END_PX = 8;
const END_SETTLE_DELAY_MS = 150;
const TAIL_GROWTH_VIEWPORTS = 2;
const TAIL_RESET_FALLBACK_MS = 900;

export function MapEventCarousel({ events, initialEventId, mapCamera, onClose }: { events: Event[]; initialEventId?: number; mapCamera?: MapCameraState; onClose: () => void }) {
  const [expandedEventId, setExpandedEventId] = useState<number>();
  const [closing, setClosing] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef(new Map<number, HTMLElement>());
  const dismissTimerRef = useRef<number>();
  const effectsFrameRef = useRef<number>();
  const endSettleTimerRef = useRef<number>();
  const tailResetTimerRef = useRef<number>();
  const pointerScrollingRef = useRef(false);
  const eventsKey = events.map((event) => event.id).join(":");
  const initialEventCardId = events.find((event) => event.id === initialEventId)?.id ?? events[0]?.id;

  const updateCardEffects = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const viewportRect = viewport.getBoundingClientRect();
    const list = viewport.querySelector<HTMLElement>(".event-card-carousel__list");
    if (!list) return;
    const cards = viewport.querySelectorAll<HTMLElement>("[data-event-card-id]");
    cards.forEach((card) => {
      const naturalCardTop = viewportRect.top + list.offsetTop + card.offsetTop - viewport.scrollTop;
      const progress = clamp(
        (viewportRect.top + CARD_FADE_START_PX - naturalCardTop) / (CARD_FADE_START_PX - CARD_FADE_END_PX),
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
    const tail = viewportRef.current?.querySelector<HTMLElement>(".event-card-carousel__tail");
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
    if (pointerScrollingRef.current) return;
    if (endSettleTimerRef.current !== undefined) window.clearTimeout(endSettleTimerRef.current);
    endSettleTimerRef.current = window.setTimeout(settleEndPosition, END_SETTLE_DELAY_MS);
  }, [settleEndPosition]);

  const extendTailIfNeeded = useCallback(() => {
    const viewport = viewportRef.current;
    const tail = viewport?.querySelector<HTMLElement>(".event-card-carousel__tail");
    if (!viewport || !tail || viewport.scrollTop <= alignedEndScrollTop(viewport) + 1) return;

    const remainingScroll = viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop;
    if (remainingScroll > viewport.clientHeight) return;
    tail.style.height = `${tail.offsetHeight + viewport.clientHeight * TAIL_GROWTH_VIEWPORTS}px`;
  }, []);

  useEffect(() => {
    carouselRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    setExpandedEventId(undefined);
    const frame = window.requestAnimationFrame(() => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      viewport.scrollTop = 0;
      const initialCard = initialEventCardId === undefined ? undefined : cardRefs.current.get(initialEventCardId);
      if (initialEventId !== undefined && initialCard) {
        const targetTop = initialCard.getBoundingClientRect().top - viewport.getBoundingClientRect().top - CARD_FADE_START_PX;
        viewport.scrollTop = Math.min(alignedEndScrollTop(viewport), Math.max(0, targetTop));
      }
      updateCardEffects();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [eventsKey, initialEventCardId, initialEventId, updateCardEffects]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const resizeObserver = new ResizeObserver(() => {
      scheduleCardEffects();
      if (!pointerScrollingRef.current && expandedEventId === undefined) settleEndPosition();
    });
    resizeObserver.observe(viewport);
    cardRefs.current.forEach((card) => resizeObserver.observe(card));
    window.addEventListener("resize", scheduleCardEffects);
    scheduleCardEffects();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleCardEffects);
    };
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
    if (dismissTimerRef.current !== undefined) window.clearTimeout(dismissTimerRef.current);
    if (effectsFrameRef.current !== undefined) window.cancelAnimationFrame(effectsFrameRef.current);
    if (endSettleTimerRef.current !== undefined) window.clearTimeout(endSettleTimerRef.current);
    if (tailResetTimerRef.current !== undefined) window.clearTimeout(tailResetTimerRef.current);
  }, []);

  if (events.length === 0) return null;
  const cardShades = eventCardShades(events);

  function dismiss() {
    if (closing) return;
    setClosing(true);
    dismissTimerRef.current = window.setTimeout(onClose, DISMISS_FALLBACK_MS);
  }

  function finishDismiss(animationEvent: ReactAnimationEvent<HTMLDivElement>) {
    if (!closing || animationEvent.target !== animationEvent.currentTarget || animationEvent.animationName !== "event-card-carousel-dismiss") return;
    if (dismissTimerRef.current !== undefined) window.clearTimeout(dismissTimerRef.current);
    onClose();
  }

  function handleScroll() {
    extendTailIfNeeded();
    scheduleCardEffects();
    const viewport = viewportRef.current;
    if (!pointerScrollingRef.current && viewport && viewport.scrollTop <= alignedEndScrollTop(viewport) + 1) {
      resetTail();
    }
  }

  function pointerDown() {
    pointerScrollingRef.current = true;
    if (endSettleTimerRef.current !== undefined) window.clearTimeout(endSettleTimerRef.current);
    if (tailResetTimerRef.current !== undefined) window.clearTimeout(tailResetTimerRef.current);
  }

  function pointerEnd() {
    pointerScrollingRef.current = false;
    settleEndPosition();
  }

  function pointerCancel() {
    pointerScrollingRef.current = false;
  }

  function keyDown(keyboardEvent: KeyboardEvent<HTMLDivElement>) {
    if (keyboardEvent.key === "Escape") {
      keyboardEvent.preventDefault();
      dismiss();
      return;
    }
    if (keyboardEvent.key !== "ArrowUp" && keyboardEvent.key !== "ArrowDown") return;

    keyboardEvent.preventDefault();
    const focusedCard = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>("[data-event-card-id]");
    const focusedIndex = focusedCard
      ? events.findIndex((event) => String(event.id) === focusedCard.dataset.eventCardId)
      : nearestCardIndex(events, cardRefs.current, viewportRef.current);
    const direction = keyboardEvent.key === "ArrowDown" ? 1 : -1;
    const nextIndex = clamp(focusedIndex + direction, 0, events.length - 1);
    const nextCard = cardRefs.current.get(events[nextIndex].id);
    nextCard?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    nextCard?.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "nearest" });
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
        ref={carouselRef}
        className="event-card-carousel"
        data-closing={closing ? "true" : "false"}
        role="group"
        aria-label={events.length > 1 ? `Карусель из ${events.length} карточек событий` : "Карточка события"}
        tabIndex={-1}
        onKeyDown={keyDown}
        onAnimationEnd={finishDismiss}
      >
        <div
          ref={viewportRef}
          className="event-card-carousel__viewport"
          data-testid="event-card-carousel-viewport"
          onScroll={handleScroll}
          onWheel={scheduleEndSettle}
          onPointerDown={pointerDown}
          onPointerUp={pointerEnd}
          onPointerCancel={pointerCancel}
          onTouchEnd={pointerEnd}
        >
          <div className="event-card-carousel__list">
            {events.map((event, index) => {
              const expanded = expandedEventId === event.id;
              const detailsId = `event-card-details-${event.id}`;
              return (
                <article
                  key={event.id}
                  ref={(card) => {
                    if (card) cardRefs.current.set(event.id, card);
                    else cardRefs.current.delete(event.id);
                  }}
                  className="event-card-carousel__card"
                  data-event-card-id={event.id}
                  data-card-shade={cardShades[index]}
                  data-expanded={expanded ? "true" : "false"}
                >
                  <button
                    type="button"
                    className="event-card-carousel__toggle focus-ring"
                    aria-expanded={expanded}
                    aria-controls={detailsId}
                    onClick={() => setExpandedEventId((current) => current === event.id ? undefined : event.id)}
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
                            events,
                            ...(mapCamera ? { mapCamera } : {}),
                          },
                        } satisfies DiscoverLocationState}
                        className="event-card-carousel__link focus-ring"
                        tabIndex={expanded ? 0 : -1}
                      >
                        Подробнее
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="event-card-carousel__tail" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

function nearestCardIndex(events: Event[], cards: Map<number, HTMLElement>, viewport: HTMLDivElement | null) {
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
  const list = viewport.querySelector<HTMLElement>(".event-card-carousel__list");
  const lastCard = list?.lastElementChild as HTMLElement | null;
  if (!list || !lastCard) return 0;
  return Math.max(0, list.offsetTop + lastCard.offsetTop + lastCard.offsetHeight - viewport.clientHeight);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
