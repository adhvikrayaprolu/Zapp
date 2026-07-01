import * as React from "react";
import { Search, Zap, TrendingDown } from "lucide-react";
import { ElectricCard } from "@/features/home";
import { COLORS } from "@/shared/theme";
import { AppButton, AppInput, AppPage, IconBadge, SectionHeader, Surface } from "@/shared/components/system";

export function SearchPage() {
  return (
    <AppPage width="default" spacing="relaxed" className="pt-10">
      <SectionHeader
        level={1}
        align="center"
        eyebrow="Decision support"
        title="Decision Engine"
        titleClassName="app-page-title"
        description="Analyze spending decisions before you commit. Access your personalized value data."
      />

      <Surface variant="overlay" padding="md" className="overflow-hidden">
        <AppInput
          type="text"
          size="hero"
          placeholder="Search for product or service..."
          startAdornment={<Search size={32} className="text-[var(--app-accent-cyan)]" />}
          endAdornment={
            <AppButton variant="hero" size="hero" className="min-w-[10rem]">
              Evaluate
            </AppButton>
          }
          className="border-transparent bg-transparent shadow-none focus-visible:border-transparent focus-visible:ring-0"
        />
      </Surface>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <ElectricCard semanticColor={COLORS.electricGreen} className="p-12" elevation={1}>
          <div className="flex items-center gap-5 mb-10">
            <IconBadge tone="green" size="md">
              <Zap />
            </IconBadge>
            <h4 className="app-section-title text-[1.75rem]">Predicted Optimal Fit</h4>
          </div>
          <div className="space-y-6">
            {[
              { n: "Mechanical Keyboard", s: 96, c: COLORS.electricGreen },
              { n: "AWS Infrastructure", s: 89, c: COLORS.electricGreen },
              { n: "Productivity Suite", s: 92, c: COLORS.electricGreen },
            ].map((item, i) => (
              <Surface key={i} variant="inset" padding="md" className="flex items-center justify-between" style={{ borderColor: `${item.c}22` }}>
                <span className="text-xl font-black text-[var(--app-color-text-secondary)]">{item.n}</span>
                <span className="font-black text-3xl" style={{ color: item.c, filter: `drop-shadow(0 0 10px ${item.c}60)` }}>
                  {item.s}
                </span>
              </Surface>
            ))}
          </div>
        </ElectricCard>

        <ElectricCard semanticColor={COLORS.electricRed} className="p-12" elevation={1}>
          <div className="flex items-center gap-5 mb-10">
            <IconBadge tone="red" size="md">
              <TrendingDown />
            </IconBadge>
            <h4 className="app-section-title text-[1.75rem]">High Regret Risk</h4>
          </div>
          <div className="space-y-6">
            {[
              { n: "Food Delivery", s: 12, c: COLORS.electricRed },
              { n: "Impulse Purchase", s: 31, c: COLORS.electricRed },
              { n: "Micro-subscriptions", s: 24, c: COLORS.electricRed },
            ].map((item, i) => (
              <Surface key={i} variant="inset" padding="md" className="flex items-center justify-between" style={{ borderColor: `${item.c}22` }}>
                <span className="text-xl font-black text-[var(--app-color-text-secondary)]">{item.n}</span>
                <span className="font-black text-3xl" style={{ color: item.c, filter: `drop-shadow(0 0 10px ${item.c}60)` }}>
                  {item.s}
                </span>
              </Surface>
            ))}
          </div>
        </ElectricCard>
      </div>
    </AppPage>
  );
}
