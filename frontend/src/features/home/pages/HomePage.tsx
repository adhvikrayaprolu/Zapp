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
import { DashboardGamification } from "@/features/gamification";
import { COLORS, GLOWS } from "@/shared/theme";
import { useDashboardFeedback } from "@/features/dashboard/context/DashboardFeedbackContext";

export function HomePage() {
  const { openFeedback } = useDashboardFeedback();

  const { transactions, loading: txLoading } = useMergedTransactions({ limit: 6 });

  const recentValueSummary = React.useMemo(() => {
    const scores = transactions
      .map((tx) => deriveTransactionValueScore(tx))
      .filter((score): score is number => score != null);

    if (scores.length === 0) {
      return {
        average: null as number | null,
        label: "No score yet",
        accentColor: COLORS.electricBlue,
        progress: 0,
      };
    }

    const average = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
    const value = getValuePresentation(average);
    return {
      average,
      label: value.label,
      accentColor: value.accentColor,
      progress: average / 150,
    };
  }, [transactions]);

  return (
    <div className="relative z-10 space-y-8 pb-32">
      <DashboardGamification />

      <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
        <ElectricCard className="md:col-span-8 overflow-hidden" semanticColor={COLORS.electricBlue} elevation={1}>
          <div className="flex items-start justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full shadow-[0_0_8px_color-mix(in_srgb,var(--app-accent-blue-soft)_30%,transparent)]" style={{ backgroundColor: "var(--app-accent-blue-soft)" }} />
                <h2 className="app-eyebrow">Financial Health</h2>
              </div>
              <div className="text-6xl font-black tracking-tight text-[var(--app-color-text-primary)]">$2,450.00</div>
              <div className="flex items-center gap-3 text-sm font-bold text-[var(--app-color-text-secondary)]">
                <TrendingUp size={16} className="text-electric-green" style={{ color: COLORS.electricGreen }} />
                <span>Monthly spending is 12% more intentional</span>
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
              <AreaChart data={[
                { n: "1", v: 400 }, { n: "2", v: 380 }, { n: "3", v: 520 }, { n: "4", v: 450 }, { n: "5", v: 600 }, { n: "6", v: 580 }, { n: "7", v: 720 }
              ]}>
                <defs>
                  <linearGradient id="areaGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.electricBlue} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={COLORS.electricBlue} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke={COLORS.electricBlue} strokeWidth={4} fill="url(#areaGlow)" animationDuration={2500} />
                <Tooltip contentStyle={{ backgroundColor: COLORS.bgCard, border: "1px solid var(--app-color-border-strong)", borderRadius: "20px" }} itemStyle={{ color: COLORS.electricBlue, fontWeight: "900" }} />
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
                <div className="text-4xl font-black text-[var(--app-color-text-primary)]">12 Days</div>
                <div className="app-eyebrow">Intentional Streak</div>
              </div>
            </div>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[var(--app-color-surface-inset)]">
              <motion.div initial={{ width: 0 }} animate={{ width: "85%" }} className="h-full rounded-full" style={{ backgroundColor: "var(--app-accent-cyan-soft)", boxShadow: `0 0 10px ${COLORS.electricCyan}66` }} />
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
                <div className="text-4xl font-black text-[var(--app-color-text-primary)]">3 Alerts</div>
                <div className="app-eyebrow">Spending Alerts</div>
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
            <h3 className="app-card-title">Category Breakdown</h3>
          </div>
          <div className="h-64 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: "High Value", value: 65, color: COLORS.electricGreen },
                    { name: "Regret", value: 15, color: COLORS.electricRed },
                    { name: "Utility", value: 20, color: COLORS.electricBlue },
                  ]}
                  innerRadius={75}
                  outerRadius={95}
                  paddingAngle={10}
                  dataKey="value"
                  stroke="none"
                >
                  {[0, 1, 2].map((i) => (
                    <Cell key={i} fill={[COLORS.electricGreen, COLORS.electricRed, COLORS.electricBlue][i]} style={{ filter: `drop-shadow(0 0 8px ${[COLORS.electricGreen, COLORS.electricRed, COLORS.electricBlue][i]}40)` }} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center">
              <div className="app-eyebrow">Status</div>
              <div className="text-xl font-black text-[var(--app-color-text-primary)]">Optimized</div>
            </div>
          </div>
          <div className="mt-12 space-y-3">
            {[
              { label: "Intentionality", val: 88, color: COLORS.electricGreen },
              { label: "Regret Risk", val: 12, color: COLORS.electricRed },
              { label: "Utility Focus", val: 74, color: COLORS.electricBlue },
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

{!txLoading && transactions.length === 0 && (
  <EmptyState
    title="No purchases logged yet"
    description="Add your first purchase to start tracking your value score."
  />
)}

{!txLoading && transactions.map((item) => {
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
