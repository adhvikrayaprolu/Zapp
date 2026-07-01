import * as React from "react";
import { Loader2, RefreshCw, Landmark } from "lucide-react";
import { ElectricCard } from "@/features/home/components/ElectricCard";
import { COLORS } from "@/shared/theme";
import { AppButton, IconBadge } from "@/shared/components/system";
import type { BankConnection } from "@/api/banking.api";

type BankConnectionCardProps = {
  connection: BankConnection;
  onSync: () => void;
  isSyncing?: boolean;
};

function formatLastSynced(iso?: string | null): string {
  if (!iso) return "Never synced";
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return "Unknown";
  }
}

export function BankConnectionCard({ connection, onSync, isSyncing = false }: BankConnectionCardProps) {
  const name = connection.institution_name ?? connection.institution ?? "Bank";
  const status = connection.status ?? "active";
  const lastSynced = connection.last_synced_at;

  return (
    <ElectricCard className="p-5" semanticColor={COLORS.electricTeal} elevation={1}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <IconBadge tone="cyan" size="md">
            <Landmark size={22} />
          </IconBadge>
          <div>
            <h4 className="app-card-title">{name}</h4>
            <div className="app-mini-label">Last synced: {formatLastSynced(lastSynced)}</div>
          </div>
        </div>
        <AppButton
          onClick={onSync}
          disabled={isSyncing}
          variant="secondary"
          size="sm"
        >
          {isSyncing ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RefreshCw size={14} />
          )}
          Sync now
        </AppButton>
      </div>
    </ElectricCard>
  );
}
