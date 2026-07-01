import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { toast } from "sonner";

import { GamificationAPI } from "@/api/gamification.api";
import { ReviewPage } from "../pages/ReviewPage";

vi.mock("@/api/gamification.api", () => ({
  GamificationAPI: {
    getWeeklyReview: vi.fn(),
    getMonthlyReview: vi.fn(),
    completeWeeklyReviewFlow: vi.fn(),
    completeMonthlyReviewFlow: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/features/home/components/ElectricCard", () => ({
  ElectricCard: ({ children }: { children: any }) => <div>{children}</div>,
}));

vi.mock("@/features/transactions/components/TransactionFeedbackModal", () => ({
  TransactionFeedbackModal: () => null,
}));

function makeWeeklyOverview() {
  return {
    review: {
      id: 7,
      user: 1,
      review_type: "weekly" as const,
      period_start: "2026-04-06",
      period_end: "2026-04-12",
      status: "open" as const,
      summary_json: {
        wins: "",
        regrets: "",
        adjustment: "",
      },
      notes: "",
      completed_at: null,
      created_at: "2026-04-12T00:00:00Z",
      updated_at: "2026-04-12T00:00:00Z",
    },
    period_label: "Apr 6 - Apr 12",
    summary_requirements: ["wins", "regrets", "adjustment"],
    minimum_transactions_required: 2,
    reviewed_transaction_count: 2,
    pending_transaction_feedback_count: 1,
    eligible_to_complete: true,
    transaction_candidates: [
      {
        id: 11,
        description_raw: "Lunch",
        occurred_at: "2026-04-10T12:00:00Z",
        amount: "16.00",
        direction: "spend",
        category: "eating_out",
        impulse_score: null,
        regret_score: null,
        satisfaction_rating: null,
      },
      {
        id: 12,
        description_raw: "Old coffee",
        occurred_at: "2026-04-02T12:00:00Z",
        amount: "8.00",
        direction: "spend",
        category: "eating_out",
        impulse_score: null,
        regret_score: null,
        satisfaction_rating: 8,
      },
    ],
    upcoming_subscription_renewals: [],
    low_value_subscriptions: [],
  };
}

function renderReviewPage() {
  return render(
    <MemoryRouter>
      <ReviewPage kind="weekly" />
    </MemoryRouter>,
  );
}

describe("ReviewPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(GamificationAPI.getWeeklyReview).mockResolvedValue(makeWeeklyOverview() as never);
    vi.mocked(GamificationAPI.completeWeeklyReviewFlow).mockResolvedValue({
      ...makeWeeklyOverview(),
      review: {
        ...makeWeeklyOverview().review,
        status: "completed",
      },
      point_event: { points: 25 },
    } as never);
  });

  it("renders tighter review copy and still submits the weekly review", async () => {
    const user = userEvent.setup();

    renderReviewPage();

    await waitFor(() => {
      expect(GamificationAPI.getWeeklyReview).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByRole("heading", { name: "Weekly Review" })).toBeInTheDocument();
    expect(
      screen.getByText("One win, one miss, and one adjustment for next week."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Apr 6 - Apr 12\. Review purchases, then finish the summary\./),
    ).toBeInTheDocument();
    expect(screen.getByText("See what's left before you submit.")).toBeInTheDocument();
    expect(screen.getByText("Showing Apr 6 - Apr 12 purchases only")).toBeInTheDocument();
    expect(screen.getByText("Needs feedback")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add feedback/i })).toBeInTheDocument();
    expect(screen.queryByText("Old coffee")).not.toBeInTheDocument();
    expect(screen.getAllByText("Biggest win")).toHaveLength(2);
    expect(screen.getAllByText("Biggest miss")).toHaveLength(2);
    expect(screen.getAllByText("Next adjustment")).toHaveLength(2);

    fireEvent.change(screen.getByPlaceholderText("One spending choice to keep."), {
      target: { value: "Packed lunch twice." },
    });
    fireEvent.change(screen.getByPlaceholderText("One purchase or pattern to rethink."), {
      target: { value: "Impulse coffee run." },
    });
    fireEvent.change(screen.getByPlaceholderText("One change for next week."), {
      target: { value: "Set a weekday lunch budget." },
    });
    fireEvent.change(screen.getByPlaceholderText("Optional notes."), {
      target: { value: "Keep lunch prep on Sunday." },
    });

    await user.click(screen.getByRole("button", { name: "Complete weekly review" }));

    await waitFor(() => {
      expect(GamificationAPI.completeWeeklyReviewFlow).toHaveBeenCalledWith(
        {
          wins: "Packed lunch twice.",
          regrets: "Impulse coffee run.",
          adjustment: "Set a weekday lunch budget.",
        },
        { notes: "Keep lunch prep on Sunday." },
      );
    });

    expect(toast.success).toHaveBeenCalledWith("Weekly review complete. +25 points");
  });

  it("shows the shorter empty-state copy when there are no purchases left to review", async () => {
    vi.mocked(GamificationAPI.getWeeklyReview).mockResolvedValue({
      ...makeWeeklyOverview(),
      transaction_candidates: [
        {
          id: 12,
          description_raw: "Old coffee",
          occurred_at: "2026-04-02T12:00:00Z",
          amount: "8.00",
          direction: "spend",
          category: "eating_out",
          impulse_score: null,
          regret_score: null,
          satisfaction_rating: 8,
        },
      ],
    } as never);

    renderReviewPage();

    await waitFor(() => {
      expect(GamificationAPI.getWeeklyReview).toHaveBeenCalledTimes(1);
    });

    expect(
      screen.getByText("No purchases to review right now. Finish the summary above if you're ready."),
    ).toBeInTheDocument();
  });
});
