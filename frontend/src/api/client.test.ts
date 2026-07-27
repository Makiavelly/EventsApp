import { afterEach, describe, expect, it, vi } from "vitest";
import { api, setAccessToken } from "./client";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  setAccessToken(null);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("authentication request coordination", () => {
  it("coalesces simultaneous 401 refreshes in one tab", async () => {
    let refreshCalls = 0;
    const fetchMock = vi.fn(async (
      input: string | URL | Request,
      init?: RequestInit,
    ) => {
      const url = String(input);
      const headers = new Headers(init?.headers);

      if (url.endsWith("/auth/login")) {
        return jsonResponse({
          token: "old-access",
          user: { id: 1, name: "Alex", email: "alex@gmail.com" },
        });
      }
      if (url.endsWith("/auth/refresh")) {
        refreshCalls += 1;
        await Promise.resolve();
        return jsonResponse({
          token: "new-access",
          user: { id: 1, name: "Alex", email: "alex@gmail.com" },
        });
      }
      if (url.includes("/events/")) {
        if (headers.get("Authorization") === "Bearer old-access") {
          return jsonResponse(
            { error: "Unauthorized", message: "authentication required" },
            401,
          );
        }
        return jsonResponse({
          id: Number(url.split("/").slice(-1)[0]),
          creator_user_id: 1,
          title: "Event",
          marker_size: "normal",
          auto_delete_policy: "never",
        });
      }
      throw new Error(`unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    await api.login({ email: "alex@gmail.com", password: "secret12" });

    const [first, second] = await Promise.all([
      api.getEvent(1),
      api.getEvent(2),
    ]);

    expect(first.id).toBe(1);
    expect(second.id).toBe(2);
    expect(refreshCalls).toBe(1);
  });

  it("clears the in-memory access token even when logout has a network error", async () => {
    let eventAuthorization: string | null = "not-requested";
    const fetchMock = vi.fn(async (
      input: string | URL | Request,
      init?: RequestInit,
    ) => {
      const url = String(input);
      if (url.endsWith("/auth/login")) {
        return jsonResponse({
          token: "access-token",
          user: { id: 1, name: "Alex", email: "alex@gmail.com" },
        });
      }
      if (url.endsWith("/auth/logout")) {
        throw new TypeError("network unavailable");
      }
      if (url.endsWith("/events/1")) {
        eventAuthorization = new Headers(init?.headers).get(
          "Authorization",
        );
        return jsonResponse({
          id: 1,
          creator_user_id: 1,
          title: "Event",
          marker_size: "normal",
          auto_delete_policy: "never",
        });
      }
      throw new Error(`unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    await api.login({ email: "alex@gmail.com", password: "secret12" });

    await expect(api.logout()).rejects.toThrow("network unavailable");
    await api.getEvent(1);

    expect(eventAuthorization).toBeNull();
  });
});
