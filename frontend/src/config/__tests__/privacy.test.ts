import { beforeEach, describe, expect, it, vi } from "vitest";

const privacyApiMocks = vi.hoisted(() => ({
  fetchPrivacyPolicyMetadata: vi.fn(),
}));

vi.mock("@/api/compliance.api", () => ({
  fetchPrivacyPolicyMetadata: privacyApiMocks.fetchPrivacyPolicyMetadata,
}));

describe("privacy config", () => {
  beforeEach(() => {
    vi.resetModules();
    privacyApiMocks.fetchPrivacyPolicyMetadata.mockReset();
  });

  it("defaults to the local privacy page until backend metadata is loaded", async () => {
    const { getPrivacyPolicyMeta, getPrivacyPolicyPath } = await import("../privacy");
    const expectedUrl = import.meta.env.VITE_PRIVACY_POLICY_URL ?? "/privacy";

    expect(getPrivacyPolicyPath()).toBe(expectedUrl);

    const meta = getPrivacyPolicyMeta();
    expect(meta.version).toMatch(/\d/);
    expect(meta.effectiveDate).toBeTruthy();
    expect(meta.supportEmail).toContain("@");
    expect(meta.privacyEmail).toContain("@");
    expect(meta.url).toBe(expectedUrl);
  });

  it("hydrates backend-authoritative policy metadata when available", async () => {
    privacyApiMocks.fetchPrivacyPolicyMetadata.mockResolvedValueOnce({
      privacy_policy_url: "https://example.com/privacy",
      privacy_policy_version: "2.3.0",
      privacy_policy_effective_date: "2026-04-15",
    });

    const { hydratePrivacyPolicyMeta, getPrivacyPolicyMeta, getPrivacyPolicyPath } = await import("../privacy");

    const meta = await hydratePrivacyPolicyMeta();

    expect(meta.version).toBe("2.3.0");
    expect(meta.effectiveDate).toBe("2026-04-15");
    expect(meta.url).toBe("https://example.com/privacy");
    expect(getPrivacyPolicyMeta().version).toBe("2.3.0");
    expect(getPrivacyPolicyPath()).toBe("https://example.com/privacy");
  });
});
