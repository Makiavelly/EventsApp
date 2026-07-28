export const LIQUID_TAB_REVEAL_STATE_KEY = "liquidTabReveal";

export function createLiquidTabExitGhost() {
  const frame = document.querySelector<HTMLElement>(".liquid-event-panel__frame");
  const panel = frame?.closest<HTMLElement>(".liquid-event-panel");
  const surface = frame?.querySelector<SVGSVGElement>(".liquid-event-panel__surface");
  const handle = frame?.querySelector<HTMLElement>(".liquid-event-panel__handle");
  const content = frame?.querySelector<HTMLElement>(".liquid-event-panel__content");
  const navigation = document.querySelector<HTMLElement>(
    ".bottom-navigation[data-surface='liquid'] .animated-selector--navigation",
  );
  if (!frame || !panel || !surface || !handle || !navigation) return;

  const frameRect = frame.getBoundingClientRect();
  const handleRect = handle.getBoundingClientRect();
  const navigationRect = navigation.getBoundingClientRect();
  const handleX = handleRect.left + handleRect.width / 2 - frameRect.left;
  const navigationTop = navigationRect.top - frameRect.top;
  const horizontalRadius = Math.min(190, frameRect.width);
  const contentIsVisible = Boolean(content && Number.parseFloat(getComputedStyle(content).opacity) > 0.05);
  const clipLeft = contentIsVisible ? 0 : Math.max(0, handleX - horizontalRadius);
  const clipRight = contentIsVisible ? 0 : Math.max(0, frameRect.width - handleX - horizontalRadius);
  const clipBottom = Math.max(0, frameRect.height - navigationTop - 2);

  const ghost = document.createElement("div");
  ghost.dataset.liquidTabExitGhost = "true";
  ghost.dataset.expanded = contentIsVisible ? "true" : "false";
  ghost.setAttribute("aria-hidden", "true");
  Object.assign(ghost.style, {
    inset: "0",
    overflow: "hidden",
    pointerEvents: "none",
    position: "fixed",
    zIndex: "41",
  });

  const ghostFrame = document.createElement("div");
  Object.assign(ghostFrame.style, {
    clipPath: `inset(0 ${clipRight}px ${clipBottom}px ${clipLeft}px)`,
    height: `${frameRect.height}px`,
    left: `${frameRect.left}px`,
    position: "absolute",
    top: `${frameRect.top}px`,
    transformOrigin: `${handleX}px ${navigationTop}px`,
    width: `${frameRect.width}px`,
  });
  const panelStyle = getComputedStyle(panel);
  [
    "--liquid-content-reveal",
    "--liquid-handle-icon-offset",
    "--liquid-handle-rotation",
    "--liquid-surface-opacity",
    "--liquid-surface-stroke-opacity",
  ].forEach((property) => {
    ghostFrame.style.setProperty(property, panelStyle.getPropertyValue(property));
  });

  const handleClone = handle.cloneNode(true) as HTMLElement;
  handleClone.removeAttribute("aria-controls");
  handleClone.removeAttribute("aria-expanded");
  handleClone.removeAttribute("aria-label");
  handleClone.setAttribute("tabindex", "-1");
  const surfaceClone = surface.cloneNode(true);
  ghostFrame.append(surfaceClone);
  if (contentIsVisible && content) {
    const contentClone = content.cloneNode(true) as HTMLElement;
    contentClone.removeAttribute("id");
    ghostFrame.append(contentClone);
    const sourceViewport = content.querySelector<HTMLElement>(".liquid-vertical-carousel");
    const clonedViewport = contentClone.querySelector<HTMLElement>(".liquid-vertical-carousel");
    if (sourceViewport && clonedViewport) clonedViewport.scrollTop = sourceViewport.scrollTop;
  }
  ghostFrame.append(handleClone);
  ghost.append(ghostFrame);
  document.body.append(ghost);

  const keyframes = contentIsVisible
    ? [
        { opacity: 1, transform: "translateY(0) scale(1, 1)" },
        { opacity: 0, transform: "translateY(120px) scale(0.98, 0.78)" },
      ]
    : [
        { opacity: 1, transform: "scale(1, 1)" },
        { opacity: 0, transform: "scale(0.34, 0.02)" },
      ];
  const animation = ghostFrame.animate(
    keyframes,
    {
      duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 120 : 320,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      fill: "forwards",
    },
  );
  const remove = () => ghost.remove();
  animation.addEventListener("finish", remove, { once: true });
  animation.addEventListener("cancel", remove, { once: true });
  window.setTimeout(remove, 500);
}
