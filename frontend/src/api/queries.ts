import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type {
  CreateEventPayload,
  CreateParticipantPayload,
  EventParticipant,
  EventsFilters,
  PatchEventPayload,
  PatchUserPayload,
  PublicUser,
  User,
} from "./types";

export const queryKeys = {
  events: (filters: EventsFilters) => ["events", filters] as const,
  event: (id: number) => ["event", id] as const,
  participants: (eventId?: number) => ["participants", eventId] as const,
  user: (id: number) => ["user", id] as const,
};

export function useEvents(filters: EventsFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.events(filters),
    queryFn: ({ signal }) => api.getEvents(filters, signal),
    enabled,
    placeholderData: (previousData) => previousData,
  });
}

export function usePublicUser(id: number) {
  return useQuery({
    queryKey: queryKeys.user(id),
    queryFn: () => api.getUser(id),
    enabled: Number.isFinite(id) && id > 0,
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
      void queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useLeaveEvent(eventId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.deleteParticipant(eventId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.participants(eventId) });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useUpdateProfile(
  userId: number,
  onIdentityUpdated: (user: User) => void,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PatchUserPayload) => api.patchUser(userId, payload),
    onSuccess: (updatedUser) => {
      onIdentityUpdated(updatedUser);
      syncUserCaches(queryClient, updatedUser);
    },
  });
}

export function syncUserCaches(
  queryClient: QueryClient,
  updatedUser: User,
) {
  const publicUser: PublicUser = {
    id: updatedUser.id,
    name: updatedUser.name,
  };
  queryClient.setQueryData(queryKeys.user(updatedUser.id), publicUser);
  queryClient.setQueriesData<EventParticipant[]>(
    { queryKey: ["participants"] },
    (participants) =>
      participants?.map((participant) =>
        participant.participant_id === updatedUser.id
          ? { ...participant, name: updatedUser.name }
          : participant,
      ),
  );

  void queryClient.invalidateQueries({
    queryKey: queryKeys.user(updatedUser.id),
  });
  void queryClient.invalidateQueries({
    queryKey: ["participants"],
  });
}
