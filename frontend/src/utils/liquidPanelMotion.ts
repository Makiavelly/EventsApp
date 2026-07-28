export const CLOSED_MENU_BAR_HEIGHT_PX = 88;
export const MAX_PANEL_HEIGHT_PX = 620;
export const OPEN_THRESHOLD = 0.42;
export const MAX_DEFORMATION_PX = 62;
export const DEFORMATION_ZONE_WIDTH_PX = 300;
export const SPRING_STIFFNESS = 360;
export const SPRING_DAMPING = 28;
export const MIN_FLING_VELOCITY_PX_MS = 0.55;
export const HANDLE_TAB_HEIGHT_PX = 24;
export const MIN_DEFORMATION_BRANCH_WIDTH_PX = 56;

export function panelTarget(progress: number, velocityY: number): 0 | 1 {
  if (velocityY <= -MIN_FLING_VELOCITY_PX_MS) return 1;
  if (velocityY >= MIN_FLING_VELOCITY_PX_MS) return 0;
  return progress >= OPEN_THRESHOLD ? 1 : 0;
}

export function panelHandleRotation(progress: number) {
  return clamp(progress, 0, 1) * 180;
}

export function liquidHandleHorizontalInset(width: number) {
  const cornerRadius = Math.min(26, width * 0.06);
  return Math.min(width / 2, cornerRadius + MIN_DEFORMATION_BRANCH_WIDTH_PX);
}

export function liquidPanelPath({
  bottomY,
  centerX: requestedCenterX,
  deformation,
  edgeY,
  progress,
  reducedMotion,
  tabScale = 1,
  width,
}: {
  bottomY: number;
  centerX?: number;
  deformation: number;
  edgeY: number;
  progress: number;
  reducedMotion: boolean;
  tabScale?: number;
  width: number;
}) {
  const cornerRadius = Math.min(26, width * 0.06);
  const horizontalInset = liquidHandleHorizontalInset(width);
  const centerX = clamp(
    requestedCenterX ?? width / 2,
    horizontalInset,
    width - horizontalInset,
  );
  const baseLift = (reducedMotion ? 8 : HANDLE_TAB_HEIGHT_PX)
    * (1 - smoothstep(progress))
    * clamp(tabScale, 0, 1);
  const lift = baseLift + (reducedMotion ? 0 : MAX_DEFORMATION_PX * deformation);
  const desiredWaveWidth = Math.min(
    width - cornerRadius * 2,
    DEFORMATION_ZONE_WIDTH_PX * (0.82 + Math.min(1, Math.abs(deformation)) * 0.28),
  );
  const desiredHalfWave = desiredWaveWidth / 2;
  const leftHalfWave = Math.min(desiredHalfWave, centerX - cornerRadius);
  const rightHalfWave = Math.min(desiredHalfWave, width - cornerRadius - centerX);
  const left = centerX - leftHalfWave;
  const right = centerX + rightHalfWave;
  const tipY = edgeY - lift;

  return [
    `M 0 ${bottomY - cornerRadius}`,
    `L 0 ${edgeY + cornerRadius}`,
    `Q 0 ${edgeY} ${cornerRadius} ${edgeY}`,
    `L ${left} ${edgeY}`,
    `C ${left + leftHalfWave * 0.58} ${edgeY} ${centerX - leftHalfWave * 0.36} ${tipY} ${centerX} ${tipY}`,
    `C ${centerX + rightHalfWave * 0.36} ${tipY} ${right - rightHalfWave * 0.58} ${edgeY} ${right} ${edgeY}`,
    `L ${width - cornerRadius} ${edgeY}`,
    `Q ${width} ${edgeY} ${width} ${edgeY + cornerRadius}`,
    `L ${width} ${bottomY - cornerRadius}`,
    `Q ${width} ${bottomY} ${width - cornerRadius} ${bottomY}`,
    `L ${cornerRadius} ${bottomY}`,
    `Q 0 ${bottomY} 0 ${bottomY - cornerRadius}`,
    "Z",
  ].join(" ");
}

function smoothstep(value: number) {
  const bounded = clamp(value, 0, 1);
  return bounded * bounded * (3 - 2 * bounded);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
