import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { cn } from "@/shared/components/ui/utils";
import { COLORS, GLOWS } from "@/shared/theme";
import { getSurfaceAccentStyle, surfaceVariants } from "@/shared/components/system";

type ElectricCardProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
  semanticColor?: string;
  glowIntensity?: "soft" | "medium" | "strong";
  elevation?: 0 | 1 | 2;
};

export const ElectricCard = ({
  children,
  className,
  style,
  delay = 0,
  semanticColor = COLORS.electricCyan,
  glowIntensity = "soft",
  elevation = 1,
}: ElectricCardProps) => {
  const shouldReduceMotion = useReducedMotion();
  const elevationStyles = {
    0: { shadow: GLOWS.ambient(0.2), y: 0, scale: 1 },
    1: { shadow: GLOWS.ambient(0.6), y: 0, scale: 1 },
    2: { shadow: GLOWS.ambient(0.8), y: -8, scale: 1.01 },
  }[elevation];

  const accentStyle = getSurfaceAccentStyle(semanticColor, "glow");

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      whileInView={shouldReduceMotion ? undefined : { opacity: 1 }}
      viewport={shouldReduceMotion ? undefined : { once: true }}
      transition={{ duration: 0.24, delay, ease: "easeOut" }}
      className={cn(
        surfaceVariants({ variant: "card", padding: "lg" }),
        "relative group transition-all duration-500",
        className
      )}
      style={{
        transform: elevationStyles.y !== 0 || elevationStyles.scale !== 1
          ? `translateY(${elevationStyles.y}px) scale(${elevationStyles.scale})`
          : undefined,
        ...accentStyle,
        boxShadow: `${elevationStyles.shadow}, ${GLOWS.inner}, ${GLOWS[glowIntensity](semanticColor)}`,
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
};

export const ReflectionPulse = ({
  active,
  color = COLORS.electricGreen,
}: {
  active: boolean;
  color?: string;
}) => (
  <AnimatePresence>
    {active && (
      <motion.div
        initial={{ scale: 0.8, opacity: 0.8 }}
        animate={{ scale: 2.5, opacity: 0 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 pointer-events-none rounded-[2.5rem] border-4 z-10"
        style={{ borderColor: color, boxShadow: `0 0 60px ${color}80` }}
      />
    )}
  </AnimatePresence>
);
