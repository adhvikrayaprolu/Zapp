import * as React from "react";
import { motion } from "motion/react";
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Crown,
  LogOut,
  Plus,
  Shield,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";

import { GamificationAPI, type Group, type GroupInvite, type GroupMember, type LeaderboardResponse } from "@/api/gamification.api";
import { useAuth } from "@/features/auth";
import { ElectricCard } from "@/features/home/components/ElectricCard";
import { COLORS } from "@/shared/theme";
import { cn } from "@/shared/components/ui/utils";
import { toast } from "sonner";
import {
  AppButton,
  AppDialog,
  AppDialogBody,
  AppDialogContent,
  AppDialogDescription,
  AppDialogFooter,
  AppDialogHeader,
  AppDialogTitle,
  AppInput,
  AppSwitch,
  EmptyState,
  FormField,
  LoadingState,
  MetricCard,
  SectionHeader,
  StatusChip,
  Surface,
} from "@/shared/components/system";

function formatDateLabel(value: string) {
  return new Date(value).toLocaleDateString();
}

export function CirclesPage() {
  const { backendUser } = useAuth();
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = React.useState<number | null>(null);
  const [members, setMembers] = React.useState<GroupMember[]>([]);
  const [leaderboard, setLeaderboard] = React.useState<LeaderboardResponse | null>(null);
  const [invites, setInvites] = React.useState<GroupInvite[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [days, setDays] = React.useState(7);
  const [page, setPage] = React.useState(1);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isJoinOpen, setIsJoinOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const selectedGroupRequestRef = React.useRef(0);

  const selectedGroup = groups.find((group) => group.id === selectedGroupId) ?? null;
  const isAdmin = members.some((member) => member.user === backendUser?.id && member.role === "admin");

  const loadBaseData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [groupResult, inviteResult] = await Promise.allSettled([
        GamificationAPI.getGroups(),
        GamificationAPI.getGroupInvites(),
      ]);
      const groupData = groupResult.status === "fulfilled" ? groupResult.value : [];
      const inviteData = inviteResult.status === "fulfilled" ? inviteResult.value : [];

      if (groupResult.status !== "fulfilled") {
        throw groupResult.reason;
      }

      if (inviteResult.status !== "fulfilled") {
        console.error(inviteResult.reason);
        toast.error("Group invites are unavailable right now.");
      }

      setGroups(groupData);
      setInvites(inviteData.filter((invite) => invite.status === "pending"));
      setSelectedGroupId((current) => (
        current && groupData.some((group) => group.id === current)
          ? current
          : (groupData[0]?.id ?? null)
      ));
    } catch (error) {
      console.error(error);
      toast.error("Failed to load circles.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSelectedGroup = React.useCallback(async () => {
    if (!selectedGroupId) {
      setMembers([]);
      setLeaderboard(null);
      return;
    }

    const requestId = selectedGroupRequestRef.current + 1;
    selectedGroupRequestRef.current = requestId;

    try {
      const [memberData, leaderboardData] = await Promise.all([
        GamificationAPI.getGroupMembers(selectedGroupId),
        GamificationAPI.getLeaderboard(selectedGroupId, days, page, 10),
      ]);

      if (selectedGroupRequestRef.current !== requestId) {
        return;
      }

      setMembers(memberData);
      setLeaderboard(leaderboardData);
    } catch (error) {
      if (selectedGroupRequestRef.current !== requestId) {
        return;
      }
      console.error(error);
      toast.error("Failed to load circle details.");
    }
  }, [days, page, selectedGroupId]);

  React.useEffect(() => {
    void loadBaseData();
  }, [loadBaseData]);

  React.useEffect(() => {
    void loadSelectedGroup();
  }, [loadSelectedGroup]);

  const handleCreate = async (name: string, isPrivate: boolean) => {
    try {
      const created = await GamificationAPI.createGroup({ name, is_private: isPrivate });
      toast.success("Circle created.");
      setIsCreateOpen(false);
      await loadBaseData();
      setSelectedGroupId(created.id);
    } catch (error) {
      console.error(error);
      toast.error("Failed to create circle.");
    }
  };

  const handleJoin = async (inviteCode: string) => {
    try {
      await GamificationAPI.joinGroup(inviteCode);
      toast.success("Joined circle.");
      setIsJoinOpen(false);
      await loadBaseData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to join circle.");
      throw error;
    }
  };

  const handleLeave = async () => {
    if (!selectedGroup) return;
    try {
      await GamificationAPI.leaveGroup(selectedGroup.id);
      toast.success("Left circle.");
      await loadBaseData();
      setPage(1);
    } catch (error) {
      console.error(error);
      toast.error("Failed to leave circle.");
    }
  };

  const handleAcceptInvite = async (inviteId: number) => {
    try {
      await GamificationAPI.acceptInvite(inviteId);
      toast.success("Invite accepted.");
      await loadBaseData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to accept invite.");
    }
  };

  const handleDeclineInvite = async (inviteId: number) => {
    try {
      await GamificationAPI.declineInvite(inviteId);
      toast.success("Invite declined.");
      await loadBaseData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to decline invite.");
    }
  };

  const handlePromote = async (membershipId: number) => {
    if (!selectedGroup) return;
    try {
      await GamificationAPI.updateMemberRole(selectedGroup.id, membershipId, "admin");
      toast.success("Member promoted.");
      await loadSelectedGroup();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update role.");
    }
  };

  const handleRemoveMember = async (membershipId: number) => {
    if (!selectedGroup) return;
    try {
      await GamificationAPI.removeMember(selectedGroup.id, membershipId);
      toast.success("Member removed.");
      await loadSelectedGroup();
    } catch (error) {
      console.error(error);
      toast.error("Failed to remove member.");
    }
  };

  const copyInviteCode = async () => {
    if (!selectedGroup?.invite_code) return;
    try {
      await navigator.clipboard.writeText(selectedGroup.invite_code);
      setCopied(true);
      toast.success("Invite code copied.");
      window.setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error(error);
      toast.error("Failed to copy invite code.");
    }
  };

  return (
    <div className="space-y-10 pb-32">
      <SectionHeader
        level={1}
        eyebrow="Gamification"
        title="Circles"
        titleClassName="app-page-title"
        description="Rolling leaderboards for accountability, streaks, and better spending habits."
        action={
          <div className="flex items-center gap-3">
          <AppButton
            onClick={() => setIsJoinOpen(true)}
            variant="outline"
          >
            <UserPlus size={16} />
            Join
          </AppButton>
          <AppButton
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus size={16} />
            Create
          </AppButton>
        </div>
        }
      />

      {invites.length > 0 && (
        <ElectricCard semanticColor={COLORS.electricYellow} elevation={1} className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <AlertCircle size={18} className="text-yellow-400" />
            <h2 className="text-lg font-black text-[var(--app-color-text-primary)]">Pending Invites</h2>
          </div>
          <div className="space-y-3">
            {invites.map((invite) => (
              <Surface
                key={invite.id}
                variant="inset"
                padding="sm"
                className="flex items-center justify-between rounded-[1.6rem]"
              >
                <div>
                  <div className="font-black text-[var(--app-color-text-primary)]">
                    {invite.group_name ?? `Circle #${invite.group}`}
                  </div>
                  <div className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-[var(--app-color-text-tertiary)]">
                    {invite.inviter_username ?? "Pending invite"} {invite.note ? `• ${invite.note}` : ""}
                  </div>
                </div>
                <div className="flex gap-2">
                  <AppButton onClick={() => handleAcceptInvite(invite.id)} variant="success">
                    Accept
                  </AppButton>
                  <AppButton onClick={() => handleDeclineInvite(invite.id)} variant="outline">
                    Decline
                  </AppButton>
                </div>
              </Surface>
            ))}
          </div>
        </ElectricCard>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-4">
          <div className="app-eyebrow">My Circles</div>
          {loading && (
            <LoadingState label="Loading circles..." lines={3} compact />
          )}
          {!loading && groups.length === 0 && (
            <EmptyState
              icon={<Users size={36} />}
              title="No circles yet."
              description="Create one or join an existing group to view rankings and members."
            />
          )}
          {groups.map((group) => (
            <AppButton
              key={group.id}
              onClick={() => {
                setSelectedGroupId(group.id);
                setPage(1);
              }}
              variant="outline"
              size="lg"
              className={cn(
                "h-auto w-full rounded-[2rem] p-5 text-left transition-all",
                selectedGroupId === group.id
                  ? "justify-start border-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_28%,var(--app-color-border-strong))] bg-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_8%,var(--app-color-surface-base))] text-[var(--app-color-text-primary)]"
                  : "justify-start border-[var(--app-color-border-subtle)] bg-[var(--app-color-surface-base)]",
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-black text-[var(--app-color-text-primary)]">{group.name}</h3>
                {selectedGroupId === group.id && (
                  <span
                    aria-hidden="true"
                    className="inline-flex size-3 items-center justify-center rounded-full border border-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_32%,transparent)] bg-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_12%,transparent)]"
                  >
                    <span className="size-1.5 rounded-full bg-[var(--app-accent-cyan-soft)] shadow-[0_0_10px_color-mix(in_srgb,var(--app-accent-cyan-soft)_30%,transparent)]" />
                  </span>
                )}
              </div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--app-color-text-tertiary)]">
                {group.member_count} members • {group.is_private ? "private" : "public"}
              </div>
            </AppButton>
          ))}
        </div>

        <div className="space-y-8 lg:col-span-8">
          {!selectedGroup && (
            <EmptyState
              icon={<Users size={52} />}
              title="Pick a circle"
              description="Select a circle or create a new one to view rankings and members."
            />
          )}

          {selectedGroup && (
            <>
              <ElectricCard semanticColor={COLORS.electricCyan} elevation={2} className="p-8">
                <div className="mb-6 flex items-start justify-between gap-6">
                  <div>
                    <h2 className="text-3xl font-black text-[var(--app-color-text-primary)]">{selectedGroup.name}</h2>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <StatusChip tone="neutral">{selectedGroup.member_count} members</StatusChip>
                      <StatusChip tone={selectedGroup.is_private ? "accent" : "info"}>
                        {selectedGroup.is_private ? "Private" : "Public"}
                      </StatusChip>
                    </div>
                  </div>
                  <AppButton
                    onClick={handleLeave}
                    variant="quietDanger"
                  >
                    <LogOut size={16} />
                    Leave
                  </AppButton>
                </div>

                <Surface variant="inset" padding="md" className="rounded-[1.8rem]">
                  <div className="mb-2 text-[10px] font-black uppercase tracking-[0.24em] text-[var(--app-color-text-tertiary)]">
                    Invite Code
                  </div>
                  <div className="flex items-center gap-3">
                    <code className="flex-1 text-lg font-black text-[var(--app-accent-cyan-soft)]">{selectedGroup.invite_code}</code>
                    <AppButton onClick={copyInviteCode} variant="info">
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </AppButton>
                  </div>
                </Surface>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <MetricCard
                    label="Current Window"
                    value={`${days} days`}
                    detail="Leaderboard scope for accountability and streak tracking."
                  />
                  <MetricCard
                    label="Your Rank"
                    value={leaderboard?.current_user_rank ? `#${leaderboard.current_user_rank}` : "Unranked"}
                    detail={leaderboard?.window_end ? `Updated through ${formatDateLabel(leaderboard.window_end)}` : "No scoring window loaded yet."}
                  />
                  <MetricCard
                    label="Leaderboard Entries"
                    value={leaderboard?.count ?? 0}
                    detail="Paginated positions available in this circle."
                  />
                </div>
              </ElectricCard>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-2xl font-black text-[var(--app-color-text-primary)]">
                    <Trophy size={20} className="text-yellow-400" />
                    Weekly Leaderboard
                  </h2>
                  <div className="flex gap-2">
                    {[7, 30, 90].map((window) => (
                      <AppButton
                        key={window}
                        onClick={() => {
                          setDays(window);
                          setPage(1);
                        }}
                        variant={days === window ? "quietAccent" : "outline"}
                        className={cn(
                          "rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em]",
                          days === window
                            ? "border-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_12%,transparent)] text-[var(--app-accent-cyan-soft)] hover:bg-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_18%,transparent)]"
                            : "",
                        )}
                      >
                        {window}d
                      </AppButton>
                    ))}
                  </div>
                </div>

                <Surface variant="card" padding="none" className="overflow-hidden">
                  {leaderboard?.results.length ? (
                    <div className="space-y-3 p-3">
                      {leaderboard.results.map((entry, index) => (
                        <motion.div
                          key={entry.user_id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.04 }}
                        >
                          <Surface
                            variant="inset"
                            padding="md"
                            className={cn(
                              "flex items-center gap-5",
                              entry.rank === leaderboard.current_user_rank &&
                                 "border-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_28%,transparent)] bg-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_8%,var(--app-color-surface-inset))]",
                            )}
                          >
                            <div className="w-10 text-center">
                              {entry.rank === 1 ? (
                                <Crown size={22} className="mx-auto text-yellow-400" />
                              ) : (
                                <div className="text-lg font-black text-[var(--app-color-text-secondary)]">#{entry.rank}</div>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-lg font-black text-[var(--app-color-text-primary)]">{entry.username}</span>
                                {entry.role === "admin" && <Shield size={14} className="text-[var(--app-accent-purple-soft)]" />}
                                {entry.rank === leaderboard.current_user_rank && <StatusChip tone="info">You</StatusChip>}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <StatusChip tone="neutral">Level {entry.level}</StatusChip>
                                <StatusChip tone="success">{entry.current_streak_days}d streak</StatusChip>
                                <StatusChip tone="warning">{entry.reflections_count} reflections</StatusChip>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-black text-[var(--app-accent-cyan-soft)]">{entry.points_total}</div>
                              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--app-color-text-tertiary)]">
                                points
                              </div>
                            </div>
                          </Surface>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={<Trophy size={32} />}
                      title="No leaderboard activity yet."
                      description="Points will appear here once members start completing reflections and streak actions."
                    />
                  )}

                  {leaderboard && (leaderboard.next || leaderboard.previous) && (
                    <div className="flex items-center justify-between border-t border-[var(--app-color-border-subtle)] px-5 py-4">
                      <AppButton
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                        disabled={!leaderboard.previous}
                        variant="outline"
                        className="rounded-2xl"
                      >
                        <ChevronLeft size={16} />
                        Previous
                      </AppButton>
                      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--app-color-text-tertiary)]">
                        Page {page}
                      </div>
                      <AppButton
                        onClick={() => setPage((current) => current + 1)}
                        disabled={!leaderboard.next}
                        variant="outline"
                        className="rounded-2xl"
                      >
                        Next
                        <ChevronRight size={16} />
                      </AppButton>
                    </div>
                  )}
                </Surface>
              </section>

              <section className="space-y-4">
                <h2 className="flex items-center gap-2 text-2xl font-black text-[var(--app-color-text-primary)]">
                  <Users size={20} className="text-[var(--app-accent-purple-soft)]" />
                  Members
                </h2>
                <Surface variant="card" padding="none" className="overflow-hidden">
                  {members.map((member) => {
                    const isCurrentUser = member.user === backendUser?.id;
                    return (
                      <div key={member.id} className="flex items-center justify-between border-b border-[var(--app-color-border-subtle)] px-6 py-5 last:border-b-0">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-base font-black text-[var(--app-color-text-primary)]">{member.username}</span>
                            {member.role === "admin" && <Shield size={14} className="text-[var(--app-accent-purple-soft)]" />}
                            {isCurrentUser && <StatusChip tone="info">You</StatusChip>}
                            <StatusChip tone={member.role === "admin" ? "accent" : "neutral"}>{member.role}</StatusChip>
                          </div>
                          <div className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-[var(--app-color-text-tertiary)]">
                            Joined {formatDateLabel(member.joined_at)}
                          </div>
                        </div>

                        {isAdmin && !isCurrentUser && member.role !== "admin" && (
                          <div className="flex gap-2">
                            <AppButton
                              onClick={() => handlePromote(member.id)}
                              variant="outline"
                              className="rounded-2xl"
                            >
                              Promote
                            </AppButton>
                            <AppButton
                              onClick={() => handleRemoveMember(member.id)}
                              variant="danger"
                              className="rounded-2xl"
                            >
                              Remove
                            </AppButton>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </Surface>
              </section>
            </>
          )}
        </div>
      </div>

      <CreateCircleDialog isOpen={isCreateOpen} onOpenChange={setIsCreateOpen} onCreate={handleCreate} />
      <JoinCircleDialog isOpen={isJoinOpen} onOpenChange={setIsJoinOpen} onJoin={handleJoin} />
    </div>
  );
}

function CreateCircleDialog({
  isOpen,
  onOpenChange,
  onCreate,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, isPrivate: boolean) => Promise<void>;
}) {
  const [name, setName] = React.useState("");
  const [isPrivate, setIsPrivate] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    try {
      setSubmitting(true);
      await onCreate(name.trim(), isPrivate);
      setName("");
      setIsPrivate(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppDialog open={isOpen} onOpenChange={onOpenChange}>
      <AppDialogContent className="max-w-lg">
        <AppDialogHeader>
          <AppDialogTitle>Create Circle</AppDialogTitle>
          <AppDialogDescription>
            Start a private accountability group and invite members with a code.
          </AppDialogDescription>
        </AppDialogHeader>
        <AppDialogBody>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <FormField label="Circle Name">
            <AppInput
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Budget Warriors"
            />
          </FormField>
          <Surface variant="inset" padding="md" className="rounded-[1.6rem]">
            <AppSwitch
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
              label="Private Circle"
              description="Members join with the invite code."
            />
          </Surface>
          <AppDialogFooter className="px-0 pb-0">
            <AppButton type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Circle"}
            </AppButton>
          </AppDialogFooter>
        </form>
        </AppDialogBody>
      </AppDialogContent>
    </AppDialog>
  );
}

function JoinCircleDialog({
  isOpen,
  onOpenChange,
  onJoin,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onJoin: (inviteCode: string) => Promise<void>;
}) {
  const [inviteCode, setInviteCode] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!inviteCode.trim()) return;
    try {
      setSubmitting(true);
      await onJoin(inviteCode.trim());
      setInviteCode("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppDialog open={isOpen} onOpenChange={onOpenChange}>
      <AppDialogContent className="max-w-lg">
        <AppDialogHeader>
          <AppDialogTitle>Join Circle</AppDialogTitle>
          <AppDialogDescription>
            Paste an invite code to join an existing accountability group.
          </AppDialogDescription>
        </AppDialogHeader>
        <AppDialogBody>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <FormField label="Invite Code">
            <AppInput
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
              placeholder="abc123xyz"
              className="font-mono"
            />
          </FormField>
          <AppDialogFooter className="px-0 pb-0">
            <AppButton type="submit" disabled={submitting}>
              {submitting ? "Joining..." : "Join Circle"}
            </AppButton>
          </AppDialogFooter>
        </form>
        </AppDialogBody>
      </AppDialogContent>
    </AppDialog>
  );
}
