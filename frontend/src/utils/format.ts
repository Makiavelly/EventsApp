import { ApiError } from "../api/client";
import type { AutoDeletePolicy, Location } from "../api/types";

export function formatDateTime(value?: string | null) {
  if (!value) {
    return "Дата не указана";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatLocation(location?: Location | null) {
  if (!location) {
    return "Локация не указана";
  }

  return `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
}

export function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.details ? `${error.message}: ${error.details}` : error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Что-то пошло не так";
}

export function toOptionalNumber(value: string) {
  if (value.trim() === "") {
    return undefined;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

export function distanceMeters(from: Location, to: Location) {
  const earthRadius = 6_371_000;
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const deltaLatitude = toRadians(to.latitude - from.latitude);
  const deltaLongitude = toRadians(to.longitude - from.longitude);
  const latitude1 = toRadians(from.latitude);
  const latitude2 = toRadians(to.latitude);
  const haversine = Math.sin(deltaLatitude / 2) ** 2
    + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(deltaLongitude / 2) ** 2;

  return 2 * earthRadius * Math.asin(Math.sqrt(haversine));
}

export function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} м`;
  return `${(meters / 1000).toLocaleString("ru-RU", { maximumFractionDigits: meters < 10_000 ? 1 : 0 })} км`;
}

export function formatAutoDelete(policy: AutoDeletePolicy, seconds?: number | null) {
  if (policy === "never") return "Не удалять автоматически";
  if (policy === "at_start") return "Удалить после начала";
  if (!seconds) return "Удалить через интервал после начала";
  const hours = seconds / 3600;
  if (Number.isInteger(hours) && hours < 24) return `Удалить через ${hours} ч после начала`;
  const days = hours / 24;
  return `Удалить через ${days.toLocaleString("ru-RU", { maximumFractionDigits: 1 })} дн. после начала`;
}
