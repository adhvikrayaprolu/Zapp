import { describe, expect, it } from "vitest";
import { deriveTransactionValueScore } from "@/shared/transaction-valuation";

describe("deriveTransactionValueScore", () => {
  it("scales model value_score values by 1.5 and rounds", () => {
    expect(
      deriveTransactionValueScore({
        value_score: 80,
        feedback_value_score: null,
        satisfaction_rating: null,
        impulse_score: null,
        regret_score: null,
      }),
    ).toBe(120);
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
    ).toBe(90);
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
