import { ApiError } from "@/api/client";

/** Maps backend security responses for banking / consent flows. */
export function messageForSecurityFlowError(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    if (e.status === 403) {
      return "Additional verification is required before connecting your bank.";
    }
    if (e.status === 428) {
      return "You must accept the privacy policy before connecting your bank.";
    }
  }
  return e instanceof Error ? e.message : fallback;
}
