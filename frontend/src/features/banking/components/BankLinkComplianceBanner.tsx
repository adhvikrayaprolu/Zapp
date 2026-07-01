import * as React from "react";
import { AlertTriangle, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth";
import { bankLinkGateMessage } from "../security/bankLinkMessages";
import { getApiConfigurationError } from "@/api/client";

/**
 * Honest UI when bank linking is blocked. Does not claim backend-only protections.
 */
export function BankLinkComplianceBanner() {
  const { canLinkBank, bankLinkGateReason, mfaLoading } = useAuth();
  const apiErr = getApiConfigurationError();

  if (apiErr) {
    return (
      <div className="flex gap-3 rounded-2xl border border-[color:color-mix(in_srgb,var(--app-color-status-danger)_32%,transparent)] bg-[color:color-mix(in_srgb,var(--app-color-status-danger)_12%,transparent)] p-4 text-sm text-[var(--app-color-text-secondary)]">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--app-color-status-danger)]" />
        <div>
          <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-[var(--app-color-status-danger)]">Configuration</p>
          <p>{apiErr}</p>
        </div>
      </div>
    );
  }

  if (canLinkBank || mfaLoading) return null;

  const msg = bankLinkGateMessage(bankLinkGateReason);
  const showProfileLink =
    bankLinkGateReason === "mfa_not_enrolled" ||
    bankLinkGateReason === "mfa_verification_needed" ||
    bankLinkGateReason === "mfa_required";

  return (
    <div className="flex gap-3 rounded-2xl border border-[color:color-mix(in_srgb,var(--app-accent-yellow-soft)_32%,transparent)] bg-[color:color-mix(in_srgb,var(--app-accent-yellow-soft)_14%,transparent)] p-4 text-sm text-[var(--app-color-text-secondary)]">
      <Shield className="mt-0.5 h-5 w-5 shrink-0 text-[var(--app-accent-yellow-soft)]" />
      <div>
        <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-[var(--app-accent-yellow-soft)]">Bank connection</p>
        <p>{msg}</p>
        {showProfileLink && (
          <Link to="/profile" className="mt-2 inline-block text-xs font-bold uppercase tracking-widest text-[var(--app-accent-cyan-soft)] hover:underline">
            Open profile & security
          </Link>
        )}
      </div>
    </div>
  );
}
