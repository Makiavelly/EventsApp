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
  creator_user_id: number;
  title: string;
  description?: string;
  location?: Location;
  date_meeting?: string;
};

export type EventsFilters = {
  latitude?: number;
  longitude?: number;
  radius?: number;
  limit?: number;
  offset?: number;
};

export type User = {
  id: number;
  name: string;
  email: string;
  password?: string;
};

export type CreateUserPayload = {
  name: string;
  email: string;
  password: string;
};

export type ParticipantUser = User;

export type EventParticipants = {
  event_id: number;
  users: ParticipantUser[];
};

export type CreateParticipantPayload = {
  event_id: number;
  participant_id: number;
};
