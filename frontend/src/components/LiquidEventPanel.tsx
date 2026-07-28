import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChevronUp } from "lucide-react";
import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
} from "react";
import type { Event } from "../api/types";
import type { MapCameraState } from "../utils/discoverReturnState";
import {
  CLOSED_MENU_BAR_HEIGHT_PX,
  HANDLE_TAB_HEIGHT_PX,
  liquidHandleHorizontalInset,
  liquidPanelPath,
  MAX_DEFORMATION_PX,
  MAX_PANEL_HEIGHT_PX,
  OPEN_THRESHOLD,
  panelHandleRotation,
  panelTarget,
  SPRING_DAMPING,
  SPRING_STIFFNESS,
} from "../utils/liquidPanelMotion";
import { DiscoverEventCarousel } from "./DiscoverEventCarousel";

const PANEL_TOP_MARGIN_PX = 54;
const DRAG_AXIS_THRESHOLD_PX = 7;
const PANEL_EDGE_FOLLOW_RATIO = 0.8;

type PanelState = "closed" | "dragging" | "opening" | "opened" | "closing";
type GestureAxis = "pending" | "horizontal" | "vertical";

type PanelGesture = {
  axis: GestureAxis;
  lastTime: number;
  lastY: number;
  pointerId: number;
  startHandleX: number;
  startHandleTipY: number;
  startProgress: number;
  startX: number;
  startY: number;
  velocityY: number;
};

type SheetGesture = {
  lastTime: number;
  lastY: number;
  startHandleTipY: number;
  startProgress: number;
  startY: number;
  velocityY: number;
};

type PanelGeometry = {
  height: number;
  navBottom: number;
  navTop: number;
  width: number;
};

type LiquidEventPanelProps = {
  closeRequestVersion?: number;
  events: Event[];
  initialEventId?: number;
  mapCamera?: MapCameraState;
  onActiveEventChange?: (event?: Event) => void;
  onClosed?: () => void;
  openOnMount?: boolean;
  openRequestVersion?: number;
  revealOnMount?: boolean;
};

