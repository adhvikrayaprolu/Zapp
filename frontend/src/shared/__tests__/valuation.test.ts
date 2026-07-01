import { describe, expect, it } from "vitest";
import { getValueMeterWidth, getValuePresentation, normalizeModelValueScore } from "@/shared/valuation";

describe("value presentation", () => {
  it("caps the primary score display at 100 and exposes overflow separately", () => {
    const value = getValuePresentation(140);

    expect(value.score).toBe(100);
    expect(value.scoreText).toBe("100");
    expect(value.displayScore).toBe(140);
    expect(value.overflow).toBe(40);
    expect(value.overflowText).toBe("+40");
    expect(value.label).toBe("High Value");
  });

  it("maps meter width to the 0–150 scale", () => {
    expect(getValueMeterWidth(150)).toBe(100);
    expect(getValueMeterWidth(75)).toBe(50);
    expect(getValueMeterWidth(140)).toBeCloseTo((140 / 150) * 100, 10);
  });

  it("scales model scores by 1.5 and rounds to the 0-150 display scale", () => {
    expect(normalizeModelValueScore(80)).toBe(120);
    expect(normalizeModelValueScore(0.82)).toBe(123);
    expect(normalizeModelValueScore(120)).toBe(150);
  });
});
