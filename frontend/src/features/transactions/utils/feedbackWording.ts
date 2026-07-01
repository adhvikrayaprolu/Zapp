/**
 * Category-aware feedback wording for the transaction feedback modal.
 * Maps transaction category to context-appropriate labels. Backend field names
 * (satisfaction_rating, regret_rating, repurchase_likelihood, usage_frequency)
 * are unchanged — this is display-only.
 */

export type FeedbackWordingConfig = {
  /** Label for repurchase_likelihood (0–100) */
  repurchaseLabel: string;
  /** Whether to show usage_frequency field */
  showUsageFrequency: boolean;
  /** Label for usage_frequency when shown */
  usageFrequencyLabel?: string;
  /** Placeholder for usage_frequency input */
  usageFrequencyPlaceholder?: string;
};

const FALLBACK: FeedbackWordingConfig = {
  repurchaseLabel: "Would you buy or use this again?",
  showUsageFrequency: false,
};

/** Category slug → feedback wording. Uses app category values from TransactionsPage. */
const CATEGORY_WORDING: Record<string, FeedbackWordingConfig> = {
  eating_out: {
    repurchaseLabel: "How likely are you to go back?",
    showUsageFrequency: true,
    usageFrequencyLabel: "How often do you go there?",
    usageFrequencyPlaceholder: "e.g. 2",
  },
  groceries: {
    repurchaseLabel: "Would you shop there again?",
    showUsageFrequency: false,
  },
  transport: {
    repurchaseLabel: "Would you book with them again?",
    showUsageFrequency: false,
  },
  subscriptions: {
    repurchaseLabel: "Would you keep paying for this?",
    showUsageFrequency: true,
    usageFrequencyLabel: "How often do you use it?",
    usageFrequencyPlaceholder: "e.g. 7",
  },
  shopping: {
    repurchaseLabel: "Would you buy this again?",
    showUsageFrequency: false,
  },
  bills: {
    repurchaseLabel: "Would you use this provider again?",
    showUsageFrequency: false,
  },
  entertainment: {
    repurchaseLabel: "Would you go back?",
    showUsageFrequency: true,
    usageFrequencyLabel: "How often do you use it?",
    usageFrequencyPlaceholder: "e.g. 5",
  },
  health: {
    repurchaseLabel: "Would you go back?",
    showUsageFrequency: true,
    usageFrequencyLabel: "How often do you go?",
    usageFrequencyPlaceholder: "e.g. 3",
  },
  education: {
    repurchaseLabel: "How useful was it after buying?",
    showUsageFrequency: true,
    usageFrequencyLabel: "How often do you use it?",
    usageFrequencyPlaceholder: "e.g. 5",
  },
  other: FALLBACK,
};

/**
 * Returns context-aware feedback wording for a transaction category.
 * Falls back to generic labels for unknown categories.
 */
export function getFeedbackWording(category: string): FeedbackWordingConfig {
  const normalized = (category || "other").toLowerCase().trim();
  return CATEGORY_WORDING[normalized] ?? FALLBACK;
}
