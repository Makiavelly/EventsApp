import { describe, expect, it } from "vitest";
import { ApiError } from "../api/client";
import { distanceMeters, errorMessage, formatAutoDelete, formatDateTime, formatLocation, toOptionalNumber } from "./format";

describe("format helpers", () => {
  it("formats absent and present locations", () => {
    expect(formatLocation()).toBe("Локация не указана");
    expect(formatLocation({ latitude: 55.751244, longitude: 37.618423 })).toBe("55.75124, 37.61842");
  });

  it("keeps an invalid date visible", () => {
    expect(formatDateTime("not-a-date")).toBe("not-a-date");
    expect(formatDateTime(null)).toBe("Дата не указана");
  });

  it("extracts useful API error details", () => {
    expect(errorMessage(new ApiError(400, "Bad Request", "invalid title"))).toBe("Bad Request: invalid title");
  });

  it("parses only finite optional numbers", () => {
    expect(toOptionalNumber("  ")).toBeUndefined();
    expect(toOptionalNumber("12.5")).toBe(12.5);
    expect(toOptionalNumber("invalid")).toBeUndefined();
  });

  it("calculates distance and formats lifecycle policy", () => {
    expect(distanceMeters({ latitude: 55.75, longitude: 37.61 }, { latitude: 55.75, longitude: 37.61 })).toBe(0);
    expect(formatAutoDelete("after_interval", 7200)).toBe("Удалить через 2 ч после начала");
    expect(formatAutoDelete("never")).toBe("Не удалять автоматически");
  });
});
