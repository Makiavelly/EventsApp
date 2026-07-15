export type Location = {
  latitude: number;
  longitude: number;
};

export type ApiErrorBody = {
  message?: string;
  error?: string;
};

export type Event = {
  id: number;
  creator_user_id: number;
  title: string;
  description?: string | null;
  location?: Location | null;
  date_meeting?: string | null;
};

export type CreateEventPayload = {
  title: string;
  description?: string;
  location?: Location;
  date_meeting?: string;
};

export type PatchEventPayload = {
  title?: string;
  description?: string | null;
  location?: Location | null;
  date_meeting?: string | null;
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

export type ParticipantStatus = "planned" | "underway" | "over";

export type EventParticipant = {
  event_id: number;
  participant_id: number;
  name: string;
  status: ParticipantStatus;
};

export type CreateParticipantPayload = {
  event_id: number;
};

export type PatchUserPayload = {
  name?: string;
  password?: string;
};
