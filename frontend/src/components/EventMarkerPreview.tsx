import type { CSSProperties } from "react";
import type { EventMarker } from "../api/types";

type EventMarkerPreviewProps = {
  marker?: EventMarker | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  sm: "h-8 w-8 text-2xl",
  md: "h-12 w-12 text-4xl",
  lg: "h-20 w-20 text-6xl",
};

export function EventMarkerPreview({ marker, size = "md", className = "" }: EventMarkerPreviewProps) {
  const classes = `event-marker-preview ${sizes[size]} ${className}`;

  if (!marker) {
    return <span className={`${classes} event-marker-preview--default`} role="img" aria-label="Бежевый маячок по умолчанию" />;
  }
  if (marker.kind === "emoji") {
    return <span className={`${classes} event-marker-preview--emoji`} role="img" aria-label={`Маячок ${marker.value}`}>{marker.value}</span>;
  }
  if (marker.kind === "image") {
    return <img className={`${classes} event-marker-preview--image`} src={marker.value} alt="Свой маячок события" />;
  }

  return (
    <span
      className={`${classes} event-marker-preview--color`}
      style={{ "--marker-color": marker.value } as CSSProperties}
      role="img"
      aria-label={`Цвет маячка ${marker.value}`}
    />
  );
}
