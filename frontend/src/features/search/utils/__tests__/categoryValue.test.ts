import { describe, expect, it } from "vitest";

import { rankCategoriesByValue } from "../categoryValue";

function tx(category: string, value_score: number | null, direction = "spend") {
  return {
    category,
    direction,
    value_score,
    personal_value_score: null,
    feedback_value_score: null,
    satisfaction_rating: null,
    impulse_score: null,
    regret_score: null,
  };
}

describe("rankCategoriesByValue", () => {
  it("ranks categories by average score, best first", () => {
    const ranked = rankCategoriesByValue([
      tx("shopping", 80), tx("shopping", 90), tx("shopping", 70),
      tx("health", 130), tx("health", 120), tx("health", 125),
    ]);

    expect(ranked.map((c) => [c.label, c.averageScore, c.ratedCount])).toEqual([
      ["Health", 125, 3],
      ["Shopping", 80, 3],
    ]);
  });

  it("skips thinly rated categories, unscored purchases and income", () => {
    const ranked = rankCategoriesByValue([
      tx("education", 140), tx("education", 140), // only 2 rated
      tx("groceries", 100), tx("groceries", 100), tx("groceries", null), tx("groceries", 100),
      tx("other", 150, "income"), tx("other", 150, "income"), tx("other", 150, "income"),
    ]);

    expect(ranked.map((c) => c.category)).toEqual(["groceries"]);
  });
});
