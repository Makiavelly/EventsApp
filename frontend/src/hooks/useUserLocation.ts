import { useCallback, useEffect, useState } from "react";
import type { Location } from "../api/types";

type LocationStatus = "loading" | "granted" | "denied" | "unavailable";
const STORAGE_KEY = "eventsapp-last-location";

function cachedLocation(): Location | undefined {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<Location> | null;
    if (value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude)) {
      return { latitude: value.latitude as number, longitude: value.longitude as number };
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return undefined;
}

export function useUserLocation() {
  const [location, setLocation] = useState<Location | undefined>(cachedLocation);
  const [status, setStatus] = useState<LocationStatus>("loading");
  const [message, setMessage] = useState("Определяем ваше местоположение…");

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("unavailable");
      setMessage("Геолокация не поддерживается. Можно пользоваться картой и выбрать область вручную.");
      return;
    }

    setStatus("loading");
    setMessage("Определяем ваше местоположение…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        setLocation(next);
        setStatus("granted");
        setMessage("Ваше положение найдено");
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      },
      (error) => {
        const denied = error.code === error.PERMISSION_DENIED;
        setStatus(denied ? "denied" : "unavailable");
        setMessage(denied
          ? "Доступ к геолокации не разрешён. Показываем последнюю или выбранную область."
          : "Не удалось определить положение. Карта продолжит работать без него.");
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }, []);

  useEffect(() => requestLocation(), [requestLocation]);

  return { location, status, message, retry: requestLocation };
}
