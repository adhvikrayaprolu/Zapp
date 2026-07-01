import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BankingSection } from "../components/BankingSection";

const authState = vi.hoisted(() => ({
  canLinkBank: false,
  bankLinkGateReason: null as string | null,
}));

const mockRequestConnect = vi.hoisted(() => vi.fn());
const mockUseBankingData = vi.hoisted(() => vi.fn());

vi.mock("@/features/auth", () => ({
  useAuth: () => ({
    canLinkBank: authState.canLinkBank,
    bankLinkGateReason: authState.bankLinkGateReason,
  }),
}));

vi.mock("../hooks/useBankingData", () => ({
  useBankingData: mockUseBankingData,
}));

vi.mock("../hooks/useSecureBankConnect", () => ({
  useSecureBankConnect: () => ({
    requestConnect: mockRequestConnect,
    isPreparingLink: false,
    isExchanging: false,
    linkError: null,
    consentOpen: false,
    setConsentOpen: vi.fn(),
    consentSubmitting: false,
    onConsentConfirm: vi.fn(),
    challengeOpen: false,
    setChallengeOpen: vi.fn(),
    challengeCode: "",
    setChallengeCode: vi.fn(),
    challengeSubmitting: false,
    submitChallenge: vi.fn(),
  }),
}));

vi.mock("../hooks/useBankConnectionSync", () => ({
  useBankConnectionSync: () => ({
    syncConnection: vi.fn(),
    syncingConnectionId: null,
  }),
}));

vi.mock("../components/BankLinkComplianceBanner", () => ({
  BankLinkComplianceBanner: () => null,
}));

vi.mock("../components/BankingEmptyState", () => ({
  BankingEmptyState: ({
    onConnect,
    isConnecting,
    disabled,
  }: {
    onConnect: () => void;
    isConnecting?: boolean;
    disabled?: boolean;
  }) => (
    <button type="button" data-testid="empty-connect" onClick={onConnect} disabled={disabled || isConnecting}>
      Connect bank
    </button>
  ),
}));

vi.mock("../components/BankConnectionsList", () => ({
  BankConnectionsList: () => <div data-testid="connections-list" />,
}));

vi.mock("../components/ConnectBankButton", () => ({
  ConnectBankButton: ({
    onConnect,
    loading,
    disabled,
  }: {
    onConnect: () => void;
    loading?: boolean;
    disabled?: boolean;
  }) => (
    <button type="button" data-testid="list-connect" onClick={onConnect} disabled={disabled || loading}>
      Connect bank
    </button>
  ),
}));

vi.mock("../components/LinkedAccountsSection", () => ({
  LinkedAccountsSection: () => <div data-testid="linked-accounts" />,
}));

vi.mock("../components/BankConnectionConsentModal", () => ({
  BankConnectionConsentModal: () => null,
}));

vi.mock("../components/MfaChallengeModal", () => ({
  MfaChallengeModal: () => null,
}));

describe("BankingSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.canLinkBank = false;
    authState.bankLinkGateReason = null;
    mockUseBankingData.mockReturnValue({
      connections: [],
      accounts: [],
      transactions: [],
      connectionsLoading: false,
      accountsLoading: false,
      transactionsLoading: false,
      refetchAll: vi.fn(),
      refetchConnections: vi.fn(),
      refetchAccounts: vi.fn(),
      refetchTransactions: vi.fn(),
    });
  });

  it("keeps the empty-state connect CTA enabled when step-up MFA verification is required", async () => {
    const user = userEvent.setup();
    authState.bankLinkGateReason = "mfa_verification_needed";

    render(<BankingSection />);

    const button = screen.getByTestId("empty-connect");
    expect(button).toBeEnabled();

    await user.click(button);

    expect(mockRequestConnect).toHaveBeenCalledTimes(1);
  });

  it("keeps the connect CTA enabled for existing connections when step-up MFA verification is required", async () => {
    const user = userEvent.setup();
    authState.bankLinkGateReason = "mfa_verification_needed";
    mockUseBankingData.mockReturnValue({
      connections: [{ id: "conn-1" }],
      accounts: [],
      transactions: [],
      connectionsLoading: false,
      accountsLoading: false,
      transactionsLoading: false,
      refetchAll: vi.fn(),
      refetchConnections: vi.fn(),
      refetchAccounts: vi.fn(),
      refetchTransactions: vi.fn(),
    });

    render(<BankingSection />);

    const button = screen.getByTestId("list-connect");
    expect(button).toBeEnabled();

    await user.click(button);

    expect(mockRequestConnect).toHaveBeenCalledTimes(1);
  });
});
