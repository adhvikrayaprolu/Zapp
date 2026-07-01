import * as React from "react";
import { Award } from "lucide-react";

import { GamificationAPI, type UserBadge } from "@/api/gamification.api";
import { BadgeGrid } from "@/features/gamification/components/BadgeDisplay";
import { toast } from "sonner";
import { EmptyState, LoadingState, MetricCard, SectionHeader } from "@/shared/components/system";

export function BadgesPage() {
  const [badges, setBadges] = React.useState<UserBadge[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    GamificationAPI.getUserBadges()
      .then((data) => {
        if (!cancelled) setBadges(data);
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) toast.error("Failed to load badges.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-8 pb-32">
      <SectionHeader
        level={1}
        eyebrow="Gamification"
        title="Badge Cabinet"
        titleClassName="app-page-title"
        description="Earned milestones that reinforce intentional behavior."
      />

      {!loading && badges.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total Badges"
            value={badges.length}
            detail="Visible rewards already unlocked across habits, streaks, and goals."
          />
          <MetricCard
            label="Latest Unlock"
            value={badges[0]?.badge.name ?? "None yet"}
            detail={badges[0] ? new Date(badges[0].awarded_at).toLocaleDateString() : "Keep building momentum."}
          />
        </div>
      )}

      {loading && (
        <LoadingState label="Loading badges..." lines={4} />
      )}

      {!loading && badges.length === 0 && (
        <EmptyState
          icon={<Award size={40} />}
          title="No badges earned yet."
          description="Complete reflections, hit targets, and keep streaks alive to start filling this cabinet."
        />
      )}

      {!loading && badges.length > 0 && <BadgeGrid badges={badges} />}
    </div>
  );
}
