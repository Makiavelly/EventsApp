import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import type { EventParticipant, PublicUser, User } from "./types";
import { queryKeys, syncUserCaches } from "./queries";

describe("profile cache synchronization", () => {
  it("updates identity projections immediately and refetches invalidated data", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    const updatedUser: User = {
      id: 3,
      name: "Новое имя",
      email: "user@gmail.com",
    };
    queryClient.setQueryData<PublicUser>(
      queryKeys.user(updatedUser.id),
      { id: updatedUser.id, name: "Старое имя" },
    );
    queryClient.setQueryData<EventParticipant[]>(
      queryKeys.participants(10),
      [
        { event_id: 10, participant_id: 3, name: "Старое имя" },
        { event_id: 10, participant_id: 4, name: "Другой участник" },
      ],
    );

    syncUserCaches(queryClient, updatedUser);

    expect(
      queryClient.getQueryData(queryKeys.user(updatedUser.id)),
    ).toEqual({ id: 3, name: "Новое имя" });
    expect(
      queryClient.getQueryData<EventParticipant[]>(
        queryKeys.participants(10),
      ),
    ).toEqual([
      { event_id: 10, participant_id: 3, name: "Новое имя" },
      { event_id: 10, participant_id: 4, name: "Другой участник" },
    ]);
    expect(
      queryClient.getQueryState(queryKeys.user(updatedUser.id))
        ?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(queryKeys.participants(10))
        ?.isInvalidated,
    ).toBe(true);

    let backendRequests = 0;
    const refetched = await queryClient.fetchQuery({
      queryKey: queryKeys.user(updatedUser.id),
      queryFn: async () => {
        backendRequests += 1;
        return { id: 3, name: "Новое имя" };
      },
    });
    expect(backendRequests).toBe(1);
    expect(refetched.name).toBe("Новое имя");
  });
});
