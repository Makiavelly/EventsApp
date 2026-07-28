export const CLOSED_MENU_BAR_HEIGHT_PX = 88;
export const MAX_PANEL_HEIGHT_PX = 620;
export const OPEN_THRESHOLD = 0.42;
export const MAX_DEFORMATION_PX = 62;
export const DEFORMATION_ZONE_WIDTH_PX = 210;
export const SPRING_STIFFNESS = 360;
export const SPRING_DAMPING = 28;
export const MIN_FLING_VELOCITY_PX_MS = 0.55;
export const HANDLE_TAB_HEIGHT_PX = 18;

export function panelTarget(progress: number, velocityY: number): 0 | 1 {
  if (velocityY <= -MIN_FLING_VELOCITY_PX_MS) return 1;
  if (velocityY >= MIN_FLING_VELOCITY_PX_MS) return 0;
  return progress >= OPEN_THRESHOLD ? 1 : 0;
}

export function liquidPanelPath({
  bottomY,
  deformation,
  edgeY,
  progress,
  reducedMotion,
  width,
}: {
  bottomY: number;
  deformation: number;
  edgeY: number;
  progress: number;
  reducedMotion: boolean;
  width: number;
}) {
  const centerX = width / 2;
  const cornerRadius = Math.min(26, width * 0.06);
  const baseLift = (reducedMotion ? 8 : HANDLE_TAB_HEIGHT_PX) * (1 - smoothstep(progress));
  const lift = baseLift + (reducedMotion ? 0 : MAX_DEFORMATION_PX * deformation);
  const waveWidth = Math.min(
    width - cornerRadius * 2,
    DEFORMATION_ZONE_WIDTH_PX * (0.82 + Math.min(1, Math.abs(deformation)) * 0.28),
  );
  const halfWave = waveWidth / 2;
  const left = centerX - halfWave;
  const right = centerX + halfWave;
  const shoulderY = edgeY - lift * 0.22;
  const neckY = edgeY - lift * 0.72;
  const tipY = edgeY - lift;
  const neckHalf = Math.min(42, waveWidth * 0.21);

  return [
    `M 0 ${bottomY - cornerRadius}`,
    `L 0 ${edgeY + cornerRadius}`,
    `Q 0 ${edgeY} ${cornerRadius} ${edgeY}`,
    `L ${left} ${edgeY}`,
    `C ${left + halfWave * 0.18} ${edgeY} ${centerX - halfWave * 0.42} ${shoulderY} ${centerX - neckHalf} ${neckY}`,
    `C ${centerX - neckHalf * 0.72} ${tipY} ${centerX - neckHalf * 0.24} ${tipY} ${centerX} ${tipY}`,
    `C ${centerX + neckHalf * 0.24} ${tipY} ${centerX + neckHalf * 0.72} ${tipY} ${centerX + neckHalf} ${neckY}`,
    `C ${centerX + halfWave * 0.42} ${shoulderY} ${right - halfWave * 0.18} ${edgeY} ${right} ${edgeY}`,
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
