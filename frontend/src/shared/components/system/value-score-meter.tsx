import { COLORS } from "@/shared/theme";
import { cn } from "@/shared/components/ui/utils";

type ValueScoreMeterProps = {
  score: number;
  className?: string;
  /** From value presentation (e.g. `row.valueColor`) so the bar matches the score chip. */
  accentColor?: string;
};

function tierFillColor(score: number): string {
  const s = Math.min(100, Math.max(0, score));
  if (s >= 80) return COLORS.electricGreen;
  if (s >= 60) return "#fb923c";
  return COLORS.electricRed;
}

const SCORE_MAX = 150;

function ValueScoreMeter({ score, className, accentColor }: ValueScoreMeterProps) {
  const clamped = Math.max(0, Math.min(SCORE_MAX, score));
  const fillPct = (clamped / SCORE_MAX) * 100;
  const baseColor = accentColor ?? tierFillColor(clamped);

  return (
    <div className={cn("w-full min-w-[12rem]", className)}>
      <div
        className="relative h-2 w-full overflow-hidden rounded-full bg-white/[0.07] ring-1 ring-white/[0.06]"
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={SCORE_MAX}
      >
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            width: `${fillPct}%`,
            background: baseColor,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.12), 0 0 10px ${baseColor}35`,
          }}
        />
      </div>
      <div className="mt-1 flex justify-between px-0.5 opacity-70">
        <span className="text-[10px] font-medium tabular-nums text-[var(--app-color-text-faint)]">0</span>
        <span className="text-[10px] font-medium tabular-nums text-[var(--app-color-text-faint)]">150</span>
      </div>
    </div>
  );
}

export { ValueScoreMeter };
