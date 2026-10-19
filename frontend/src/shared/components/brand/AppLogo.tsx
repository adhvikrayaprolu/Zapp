import * as React from "react";

import { Image, webpFrom } from "@/shared/components/system/image";
import { cn } from "@/shared/components/ui/utils";
import { useAppThemeMode } from "@/shared/theme-provider";

type AppLogoProps = {
  className?: string;
  markClassName?: string;
  size?: number;
  showWordmark?: boolean;
  wordmarkClassName?: string;
};

export function AppLogo({
  className,
  markClassName,
  size = 64,
  showWordmark = false,
  wordmarkClassName,
}: AppLogoProps) {
  const { mode } = useAppThemeMode();
  const logoSrc = mode === "dark" ? "/zap-logo-white-Photoroom.png" : "/zap-logo-black-Photoroom.png";
  // Fall back to the wordmark if a brand image is missing. Tracking the failed src
  // (rather than a reset flag) stays correct when the theme switches the logo.
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null);
  const markFailed = failedSrc === logoSrc;
  const renderWordmark = showWordmark || markFailed;

  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      {markFailed ? null : <Image
        alt={showWordmark ? "" : "Zapp logo"}
        aria-hidden={showWordmark}
        className={cn("block shrink-0 object-contain object-center", markClassName)}
        draggable={false}
        role={showWordmark ? undefined : "img"}
        src={logoSrc}
        webpSrc={webpFrom(logoSrc)}
        width={size}
        height={size}
        style={{ width: size, height: size, objectPosition: "36% 56%" }}
        onError={() => setFailedSrc(logoSrc)}
      />}

      {renderWordmark ? (
        <span
          className={cn(
            "text-3xl font-black uppercase italic tracking-[-0.06em] text-[var(--app-color-text-primary)] sm:text-4xl",
            wordmarkClassName
          )}
        >
          Zapp
        </span>
      ) : null}
    </div>
  );
}
