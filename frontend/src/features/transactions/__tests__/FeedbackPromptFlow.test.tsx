import { act, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TransactionsAPI } from "@/api/transactions.api";
import { FeedbackPromptFlow } from "../components/FeedbackPromptFlow";
import type { DisplayTransaction } from "../utils/normalizeBankTransaction";

const mockUseAuth = vi.fn();
const mockUseMergedTransactions = vi.fn();
const mockOpenFeedback = vi.fn();
const mockRegisterPromptCloseHandler = vi.fn();
const mockRegisterPromptFeedbackSaved = vi.fn();

vi.mock("@/features/auth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../hooks/useMergedTransactions", () => ({
  useMergedTransactions: (filters: unknown) => mockUseMergedTransactions(filters),
}));

vi.mock("@/features/dashboard/context/DashboardFeedbackContext", () => ({
  useDashboardFeedback: () => ({
    feedbackTransaction: null,
    openFeedback: mockOpenFeedback,
    registerPromptCloseHandler: mockRegisterPromptCloseHandler,
    registerPromptFeedbackSaved: mockRegisterPromptFeedbackSaved,
  }),
}));

vi.mock("@/api/transactions.api", () => ({
  TransactionsAPI: {
    getFeedbackCandidates: vi.fn(),
  },
}));

const baseTransaction: DisplayTransaction = {
  id: 42,
  description_raw: "Coffee beans",
  occurred_at: "2026-04-10T12:00:00Z",
  amount: "18.50",
  direction: "spend",
  category: "groceries",
  impulse_score: null,
  regret_score: null,
  satisfaction_rating: null,
  regret_rating: null,
  repurchase_likelihood: null,
  usage_frequency: null,
  reflection_text: null,
  considered_at: null,
  source: "manual",
};

function renderFlow() {
  // Home dashboard lives at /home; "/" redirects authenticated users there.
  return render(
    <MemoryRouter initialEntries={["/home"]}>
      <FeedbackPromptFlow />
    </MemoryRouter>,
  );
}

describe("FeedbackPromptFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    mockUseAuth.mockReturnValue({ user: { id: "user-1" } });
    mockUseMergedTransactions.mockReturnValue({
      transactions: [baseTransaction],
      loading: false,
    });
    vi.mocked(TransactionsAPI.getFeedbackCandidates).mockResolvedValue([{ transaction_id: 42 }] as never);
  });

  it("does not reopen the first prompt after a reload in the same tab session", async () => {
    const firstRender = renderFlow();

    await waitFor(() => {
      expect(mockOpenFeedback).toHaveBeenCalledTimes(1);
      expect(mockOpenFeedback).toHaveBeenCalledWith(baseTransaction, "prompt");
    });

    firstRender.unmount();
    renderFlow();

    await waitFor(() => {
      expect(TransactionsAPI.getFeedbackCandidates).toHaveBeenCalledTimes(2);
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockOpenFeedback).toHaveBeenCalledTimes(1);
  });

  it("skips auto-prompting transactions that already have a reflection note", async () => {
    mockUseMergedTransactions.mockReturnValue({
      transactions: [{ ...baseTransaction, reflection_text: "Already reflected." }],
      loading: false,
    });

    renderFlow();

    await waitFor(() => {
      expect(TransactionsAPI.getFeedbackCandidates).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockOpenFeedback).not.toHaveBeenCalled();
  });
});
