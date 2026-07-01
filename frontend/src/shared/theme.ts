export const APP_THEME = {
  font: {
    sans: '"Inter", "Segoe UI", sans-serif',
  },
  colors: {
    canvas: "#0B1220",
    surface: "#101A2E",
    surfaceMuted: "#14203A",
    surfaceStrong: "#08111F",
    borderSubtle: "rgba(255,255,255,0.06)",
    borderStrong: "rgba(255,255,255,0.12)",
    textPrimary: "#FFFFFF",
    textSecondary: "#CBD5E1",
    textMuted: "#6B7280",
    textFaint: "#4B5563",
    accentGreen: "#3CFF9E",
    accentRed: "#FF4D4D",
    accentBlue: "#3B82FF",
    accentCyan: "#22F0FF",
    accentTeal: "#00FFD1",
    accentPurple: "#B47CFF",
    accentYellow: "#FFE066",
    accentGreenSoft: "#3CFF9E",
    accentRedSoft: "#FF4D4D",
    accentBlueSoft: "#3B82FF",
    accentCyanSoft: "#22F0FF",
    accentTealSoft: "#00FFD1",
    accentPurpleSoft: "#B47CFF",
    accentYellowSoft: "#FFE066",
  },
  radius: {
    sm: "0.75rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    pill: "2.5rem",
  },
  spacing: {
    section: "3rem",
    card: "2rem",
    controlX: "1.25rem",
    controlY: "0.875rem",
  },
  motion: {
    fast: 0.18,
    normal: 0.28,
    slow: 0.45,
  },
  zIndex: {
    chrome: 50,
    floating: 100,
    overlay: 110,
  },
} as const;

export type AppTheme = typeof APP_THEME;
export type ThemeMode = "light" | "dark";
type ThemeSectionKey = keyof AppTheme;
export type ThemeOverrides = {
  [K in ThemeSectionKey]?: Partial<AppTheme[K]>;
};

export const LIGHT_THEME_OVERRIDES: ThemeOverrides = {
  colors: {
    // Canvas sits a step below the (near-white) card surfaces so cards read as
    // raised panels instead of dissolving into the page.
    canvas: "#E4EBF6",
    surface: "#FFFFFF",
    surfaceMuted: "#EDF2FA",
    surfaceStrong: "#E1E9F4",
    borderSubtle: "rgba(11,18,32,0.10)",
    borderStrong: "rgba(11,18,32,0.16)",
    textPrimary: "#0A1424",
    textSecondary: "#33415A",
    textMuted: "#5B6B82",
    textFaint: "#8A99AD",
    accentGreenSoft: "#1FAF68",
    accentRedSoft: "#D64C5F",
    accentBlueSoft: "#2F6FDD",
    accentCyanSoft: "#0F8FA5",
    accentTealSoft: "#0D9E86",
    accentPurpleSoft: "#7C5BCF",
    accentYellowSoft: "#B98519",
  },
};

export const PAGE_ACCENTS = {
  home: APP_THEME.colors.accentGreen,
  transactions: APP_THEME.colors.accentCyan,
  circles: APP_THEME.colors.accentYellow,
  subscriptions: APP_THEME.colors.accentBlue,
  analytics: APP_THEME.colors.accentCyan,
  search: APP_THEME.colors.accentTeal,
  profile: APP_THEME.colors.accentPurple,
} as const;

function mergeTheme(baseTheme: AppTheme, overrides?: ThemeOverrides): AppTheme {
  if (!overrides) return baseTheme;

  return {
    font: { ...baseTheme.font, ...overrides.font },
    colors: { ...baseTheme.colors, ...overrides.colors },
    radius: { ...baseTheme.radius, ...overrides.radius },
    spacing: { ...baseTheme.spacing, ...overrides.spacing },
    motion: { ...baseTheme.motion, ...overrides.motion },
    zIndex: { ...baseTheme.zIndex, ...overrides.zIndex },
  };
}

