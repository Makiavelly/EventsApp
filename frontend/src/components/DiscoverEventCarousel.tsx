import { CalendarDays, ChevronDown } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from "react";
import { Link } from "react-router-dom";
import type { Event } from "../api/types";
import type { DiscoverLocationState, MapCameraState } from "../utils/discoverReturnState";
import { eventCardShades } from "../utils/eventCardShades";
import { formatDateTime } from "../utils/format";

const COLLAPSED_HEIGHT_PX = 84;
const FADE_ZONE_PX = 64;
const OPEN_THRESHOLD = 0.46;
const END_SETTLE_DELAY_MS = 150;
const TAIL_RESET_FALLBACK_MS = 900;

type GestureState = {
  moved: boolean;
  pointerId: number;
  startProgress: number;
  startScrollTop: number;
  startX: number;
  startY: number;
};

type DiscoverEventCarouselProps = {
  dismissCompletely?: boolean;
  events: Event[];
  expandedEventId?: number;
  mapCamera?: MapCameraState;
  onExpandedEventChange: (event?: Event) => void;
  onFullyCollapsed?: () => void;
  openOnMount?: boolean;
};

export function DiscoverEventCarousel({
  dismissCompletely = false,
  events,
  expandedEventId,
  mapCamera,
  onExpandedEventChange,
  onFullyCollapsed,
  openOnMount = false,
}: DiscoverEventCarouselProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef(new Map<number, HTMLElement>());
  const gestureRef = useRef<GestureState>();
  const removeGestureListenersRef = useRef<() => void>();
  const effectsFrameRef = useRef<number>();
  const collapseTimerRef = useRef<number>();
  const endSettleTimerRef = useRef<number>();
  const tailResetTimerRef = useRef<number>();
  const progressRef = useRef(0);
  const suppressClickRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(() => window.innerHeight);
  const shades = useMemo(() => eventCardShades(events), [events]);
  const collapsedHeight = dismissCompletely ? 0 : COLLAPSED_HEIGHT_PX;
  const maximumHeight = Math.max(COLLAPSED_HEIGHT_PX, Math.min(500, viewportHeight * 0.5));
  const movementRange = Math.max(1, maximumHeight - collapsedHeight);
  const panelHeight = collapsedHeight + movementRange * progress;

  const updateCardEffects = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const viewportRect = viewport.getBoundingClientRect();
    const list = viewport.querySelector<HTMLElement>(".discover-event-carousel__list");
    if (!list) return;
    const fadeZone = FADE_ZONE_PX * progressRef.current;
    const reveal = clamp((progressRef.current - 0.08) / 0.5, 0, 1);

    viewport.querySelectorAll<HTMLElement>("[data-discover-event-card-id]").forEach((card, index) => {
      const naturalTop = viewportRect.top + list.offsetTop + card.offsetTop - viewport.scrollTop;
      const fadeProgress = fadeZone < 10
        ? 0
        : clamp((viewportRect.top + fadeZone - naturalTop) / Math.max(1, fadeZone - 8), 0, 1);
      const opacity = (1 - fadeProgress) * (index === 0 ? 1 : reveal);
      card.style.setProperty("--carousel-card-scale", String(1 - fadeProgress * 0.16));
      card.style.setProperty("--carousel-card-opacity", String(opacity));
      card.style.setProperty("--carousel-card-shift", `${fadeProgress * -6}px`);
      card.style.pointerEvents = opacity < 0.08 ? "none" : "";
    });
  }, []);

  const scheduleCardEffects = useCallback(() => {
    if (effectsFrameRef.current !== undefined) window.cancelAnimationFrame(effectsFrameRef.current);
    effectsFrameRef.current = window.requestAnimationFrame(() => {
      effectsFrameRef.current = undefined;
      updateCardEffects();
    });
  }, [updateCardEffects]);

  const applyProgress = useCallback((nextProgress: number) => {
    const boundedProgress = clamp(nextProgress, 0, 1);
    progressRef.current = boundedProgress;
    setProgress(boundedProgress);
    scheduleCardEffects();
  }, [scheduleCardEffects]);

  const resetTail = useCallback(() => {
    const tail = viewportRef.current?.querySelector<HTMLElement>(".discover-event-carousel__tail");
    if (tail) tail.style.height = "";
    if (tailResetTimerRef.current !== undefined) {
      window.clearTimeout(tailResetTimerRef.current);
      tailResetTimerRef.current = undefined;
    }
  }, []);

  const settleEndPosition = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || progressRef.current < 1) return;
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
    const tail = viewport?.querySelector<HTMLElement>(".discover-event-carousel__tail");
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

  const collapseCarousel = useCallback(() => {
    const viewport = viewportRef.current;
    if (viewport) {
      viewport.scrollTo({
        top: 0,
        behavior: reducedMotion() ? "auto" : "smooth",
      });
    }
    resetTail();
    applyProgress(0);
    onExpandedEventChange(undefined);
    if (!dismissCompletely || !onFullyCollapsed) return;
    if (collapseTimerRef.current !== undefined) window.clearTimeout(collapseTimerRef.current);
    collapseTimerRef.current = window.setTimeout(() => {
      collapseTimerRef.current = undefined;
      onFullyCollapsed();
    }, reducedMotion() ? 0 : 320);
  }, [
    applyProgress,
    dismissCompletely,
    onExpandedEventChange,
    onFullyCollapsed,
    resetTail,
  ]);

  useEffect(() => {
    const handleResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!openOnMount) return;
    const frame = window.requestAnimationFrame(() => applyProgress(1));
    return () => window.cancelAnimationFrame(frame);
  }, [applyProgress, openOnMount]);

  useEffect(() => {
    const handleNewPointer = (event: PointerEvent) => {
      suppressClickRef.current = false;
      const target = event.target;
      if (target instanceof Element && !target.closest("[data-discover-event-carousel-root]")) {
        collapseCarousel();
      }
    };
    const handleOutsideClick = (event: MouseEvent) => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        return;
      }
      const target = event.target;
      if (target instanceof Element && target.closest("[data-discover-event-card-id]")) return;
      collapseCarousel();
    };
    document.addEventListener("pointerdown", handleNewPointer, true);
    document.addEventListener("click", handleOutsideClick);
    return () => {
      document.removeEventListener("pointerdown", handleNewPointer, true);
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [collapseCarousel]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(scheduleCardEffects);
    return () => window.cancelAnimationFrame(frame);
  }, [events, progress, scheduleCardEffects]);

  useEffect(() => {
    if (expandedEventId === undefined) return;
    applyProgress(1);
    const frame = window.requestAnimationFrame(() => {
      cardRefs.current.get(expandedEventId)?.scrollIntoView({
        behavior: reducedMotion() ? "auto" : "smooth",
        block: "nearest",
      });
      scheduleCardEffects();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [applyProgress, expandedEventId, scheduleCardEffects]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const resizeObserver = new ResizeObserver(() => {
      scheduleCardEffects();
      if (!gestureRef.current) settleEndPosition();
    });
    resizeObserver.observe(viewport);
    cardRefs.current.forEach((card) => resizeObserver.observe(card));
    return () => resizeObserver.disconnect();
  }, [events, expandedEventId, scheduleCardEffects, settleEndPosition]);

  useEffect(() => () => {
    removeGestureListenersRef.current?.();
    if (collapseTimerRef.current !== undefined) window.clearTimeout(collapseTimerRef.current);
    if (effectsFrameRef.current !== undefined) window.cancelAnimationFrame(effectsFrameRef.current);
    if (endSettleTimerRef.current !== undefined) window.clearTimeout(endSettleTimerRef.current);
    if (tailResetTimerRef.current !== undefined) window.clearTimeout(tailResetTimerRef.current);
  }, []);

  if (events.length === 0) return null;

  function pointerDown(pointerEvent: ReactPointerEvent<HTMLDivElement>) {
    if (pointerEvent.button !== 0) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    removeGestureListenersRef.current?.();
    gestureRef.current = {
      moved: false,
      pointerId: pointerEvent.pointerId,
      startProgress: progressRef.current,
      startScrollTop: viewport.scrollTop,
      startX: pointerEvent.clientX,
      startY: pointerEvent.clientY,
    };
    suppressClickRef.current = false;
    if (endSettleTimerRef.current !== undefined) window.clearTimeout(endSettleTimerRef.current);
    if (tailResetTimerRef.current !== undefined) window.clearTimeout(tailResetTimerRef.current);
    setDragging(true);

    const handleMove = (event: PointerEvent) => pointerMove(event);
    const handleEnd = (event: PointerEvent) => finishPointer(event);
    document.addEventListener("pointermove", handleMove, { passive: false });
    document.addEventListener("pointerup", handleEnd);
    document.addEventListener("pointercancel", handleEnd);
    removeGestureListenersRef.current = () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleEnd);
      document.removeEventListener("pointercancel", handleEnd);
      removeGestureListenersRef.current = undefined;
    };
  }

  function pointerMove(pointerEvent: PointerEvent) {
    const gesture = gestureRef.current;
    const viewport = viewportRef.current;
    if (!gesture || !viewport || gesture.pointerId !== pointerEvent.pointerId) return;
    const deltaX = pointerEvent.clientX - gesture.startX;
    const deltaY = pointerEvent.clientY - gesture.startY;
    if (!gesture.moved && Math.hypot(deltaX, deltaY) < 5) return;
    gesture.moved = true;
    if (pointerEvent.cancelable) pointerEvent.preventDefault();

    const requestedScrollTop = gesture.startScrollTop - deltaY;
    if (gesture.startProgress >= 1 && requestedScrollTop >= 0) {
      scrollWithTail(requestedScrollTop);
      applyProgress(1);
      return;
    }

    if (gesture.startProgress >= 1) {
      viewport.scrollTop = 0;
      resetTail();
      applyProgress(1 + requestedScrollTop / movementRange);
      return;
    }

    const nextProgress = gesture.startProgress - deltaY / movementRange;
    applyProgress(nextProgress);
    if (nextProgress > 1) {
      scrollWithTail((nextProgress - 1) * movementRange);
    }
  }

  function finishPointer(pointerEvent: PointerEvent) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== pointerEvent.pointerId) return;
    suppressClickRef.current = gesture.moved;
    gestureRef.current = undefined;
    removeGestureListenersRef.current?.();
    setDragging(false);
    if (!gesture.moved) return;
    if (progressRef.current === 1) {
      settleEndPosition();
      return;
    }
    const shouldOpen = progressRef.current >= OPEN_THRESHOLD;
    applyProgress(shouldOpen ? 1 : 0);
    if (!shouldOpen) {
      if (viewportRef.current) viewportRef.current.scrollTop = 0;
      resetTail();
      onExpandedEventChange(undefined);
      if (dismissCompletely && onFullyCollapsed) {
        if (collapseTimerRef.current !== undefined) window.clearTimeout(collapseTimerRef.current);
        collapseTimerRef.current = window.setTimeout(() => {
          collapseTimerRef.current = undefined;
          onFullyCollapsed();
        }, reducedMotion() ? 0 : 320);
      }
    }
  }

  function wheel(wheelEvent: ReactWheelEvent<HTMLDivElement>) {
    const viewport = viewportRef.current;
    if (!viewport) return;
    if (progressRef.current < 1) {
      wheelEvent.preventDefault();
      applyProgress(progressRef.current + wheelEvent.deltaY / movementRange);
      return;
    }
    if (wheelEvent.deltaY < 0 && viewport.scrollTop <= 0) {
      wheelEvent.preventDefault();
      applyProgress(1 + wheelEvent.deltaY / movementRange);
      resetTail();
      return;
    }
    if (wheelEvent.deltaY > 0 && viewport.scrollTop >= alignedEndScrollTop(viewport) - 1) {
      wheelEvent.preventDefault();
      scrollWithTail(viewport.scrollTop + wheelEvent.deltaY);
    }
    scheduleEndSettle();
  }

  function toggleEvent(event: Event) {
    if (suppressClickRef.current) return;
    onExpandedEventChange(expandedEventId === event.id ? undefined : event);
  }

  const carouselStyle = {
    "--discover-carousel-fade-zone": `${FADE_ZONE_PX * progress}px`,
    "--discover-carousel-progress": progress,
    height: `${panelHeight}px`,
  } as CSSProperties;

  return (
    <>
      <div
        className="discover-event-carousel__backdrop"
        style={{
          background: `rgb(var(--event-card-overlay) / ${0.12 * progress})`,
          backdropFilter: `blur(${5 * progress}px)`,
        }}
        aria-hidden="true"
        data-testid="discover-carousel-backdrop"
      />
      <section
        className="discover-event-carousel"
        style={carouselStyle}
        data-dragging={dragging ? "true" : "false"}
        data-open={progress >= 0.99 ? "true" : "false"}
        data-variant={dismissCompletely ? "selection" : "all-events"}
        data-discover-event-carousel-root
        aria-label={dismissCompletely
          ? `Карусель выбранных событий, ${events.length}`
          : `Карусель ближайших событий, ${events.length}`}
        data-testid="discover-event-carousel"
      >
        <div
          ref={viewportRef}
          className="discover-event-carousel__viewport"
          onPointerDown={pointerDown}
          onWheel={wheel}
          onScroll={() => {
            scheduleCardEffects();
            if (!gestureRef.current) scheduleEndSettle();
          }}
          onTransitionEnd={scheduleCardEffects}
          data-testid="discover-event-carousel-viewport"
        >
          <div className="event-card-carousel__list discover-event-carousel__list">
            {events.map((event, index) => {
              const expanded = expandedEventId === event.id;
              const detailsId = `discover-event-card-details-${event.id}`;
              return (
                <article
                  key={event.id}
                  ref={(card) => {
                    if (card) cardRefs.current.set(event.id, card);
                    else cardRefs.current.delete(event.id);
                  }}
                  className="event-card-carousel__card discover-event-carousel__card"
                  style={index === 0 ? undefined : { "--carousel-card-opacity": 0 } as CSSProperties}
                  data-discover-event-card-id={event.id}
                  data-card-shade={shades[index]}
                  data-expanded={expanded ? "true" : "false"}
                >
                  <button
                    type="button"
                    className="event-card-carousel__toggle focus-ring"
                    aria-expanded={expanded}
                    aria-controls={detailsId}
                    onPointerDown={() => {
                      suppressClickRef.current = false;
                    }}
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
          <div className="discover-event-carousel__tail" aria-hidden="true" />
        </div>
      </section>
    </>
  );
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function alignedEndScrollTop(viewport: HTMLDivElement) {
  const list = viewport.querySelector<HTMLElement>(".discover-event-carousel__list");
  const lastCard = list?.lastElementChild as HTMLElement | null;
  if (!list || !lastCard) return 0;
  return Math.max(0, list.offsetTop + lastCard.offsetTop + lastCard.offsetHeight - viewport.clientHeight);
}
