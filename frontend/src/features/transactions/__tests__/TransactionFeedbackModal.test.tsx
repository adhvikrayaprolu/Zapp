import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";

import { TransactionsAPI } from "@/api/transactions.api";
import { TransactionFeedbackModal } from "../components/TransactionFeedbackModal";
import type { DisplayTransaction } from "../utils/normalizeBankTransaction";

vi.mock("@/api/transactions.api", () => ({
  TransactionsAPI: {
    submitFeedback: vi.fn(),
  },
}));

vi.mock("@/api/banking.api", () => ({
  BankingAPI: {
    submitFeedback: vi.fn(),
  },
}));

vi.mock("@/api/gamification.api", () => ({
  GamificationAPI: {
    createTransactionReflection: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/shared/components/ui/slider", () => ({
  Slider: ({ className }: { className?: string }) => (
    <div data-testid="mock-slider" className={className} />
  ),
}));

const transaction: DisplayTransaction = {
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

describe("TransactionFeedbackModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(TransactionsAPI.submitFeedback).mockResolvedValue({} as never);
  });

  it("shows shorter guidance and still saves manual transaction feedback", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onSubmitted = vi.fn();

    render(
      <TransactionFeedbackModal
        transaction={transaction}
        open
        onOpenChange={onOpenChange}
        onSubmitted={onSubmitted}
      />,
    );

    expect(screen.getByText("Purchase reflection")).toBeInTheDocument();
    expect(
      screen.getByText("Add a rating for full feedback, or leave a note."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add rating or note" })).toBeInTheDocument();
    expect(screen.getByText("Add a rating or note.")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("What stood out?"), "Worth the price.");
    expect(screen.getByRole("button", { name: "Save reflection" })).toBeInTheDocument();
    expect(screen.getByText("Only the note will be saved.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "8" }));
    expect(screen.getByText("Rating and note save together.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save feedback" }));

    await waitFor(() => {
      expect(TransactionsAPI.submitFeedback).toHaveBeenCalledWith(
        42,
        expect.objectContaining({
          satisfaction_rating: 8,
          regret_rating: 50,
          repurchase_likelihood: 50,
          reflection_text: "Worth the price.",
        }),
      );
    });

    expect(onSubmitted).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(toast.success).toHaveBeenCalledWith("Feedback saved.");
  });
});
