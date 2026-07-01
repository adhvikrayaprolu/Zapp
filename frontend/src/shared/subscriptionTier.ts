/** Shown when the API has no subscription / plan tier yet. */
export const DEFAULT_PLAN_LABEL = "Premium";

export function displayPlanLabel(tier: string | undefined): string {
  const t = tier?.trim();
  return t || DEFAULT_PLAN_LABEL;
}
