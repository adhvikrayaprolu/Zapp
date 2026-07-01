import { apiRequest } from "./client";
import type { Transaction } from "./transactions.api";

export type PointEvent = {
  id: number;
  user: number;
  group: number | null;
  action: string;
  points: number;
  source_object_type: string;
  source_object_id: number | null;
  event_key: string | null;
  metadata_json: Record<string, unknown>;
  window_date: string | null;
  created_at: string;
};

export type StreakData = {
  user: number;
  total_points_earned: number;
  current_streak_days: number;
  best_streak_days: number;
  last_checkin_date: string | null;
  updated_at: string;
  level: number;
  level_floor_points: number;
  next_level_points: number;
  points_into_level: number;
  points_to_next_level: number;
};

export type Badge = {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  is_active: boolean;
  created_at: string;
};

export type UserBadge = {
  id: number;
  user: number;
  badge: Badge;
  awarded_at: string;
  source_object_type: string;
  source_object_id: number | null;
  trigger_event: number | null;
};

export type MonthlyTarget = {
  id: number;
  user: number;
  target_type: string;
  title: string;
  month_start: string;
  target_value: number;
  current_value: number;
  status: "active" | "completed" | "expired";
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Group = {
  id: number;
  name: string;
  created_by: number;
  invite_code: string;
  is_private: boolean;
  created_at: string;
  member_count: number;
};

export type GroupMember = {
  id: number;
  group: number;
  user: number;
  username: string;
  role: "admin" | "member";
  joined_at: string;
};

export type GroupInvite = {
  id: number;
  group: number;
  invited_by: number;
  invited_user: number | null;
  invite_code: string;
  status: "pending" | "accepted" | "declined" | "revoked";
  note: string;
  expires_at: string | null;
  accepted_by: number | null;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
  group_name?: string;
  inviter_username?: string;
};

export type LeaderboardEntry = {
  user_id: number;
  username: string;
  role: "admin" | "member";
  points_total: number;
  active_days_count: number;
  reflections_count: number;
  current_streak_days: number;
  best_streak_days: number;
  lifetime_points_total: number;
  level: number;
  rank: number;
};

export type LeaderboardResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  group_id: number;
  group_name: string;
  days: number;
  window_start: string;
  window_end: string;
  member_count: number;
  current_user_rank: number | null;
  results: LeaderboardEntry[];
};

export type CreateMonthlyTargetInput = {
  target_type: string;
  title: string;
  month_start: string;
  target_value: number;
};

export type CreateGroupInput = {
  name: string;
  is_private: boolean;
};

export type CreateTransactionReflectionInput = {
  transaction: number;
  regret_score?: number | null;
  was_worth_it?: boolean | null;
  notes?: string;
};

export type TransactionReflection = {
  id: number;
  user: number;
  transaction: number;
  reflected_at: string;
  regret_score: number | null;
  was_worth_it: boolean | null;
  notes: string;
  reflected_same_day: boolean;
};

