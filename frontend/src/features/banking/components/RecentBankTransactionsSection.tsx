import * as React from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { ElectricCard } from "@/features/home/components/ElectricCard";
import { formatDateLabel } from "@/shared/date";
import { cn } from "@/shared/components/ui/utils";
import { COLORS } from "@/shared/theme";
import { AppButton, IconBadge, Surface } from "@/shared/components/system";
import type { BankTransaction } from "@/api/banking.api";

type RecentBankTransactionsSectionProps = {
  transactions: BankTransaction[];
  loading?: boolean;
  onViewAll?: () => void;
};

function formatDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return formatDateLabel(iso, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatAmount(amount: string | number, direction?: string): { text: string; isIncome: boolean } {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  const isIncome = n >= 0 || direction === "income";
  const abs = Math.abs(Number.isNaN(n) ? 0 : n);
  return {
    text: `${isIncome ? "+" : "-"}$${abs.toFixed(2)}`,
    isIncome,
  };
}

export function RecentBankTransactionsSection({
  transactions,
  loading = false,
  onViewAll,
}: RecentBankTransactionsSectionProps) {
  if (loading && transactions.length === 0) {
    return (
      <ElectricCard className="p-6" semanticColor={COLORS.electricGreen} elevation={1}>
        <div className="mb-4 app-mini-label">Recent bank transactions</div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-14 rounded-xl border border-[var(--app-color-border-subtle)] bg-[var(--app-color-surface-inset)] animate-pulse"
            />
          ))}
        </div>
      </ElectricCard>
    );
  }

  if (transactions.length === 0) return null;

  const display = transactions.slice(0, 8);

  return (
    <ElectricCard className="p-6" semanticColor={COLORS.electricGreen} elevation={1}>
      <div className="mb-4 flex items-center justify-between">
        <div className="app-mini-label">Recent bank transactions</div>
        {onViewAll && transactions.length > 8 && (
          <AppButton type="button" onClick={onViewAll} variant="quietAccent" size="sm">
            View all
          </AppButton>
        )}
      </div>
      <div className="space-y-2">
        {display.map((tx) => {
          const { text, isIncome } = formatAmount(tx.amount, tx.direction);
          const name = tx.merchant_name ?? tx.name ?? tx.description_raw ?? "Transaction";
          return (
            <Surface
              key={tx.id}
              variant="inset"
              padding="sm"
              className="flex items-center justify-between rounded-xl"
            >
              <div className="flex items-center gap-3 min-w-0">
                <IconBadge
                  tone={isIncome ? "green" : "neutral"}
                  size="sm"
                  className="shrink-0 rounded-lg"
                >
                  {isIncome ? (
                    <ArrowDownRight size={14} />
                  ) : (
                    <ArrowUpRight size={14} className="text-[var(--app-color-text-tertiary)]" />
                  )}
                </IconBadge>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-[var(--app-color-text-primary)]">{name}</div>
                  <div className="app-mini-label">
                    {formatDate(tx.date ?? tx.occurred_at)}
                  </div>
                </div>
              </div>
              <div
                className={cn(
                  "ml-2 shrink-0 text-sm font-black",
                  isIncome ? "text-[var(--app-accent-green-soft)]" : "text-[var(--app-color-text-primary)]"
                )}
              >
                {text}
              </div>
            </Surface>
          );
        })}
      </div>
    </ElectricCard>
  );
}
