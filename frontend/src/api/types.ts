export type Location = {
  latitude: number;
  longitude: number;
};

export type ApiErrorBody = {
  message?: string;
  error?: string;
};

export type EventMarker =
  | { kind: "emoji"; value: string }
  | { kind: "color"; value: string }
  | { kind: "image"; value: string };

export type Event = {
  id: number;
  creator_user_id: number;
  title: string;
  description?: string | null;
  location?: Location | null;
  marker?: EventMarker | null;
  date_meeting?: string | null;
  auto_delete_policy: AutoDeletePolicy;
  auto_delete_after_seconds?: number | null;
};

export type AutoDeletePolicy = "at_start" | "after_interval" | "never";

export type CreateEventPayload = {
  title: string;
  description?: string;
  location?: Location;
  marker?: EventMarker;
  date_meeting?: string;
  auto_delete_policy: AutoDeletePolicy;
  auto_delete_after_seconds?: number;
};

export type PatchEventPayload = {
  title?: string;
  description?: string | null;
  location?: Location | null;
  marker?: EventMarker | null;
  date_meeting?: string | null;
  auto_delete_policy?: AutoDeletePolicy;
  auto_delete_after_seconds?: number | null;
};

export type EventBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type EventsFilters = {
  latitude?: number;
  longitude?: number;
  radius?: number;
  bounds?: EventBounds;
  limit?: number;
  offset?: number;
  creatorId?: number;
  participantId?: number;
  withoutLocation?: boolean;
};

export type User = {
  id: number;
  name: string;
  email: string;
};

export type PublicUser = Pick<User, "id" | "name">;

export type CreateUserPayload = {
  name: string;
  email: string;
  password: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type AuthResponse = {
  token: string;
  user: User;
};

export type EventParticipant = {
  event_id: number;
  participant_id: number;
  name: string;
};

export type CreateParticipantPayload = {
  event_id: number;
};

export type PatchUserPayload = {
  name?: string;
  password?: string;
};
