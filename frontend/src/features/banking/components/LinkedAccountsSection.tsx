import * as React from "react";
import { Wallet } from "lucide-react";
import { ElectricCard } from "@/features/home/components/ElectricCard";
import { COLORS } from "@/shared/theme";
import { IconBadge, Surface } from "@/shared/components/system";
import type { BankAccount } from "@/api/banking.api";

type LinkedAccountsSectionProps = {
  accounts: BankAccount[];
  loading?: boolean;
};

function formatBalance(val: number | string | null | undefined): string {
  if (val == null) return "—";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (Number.isNaN(n)) return "—";
  return `$${n.toFixed(2)}`;
}

export function LinkedAccountsSection({ accounts, loading = false }: LinkedAccountsSectionProps) {
  if (loading && accounts.length === 0) {
    return (
      <ElectricCard className="p-6" semanticColor={COLORS.electricBlue} elevation={1}>
        <div className="mb-4 app-mini-label">Linked accounts</div>
        <div className="h-20 rounded-2xl border border-[var(--app-color-border-subtle)] bg-[var(--app-color-surface-inset)] animate-pulse" />
      </ElectricCard>
    );
  }

  if (accounts.length === 0) return null;

  return (
    <ElectricCard className="p-6" semanticColor={COLORS.electricBlue} elevation={1}>
      <div className="mb-4 app-mini-label">Linked accounts</div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {accounts.map((acc) => (
          <Surface
            key={acc.id}
            variant="inset"
            padding="sm"
            className="flex items-center gap-4 rounded-2xl"
          >
            <IconBadge tone="blue" size="sm">
              <Wallet size={18} />
            </IconBadge>
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-bold text-[var(--app-color-text-primary)]">
                {acc.name ?? "Account"}
              </div>
              <div className="app-mini-label">
                {[acc.type, acc.subtype].filter(Boolean).join(" · ") || "—"}
                {acc.mask ? ` •••• ${acc.mask}` : ""}
              </div>
            </div>
            <div className="text-right">
              <div className="font-black text-[var(--app-color-text-primary)]">
                {formatBalance(acc.current_balance ?? acc.available_balance)}
              </div>
            </div>
          </Surface>
        ))}
      </div>
    </ElectricCard>
  );
}
