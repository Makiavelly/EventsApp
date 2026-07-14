import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { CreateEventPayload, CreateParticipantPayload, EventsFilters } from "./types";

export const queryKeys = {
  events: (filters: EventsFilters) => ["events", filters] as const,
  event: (id: number) => ["event", id] as const,
  participants: (eventId?: number) => ["participants", eventId] as const,
  users: () => ["users"] as const,
  user: (id?: number) => ["user", id] as const,
};

export function useEvents(filters: EventsFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.events(filters),
    queryFn: ({ signal }) => api.getEvents(filters, signal),
    enabled,
    placeholderData: (previousData) => previousData,
  });
}

export function useEvent(id: number) {
  return useQuery({
    queryKey: queryKeys.event(id),
    queryFn: () => api.getEvent(id),
    enabled: Number.isFinite(id),
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateEventPayload) => api.createEvent(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useParticipants(eventId?: number) {
  return useQuery({
    queryKey: queryKeys.participants(eventId),
    queryFn: () => api.getParticipants(eventId),
    enabled: eventId !== undefined,
  });
}

export function useJoinEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateParticipantPayload) => api.createParticipant(payload),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.participants(variables.event_id) });
    },
  });
}

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users(),
    queryFn: () => api.getUsers(),
  });
}

export function useUser(id?: number) {
  return useQuery({
    queryKey: queryKeys.user(id),
    queryFn: () => api.getUser(id as number),
    enabled: id !== undefined && Number.isFinite(id),
  });
}
