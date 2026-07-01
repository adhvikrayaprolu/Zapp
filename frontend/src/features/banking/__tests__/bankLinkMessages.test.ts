import { describe, it, expect } from "vitest";
import { bankLinkGateMessage } from "../security/bankLinkMessages";

describe("bankLinkGateMessage", () => {
  it("returns distinct messages per gate reason", () => {
    const api = bankLinkGateMessage("api_misconfigured");
    const loading = bankLinkGateMessage("mfa_loading");
    const enroll = bankLinkGateMessage("mfa_not_enrolled");
    expect(api).not.toEqual(loading);
    expect(enroll.length).toBeGreaterThan(10);
  });

  it("handles null reason with generic message", () => {
    expect(bankLinkGateMessage(null)).toBeTruthy();
  });
});
