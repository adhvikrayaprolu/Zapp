import { motion, useReducedMotion } from "motion/react";
import { COLORS } from "@/shared/theme";

export function AmbientEnergyLines() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-[0.03] z-0">
      {/* Paths extend beyond the viewBox (-100 → 1100) so a small vertical drift
          never reveals an edge. We animate a transform instead of morphing the
          `d` string: motion's path-string interpolation can momentarily emit an
          undefined `d`, which logs an SVG console error on every route. */}
      <svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="none">
        <motion.path
          d="M -100 500 Q 250 300 500 500 T 1100 500"
          stroke={COLORS.electricCyan}
          strokeWidth="1"
          fill="none"
          animate={shouldReduceMotion ? undefined : { y: [0, 120, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.path
          d="M -100 200 Q 300 500 600 200 T 1100 200"
          stroke={COLORS.electricPurple}
          strokeWidth="1"
          fill="none"
          animate={shouldReduceMotion ? undefined : { y: [0, -140, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
      </svg>
    </div>
  );
}
