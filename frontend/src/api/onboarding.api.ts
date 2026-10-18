import { apiRequest } from "./client";

export type OnboardingData = {
  life_stage: string;
  household_size: number | null;
  location_zip: string;
  income_range: string;
  monthly_fixed_expenses: number | null;
  financial_goal: string;
  risk_tolerance: string;
  budget_style: string;
  value_priority_cost: number;
  value_priority_quality: number;
  value_priority_sustainability: number;
  self_report_research_habit: number | null;
};

export const OnboardingAPI = {
  checkComplete: async (): Promise<boolean> => {
    const data = await apiRequest<any[]>("/api/raw-explicit/", { requireAuth: true });
    return data.length > 0;
  },
  /** "Skip for now": save an empty profile (no assumed answers) so onboarding is marked done. */
  skip: () =>
    apiRequest("/api/raw-explicit/", {
      requireAuth: true,
      method: "POST",
      body: JSON.stringify({}),
      audit: {
        eventName: "account.onboarding_skip",
        action: "create",
        resourceType: "raw_explicit_profile",
      },
    }),
  submit: (payload: OnboardingData) =>
    apiRequest("/api/raw-explicit/", {
      requireAuth: true,
      method: "POST",
      body: JSON.stringify(payload),
      audit: {
        eventName: "account.onboarding_submit",
        action: "create",
        resourceType: "raw_explicit_profile",
      },
    }),
};
