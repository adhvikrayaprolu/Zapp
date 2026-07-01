import * as React from "react";
import { Loader2 } from "lucide-react";
import { AppButton } from "@/shared/components/system";
import { cn } from "@/shared/components/ui/utils";

type ConnectBankButtonProps = {
  onConnect: () => void;
  loading?: boolean;
  disabled?: boolean;
  error?: string | null;
  className?: string;
};

export function ConnectBankButton({
  onConnect,
  loading = false,
  disabled = false,
  error,
  className,
}: ConnectBankButtonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <AppButton
        onClick={onConnect}
        disabled={disabled || loading}
        variant="info"
        size="lg"
        className="w-full sm:w-auto"
      >
        {loading ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            <span>Connecting...</span>
          </>
        ) : (
          <span>Connect bank</span>
        )}
      </AppButton>
      {error && (
        <p className="app-error">{error}</p>
      )}
    </div>
  );
}
