import { ApiError } from "../api/client";
import type { Location } from "../api/types";

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
