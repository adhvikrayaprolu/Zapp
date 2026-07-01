import { apiRequest } from "./client";

/** GET /api/security/auth-assurance/ */
export type AuthAssuranceResponse = {
  mfa_required_by_policy: boolean;
  consent_required_by_policy: boolean;
  financial_consent_valid: boolean;
  assurance: {
    aal: string | null;
    amr: string[];
    mfa_factors_count: number;
  };
  aal_normalized: string | null;
  banking_allowed: boolean;
  blocking_code: string | null;
};

/** GET /api/compliance/consent/status/ */
export type ConsentStatusResponse = {
  has_valid_financial_consent: boolean;
  required_policy_version: string;
};

/** GET /api/compliance/privacy-policy/ */
export type PrivacyPolicyMetadataResponse = {
  privacy_policy_url: string;
  privacy_policy_version: string;
  privacy_policy_effective_date: string;
};

/** POST /api/compliance/consent/ */
export type FinancialDataConsentPayload = {
  consent_text: string;
  source: "web";
};

export async function fetchAuthAssurance(): Promise<AuthAssuranceResponse> {
  return apiRequest<AuthAssuranceResponse>("/api/security/auth-assurance/", { requireAuth: true });
}

export async function fetchConsentStatus(): Promise<ConsentStatusResponse> {
  return apiRequest<ConsentStatusResponse>("/api/compliance/consent/status/", { requireAuth: true });
}

export async function fetchPrivacyPolicyMetadata(): Promise<PrivacyPolicyMetadataResponse> {
  return apiRequest<PrivacyPolicyMetadataResponse>("/api/compliance/privacy-policy/");
}

/**
 * Records affirmative consent before Plaid link-token creation.
 * Failures must surface to the caller (no silent success).
 */
export async function recordFinancialDataConsent(consentText: string): Promise<void> {
  const payload: FinancialDataConsentPayload = {
    consent_text: consentText,
    source: "web",
  };
  await apiRequest<unknown>("/api/compliance/consent/", {
    requireAuth: true,
    method: "POST",
    body: JSON.stringify(payload),
  });
}
