import * as React from "react";
import { Landmark } from "lucide-react";
import { toast } from "sonner";
import { IconBadge, SectionHeader, Surface } from "@/shared/components/system";
import { useBankingData } from "../hooks/useBankingData";
import { useSecureBankConnect } from "../hooks/useSecureBankConnect";
import { useBankConnectionSync } from "../hooks/useBankConnectionSync";
import { BankingEmptyState } from "./BankingEmptyState";
import { BankConnectionsList } from "./BankConnectionsList";
import { ConnectBankButton } from "./ConnectBankButton";
import { LinkedAccountsSection } from "./LinkedAccountsSection";
import { BankConnectionConsentModal } from "./BankConnectionConsentModal";
import { MfaChallengeModal } from "./MfaChallengeModal";
import { BankLinkComplianceBanner } from "./BankLinkComplianceBanner";
import { useAuth } from "@/features/auth";

type BankingSectionProps = {
  onTransactionsRefetch?: () => void | Promise<void>;
};

export function BankingSection({ onTransactionsRefetch }: BankingSectionProps) {
  const { canLinkBank, bankLinkGateReason } = useAuth();
  const {
    connections,
    accounts,
    transactions,
    connectionsLoading,
    accountsLoading,
    transactionsLoading,
    refetchAll,
    refetchConnections,
    refetchAccounts,
    refetchTransactions,
  } = useBankingData({ autoLoad: true });

  const handleConnected = React.useCallback(async () => {
    await refetchAll();
    await onTransactionsRefetch?.();
    toast.success("Bank connected successfully. Your transactions are syncing.");
  }, [refetchAll, onTransactionsRefetch]);

  const secure = useSecureBankConnect({
    onConnected: handleConnected,
  });
  const {
    requestConnect,
    isPreparingLink,
    isExchanging,
    linkError,
    consentOpen,
    setConsentOpen,
    consentSubmitting,
    onConsentConfirm,
    challengeOpen,
    setChallengeOpen,
    challengeCode,
    setChallengeCode,
    challengeSubmitting,
    submitChallenge,
  } = secure;

  const handleSynced = React.useCallback(async () => {
    await refetchConnections();
    await refetchAccounts();
    await refetchTransactions();
    await onTransactionsRefetch?.();
    toast.success("Sync complete.");
  }, [refetchConnections, refetchAccounts, refetchTransactions, onTransactionsRefetch]);

  const { syncConnection, syncingConnectionId } = useBankConnectionSync({
    onSynced: handleSynced,
  });

  const isConnecting = isPreparingLink || isExchanging;
  const hasConnections = connections.length > 0;
  const canTriggerConnect = canLinkBank || bankLinkGateReason === "mfa_verification_needed";

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <IconBadge tone="cyan" size="md">
          <Landmark size={22} />
        </IconBadge>
        <SectionHeader
          eyebrow="Secure sync"
          title="Bank connections"
          description="Connect institutions, sync balances, and pull recent transactions through the shared banking flow."
          className="gap-2"
          titleClassName="app-card-title text-[var(--app-type-section-title-size)]"
        />
      </div>

      <BankLinkComplianceBanner />

      {!hasConnections && !connectionsLoading && (
        <BankingEmptyState
          onConnect={requestConnect}
          isConnecting={isConnecting}
          disabled={!canTriggerConnect}
        />
      )}

      {linkError && hasConnections && (
        <Surface
          variant="inset"
          padding="sm"
          className="text-sm font-bold text-[var(--app-accent-red-soft)]"
          style={{
            borderColor: "color-mix(in srgb, var(--app-accent-red-soft) 20%, transparent)",
            backgroundColor: "color-mix(in srgb, var(--app-accent-red-soft) 10%, transparent)",
          }}
        >
          {linkError}
        </Surface>
      )}

      {hasConnections && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <BankConnectionsList
              connections={connections}
              onSync={syncConnection}
              syncingConnectionId={syncingConnectionId}
            />
            <ConnectBankButton
              onConnect={requestConnect}
              loading={isConnecting}
              disabled={!canTriggerConnect}
              error={linkError}
            />
          </div>

          <LinkedAccountsSection
            accounts={accounts}
            loading={accountsLoading && accounts.length === 0}
          />
        </div>
      )}

      <BankConnectionConsentModal
        open={consentOpen}
        onOpenChange={setConsentOpen}
        onConfirm={onConsentConfirm}
        submitting={consentSubmitting}
      />
      <MfaChallengeModal
        open={challengeOpen}
        onOpenChange={setChallengeOpen}
        code={challengeCode}
        onCodeChange={setChallengeCode}
        onSubmit={submitChallenge}
        submitting={challengeSubmitting}
      />
    </section>
  );
}
