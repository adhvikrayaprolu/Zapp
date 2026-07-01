import * as React from "react";
import { BankingAPI } from "@/api/banking.api";

type UseBankConnectionSyncParams = {
  onSynced?: () => void | Promise<void>;
};

type UseBankConnectionSyncReturn = {
  syncConnection: (connectionId: string) => Promise<void>;
  syncingConnectionId: string | null;
  syncError: string | null;
};

export function useBankConnectionSync(params: UseBankConnectionSyncParams = {}): UseBankConnectionSyncReturn {
  const { onSynced } = params;
  const [syncingConnectionId, setSyncingConnectionId] = React.useState<string | null>(null);
  const [syncError, setSyncError] = React.useState<string | null>(null);

  const syncConnection = React.useCallback(
    async (connectionId: string) => {
      setSyncingConnectionId(connectionId);
      setSyncError(null);
      try {
        await BankingAPI.syncConnection(connectionId);
        await onSynced?.();
      } catch (e) {
        setSyncError(e instanceof Error ? e.message : "Failed to sync");
      } finally {
        setSyncingConnectionId(null);
      }
    },
    [onSynced]
  );

  return {
    syncConnection,
    syncingConnectionId,
    syncError,
  };
}
