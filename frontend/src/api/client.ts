import type {
  ApiErrorBody,
  CreateEventPayload,
  CreateParticipantPayload,
  CreateUserPayload,
  Event,
  EventParticipants,
  EventsFilters,
  User,
} from "./types";

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL;

export const API_BASE_URL =
  configuredBaseUrl && configuredBaseUrl.trim().length > 0
    ? configuredBaseUrl.replace(/\/$/, "")
    : "http://172.20.247.149:5050/api/v1";

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

function buildUrl(path: string, params?: Record<string, string | number | undefined>) {
  const url = new URL(`${API_BASE_URL}${path}`);

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const responseText = await response.text();
  const shouldParseJson =
    contentType.includes("application/json") || responseText.trim().startsWith("{") || responseText.trim().startsWith("[");
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

export const api = {
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
      }),
      { signal },
    );
  },

  getEvent(id: number) {
    return request<Event>(buildUrl(`/events/${id}`));
  },

  createEvent(payload: CreateEventPayload) {
    return request<Event>(buildUrl("/events"), {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getUsers(limit = 20, offset = 0) {
    return request<User[]>(buildUrl("/users", { limit, offset }));
  },

  getUser(id: number) {
    return request<User>(buildUrl(`/users/${id}`));
  },

  createUser(payload: CreateUserPayload) {
    return request<User>(buildUrl("/users"), {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getParticipants(eventId?: number) {
    return request<EventParticipants[]>(
      buildUrl("/participants", {
        event_id: eventId,
      }),
    );
  },

  createParticipant(payload: CreateParticipantPayload) {
    return request(buildUrl("/participants"), {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
