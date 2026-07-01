import { MonthlyTargetsWidget } from "@/features/gamification/components/MonthlyTargetsWidget";
import { SectionHeader } from "@/shared/components/system";

export function TargetsPage() {
  return (
    <div className="space-y-8 pb-32">
      <SectionHeader
        level={1}
        eyebrow="Habit planning"
        title="Monthly Targets"
        titleClassName="app-page-title"
        description="Set habit goals and track progress against the month in flight."
      />
      <MonthlyTargetsWidget />
    </div>
  );
}
