import * as React from "react";
import {
  applyThemeVariables,
  buildThemeCssVars,
  resolveAppTheme,
  type ThemeMode,
  type ThemeOverrides,
} from "@/shared/theme";

const THEME_STORAGE_KEY = "zapp_theme_mode";

type AppThemeModeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
};

const AppThemeModeContext = React.createContext<AppThemeModeContextValue | null>(null);

function getInitialMode(): ThemeMode {
  if (typeof window === "undefined") return "dark";

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function AppThemeProvider({
  children,
  overrides,
}: {
  children: React.ReactNode;
  overrides?: ThemeOverrides;
}) {
  const [mode, setMode] = React.useState<ThemeMode>(() => getInitialMode());

  const toggleMode = React.useCallback(() => {
    setMode((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  const resolvedTheme = React.useMemo(() => resolveAppTheme(mode, overrides), [mode, overrides]);
  const cssVars = React.useMemo(() => buildThemeCssVars(resolvedTheme), [resolvedTheme]);

  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", mode === "dark");
    root.classList.toggle("light", mode === "light");
    root.style.colorScheme = mode;
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    applyThemeVariables(root, resolvedTheme);
  }, [mode, resolvedTheme]);

  const value = React.useMemo(
    () => ({
      mode,
      setMode,
      toggleMode,
    }),
    [mode, toggleMode]
  );

  return (
    <AppThemeModeContext.Provider value={value}>
      <div className="contents" style={cssVars as React.CSSProperties}>
        {children}
      </div>
    </AppThemeModeContext.Provider>
  );
}

export function useAppThemeMode() {
  const context = React.useContext(AppThemeModeContext);
  if (!context) {
    throw new Error("useAppThemeMode must be used within AppThemeProvider.");
  }
  return context;
}
