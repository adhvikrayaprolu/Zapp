import { apiRequest } from "./client";

/** User-provided explicit profile data (onboarding). */
export type RawExplicit = {
  id: number;
  life_stage: string;
  household_size: number | null;
  location_zip: string;
  income_range: string;
  /** Set when the user enters an exact amount; otherwise use `income_range` buckets. */
  monthly_income?: string | number | null;
  monthly_fixed_expenses: number | null;
  financial_goal: string;
  risk_tolerance: string;
  budget_style: string;
  value_priority_cost: number;
  value_priority_quality: number;
  value_priority_sustainability: number;
  self_report_research_habit: number | null;
};

export type RawExplicitCreate = Omit<RawExplicit, "id">;

/** Inferred user data (read-only). */
export type RawInferred = Record<string, unknown> & { id: number };

/** Computed insights (read-only). */
export type Computed = Record<string, unknown> & { id: number };

/** User preference with typed value. */
export type Preference = {
  id: number;
  key: string;
  value: string | number | boolean | object;
  value_type: "bool" | "int" | "float" | "string" | "json";
};

export type PreferenceCreate = {
  key: string;
  value: string | number | boolean | object;
  value_type: Preference["value_type"];
};

const auth = { requireAuth: true as const };

export const RawExplicitAPI = {
  list: () => apiRequest<RawExplicit[]>("/api/raw-explicit/", auth),
  get: (id: number) => apiRequest<RawExplicit>(`/api/raw-explicit/${id}/`, auth),
  create: (data: RawExplicitCreate) =>
    apiRequest<RawExplicit>("/api/raw-explicit/", {
      ...auth,
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<RawExplicitCreate>) =>
    apiRequest<RawExplicit>(`/api/raw-explicit/${id}/`, {
      ...auth,
      method: "PUT",
      body: JSON.stringify(data),
    }),
  patch: (id: number, data: Partial<RawExplicitCreate>) =>
    apiRequest<RawExplicit>(`/api/raw-explicit/${id}/`, {
      ...auth,
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  remove: (id: number) =>
    apiRequest<null>(`/api/raw-explicit/${id}/`, { ...auth, method: "DELETE" }),
};

export const RawInferredAPI = {
  list: () => apiRequest<RawInferred[]>("/api/raw-inferred/", auth),
  get: (id: number) => apiRequest<RawInferred>(`/api/raw-inferred/${id}/`, auth),
};

export const ComputedAPI = {
  list: () => apiRequest<Computed[]>("/api/computed/", auth),
  get: (id: number) => apiRequest<Computed>(`/api/computed/${id}/`, auth),
};

export const PreferencesAPI = {
  list: () => apiRequest<Preference[]>("/api/preferences/", auth),
  get: (id: number) => apiRequest<Preference>(`/api/preferences/${id}/`, auth),
  create: (data: PreferenceCreate) =>
    apiRequest<Preference>("/api/preferences/", {
      ...auth,
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<PreferenceCreate>) =>
    apiRequest<Preference>(`/api/preferences/${id}/`, {
      ...auth,
      method: "PUT",
      body: JSON.stringify(data),
    }),
  patch: (id: number, data: Partial<PreferenceCreate>) =>
    apiRequest<Preference>(`/api/preferences/${id}/`, {
      ...auth,
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  remove: (id: number) =>
    apiRequest<null>(`/api/preferences/${id}/`, { ...auth, method: "DELETE" }),
};
