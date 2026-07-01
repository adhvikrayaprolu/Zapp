import type { BankLinkGateReason } from "@/features/auth/context/AuthContext";

/** User-facing copy for bank-link gates (auth-assurance + client). */
export function bankLinkGateMessage(reason: BankLinkGateReason): string {
  switch (reason) {
    case "api_misconfigured":
      return "This app is not configured for a secure API connection. Check with your administrator.";
    case "mfa_loading":
      return "Checking security settings…";
    case "auth_assurance_unavailable":
      return "We could not verify your security settings. Please try again in a moment.";
    case "mfa_not_enrolled":
      return "Add two-factor authentication in Profile before connecting a bank.";
    case "mfa_verification_needed":
      return "Enter your authenticator code to continue (verification required for bank linking).";
    case "mfa_required":
      return "Additional multi-factor verification is required before connecting a bank.";
    default:
      return "Bank connection is not available right now.";
  }
}
