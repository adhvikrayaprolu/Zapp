import * as React from "react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth";
import { usePlaidConnect } from "./usePlaidConnect";
import { fetchConsentStatus, recordFinancialDataConsent } from "@/api/compliance.api";
import { getFinancialConsentDisclosure, usePrivacyPolicyMeta } from "@/config/privacy";
import { bankLinkGateMessage } from "../security/bankLinkMessages";
import { messageForSecurityFlowError } from "../security/securityFlowErrors";

type Params = {
  onConnected?: () => void | Promise<void>;
};

/**
 * Secure bank connection: the only supported entry for Plaid in this app.
 *
 * 1. `refreshMfa()` — Supabase MFA snapshot + `GET /api/security/auth-assurance/`
 * 2. If blocked → toast; if step-up needed → MFA challenge modal
 * 3. Consent: `GET /api/compliance/consent/status/` then modal + `POST /api/compliance/consent/` if needed
 * 4. Immediately before `POST /api/banking/link-token/` / Plaid: `refreshMfa()` again (no stale gate)
 * 5. `usePlaidConnect` requests link-token, then opens Plaid Link
 */
export function useSecureBankConnect(params: Params = {}) {
  const { onConnected } = params;
  const { verifyMfaChallenge, refreshMfa } = useAuth();
  const plaid = usePlaidConnect({ onConnected });
  const privacyPolicyMeta = usePrivacyPolicyMeta();
  const consentDisclosure = React.useMemo(
    () => getFinancialConsentDisclosure(privacyPolicyMeta),
    [privacyPolicyMeta]
  );
  const [consentOpen, setConsentOpen] = React.useState(false);
  const [consentSubmitting, setConsentSubmitting] = React.useState(false);
  const [challengeOpen, setChallengeOpen] = React.useState(false);
  const [challengeCode, setChallengeCode] = React.useState("");
  const [challengeSubmitting, setChallengeSubmitting] = React.useState(false);

  const requestConnect = React.useCallback(async () => {
    const { gate, mfaSnapshot: snapAfter } = await refreshMfa();
    const verifiedFactorId = snapAfter?.factors.find((f) => f.status === "verified")?.id ?? null;

    if (gate.reason === "mfa_verification_needed" && verifiedFactorId) {
      setChallengeOpen(true);
      setChallengeCode("");
      return;
    }
    if (!gate.can) {
      toast.error(bankLinkGateMessage(gate.reason));
      return;
    }

    try {
      const status = await fetchConsentStatus();
      if (status.has_valid_financial_consent === true) {
        const { gate: gateBeforePlaid } = await refreshMfa();
        if (!gateBeforePlaid.can) {
          toast.error(bankLinkGateMessage(gateBeforePlaid.reason));
          return;
        }
        plaid.startConnect();
        return;
      }
    } catch {
      // If status cannot be loaded, collect consent explicitly.
    }
    setConsentOpen(true);
  }, [refreshMfa, plaid]);

  const handleConsentConfirm = React.useCallback(async () => {
    setConsentSubmitting(true);
    try {
      await recordFinancialDataConsent(consentDisclosure.auditText);
    } catch (e) {
      toast.error(messageForSecurityFlowError(e, "Could not record consent."));
      setConsentSubmitting(false);
      return;
    }
    const { gate } = await refreshMfa();
    if (!gate.can) {
      toast.error(bankLinkGateMessage(gate.reason));
      setConsentSubmitting(false);
      setConsentOpen(false);
      return;
    }
    setConsentOpen(false);
    setConsentSubmitting(false);
    plaid.startConnect();
  }, [consentDisclosure.auditText, plaid, refreshMfa]);

  const submitChallenge = React.useCallback(async () => {
    const { mfaSnapshot: snap } = await refreshMfa();
    const verifiedFactorId = snap?.factors.find((f) => f.status === "verified")?.id ?? null;
    if (!verifiedFactorId || !challengeCode.trim()) {
      toast.error("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setChallengeSubmitting(true);
    try {
      await verifyMfaChallenge(verifiedFactorId, challengeCode.trim());
      toast.success("Verified. You can connect your bank.");
      setChallengeOpen(false);
      setChallengeCode("");
      const { gate } = await refreshMfa();
      if (!gate.can) {
        toast.error(bankLinkGateMessage(gate.reason));
        return;
      }
      try {
        const status = await fetchConsentStatus();
        if (status.has_valid_financial_consent === true) {
          const { gate: gateBeforePlaid } = await refreshMfa();
          if (!gateBeforePlaid.can) {
            toast.error(bankLinkGateMessage(gateBeforePlaid.reason));
            return;
          }
          plaid.startConnect();
          return;
        }
      } catch {
        // fall through to consent
      }
      setConsentOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed.");
    } finally {
      setChallengeSubmitting(false);
    }
  }, [challengeCode, verifyMfaChallenge, refreshMfa, plaid]);

  return {
    isPreparingLink: plaid.isPreparingLink,
    isExchanging: plaid.isExchanging,
    linkError: plaid.linkError,
    requestConnect,
    consentOpen,
    setConsentOpen,
    consentSubmitting,
    onConsentConfirm: handleConsentConfirm,
    challengeOpen,
    setChallengeOpen,
    challengeCode,
    setChallengeCode,
    challengeSubmitting,
    submitChallenge,
  };
}
