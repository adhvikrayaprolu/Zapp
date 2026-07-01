/**
 * `apiRequest` is mocked here. Wire-level `credentials: "include"` for MFA routes is
 * asserted in `src/api/__tests__/client.test.ts` (MFA session endpoints test).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  enrollTotpFactor,
  getMfaSnapshot,
  unenrollFactor,
  verifyMfaChallenge,
  verifyTotpEnrollment,
} from "./mfaOperations";

const { mockApiRequest } = vi.hoisted(() => ({
  mockApiRequest: vi.fn(),
}));

vi.mock("@/api/client", () => ({
  apiRequest: mockApiRequest,
}));

describe("mfaOperations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requests MFA snapshot from the backend session API", async () => {
    mockApiRequest.mockResolvedValueOnce({
      current_level: "aal1",
      next_level: "aal2",
      factors: [],
    });

    const result = await getMfaSnapshot();

    expect(mockApiRequest).toHaveBeenCalledWith("/api/auth/mfa/snapshot/", { requireAuth: true });
    expect(result.currentLevel).toBe("aal1");
    expect(result.nextLevel).toBe("aal2");
  });

  it("starts TOTP enrollment through the backend session API", async () => {
    mockApiRequest.mockResolvedValueOnce({ id: "factor-1" });

    await enrollTotpFactor("Phone");

    expect(mockApiRequest).toHaveBeenCalledWith("/api/auth/mfa/enroll/", {
      requireAuth: true,
      method: "POST",
      body: JSON.stringify({ friendly_name: "Phone" }),
    });
  });

  it("verifies enrollment through the backend session API", async () => {
    mockApiRequest.mockResolvedValueOnce({});

    await verifyTotpEnrollment("factor-1", "123 456");

    expect(mockApiRequest).toHaveBeenCalledWith("/api/auth/mfa/verify-enrollment/", {
      requireAuth: true,
      method: "POST",
      body: JSON.stringify({ factor_id: "factor-1", code: "123456" }),
    });
  });

  it("performs MFA step-up as challenge then verify", async () => {
    mockApiRequest
      .mockResolvedValueOnce({ challenge_id: "challenge-1" })
      .mockResolvedValueOnce({ aal: "aal2" });

    await verifyMfaChallenge("factor-1", "123 456");

    expect(mockApiRequest).toHaveBeenNthCalledWith(1, "/api/auth/mfa/challenge/", {
      requireAuth: true,
      method: "POST",
      body: JSON.stringify({ factor_id: "factor-1" }),
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(2, "/api/auth/mfa/verify/", {
      requireAuth: true,
      method: "POST",
      body: JSON.stringify({
        factor_id: "factor-1",
        challenge_id: "challenge-1",
        code: "123456",
      }),
    });
  });

  it("unenrolls a factor through the backend session API", async () => {
    mockApiRequest.mockResolvedValueOnce(null);

    await unenrollFactor("factor-1");

    expect(mockApiRequest).toHaveBeenCalledWith("/api/auth/mfa/factors/factor-1/", {
      requireAuth: true,
      method: "DELETE",
    });
  });
});
