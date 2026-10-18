import { describe, expect, it } from "vitest";
import { deriveTransactionValueScore } from "@/shared/transaction-valuation";

describe("deriveTransactionValueScore", () => {
  it("keeps 0-150 model value_score values on their own scale", () => {
    expect(
      deriveTransactionValueScore({
        value_score: 80,
        feedback_value_score: null,
        satisfaction_rating: null,
        impulse_score: null,
        regret_score: null,
      }),
    ).toBe(80);
  });

  it("uses personal_value_score when present on bank transactions", () => {
    expect(
      deriveTransactionValueScore({
        personal_value_score: 60,
        value_score: null,
        feedback_value_score: null,
        satisfaction_rating: null,
        impulse_score: null,
        regret_score: null,
      }),
    ).toBe(60);
  });

  it("estimates from ratings so mediocre purchases are not 'high value'", () => {
    const fromRatings = (satisfaction_rating: number | null, impulse_score = 0, regret_score = 0) =>
      deriveTransactionValueScore({
        value_score: null,
        feedback_value_score: null,
        satisfaction_rating,
        impulse_score,
        regret_score,
      });

    expect(fromRatings(10)).toBe(150);
    expect(fromRatings(7)).toBe(110); // just above the ~100 "match" line
    expect(fromRatings(6)).toBe(96); // on target
    expect(fromRatings(5)).toBe(83); // low value
    expect(fromRatings(7, 0.4, 0.4)).toBe(86); // impulse + regret pull it down
    expect(fromRatings(null, 0, 0)).toBeNull();
    expect(fromRatings(null, 0, 0.2)).toBe(89); // neutral baseline minus regret
  });

  it("keeps fractional legacy scores on the 0-150 scale", () => {
    expect(
      deriveTransactionValueScore({
        value_score: null,
        feedback_value_score: 0.82,
        satisfaction_rating: null,
        impulse_score: null,
        regret_score: null,
      }),
    ).toBe(123);
  });
});