export function buildThemeCssVars(theme: AppTheme) {
  return {
    "--app-font-sans": theme.font.sans,
    "--app-bg-canvas": theme.colors.canvas,
    "--app-surface": theme.colors.surface,
    "--app-surface-muted": theme.colors.surfaceMuted,
    "--app-surface-strong": theme.colors.surfaceStrong,
    "--app-border-subtle": theme.colors.borderSubtle,
    "--app-border-strong": theme.colors.borderStrong,
    "--app-text-primary": theme.colors.textPrimary,
    "--app-text-secondary": theme.colors.textSecondary,
    "--app-text-muted": theme.colors.textMuted,
    "--app-text-faint": theme.colors.textFaint,
    "--app-accent-green": theme.colors.accentGreen,
    "--app-accent-red": theme.colors.accentRed,
    "--app-accent-blue": theme.colors.accentBlue,
    "--app-accent-cyan": theme.colors.accentCyan,
    "--app-accent-teal": theme.colors.accentTeal,
    "--app-accent-purple": theme.colors.accentPurple,
    "--app-accent-yellow": theme.colors.accentYellow,
    "--app-accent-green-soft": theme.colors.accentGreenSoft,
    "--app-accent-red-soft": theme.colors.accentRedSoft,
    "--app-accent-blue-soft": theme.colors.accentBlueSoft,
    "--app-accent-cyan-soft": theme.colors.accentCyanSoft,
    "--app-accent-teal-soft": theme.colors.accentTealSoft,
    "--app-accent-purple-soft": theme.colors.accentPurpleSoft,
    "--app-accent-yellow-soft": theme.colors.accentYellowSoft,
    "--app-radius-sm": theme.radius.sm,
    "--app-radius-md": theme.radius.md,
    "--app-radius-lg": theme.radius.lg,
    "--app-radius-xl": theme.radius.xl,
    "--app-radius-pill": theme.radius.pill,
    "--app-space-section": theme.spacing.section,
    "--app-space-card": theme.spacing.card,
    "--app-space-control-x": theme.spacing.controlX,
    "--app-space-control-y": theme.spacing.controlY,
  } satisfies Record<string, string>;
}

export function getRuntimeThemeOverrides(): ThemeOverrides | undefined {
  if (typeof window === "undefined") return undefined;
  return window.__ZAPP_THEME__;
}

export function resolveAppTheme(mode: ThemeMode = "dark", overrides?: ThemeOverrides) {
  const baseTheme = mergeTheme(APP_THEME, mode === "light" ? LIGHT_THEME_OVERRIDES : undefined);
  return mergeTheme(baseTheme, overrides ?? getRuntimeThemeOverrides());
}

export const themeCssVars = buildThemeCssVars(APP_THEME);

export function applyThemeVariables(target: HTMLElement = document.documentElement, theme: AppTheme = APP_THEME) {
  for (const [key, value] of Object.entries(buildThemeCssVars(theme))) {
    target.style.setProperty(key, value);
  }
}

export const COLORS = {
  // Surface/background constants resolve to theme tokens so inline `backgroundColor`
  // styles adapt to light/dark instead of being frozen to the dark palette.
  bgPrimary: "var(--app-color-background-canvas)",
  bgCard: "var(--app-color-surface-base)",
  bgCardHover: "var(--app-color-surface-raised)",
  electricGreen: APP_THEME.colors.accentGreen,
  electricRed: APP_THEME.colors.accentRed,
  electricBlue: APP_THEME.colors.accentBlue,
  electricCyan: APP_THEME.colors.accentCyan,
  electricTeal: APP_THEME.colors.accentTeal,
  electricPurple: APP_THEME.colors.accentPurple,
  electricYellow: APP_THEME.colors.accentYellow,
} as const;

export const GLOWS = {
  soft: (color: string) => `0 0 12px ${color}40`,
  medium: (color: string) => `0 0 24px ${color}59`,
  strong: (color: string) => `0 0 40px ${color}8c`,
  inner: "inset 0 0 1px rgba(255,255,255,0.15)",
  // Ambient elevation maps to the theme token so cards cast a soft, light-adapted
  // shadow in light mode instead of a hardcoded heavy black halo. The opacity arg
  // is kept for call-site compatibility but the token controls the real value.
  ambient: (_opacity = 0.6) => "var(--app-shadow-ambient)",
};

export const UI_PATTERNS = {
  card: "app-card",
  panel: "app-panel",
  eyebrow: "app-eyebrow",
  emptyState: "app-empty-state",
} as const;

declare global {
  interface Window {
    __ZAPP_THEME__?: ThemeOverrides;
  }
}
