import { Moon, Sun } from "lucide-react";
import { AppButton } from "@/shared/components/system";
import { useAppThemeMode } from "@/shared/theme-provider";

export function ThemeModeToggle() {
  const { mode, toggleMode } = useAppThemeMode();
  const isDark = mode === "dark";

  return (
    <AppButton
      type="button"
      onClick={toggleMode}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      variant="floating"
      size="icon"
      className="rounded-[var(--app-radius-control)]"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </AppButton>
  );
}
