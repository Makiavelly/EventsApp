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

export type ParticipantUser = User;

export type EventParticipants = {
  event_id: number;
  users: ParticipantUser[];
};

export type CreateParticipantPayload = {
  event_id: number;
};
