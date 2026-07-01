import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSecureBankConnect } from "../hooks/useSecureBankConnect";

const authMocks = vi.hoisted(() => ({
  refreshMfa: vi.fn(),
  verifyMfaChallenge: vi.fn().mockResolvedValue(undefined),
}));

const plaidMocks = vi.hoisted(() => ({
  startConnect: vi.fn(),
}));

const complianceMocks = vi.hoisted(() => ({
  fetchConsentStatus: vi.fn(),
  recordFinancialDataConsent: vi.fn(),
}));

vi.mock("@/features/auth", () => ({
  useAuth: () => ({
    verifyMfaChallenge: authMocks.verifyMfaChallenge,
    refreshMfa: authMocks.refreshMfa,
  }),
}));

vi.mock("../hooks/usePlaidConnect", () => ({
  usePlaidConnect: () => ({
    startConnect: plaidMocks.startConnect,
    isPreparingLink: false,
    isExchanging: false,
    linkError: null,
  }),
}));

vi.mock("@/api/compliance.api", () => ({
  fetchConsentStatus: complianceMocks.fetchConsentStatus,
  recordFinancialDataConsent: complianceMocks.recordFinancialDataConsent,
}));

vi.mock("@/config/privacy", () => ({
  usePrivacyPolicyMeta: () => ({
    version: "1.0.0",
    effectiveDate: "2026-01-01",
    supportEmail: "support@example.com",
    privacyEmail: "privacy@example.com",
    url: "/privacy",
  }),
  getFinancialConsentDisclosure: () => ({
    intro: "intro",
    policyReference: "policy",
    checkboxLabel: "checkbox",
    auditText: "consent-audit-text",
  }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const snap = { factors: [] as { id: string; status: string }[], currentLevel: null as const, nextLevel: null as const };

describe("useSecureBankConnect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.refreshMfa.mockResolvedValue({
      gate: { can: true, reason: null },
      mfaSnapshot: snap,
    });
    complianceMocks.fetchConsentStatus.mockResolvedValue({
      has_valid_financial_consent: false,
      required_policy_version: "1.0.0",
    });
    complianceMocks.recordFinancialDataConsent.mockResolvedValue(undefined);
  });

  it("does not call Plaid when auth assurance denies banking on initial refresh", async () => {
    authMocks.refreshMfa.mockResolvedValueOnce({
      gate: { can: false, reason: "mfa_not_enrolled" },
      mfaSnapshot: snap,
    });
    const { result } = renderHook(() => useSecureBankConnect());
    await act(async () => {
      await result.current.requestConnect();
    });
    expect(plaidMocks.startConnect).not.toHaveBeenCalled();
    expect(authMocks.refreshMfa).toHaveBeenCalledTimes(1);
  });

  it("with existing consent, runs a fresh MFA re-check and blocks Plaid when gate turns false", async () => {
    authMocks.refreshMfa
      .mockResolvedValueOnce({
        gate: { can: true, reason: null },
        mfaSnapshot: snap,
      })
      .mockResolvedValueOnce({
        gate: { can: false, reason: "mfa_required" },
        mfaSnapshot: snap,
      });
    complianceMocks.fetchConsentStatus.mockResolvedValue({
      has_valid_financial_consent: true,
      required_policy_version: "1.0.0",
    });
    const { result } = renderHook(() => useSecureBankConnect());
    await act(async () => {
      await result.current.requestConnect();
    });
    expect(authMocks.refreshMfa).toHaveBeenCalledTimes(2);
    expect(plaidMocks.startConnect).not.toHaveBeenCalled();
  });

  it("with existing consent and passing re-check, reaches Plaid preparation (startConnect)", async () => {
    complianceMocks.fetchConsentStatus.mockResolvedValue({
      has_valid_financial_consent: true,
      required_policy_version: "1.0.0",
    });
    const { result } = renderHook(() => useSecureBankConnect());
    await act(async () => {
      await result.current.requestConnect();
    });
    expect(authMocks.refreshMfa).toHaveBeenCalledTimes(2);
    expect(plaidMocks.startConnect).toHaveBeenCalledTimes(1);
  });

  it("after successful consent POST, re-checks MFA and does not open Plaid when denied", async () => {
    authMocks.refreshMfa.mockResolvedValue({
      gate: { can: false, reason: "auth_assurance_unavailable" },
      mfaSnapshot: snap,
    });
    const { result } = renderHook(() => useSecureBankConnect());
    await act(async () => {
      await result.current.onConsentConfirm();
    });
    expect(complianceMocks.recordFinancialDataConsent).toHaveBeenCalledWith("consent-audit-text");
    expect(plaidMocks.startConnect).not.toHaveBeenCalled();
    expect(authMocks.refreshMfa).toHaveBeenCalled();
  });

  it("after successful consent POST and passing re-check, opens Plaid preparation", async () => {
    const { result } = renderHook(() => useSecureBankConnect());
    await act(async () => {
      await result.current.onConsentConfirm();
    });
    expect(complianceMocks.recordFinancialDataConsent).toHaveBeenCalled();
    expect(plaidMocks.startConnect).toHaveBeenCalledTimes(1);
  });
});
