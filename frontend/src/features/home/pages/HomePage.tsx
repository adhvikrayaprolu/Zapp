import * as React from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { TrendingUp, AlertCircle, Sparkles, TrendingDown, ChevronRight } from "lucide-react";
import { useMergedTransactions } from "@/features/transactions/hooks/useMergedTransactions";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { AppButton, EmptyState, IconBadge, LoadingState, StatusChip } from "@/shared/components/system";
import { cn } from "@/shared/components/ui/utils";
import { formatLocalDateYYYYMMDD, getLocalDateKey, parseDateForDisplay } from "@/shared/date";
import { deriveTransactionValueScore } from "@/shared/transaction-valuation";
import { getValuePresentation } from "@/shared/valuation";
import { ElectricCard } from "../components/ElectricCard";
import { computeHomeMetrics } from "../utils/homeMetrics";
import { DashboardGamification } from "@/features/gamification";
import { COLORS, GLOWS } from "@/shared/theme";
import { useDashboardFeedback } from "@/features/dashboard/context/DashboardFeedbackContext";

const HOME_TRANSACTION_LIMIT = 300;
const RECENT_TRANSACTION_COUNT = 6;
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function HomePage() {
  const { openFeedback } = useDashboardFeedback();

  const { transactions, loading: txLoading } = useMergedTransactions({ limit: HOME_TRANSACTION_LIMIT });
  const recentTransactions = React.useMemo(
    () =>
      [...transactions]
        .sort((a, b) => parseDateForDisplay(b.occurred_at).getTime() - parseDateForDisplay(a.occurred_at).getTime())
        .slice(0, RECENT_TRANSACTION_COUNT),
    [transactions]
  );
  const metrics = React.useMemo(() => computeHomeMetrics(transactions), [transactions]);

  const recentValueSummary = React.useMemo(() => {
    const average = metrics.averageScore;
    if (average == null) {
      return {
        average: null as number | null,
        label: "No score yet",
        accentColor: COLORS.electricBlue,
        progress: 0,
      };
    }

    const value = getValuePresentation(average);
    return {
      average,
      label: value.label,
      accentColor: value.accentColor,
      progress: average / 150,
    };
  }, [metrics.averageScore]);

  const pct = (count: number) => (metrics.scoredCount > 0 ? Math.round((count / metrics.scoredCount) * 100) : 0);
  const tierBreakdown = [
    { name: "High Value", value: metrics.highValueCount, color: COLORS.electricGreen },
    { name: "On Target", value: metrics.onTargetCount, color: COLORS.electricBlue },
    { name: "Below Target", value: metrics.belowTargetCount, color: COLORS.electricRed },
  ];
  const SpendTrendIcon = metrics.spendChangePct != null && metrics.spendChangePct > 0 ? TrendingUp : TrendingDown;

  return (
    <div className="relative z-10 space-y-8 pb-32">
      <DashboardGamification />

      <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
        <ElectricCard className="md:col-span-8 overflow-hidden" semanticColor={COLORS.electricBlue} elevation={1}>
          <div className="flex items-start justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full shadow-[0_0_8px_color-mix(in_srgb,var(--app-accent-blue-soft)_30%,transparent)]" style={{ backgroundColor: "var(--app-accent-blue-soft)" }} />
                <h2 className="app-eyebrow">Spent this month</h2>
              </div>
              <div className="text-6xl font-black tracking-tight text-[var(--app-color-text-primary)]">
                {currency.format(metrics.monthSpend)}
              </div>
              <div className="flex items-center gap-3 text-sm font-bold text-[var(--app-color-text-secondary)]">
                {metrics.spendChangePct != null && (
                  <SpendTrendIcon
                    size={16}
                    style={{ color: metrics.spendChangePct > 0 ? COLORS.electricRed : COLORS.electricGreen }}
                  />
                )}
                <span>
                  {metrics.purchaseCount} {metrics.purchaseCount === 1 ? "purchase" : "purchases"}
                  {metrics.spendChangePct != null &&
                    ` · ${Math.abs(metrics.spendChangePct)}% ${metrics.spendChangePct > 0 ? "more" : "less"} than this point last month`}
                </span>
              </div>
            </div>
            <div className="relative group/meter">
              <svg className="w-40 h-40 transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="72"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  className="text-[var(--app-color-border-subtle)]"
                />
                <motion.circle
                  cx="80" cy="80" r="72"
                  stroke={recentValueSummary.accentColor}
                  strokeWidth="12"
                  strokeDasharray={452}
                  initial={{ strokeDashoffset: 452 }}
                  animate={{ strokeDashoffset: 452 * (1 - recentValueSummary.progress) }}
                  transition={{ duration: 2, ease: [0.23, 1, 0.32, 1] }}
                  strokeLinecap="round"
                  fill="transparent"
                  style={{ filter: `drop-shadow(0 0 10px ${recentValueSummary.accentColor}66)` }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-[var(--app-color-text-primary)]">
                  {recentValueSummary.average ?? "—"}
                </span>
                <span
                  className="text-[10px] uppercase font-black tracking-[0.2em]"
                  style={{ color: recentValueSummary.average == null ? "var(--app-color-text-tertiary)" : recentValueSummary.accentColor }}
                >
                  {recentValueSummary.average == null ? "No score" : recentValueSummary.label}
                </span>
              </div>
            </div>
          </div>
          <div className="h-48 mt-12">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.dailySpend}>
                <defs>
                  <linearGradient id="areaGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.electricBlue} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={COLORS.electricBlue} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="spend" name="Spent" stroke={COLORS.electricBlue} strokeWidth={4} fill="url(#areaGlow)" animationDuration={2500} />
                <Tooltip
                  formatter={(value) => currency.format(Number(value))}
                  labelFormatter={(_, payload) => {
                    const day = payload?.[0]?.payload?.day as string | undefined;
                    return day ? parseDateForDisplay(day).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
                  }}
                  contentStyle={{ backgroundColor: COLORS.bgCard, border: "1px solid var(--app-color-border-strong)", borderRadius: "20px" }}
                  itemStyle={{ color: COLORS.electricBlue, fontWeight: "900" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ElectricCard>
        <div className="flex flex-col gap-8 md:col-span-4">
          <ElectricCard className="flex-1 flex flex-col justify-center gap-2" semanticColor={COLORS.electricCyan} glowIntensity="soft" elevation={1}>
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center border border-[var(--app-color-border-subtle)]"
                style={{ backgroundColor: `${COLORS.electricCyan}12`, boxShadow: GLOWS.soft(COLORS.electricCyan) }}
              >
                <TrendingUp size={28} style={{ color: COLORS.electricCyan }} />
              </div>
              <div>
                <div className="text-4xl font-black text-[var(--app-color-text-primary)]">{metrics.highValueCount}</div>
                <div className="app-eyebrow">High-value buys this month</div>
              </div>
            </div>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[var(--app-color-surface-inset)]">
              <motion.div initial={{ width: 0 }} animate={{ width: `${pct(metrics.highValueCount)}%` }} className="h-full rounded-full" style={{ backgroundColor: "var(--app-accent-cyan-soft)", boxShadow: `0 0 10px ${COLORS.electricCyan}66` }} />
            </div>
          </ElectricCard>
          <ElectricCard className="flex-1 flex flex-col justify-center gap-2" semanticColor={COLORS.electricRed} elevation={1}>
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center border border-[var(--app-color-border-subtle)]"
                style={{ backgroundColor: `${COLORS.electricRed}12`, boxShadow: GLOWS.soft(COLORS.electricRed) }}
              >
                <AlertCircle size={28} style={{ color: COLORS.electricRed }} />
              </div>
              <div>
                <div className="text-4xl font-black text-[var(--app-color-text-primary)]">{metrics.belowTargetCount}</div>
                <div className="app-eyebrow">Below-target buys this month</div>
              </div>
            </div>
          </ElectricCard>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <ElectricCard className="lg:col-span-4" semanticColor={COLORS.electricTeal} elevation={1}>
          <div className="flex items-center gap-2 mb-10">
            <IconBadge tone="green" size="sm">
              <Sparkles size={16} style={{ color: COLORS.electricTeal }} />
            </IconBadge>
            <h3 className="app-card-title">Value Breakdown</h3>
          </div>
          <div className="h-64 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tierBreakdown}
                  innerRadius={75}
                  outerRadius={95}
                  paddingAngle={10}
                  dataKey="value"
                  stroke="none"
                >
                  {tierBreakdown.map((slice) => (
                    <Cell key={slice.name} fill={slice.color} style={{ filter: `drop-shadow(0 0 8px ${slice.color}40)` }} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center">
              <div className="app-eyebrow">This month</div>
              <div className="text-xl font-black text-[var(--app-color-text-primary)]">
                {metrics.scoredCount > 0 ? recentValueSummary.label : "No scores yet"}
              </div>
            </div>
          </div>
          <div className="mt-12 space-y-3">
            {[
              { label: "High value", val: pct(metrics.highValueCount), color: COLORS.electricGreen },
              { label: "On target", val: pct(metrics.onTargetCount), color: COLORS.electricBlue },
              { label: "Below target", val: pct(metrics.belowTargetCount), color: COLORS.electricRed },
            ].map((stat, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-2xl border border-[var(--app-color-border-subtle)] bg-[var(--app-color-surface-inset)] p-4"
              >
                <span className="text-xs font-black uppercase tracking-widest text-[var(--app-color-text-tertiary)]">{stat.label}</span>
                <span className="text-lg font-black" style={{ color: stat.color }}>{stat.val}%</span>
              </div>
            ))}
          </div>
        </ElectricCard>

        <ElectricCard className="lg:col-span-8 overflow-hidden" semanticColor={COLORS.electricGreen} elevation={1}>
          <div className="flex items-center justify-between mb-10">
            <h3 className="app-card-title text-xl">Recent Spending History</h3>
            <AppButton variant="quietAccent" size="sm" className="px-0" asChild>
              <Link to="/transactions">View Timeline</Link>
            </AppButton>
          </div>
          <div className="space-y-4">
            {txLoading && (
  <LoadingState label="Loading transactions..." lines={3} compact />
)}

{!txLoading && recentTransactions.length === 0 && (
  <EmptyState
    title="No purchases logged yet"
    description="Add your first purchase to start tracking your value score."
  />
)}

{!txLoading && recentTransactions.map((item) => {
  const score = deriveTransactionValueScore(item);
  const value = getValuePresentation(score);

  const isRegret = item.regret_score != null
    ? item.regret_score > 0.5
    : score != null && score < 80;

  const timeAgo = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const itemDate = parseDateForDisplay(getLocalDateKey(item.occurred_at));
    itemDate.setHours(0, 0, 0, 0);

    const todayKey = formatLocalDateYYYYMMDD(today);
    const itemKey = formatLocalDateYYYYMMDD(itemDate);
    const days = Math.round((today.getTime() - itemDate.getTime()) / 86400000);

    if (itemKey === todayKey) return "Today";
    if (days < 0) return "Today";
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  })();

  return (
    <div
      key={item.id}
      role="button"
      tabIndex={0}
      onClick={() => openFeedback(item, "manual")}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openFeedback(item, "manual");
        }
      }}
      className="relative flex cursor-pointer items-center justify-between rounded-[2.5rem] border border-[var(--app-color-border-subtle)] bg-[var(--app-color-surface-inset)] p-6 transition-all"
    >
      <div className="flex items-center gap-8">
        <div
          className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center border transition-all"
          style={{
            color: isRegret ? COLORS.electricRed : COLORS.electricGreen,
            backgroundColor: isRegret ? `${COLORS.electricRed}15` : `${COLORS.electricGreen}15`,
            borderColor: isRegret ? `${COLORS.electricRed}33` : `${COLORS.electricGreen}33`,
            boxShadow: isRegret ? GLOWS.soft(COLORS.electricRed) : GLOWS.soft(COLORS.electricGreen),
          }}
        >
          {isRegret ? <TrendingDown size={32} /> : <TrendingUp size={32} />}
        </div>
        <div>
          <div className="text-2xl font-black tracking-tight text-[var(--app-color-text-primary)]">
            {item.description_raw || item.category}
          </div>
          <div className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--app-color-text-tertiary)]">
            {timeAgo} • ${Number(item.amount).toFixed(2)}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-10">
        <div className="text-right">
          {score != null ? (
            <>
              <div
                className="text-4xl font-black tracking-tighter"
                style={{
                  color: value.accentColor,
                  filter: `drop-shadow(0 0 8px ${value.accentColor}55)`,
                }}
              >
                {value.displayScoreText}
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-widest font-black" style={{ color: value.accentColor }}>
                {value.label}
              </div>
              {value.overflowText ? (
                 <div className="mt-1 text-[10px] font-bold text-[var(--app-accent-blue-soft)]">
                   {value.overflowText.replace("+", "")} above target
                 </div>
              ) : null}
            </>
          ) : (
            <StatusChip tone="neutral">No score</StatusChip>
          )}
        </div>
        <ChevronRight size={24} className="text-[var(--app-color-text-faint)]" />
      </div>
    </div>
  );
})}
          </div>
        </ElectricCard>
      </div>
    </div>
  );
}