export type PeriodicReview = {
  id: number;
  user: number;
  review_type: "weekly" | "monthly";
  period_start: string;
  period_end: string;
  status: "open" | "completed";
  summary_json: Record<string, string>;
  notes: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ReviewSubscription = {
  id: number;
  user: number;
  merchant: number;
  plan_name: string | null;
  status: "active" | "paused" | "canceled";
  billing_cycle: string;
  price: string;
  currency: string;
  started_on: string | null;
  renewal_date: string | null;
  cancelled_on: string | null;
  notes: string | null;
  usage_frequency: number | null;
  reactivation_count: number;
  feedback_value_score: number | null;
  feedback_confidence: number | null;
  subscription_utilization: number | null;
  subscription_cost_benefit: number | null;
  created_at: string;
  updated_at: string;
};

export type ReviewOverview = {
  review: PeriodicReview;
  period_label: string;
  summary_requirements: string[];
  minimum_transactions_required: number;
  reviewed_transaction_count: number;
  pending_transaction_feedback_count: number;
  eligible_to_complete: boolean;
  transaction_candidates: Transaction[];
  upcoming_subscription_renewals: ReviewSubscription[];
  low_value_subscriptions: ReviewSubscription[];
  detail?: string;
  missing_requirements?: string[];
  point_event?: PointEvent;
};

export type ReviewNudge = {
  review_id: number;
  status: "open" | "completed";
  due: boolean;
  period_start: string;
  period_end: string;
  pending_transaction_feedback_count: number;
  reviewed_transaction_count: number;
  eligible_to_complete: boolean;
  upcoming_subscription_renewals_count?: number;
  low_value_subscriptions_count?: number;
};

export type ReviewNudges = {
  weekly: ReviewNudge;
  monthly: ReviewNudge;
};

export const GamificationAPI = {
  getMyStreak: () => apiRequest<StreakData>("/api/gamification/points/my_streak/", { requireAuth: true }),

  completeWeeklyReview: (reviewDate?: string) =>
    apiRequest<PointEvent>("/api/gamification/points/complete_weekly_review/", {
      requireAuth: true,
      method: "POST",
      body: JSON.stringify(reviewDate ? { review_date: reviewDate } : {}),
    }),

  completeMonthlyReview: (month?: string) =>
    apiRequest<PointEvent>("/api/gamification/points/complete_monthly_review/", {
      requireAuth: true,
      method: "POST",
      body: JSON.stringify(month ? { month } : {}),
    }),

  getBadges: () => apiRequest<Badge[]>("/api/gamification/badges/", { requireAuth: true }),

  getUserBadges: () => apiRequest<UserBadge[]>("/api/gamification/user-badges/", { requireAuth: true }),

  getMonthlyTargets: () => apiRequest<MonthlyTarget[]>("/api/gamification/monthly-targets/", { requireAuth: true }),

  createMonthlyTarget: (data: CreateMonthlyTargetInput) =>
    apiRequest<MonthlyTarget>("/api/gamification/monthly-targets/", {
      requireAuth: true,
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateTargetProgress: (targetId: number, amount: number) =>
    apiRequest<MonthlyTarget>(`/api/gamification/monthly-targets/${targetId}/progress/`, {
      requireAuth: true,
      method: "POST",
      body: JSON.stringify({ amount }),
    }),

  getGroups: () => apiRequest<Group[]>("/api/gamification/groups/", { requireAuth: true }),

  createGroup: (data: CreateGroupInput) =>
    apiRequest<Group>("/api/gamification/groups/", {
      requireAuth: true,
      method: "POST",
      body: JSON.stringify(data),
    }),

  joinGroup: (inviteCode: string) =>
    apiRequest<{ detail: string; group_id: number }>("/api/gamification/groups/join/", {
      requireAuth: true,
      method: "POST",
      body: JSON.stringify({ invite_code: inviteCode }),
    }),

  leaveGroup: (groupId: number) =>
    apiRequest<{ detail: string; group_deleted: boolean }>(`/api/gamification/groups/${groupId}/leave/`, {
      requireAuth: true,
      method: "POST",
    }),

  getGroupMembers: (groupId: number) =>
    apiRequest<GroupMember[]>(`/api/gamification/groups/${groupId}/members/`, { requireAuth: true }),

  updateMemberRole: (groupId: number, membershipId: number, role: "admin" | "member") =>
    apiRequest<GroupMember>(`/api/gamification/groups/${groupId}/update_member_role/`, {
      requireAuth: true,
      method: "POST",
      body: JSON.stringify({ membership_id: membershipId, role }),
      audit: {
        eventName: "rbac.group_member_role_change",
        action: "update_role",
        resourceType: "group_membership",
        resourceId: membershipId,
        metadata: { group_id: groupId, new_role: role },
      },
    }),

  removeMember: (groupId: number, membershipId: number) =>
    apiRequest<void>(`/api/gamification/groups/${groupId}/remove_member/`, {
      requireAuth: true,
      method: "POST",
      body: JSON.stringify({ membership_id: membershipId }),
      audit: {
        eventName: "admin.group_member_remove",
        action: "remove_member",
        resourceType: "group_membership",
        resourceId: membershipId,
        metadata: { group_id: groupId },
      },
    }),

  getGroupInvites: () => apiRequest<GroupInvite[]>("/api/gamification/group-invites/", { requireAuth: true }),

  createGroupInvite: (data: Record<string, unknown>) =>
    apiRequest<GroupInvite>("/api/gamification/group-invites/", {
      requireAuth: true,
      method: "POST",
      body: JSON.stringify(data),
    }),

  acceptInvite: (inviteId: number) =>
    apiRequest<{ detail: string; group_id: number }>(`/api/gamification/group-invites/${inviteId}/accept/`, {
      requireAuth: true,
      method: "POST",
    }),

  declineInvite: (inviteId: number) =>
    apiRequest<{ detail: string }>(`/api/gamification/group-invites/${inviteId}/decline/`, {
      requireAuth: true,
      method: "POST",
    }),

  deleteInvite: (inviteId: number) =>
    apiRequest<void>(`/api/gamification/group-invites/${inviteId}/`, {
      requireAuth: true,
      method: "DELETE",
      audit: {
        eventName: "admin.group_invite_delete",
        action: "delete_invite",
        resourceType: "group_invite",
        resourceId: inviteId,
      },
    }),

  getLeaderboard: (groupId: number, days = 7, page = 1, pageSize = 10) => {
    const params = new URLSearchParams({
      group_id: String(groupId),
      days: String(days),
      page: String(page),
      page_size: String(pageSize),
    });
    return apiRequest<LeaderboardResponse>(`/api/gamification/points/leaderboard/?${params.toString()}`, {
      requireAuth: true,
    });
  },

  createTransactionReflection: (data: CreateTransactionReflectionInput) =>
    apiRequest<TransactionReflection>("/api/transaction-reflections/", {
      requireAuth: true,
      method: "POST",
      body: JSON.stringify(data),
    }),

  getReviewNudges: () =>
    apiRequest<ReviewNudges>("/api/gamification/reviews/nudges/", { requireAuth: true }),

  getWeeklyReview: (date?: string) => {
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    const query = params.toString();
    return apiRequest<ReviewOverview>(`/api/gamification/reviews/weekly/${query ? `?${query}` : ""}`, {
      requireAuth: true,
    });
  },

  completeWeeklyReviewFlow: (summaryJson: Record<string, string>, options?: { date?: string; notes?: string }) =>
    apiRequest<ReviewOverview>("/api/gamification/reviews/weekly/complete/", {
      requireAuth: true,
      method: "POST",
      body: JSON.stringify({
        summary_json: summaryJson,
        ...(options?.date ? { date: options.date } : {}),
        ...(options?.notes ? { notes: options.notes } : {}),
      }),
    }),

  getMonthlyReview: (month?: string) => {
    const params = new URLSearchParams();
    if (month) params.set("month", month);
    const query = params.toString();
    return apiRequest<ReviewOverview>(`/api/gamification/reviews/monthly/${query ? `?${query}` : ""}`, {
      requireAuth: true,
    });
  },

  completeMonthlyReviewFlow: (summaryJson: Record<string, string>, options?: { month?: string; notes?: string }) =>
    apiRequest<ReviewOverview>("/api/gamification/reviews/monthly/complete/", {
      requireAuth: true,
      method: "POST",
      body: JSON.stringify({
        summary_json: summaryJson,
        ...(options?.month ? { month: options.month } : {}),
        ...(options?.notes ? { notes: options.notes } : {}),
      }),
    }),
};
