import { describe, expect, it } from "vitest";
import { ApiError } from "../api/client";
import { errorMessage, formatDateTime, formatLocation, toOptionalNumber } from "./format";

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
});
