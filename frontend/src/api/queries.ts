import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type {
  CreateEventPayload,
  CreateParticipantPayload,
  EventsFilters,
  ParticipantStatus,
  PatchEventPayload,
} from "./types";

export const queryKeys = {
  events: (filters: EventsFilters) => ["events", filters] as const,
  event: (id: number) => ["event", id] as const,
  participants: (eventId?: number) => ["participants", eventId] as const,
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

export function useUpdateEvent(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PatchEventPayload) => api.patchEvent(id, payload),
    onSuccess: (event) => {
      queryClient.setQueryData(queryKeys.event(id), event);
      void queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.deleteEvent(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.event(id) });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useParticipants(eventId?: number) {
  return useQuery({
    queryKey: queryKeys.participants(eventId),
    queryFn: () => api.getParticipants(eventId),
    enabled: eventId !== undefined && Number.isFinite(eventId) && eventId > 0,
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

export function useUpdateParticipation(eventId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status: ParticipantStatus) => api.patchParticipant(eventId, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.participants(eventId) });
    },
  });
}

export function useLeaveEvent(eventId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.deleteParticipant(eventId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.participants(eventId) });
    },
  });
}
