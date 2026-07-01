import { describe, expect, it } from "vitest";
import {
  formatDateLabel,
  getLocalDateKey,
  isDateOnlyString,
  parseDateOnlyAsLocal,
} from "@/shared/date";

describe("date helpers", () => {
  it("treats YYYY-MM-DD strings as local dates instead of UTC-midnight dates", () => {
    expect(isDateOnlyString("2026-03-03")).toBe(true);
    expect(getLocalDateKey("2026-03-03")).toBe("2026-03-03");
    expect(formatDateLabel("2026-03-03", { month: "short", day: "numeric", year: "numeric" })).toBe(
      "Mar 3, 2026"
    );
  });

  it("creates a stable local-noon date for date-only parsing", () => {
    const parsed = parseDateOnlyAsLocal("2026-03-03");
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(2);
    expect(parsed.getDate()).toBe(3);
    expect(parsed.getHours()).toBe(12);
  });
});
