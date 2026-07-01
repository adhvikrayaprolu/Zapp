import * as React from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export type RevealProps = {
  children: React.ReactNode;
  className?: string;
  /** Vertical travel for the fade-up, in px. */
  y?: number;
  /** Animation duration, in seconds. */
  duration?: number;
  /** Delay before animating, in seconds. */
  delay?: number;
  /** Viewport root margin; negative values trigger slightly before fully in view. */
  margin?: string;
};

/**
 * Reveal a single element with a subtle fade-up the first time it scrolls into
 * view. Respects `prefers-reduced-motion` by rendering its children statically
 * (fully visible, no transform). Animates once and never re-runs on re-render.
 */
export function Reveal({
  children,
  className,
  y = 16,
  duration = 0.4,
  delay = 0,
  margin = "-10% 0px",
}: RevealProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: margin as never }}
      transition={{ duration, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

export type RevealStaggerProps = RevealProps & {
  /** Seconds between each child's reveal. */
  stagger?: number;
};

/**
 * Reveal a list/grid of children with a staggered fade-up. Each direct child is
 * wrapped in a motion item, so usage stays one line:
 *
 *   <RevealStagger className="grid gap-4">{cards}</RevealStagger>
 *
 * Honors reduced motion (renders children statically and visible).
 */
export function RevealStagger({
  children,
  className,
  y = 16,
  duration = 0.4,
  margin = "-10% 0px",
  stagger = 0.08,
}: RevealStaggerProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const containerVariants: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: stagger, delayChildren: 0.05 } },
  };
  const itemVariants: Variants = {
    hidden: { opacity: 0, y },
    visible: { opacity: 1, y: 0, transition: { duration, ease: EASE_OUT } },
  };

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: margin as never }}
      variants={containerVariants}
    >
      {React.Children.map(children, (child) => (
        <motion.div variants={itemVariants}>{child}</motion.div>
      ))}
    </motion.div>
  );
}
