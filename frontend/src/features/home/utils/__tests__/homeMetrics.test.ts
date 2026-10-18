import { describe, expect, it } from "vitest";

import { CHART_DAYS, computeHomeMetrics } from "../homeMetrics";

const NOW = new Date(2026, 9, 18, 15, 0, 0); // Oct 18 2026, local time

function tx(
  occurred_at: string,
  amount: string,
  value_score: number | null = null,
  direction = "spend",
) {
  return {
    occurred_at,
    amount,
    direction,
    value_score,
    personal_value_score: null,
    feedback_value_score: null,
    satisfaction_rating: null,
    impulse_score: null,
    regret_score: null,
  };
}

describe("computeHomeMetrics", () => {
  it("sums only this month's spend and compares to the same days last month", () => {
    const metrics = computeHomeMetrics(
      [
        tx("2026-10-02", "100.00", 120),
        tx("2026-10-17", "50.00", 95),
        tx("2026-10-10", "500.00", null, "income"),
        tx("2026-09-05", "120.00"),
        tx("2026-09-25", "999.00"), // after Sep 18: excluded from month-to-date comparison
      ],
      NOW,
    );

    expect(metrics.monthSpend).toBe(150);
    expect(metrics.purchaseCount).toBe(2);
    expect(metrics.spendChangePct).toBe(25); // 150 vs 120
  });

  it("averages value scores and buckets them by tier", () => {
    const metrics = computeHomeMetrics(
      [
        tx("2026-10-01", "10.00", 130), // high value
        tx("2026-10-02", "10.00", 95), // on target
        tx("2026-10-03", "10.00", 70), // below target
        tx("2026-10-04", "10.00", null), // unscored
      ],
      NOW,
    );

    expect(metrics.averageScore).toBe(98);
    expect(metrics.scoredCount).toBe(3);
    expect(metrics.highValueCount).toBe(1);
    expect(metrics.onTargetCount).toBe(1);
    expect(metrics.belowTargetCount).toBe(1);
  });

  it("builds a daily spend series for the last two weeks", () => {
    const metrics = computeHomeMetrics([tx("2026-10-18", "12.50"), tx("2026-10-18", "7.50")], NOW);

    expect(metrics.dailySpend).toHaveLength(CHART_DAYS);
    expect(metrics.dailySpend[0].day).toBe("2026-10-05");
    expect(metrics.dailySpend.at(-1)).toEqual({ day: "2026-10-18", spend: 20 });
  });

  it("returns empty-state values when there is no data", () => {
    const metrics = computeHomeMetrics([], NOW);

    expect(metrics.monthSpend).toBe(0);
    expect(metrics.spendChangePct).toBeNull();
    expect(metrics.averageScore).toBeNull();
  });
});
