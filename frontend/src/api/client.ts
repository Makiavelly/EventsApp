import type {
  ApiErrorBody,
  AuthResponse,
  CreateEventPayload,
  CreateParticipantPayload,
  CreateUserPayload,
  Event,
  EventParticipant,
  EventsFilters,
  LoginPayload,
  PatchEventPayload,
  PatchUserPayload,
  PublicUser,
  User,
} from "./types";

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL;

export const API_BASE_URL =
  configuredBaseUrl && configuredBaseUrl.trim().length > 0
    ? configuredBaseUrl.replace(/\/$/, "")
    : "/api/v1";

let accessToken: string | null = null;
let refreshPromise: Promise<AuthResponse> | null = null;
const authenticationExpiredListeners = new Set<() => void>();

export class ApiError extends Error {
  status: number;
  details?: string;

  constructor(status: number, message: string, details?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function onAuthenticationExpired(listener: () => void) {
  authenticationExpiredListeners.add(listener);
  return () => authenticationExpiredListeners.delete(listener);
}

function expireAuthentication() {
  accessToken = null;
  authenticationExpiredListeners.forEach((listener) => listener());
}

function buildUrl(path: string, params?: Record<string, string | number | undefined>) {
  const origin = globalThis.location?.origin ?? "http://localhost";
  const baseUrl = new URL(
    API_BASE_URL.endsWith("/") ? API_BASE_URL : API_BASE_URL + "/",
    origin,
  );
  const url = new URL(path.replace(/^\//, ""), baseUrl);

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

async function sendRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers,
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const responseText = await response.text();
  const shouldParseJson =
    contentType.includes("application/json") ||
    responseText.trim().startsWith("{") ||
    responseText.trim().startsWith("[");
  const body = shouldParseJson && responseText ? (JSON.parse(responseText) as unknown) : responseText;

  if (!response.ok) {
    const errorBody = typeof body === "object" && body !== null ? (body as ApiErrorBody) : undefined;
    throw new ApiError(
      response.status,
      errorBody?.message ?? `HTTP ${response.status}`,
      errorBody?.error ?? (typeof body === "string" ? body : undefined),
    );
  }

  return body as T;
}

async function refreshAuthentication() {
  if (!refreshPromise) {
    refreshPromise = withRefreshLock(() =>
      sendRequest<AuthResponse>(buildUrl("/auth/refresh"), { method: "POST" }),
    )
      .then((response) => {
        setAccessToken(response.token);
        return response;
      })
      .catch((error: unknown) => {
        expireAuthentication();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

function withRefreshLock<T>(action: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return new Promise<T>((resolve, reject) => {
      void navigator.locks
        .request("eventsapp-auth-refresh", async () => {
          try {
            resolve(await action());
          } catch (error) {
            reject(error);
          }
        })
        .catch(reject);
    });
  }

  return action();
}

async function request<T>(path: string, init?: RequestInit, canRefresh = true): Promise<T> {
  try {
    return await sendRequest<T>(path, init);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || !canRefresh) {
      throw error;
    }

    await refreshAuthentication();
    return sendRequest<T>(path, init);
  }
}

export const api = {
  async register(payload: CreateUserPayload) {
    const response = await request<AuthResponse>(
      buildUrl("/auth/register"),
      { method: "POST", body: JSON.stringify(payload) },
      false,
    );
    setAccessToken(response.token);
    return response;
  },

  async login(payload: LoginPayload) {
    const response = await request<AuthResponse>(
      buildUrl("/auth/login"),
      { method: "POST", body: JSON.stringify(payload) },
      false,
    );
    setAccessToken(response.token);
    return response;
  },

  refresh() {
    return refreshAuthentication();
  },

  async logout() {
    try {
      await request<void>(
        buildUrl("/auth/logout"),
        { method: "POST" },
        false,
      );
    } finally {
      setAccessToken(null);
    }
  },

  getEvents(filters: EventsFilters = {}, signal?: AbortSignal) {
    return request<Event[]>(
      buildUrl("/events", {
        latitude: filters.latitude,
        longitude: filters.longitude,
        radius: filters.radius,
        west: filters.bounds?.west,
        south: filters.bounds?.south,
        east: filters.bounds?.east,
        north: filters.bounds?.north,
        limit: filters.limit,
        offset: filters.offset,
        creator_id: filters.creatorId,
        participant_id: filters.participantId,
        without_location: filters.withoutLocation ? "true" : undefined,
      }),
      { signal },
    );
  },

  getEvent(id: number) {
    return request<Event>(buildUrl(`/events/${id}`));
  },

  getUser(id: number) {
    return request<PublicUser>(buildUrl(`/users/${id}`));
  },

  createEvent(payload: CreateEventPayload) {
    return request<Event>(buildUrl("/events"), {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  patchEvent(id: number, payload: PatchEventPayload) {
    return request<Event>(buildUrl("/events/" + id), {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deleteEvent(id: number) {
    return request<void>(buildUrl("/events/" + id), { method: "DELETE" });
  },

  patchUser(id: number, payload: PatchUserPayload) {
    return request<User>(buildUrl("/users/" + id), {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async deleteUser(id: number) {
    await request<void>(buildUrl("/users/" + id), { method: "DELETE" });
    try {
      await request<void>(buildUrl("/auth/logout"), { method: "POST" }, false);
    } catch {
      // The account and its server-side sessions are already deleted.
    } finally {
      setAccessToken(null);
    }
  },

  getParticipants(eventId?: number) {
    return request<EventParticipant[]>(buildUrl("/participants", { event_id: eventId, limit: 500, offset: 0 }));
  },

  createParticipant(payload: CreateParticipantPayload) {
    return request(buildUrl("/participants"), {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  deleteParticipant(eventId: number) {
    return request<void>(
      buildUrl("/participants", { event_id: eventId }),
      { method: "DELETE" },
    );
  },
};
