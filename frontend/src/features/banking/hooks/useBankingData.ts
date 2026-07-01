import * as React from "react";
import { BankingAPI, type BankConnection, type BankAccount, type BankTransaction } from "@/api/banking.api";

type UseBankingDataConfig = {
  autoLoad?: boolean;
};

type UseBankingDataReturn = {
  connections: BankConnection[];
  accounts: BankAccount[];
  transactions: BankTransaction[];
  loading: boolean;
  connectionsLoading: boolean;
  accountsLoading: boolean;
  transactionsLoading: boolean;
  connectionsError: string | null;
  accountsError: string | null;
  transactionsError: string | null;
  refetchAll: () => Promise<void>;
  refetchConnections: () => Promise<void>;
  refetchAccounts: () => Promise<void>;
  refetchTransactions: () => Promise<void>;
};

export function useBankingData(config: UseBankingDataConfig = {}): UseBankingDataReturn {
  const { autoLoad = true } = config;

  const [connections, setConnections] = React.useState<BankConnection[]>([]);
  const [accounts, setAccounts] = React.useState<BankAccount[]>([]);
  const [transactions, setTransactions] = React.useState<BankTransaction[]>([]);
  const [connectionsLoading, setConnectionsLoading] = React.useState(false);
  const [accountsLoading, setAccountsLoading] = React.useState(false);
  const [transactionsLoading, setTransactionsLoading] = React.useState(false);
  const [connectionsError, setConnectionsError] = React.useState<string | null>(null);
  const [accountsError, setAccountsError] = React.useState<string | null>(null);
  const [transactionsError, setTransactionsError] = React.useState<string | null>(null);

  const refetchConnections = React.useCallback(async () => {
    setConnectionsLoading(true);
    setConnectionsError(null);
    try {
      const data = await BankingAPI.getConnections();
      setConnections(Array.isArray(data) ? data : []);
    } catch (e) {
      setConnectionsError(e instanceof Error ? e.message : "Failed to load connections");
      setConnections([]);
    } finally {
      setConnectionsLoading(false);
    }
  }, []);

  const refetchAccounts = React.useCallback(async () => {
    setAccountsLoading(true);
    setAccountsError(null);
    try {
      const data = await BankingAPI.getAccounts();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (e) {
      setAccountsError(e instanceof Error ? e.message : "Failed to load accounts");
      setAccounts([]);
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  const refetchTransactions = React.useCallback(async () => {
    setTransactionsLoading(true);
    setTransactionsError(null);
    try {
      const data = await BankingAPI.getTransactions({ limit: 20 });
      setTransactions(Array.isArray(data) ? data : []);
    } catch (e) {
      setTransactionsError(e instanceof Error ? e.message : "Failed to load transactions");
      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  }, []);

  const refetchAll = React.useCallback(async () => {
    await Promise.all([refetchConnections(), refetchAccounts(), refetchTransactions()]);
  }, [refetchConnections, refetchAccounts, refetchTransactions]);

  React.useEffect(() => {
    if (autoLoad) {
      refetchAll();
    }
  }, [autoLoad, refetchAll]);

  const loading = connectionsLoading || accountsLoading || transactionsLoading;

  return {
    connections,
    accounts,
    transactions,
    loading,
    connectionsLoading,
    accountsLoading,
    transactionsLoading,
    connectionsError,
    accountsError,
    transactionsError,
    refetchAll,
    refetchConnections,
    refetchAccounts,
    refetchTransactions,
  };
}
