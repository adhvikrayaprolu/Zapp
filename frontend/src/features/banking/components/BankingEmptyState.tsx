import * as React from "react";
import { Landmark } from "lucide-react";
import { ElectricCard } from "@/features/home/components/ElectricCard";
import { COLORS } from "@/shared/theme";
import { IconBadge } from "@/shared/components/system";
import { ConnectBankButton } from "./ConnectBankButton";

type BankingEmptyStateProps = {
  onConnect: () => void;
  isConnecting?: boolean;
  disabled?: boolean;
};

export function BankingEmptyState({ onConnect, isConnecting = false, disabled = false }: BankingEmptyStateProps) {
  return (
    <ElectricCard className="p-8" semanticColor={COLORS.electricCyan} elevation={1}>
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <IconBadge tone="cyan" size="lg">
          <Landmark size={28} />
        </IconBadge>
        <div className="flex-1 space-y-2">
          <h3 className="app-card-title">Import real transactions from your bank</h3>
          <p className="app-helper">
            Connect your bank account securely via Plaid to automatically sync transactions. Your data stays private and encrypted.
          </p>
          <p className="app-mini-label">
            Sandbox mode available for testing
          </p>
        </div>
        <ConnectBankButton onConnect={onConnect} loading={isConnecting} disabled={disabled} />
      </div>
    </ElectricCard>
  );
}
