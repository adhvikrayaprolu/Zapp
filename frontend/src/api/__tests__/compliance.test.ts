import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  recordFinancialDataConsent,
  fetchAuthAssurance,
  fetchConsentStatus,
  fetchPrivacyPolicyMetadata,
} from "../compliance.api";
import { apiRequest } from "../client";

vi.mock("../client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../client")>();
  return {
    ...actual,
    apiRequest: vi.fn(),
  };
});

describe("compliance.api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetchAuthAssurance calls auth-assurance endpoint", async () => {
    const body = {
      mfa_required_by_policy: false,
      consent_required_by_policy: true,
      financial_consent_valid: true,
      assurance: { aal: "aal2" as string | null, amr: ["mfa"], mfa_factors_count: 1 },
      aal_normalized: "aal2" as string | null,
      banking_allowed: true,
      blocking_code: null,
    };
    vi.mocked(apiRequest).mockResolvedValueOnce(body);
    const r = await fetchAuthAssurance();
    expect(r).toEqual(body);
    expect(apiRequest).toHaveBeenCalledWith("/api/security/auth-assurance/", { requireAuth: true });
  });

  it("fetchConsentStatus calls consent status endpoint", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({
      has_valid_financial_consent: false,
      required_policy_version: "2.1.0",
    });
    const r = await fetchConsentStatus();
    expect(r.has_valid_financial_consent).toBe(false);
    expect(r.required_policy_version).toBe("2.1.0");
    expect(apiRequest).toHaveBeenCalledWith("/api/compliance/consent/status/", { requireAuth: true });
  });

  it("fetchPrivacyPolicyMetadata calls privacy-policy endpoint", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({
      privacy_policy_url: "/privacy",
      privacy_policy_version: "2.1.0",
      privacy_policy_effective_date: "2026-04-01",
    });
    const r = await fetchPrivacyPolicyMetadata();
    expect(r.privacy_policy_version).toBe("2.1.0");
    expect(apiRequest).toHaveBeenCalledWith("/api/compliance/privacy-policy/");
  });

  it("recordFinancialDataConsent sends consent_text and source", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({});
    await recordFinancialDataConsent("I agree to the current policy.");
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/compliance/consent/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          consent_text: "I agree to the current policy.",
          source: "web",
        }),
        requireAuth: true,
      })
    );
  });

  it("recordFinancialDataConsent propagates errors (no silent 404)", async () => {
    const { ApiError } = await import("../client");
    vi.mocked(apiRequest).mockRejectedValueOnce(new ApiError("Not found", 404));
    await expect(recordFinancialDataConsent("consent text")).rejects.toBeTruthy();
  });
});
