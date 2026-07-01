import { COLORS } from "./theme";

export type ValueTier = "poor" | "below_optimal" | "decent" | "high_value" | "unknown";

export type ValuePresentation = {
  score: number | null;
  scoreText: string;
  displayScore: number | null;
  displayScoreText: string;
  overflow: number;
  overflowText: string | null;
  tier: ValueTier;
  label: string;
  tone: string;
  accentColor: string;
  trackColor: string;
};

const MIN_SCORE = 0;
const BASE_SCORE_MAX = 100;
const OVERFLOW_SCORE_MAX = 150;

function clampScore(score: number) {
  return Math.min(OVERFLOW_SCORE_MAX, Math.max(MIN_SCORE, Math.round(score)));
}

/**
 * Normalize model-backed value scores into the app's 0-150 display scale.
 * Fractional legacy scores are treated as 0-1 and scaled up before rounding.
 */
export function normalizeModelValueScore(score: number | null | undefined) {
  if (score == null || Number.isNaN(score)) return null;
  const scaled = score <= 1 ? score * OVERFLOW_SCORE_MAX : score * 1.5;
  return clampScore(scaled);
}

export function getValuePresentation(score: number | null | undefined): ValuePresentation {
  if (score == null || Number.isNaN(score)) {
    return {
      score: null,
      scoreText: "—",
      displayScore: null,
      displayScoreText: "—",
      overflow: 0,
      overflowText: null,
      tier: "unknown",
      label: "No score yet",
      tone: "Waiting for more usage data.",
      accentColor: "var(--app-color-text-tertiary)",
      trackColor: "color-mix(in srgb, var(--app-color-text-tertiary) 20%, transparent)",
    };
  }

  const normalized = clampScore(score);
  const baseScore = Math.min(BASE_SCORE_MAX, normalized);
  const overflow = Math.max(0, normalized - BASE_SCORE_MAX);
  const overflowText = overflow > 0 ? `+${overflow}` : null;

  if (overflow > 0) {
    return {
      score: baseScore,
      scoreText: String(baseScore),
      displayScore: normalized,
      displayScoreText: String(normalized),
      overflow,
      overflowText,
      tier: "high_value",
      label: "High Value",
      tone: "Exceeded your target range in a strong way.",
      accentColor: COLORS.electricGreen,
      trackColor: `${COLORS.electricGreen}22`,
    };
  }

  if (normalized >= 90) {
    return {
      score: baseScore,
      scoreText: String(normalized),
      displayScore: normalized,
      displayScoreText: String(normalized),
      overflow,
      overflowText,
      tier: "decent",
      label: "On Target",
      tone: "Landing right in your expected value range.",
      accentColor: COLORS.electricCyan,
      trackColor: `${COLORS.electricCyan}22`,
    };
  }

  if (normalized >= 60) {
    return {
      score: baseScore,
      scoreText: String(normalized),
      displayScore: normalized,
      displayScoreText: String(normalized),
      overflow,
      overflowText,
      tier: "below_optimal",
      label: "Low Value",
      tone: "Some value is there, but the payoff is uneven.",
      accentColor: COLORS.electricYellow,
      trackColor: `${COLORS.electricYellow}22`,
    };
  }

  return {
    score: baseScore,
    scoreText: String(normalized),
    displayScore: normalized,
    displayScoreText: String(normalized),
    overflow,
    overflowText,
    tier: "poor",
    label: "Bad Value",
    tone: "Underperforming for what you paid.",
    accentColor: COLORS.electricRed,
    trackColor: `${COLORS.electricRed}22`,
  };
}

/** Width percentage for a 0–150 value meter (same scale as {@link ValueScoreMeter}). */
export function getValueMeterWidth(score: number | null | undefined) {
  if (score == null || Number.isNaN(score)) return 0;
  return (clampScore(score) / OVERFLOW_SCORE_MAX) * 100;
}
