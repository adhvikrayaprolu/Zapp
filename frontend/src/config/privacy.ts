import * as React from "react";
import { fetchPrivacyPolicyMetadata } from "@/api/compliance.api";

/**
 * Privacy policy metadata is backend-authoritative.
 * Frontend env values are fallback defaults for first paint and local development.
 */
export type PrivacyPolicyMeta = {
  version: string;
  effectiveDate: string;
  supportEmail: string;
  privacyEmail: string;
  url: string;
};

const LOCAL_PRIVACY_POLICY_PATH = "/privacy";

function buildFallbackPrivacyPolicyMeta(): PrivacyPolicyMeta {
  return {
    version: import.meta.env.VITE_PRIVACY_POLICY_VERSION ?? "1.0.0",
    effectiveDate: import.meta.env.VITE_PRIVACY_POLICY_EFFECTIVE_DATE ?? "2026-01-01",
    supportEmail: import.meta.env.VITE_SUPPORT_EMAIL ?? "support@example.com",
    privacyEmail: import.meta.env.VITE_PRIVACY_EMAIL ?? "privacy@example.com",
    url: import.meta.env.VITE_PRIVACY_POLICY_URL ?? LOCAL_PRIVACY_POLICY_PATH,
  };
}

let cachedPrivacyPolicyMeta: PrivacyPolicyMeta = buildFallbackPrivacyPolicyMeta();
let inflightPrivacyPolicyMeta: Promise<PrivacyPolicyMeta> | null = null;

function mergePrivacyPolicyMeta(partial: Partial<PrivacyPolicyMeta>): PrivacyPolicyMeta {
  cachedPrivacyPolicyMeta = {
    ...cachedPrivacyPolicyMeta,
    ...Object.fromEntries(
      Object.entries(partial).filter(([, value]) => value !== undefined && value !== "")
    ),
  };
  return cachedPrivacyPolicyMeta;
}

export function getPrivacyPolicyMeta(): PrivacyPolicyMeta {
  return cachedPrivacyPolicyMeta;
}

export async function hydratePrivacyPolicyMeta(): Promise<PrivacyPolicyMeta> {
  if (inflightPrivacyPolicyMeta) {
    return inflightPrivacyPolicyMeta;
  }

  inflightPrivacyPolicyMeta = fetchPrivacyPolicyMetadata()
    .then((response) =>
      mergePrivacyPolicyMeta({
        version: response.privacy_policy_version,
        effectiveDate: response.privacy_policy_effective_date,
        url: response.privacy_policy_url,
      })
    )
    .catch(() => cachedPrivacyPolicyMeta)
    .finally(() => {
      inflightPrivacyPolicyMeta = null;
    });

  return inflightPrivacyPolicyMeta;
}

export function usePrivacyPolicyMeta(): PrivacyPolicyMeta {
  const [meta, setMeta] = React.useState(() => getPrivacyPolicyMeta());

  React.useEffect(() => {
    let active = true;

    void hydratePrivacyPolicyMeta().then((resolvedMeta) => {
      if (active) {
        setMeta(resolvedMeta);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  return meta;
}

export function getPrivacyPolicyPath(): string {
  return getPrivacyPolicyMeta().url || LOCAL_PRIVACY_POLICY_PATH;
}

export function isExternalPrivacyPolicyUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function getFinancialConsentDisclosure(meta: PrivacyPolicyMeta): {
  intro: string;
  policyReference: string;
  checkboxLabel: string;
  auditText: string;
} {
  const intro =
    "To import transactions, Zapp uses Plaid to connect to your financial institution. We collect account and transaction data you authorize through Plaid, process it to show spending insights in this app, and store it as described in our privacy policy. We do not sell your data for marketing.";
  const policyReference =
    "Plaid's privacy practices are described in Plaid's policies. Zapp's handling of your data is described in our privacy policy.";
  const checkboxLabel =
    "I have read and agree to the collection and use of my financial information as described in the privacy policy above.";
  const auditText = [
    intro,
    policyReference,
    `Privacy policy version ${meta.version}. Effective ${meta.effectiveDate}. URL ${meta.url || LOCAL_PRIVACY_POLICY_PATH}.`,
    `User affirmation: ${checkboxLabel}`,
  ].join("\n\n");

  return {
    intro,
    policyReference,
    checkboxLabel,
    auditText,
  };
}