export function LiquidEventPanel({
  closeRequestVersion = 0,
  events,
  initialEventId,
  mapCamera,
  onActiveEventChange,
  onClosed,
  openOnMount = false,
  openRequestVersion = 0,
  revealOnMount = false,
}: LiquidEventPanelProps) {
  const panelId = useId();
  const frameRef = useRef<HTMLDivElement>(null);
  const navigationRef = useRef<HTMLDivElement>(null);
  const panelGestureRef = useRef<PanelGesture>();
  const sheetGestureRef = useRef<SheetGesture>();
  const motionFrameRef = useRef<number>();
  const revealFrameRef = useRef<number>();
  const progressRef = useRef(0);
  const deformationRef = useRef(0);
  const scrollUnlockRef = useRef<() => void>();
  const suppressHandleClickRef = useRef(false);
  const mountedOpenRef = useRef(false);
  const handledOpenRequestRef = useRef(0);
  const handledCloseRequestRef = useRef(0);
  const [panelState, setPanelState] = useState<PanelState>("closed");
  const [progress, setProgress] = useState(0);
  const [deformation, setDeformation] = useState(0);
  const [absorptionProgress, setAbsorptionProgress] = useState(() => revealOnMount ? 1 : 0);
  const [handleCenterRatio, setHandleCenterRatio] = useState(0.5);
  const [activeIndex, setActiveIndex] = useState(() => eventIndex(events, initialEventId));
  const [reducedMotion, setReducedMotion] = useState(() => prefersReducedMotion());
  const [geometry, setGeometry] = useState<PanelGeometry>(() => ({
    height: window.innerHeight,
    navBottom: window.innerHeight,
    navTop: window.innerHeight - CLOSED_MENU_BAR_HEIGHT_PX,
    width: Math.min(window.innerWidth, 480),
  }));

  const eventsKey = useMemo(() => events.map((event) => event.id).join(":"), [events]);
  const closedHeight = Math.max(1, geometry.navBottom - geometry.navTop);
  const maximumHeight = Math.max(
    closedHeight + 1,
    Math.min(MAX_PANEL_HEIGHT_PX, geometry.navBottom - PANEL_TOP_MARGIN_PX),
  );
  const movementRange = Math.max(1, maximumHeight - closedHeight);
  const panelHeight = closedHeight + movementRange * progress;
  const edgeY = geometry.navBottom - panelHeight;
  const handleHorizontalInset = liquidHandleHorizontalInset(geometry.width);
  const handleCenterX = clamp(
    handleCenterRatio * geometry.width,
    handleHorizontalInset,
    geometry.width - handleHorizontalInset,
  );
  const baseTabLift = (reducedMotion ? 8 : HANDLE_TAB_HEIGHT_PX)
    * (1 - smoothstep(progress))
    * (1 - absorptionProgress);
  const deformationLift = reducedMotion ? 0 : MAX_DEFORMATION_PX * deformation;
  const handleTipY = edgeY - baseTabLift - deformationLift;
  const handleIconOffset = Math.max(0, baseTabLift + deformationLift) * 0.46;
  const contentReveal = clamp((progress - 0.12) / 0.54, 0, 1);
  const surfaceOpacity = 1 - smoothstep(progress) * 0.34;
  const surfaceStrokeOpacity = 0.72 - smoothstep(progress) * 0.24;
  const surfaceHeight = Math.max(1, geometry.navBottom - edgeY);
  const opaqueMenuOffset = clamp((geometry.navTop - edgeY) / surfaceHeight, 0, 1);
  const opacityFadeStartOffset = clamp(
    (geometry.navTop - 72 - edgeY) / surfaceHeight,
    0,
    opaqueMenuOffset,
  );
  const surfaceGradientId = `${panelId.replace(/[^a-zA-Z0-9_-]/g, "")}-surface-gradient`;
  const path = liquidPanelPath({
    bottomY: geometry.navBottom,
    centerX: handleCenterX,
    deformation,
    edgeY,
    progress,
    reducedMotion,
    tabScale: 1 - absorptionProgress,
    width: geometry.width,
  });

  const applyMotion = useCallback((nextProgress: number, nextDeformation: number) => {
    const boundedProgress = clamp(nextProgress, 0, 1);
    const boundedDeformation = clamp(nextDeformation, -1, 1);
    progressRef.current = boundedProgress;
    deformationRef.current = boundedDeformation;
    setProgress(boundedProgress);
    setDeformation(boundedDeformation);
  }, []);

  const stopMotion = useCallback(() => {
    if (motionFrameRef.current !== undefined) {
      window.cancelAnimationFrame(motionFrameRef.current);
      motionFrameRef.current = undefined;
    }
  }, []);

  const animateTo = useCallback((target: 0 | 1, releaseVelocity = 0) => {
    stopMotion();
    setAbsorptionProgress(0);
    scrollUnlockRef.current?.();
    scrollUnlockRef.current = undefined;
    setPanelState(target === 1 ? "opening" : "closing");

    if (reducedMotion) {
      const startProgress = progressRef.current;
      const startedAt = performance.now();
      const duration = 240;
      const frame = (time: number) => {
        const elapsed = clamp((time - startedAt) / duration, 0, 1);
        const eased = 1 - (1 - elapsed) ** 3;
        applyMotion(startProgress + (target - startProgress) * eased, 0);
        if (elapsed < 1) {
          motionFrameRef.current = window.requestAnimationFrame(frame);
          return;
        }
        motionFrameRef.current = undefined;
        setPanelState(target === 1 ? "opened" : "closed");
        if (target === 0) onClosed?.();
      };
      motionFrameRef.current = window.requestAnimationFrame(frame);
      return;
    }

    let position = progressRef.current;
    let velocity = releaseVelocity;
    let shape = deformationRef.current;
    let shapeVelocity = Math.abs(shape) < 0.08 ? (target === 1 ? 9 : -10.5) : 0;
    let previousTime = performance.now();

    const frame = (time: number) => {
      const deltaSeconds = Math.min(0.032, Math.max(0.001, (time - previousTime) / 1_000));
      previousTime = time;

      velocity += (SPRING_STIFFNESS * (target - position) - SPRING_DAMPING * velocity) * deltaSeconds;
      position += velocity * deltaSeconds;
      if ((target === 1 && position >= 1) || (target === 0 && position <= 0)) {
        position = target;
        velocity = 0;
      }

      shapeVelocity += (-SPRING_STIFFNESS * shape - SPRING_DAMPING * shapeVelocity) * deltaSeconds;
      shape += shapeVelocity * deltaSeconds;
      applyMotion(position, shape);

      const settled = Math.abs(target - position) < 0.001
        && Math.abs(velocity) < 0.01
        && Math.abs(shape) < 0.003
        && Math.abs(shapeVelocity) < 0.02;
      if (!settled) {
        motionFrameRef.current = window.requestAnimationFrame(frame);
        return;
      }

      applyMotion(target, 0);
      motionFrameRef.current = undefined;
      setPanelState(target === 1 ? "opened" : "closed");
      if (target === 0) onClosed?.();
    };

    motionFrameRef.current = window.requestAnimationFrame(frame);
  }, [applyMotion, onClosed, reducedMotion, stopMotion]);

  const measure = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const frameRect = frame.getBoundingClientRect();
    const navigationRect = navigationRef.current?.getBoundingClientRect();
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    setGeometry({
      height: viewportHeight,
      navBottom: navigationRect ? navigationRect.bottom - frameRect.top : viewportHeight,
      navTop: navigationRect ? navigationRect.top - frameRect.top : viewportHeight - CLOSED_MENU_BAR_HEIGHT_PX,
      width: frameRect.width,
    });
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    if (frameRef.current) observer.observe(frameRef.current);
    if (navigationRef.current) observer.observe(navigationRef.current);
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, [measure]);

  useEffect(() => {
    const nextIndex = eventIndex(events, initialEventId);
    setActiveIndex(nextIndex);
  }, [eventsKey, events, initialEventId]);

  useEffect(() => {
    if (!openOnMount || mountedOpenRef.current || events.length === 0) return;
    mountedOpenRef.current = true;
    const frame = window.requestAnimationFrame(() => animateTo(1));
    return () => window.cancelAnimationFrame(frame);
  }, [animateTo, events.length, openOnMount]);

  useEffect(() => {
    if (
      openRequestVersion <= handledOpenRequestRef.current
      || openRequestVersion <= 0
      || events.length === 0
    ) return;
    handledOpenRequestRef.current = openRequestVersion;
    animateTo(1);
  }, [animateTo, events.length, openRequestVersion]);

  useEffect(() => {
    if (
      closeRequestVersion <= handledCloseRequestRef.current
      || closeRequestVersion <= 0
    ) return;
    handledCloseRequestRef.current = closeRequestVersion;
    animateTo(0);
  }, [animateTo, closeRequestVersion]);

  useEffect(() => {
    if (!revealOnMount) return;
    const startedAt = performance.now();
    const duration = reducedMotion ? 120 : 320;
    const frame = (time: number) => {
      const elapsed = clamp((time - startedAt) / duration, 0, 1);
      const eased = 1 - (1 - elapsed) ** 3;
      setAbsorptionProgress(1 - eased);
      if (elapsed < 1) {
        revealFrameRef.current = window.requestAnimationFrame(frame);
        return;
      }
      revealFrameRef.current = undefined;
    };
    revealFrameRef.current = window.requestAnimationFrame(frame);
    return () => {
      if (revealFrameRef.current !== undefined) {
        window.cancelAnimationFrame(revealFrameRef.current);
        revealFrameRef.current = undefined;
      }
    };
  }, [reducedMotion, revealOnMount]);

  useEffect(() => {
    if (events.length > 0 || progressRef.current <= 0) return;
    animateTo(0);
  }, [animateTo, events.length]);

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || progressRef.current < 0.01) return;
      event.preventDefault();
      animateTo(0);
    };
    document.addEventListener("keydown", keyDown);
    return () => document.removeEventListener("keydown", keyDown);
  }, [animateTo]);

  useEffect(() => () => {
    stopMotion();
    scrollUnlockRef.current?.();
  }, [stopMotion]);

  function panelPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (events.length === 0 || event.button !== 0) return;
    stopMotion();
    const time = performance.now();
    panelGestureRef.current = {
      axis: "pending",
      lastTime: time,
      lastY: event.clientY,
      pointerId: event.pointerId,
      startHandleX: handleCenterX,
      startHandleTipY: handleTipY,
      startProgress: progressRef.current,
      startX: event.clientX,
      startY: event.clientY,
      velocityY: 0,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function sheetPointerDown(clientY: number) {
    stopMotion();
    scrollUnlockRef.current?.();
    const time = performance.now();
    sheetGestureRef.current = {
      lastTime: time,
      lastY: clientY,
      startHandleTipY: handleTipY,
      startProgress: progressRef.current,
      startY: clientY,
      velocityY: 0,
    };
    setPanelState("dragging");
    scrollUnlockRef.current = lockPageScroll();
  }

  function sheetPointerMove(clientY: number) {
    const gesture = sheetGestureRef.current;
    if (!gesture) return;
    const now = performance.now();
    const deltaTime = Math.max(1, now - gesture.lastTime);
    const deltaY = clientY - gesture.startY;
    gesture.velocityY = (clientY - gesture.lastY) / deltaTime;
    gesture.lastTime = now;
    gesture.lastY = clientY;

    const nextProgress = clamp(
      gesture.startProgress - deltaY * PANEL_EDGE_FOLLOW_RATIO / movementRange,
      0,
      1,
    );
    const nextEdgeY = geometry.navBottom - (closedHeight + movementRange * nextProgress);
    const nextBaseLift = (reducedMotion ? 8 : HANDLE_TAB_HEIGHT_PX) * (1 - smoothstep(nextProgress));
    const desiredHandleTipY = gesture.startHandleTipY + deltaY;
    const nextDeformation = reducedMotion
      ? 0
      : (nextEdgeY - nextBaseLift - desiredHandleTipY) / MAX_DEFORMATION_PX;
    applyMotion(nextProgress, nextDeformation);
  }

  function sheetPointerEnd() {
    const gesture = sheetGestureRef.current;
    if (!gesture) return;
    sheetGestureRef.current = undefined;
    scrollUnlockRef.current?.();
    scrollUnlockRef.current = undefined;
    const target = panelTarget(progressRef.current, gesture.velocityY);
    const progressVelocity = -gesture.velocityY * 1_000 / movementRange;
    animateTo(target, progressVelocity);
  }

  function panelPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const gesture = panelGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;

    let activatedVerticalAfterHorizontal = false;
    if (gesture.axis === "pending") {
      if (Math.hypot(deltaX, deltaY) < DRAG_AXIS_THRESHOLD_PX) return;
      gesture.axis = Math.abs(deltaY) >= Math.abs(deltaX) ? "vertical" : "horizontal";
      if (gesture.axis === "vertical") {
        setPanelState("dragging");
        scrollUnlockRef.current = lockPageScroll();
      }
    }

    if (
      gesture.axis === "horizontal"
      && Math.abs(deltaY) >= DRAG_AXIS_THRESHOLD_PX
    ) {
      gesture.axis = "vertical";
      gesture.startY = event.clientY;
      gesture.startProgress = progressRef.current;
      gesture.startHandleTipY = handleTipY;
      gesture.lastTime = performance.now();
      gesture.lastY = event.clientY;
      gesture.velocityY = 0;
      activatedVerticalAfterHorizontal = true;
      setPanelState("dragging");
      scrollUnlockRef.current = lockPageScroll();
    }

    event.preventDefault();
    const nextHandleX = clamp(
      gesture.startHandleX + deltaX,
      handleHorizontalInset,
      geometry.width - handleHorizontalInset,
    );
    setHandleCenterRatio(nextHandleX / geometry.width);
    if (activatedVerticalAfterHorizontal) return;
    if (gesture.axis !== "vertical") return;

    const now = performance.now();
    const deltaTime = Math.max(1, now - gesture.lastTime);
    gesture.velocityY = (event.clientY - gesture.lastY) / deltaTime;
    gesture.lastTime = now;
    gesture.lastY = event.clientY;

    const nextProgress = clamp(
      gesture.startProgress - deltaY * PANEL_EDGE_FOLLOW_RATIO / movementRange,
      0,
      1,
    );
    const nextEdgeY = geometry.navBottom - (closedHeight + movementRange * nextProgress);
    const nextBaseLift = (reducedMotion ? 8 : HANDLE_TAB_HEIGHT_PX) * (1 - smoothstep(nextProgress));
    const desiredHandleTipY = gesture.startHandleTipY + deltaY;
    const nextDeformation = reducedMotion
      ? 0
      : (nextEdgeY - nextBaseLift - desiredHandleTipY) / MAX_DEFORMATION_PX;
    applyMotion(nextProgress, nextDeformation);
  }

  function panelPointerEnd(event: ReactPointerEvent<HTMLButtonElement>) {
    const gesture = panelGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    panelGestureRef.current = undefined;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    scrollUnlockRef.current?.();
    scrollUnlockRef.current = undefined;

    if (gesture.axis !== "vertical") {
      if (gesture.axis === "horizontal") suppressHandleClickRef.current = true;
      setPanelState(progressRef.current >= 0.5 ? "opened" : "closed");
      return;
    }

    suppressHandleClickRef.current = true;
    const target = panelTarget(progressRef.current, gesture.velocityY);
    const progressVelocity = -gesture.velocityY * 1_000 / movementRange;
    animateTo(target, progressVelocity);
  }

  function handleClick() {
    if (suppressHandleClickRef.current) {
      suppressHandleClickRef.current = false;
      return;
    }
    animateTo(progressRef.current >= 0.5 ? 0 : 1);
  }

  function selectEvent(event: Event) {
    const nextIndex = events.findIndex((item) => item.id === event.id);
    if (nextIndex < 0) return;
    setActiveIndex(nextIndex);
    onActiveEventChange?.(event);
  }

  const rootStyle = {
    "--liquid-content-reveal": contentReveal,
    "--liquid-absorption-progress": absorptionProgress,
    "--liquid-handle-icon-offset": `${handleIconOffset}px`,
    "--liquid-handle-rotation": `${panelHandleRotation(progress)}deg`,
    "--liquid-surface-opacity": surfaceOpacity,
    "--liquid-surface-stroke-opacity": surfaceStrokeOpacity,
  } as CSSProperties;
  const activeEvent = events[activeIndex];
  const panelIsExpanded = panelState === "opened"
    || panelState === "opening"
    || (panelState === "dragging" && progress >= OPEN_THRESHOLD);

  return (
    <div
      className="liquid-event-panel"
      data-state={panelState}
      data-reduced-motion={reducedMotion ? "true" : undefined}
      style={rootStyle}
      data-testid="liquid-event-panel"
    >
      <div
        className="liquid-event-panel__backdrop"
        style={{ opacity: contentReveal * 0.72 }}
        onPointerDown={() => animateTo(0)}
        aria-hidden="true"
        data-testid="liquid-event-panel-backdrop"
      />

      <div ref={frameRef} className="liquid-event-panel__frame">
        <svg
          className="liquid-event-panel__surface"
          viewBox={`0 0 ${geometry.width} ${geometry.height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id={surfaceGradientId}
              x1="0"
              x2="0"
              y1={edgeY}
              y2={geometry.navBottom}
              gradientUnits="userSpaceOnUse"
            >
              <stop
                className="liquid-event-panel__surface-stop"
                offset="0"
                stopOpacity={surfaceOpacity}
                data-liquid-surface-stop="panel"
              />
              <stop
                className="liquid-event-panel__surface-stop"
                offset={opacityFadeStartOffset}
                stopOpacity={surfaceOpacity}
              />
              <stop
                className="liquid-event-panel__surface-stop"
                offset={opaqueMenuOffset}
                stopOpacity="1"
                data-liquid-surface-stop="menu"
              />
              <stop
                className="liquid-event-panel__surface-stop"
                offset="1"
                stopOpacity="1"
              />
            </linearGradient>
          </defs>
          <path d={path} fill={`url(#${surfaceGradientId})`} />
        </svg>

        <section
          id={panelId}
          className="liquid-event-panel__content"
          style={{
            top: `${edgeY + 22}px`,
            bottom: `${Math.max(0, geometry.height - geometry.navTop)}px`,
          }}
          aria-label={`Карусель событий, ${events.length}`}
          aria-hidden={panelState === "closed" ? "true" : undefined}
          data-testid="liquid-event-carousel"
        >
          {events.length > 0 ? (
            <DiscoverEventCarousel
              activeEventId={activeEvent?.id}
              enabled={panelState === "opened"}
              events={events}
              mapCamera={mapCamera}
              onActiveEventChange={selectEvent}
              onSheetDragEnd={sheetPointerEnd}
              onSheetDragMove={sheetPointerMove}
              onSheetDragStart={sheetPointerDown}
            />
          ) : (
            <p className="liquid-event-panel__empty">Событий пока нет.</p>
          )}
        </section>

        <button
          type="button"
          className="liquid-event-panel__handle"
          style={{ left: `${handleCenterX}px`, top: `${handleTipY}px` }}
          aria-controls={panelId}
          aria-expanded={panelIsExpanded}
          aria-label={panelIsExpanded ? "Закрыть карусель событий" : "Открыть карусель событий"}
          disabled={events.length === 0}
          onClick={handleClick}
          onPointerDown={panelPointerDown}
          onPointerMove={panelPointerMove}
          onPointerUp={panelPointerEnd}
          onPointerCancel={panelPointerEnd}
          data-liquid-panel-handle
        >
          <span className="liquid-event-panel__grip" aria-hidden="true">
            <ChevronUp
              data-liquid-panel-chevron
              size={20}
              strokeWidth={2.5}
            />
          </span>
        </button>

        <div ref={navigationRef} className="liquid-event-panel__navigation" aria-hidden="true" />
      </div>

      <span className="sr-only" aria-live="polite">
        {panelState === "opened"
          ? `Карусель открыта${activeEvent ? `, выбрано событие ${activeEvent.title}` : ""}`
          : panelState === "closed" ? "Карусель закрыта" : ""}
      </span>
    </div>
  );
}

function eventIndex(events: Event[], eventId?: number) {
  if (events.length === 0) return 0;
  const index = eventId === undefined ? -1 : events.findIndex((event) => event.id === eventId);
  return index >= 0 ? index : 0;
}

function lockPageScroll() {
  const body = document.body;
  const root = document.documentElement;
  const previousBodyOverflow = body.style.overflow;
  const previousBodyTouchAction = body.style.touchAction;
  const previousRootOverscroll = root.style.overscrollBehaviorY;
  body.style.overflow = "hidden";
  body.style.touchAction = "none";
  root.style.overscrollBehaviorY = "none";
  return () => {
    body.style.overflow = previousBodyOverflow;
    body.style.touchAction = previousBodyTouchAction;
    root.style.overscrollBehaviorY = previousRootOverscroll;
  };
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function smoothstep(value: number) {
  const bounded = clamp(value, 0, 1);
  return bounded * bounded * (3 - 2 * bounded);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
