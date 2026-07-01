import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

type MfaChallengeModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  code: string;
  onCodeChange: (v: string) => void;
  onSubmit: () => void | Promise<void>;
  submitting?: boolean;
};

/** Second-factor challenge to reach AAL2 before sensitive actions (e.g. Plaid). */
export function MfaChallengeModal({
  open,
  onOpenChange,
  code,
  onCodeChange,
  onSubmit,
  submitting = false,
}: MfaChallengeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-[var(--app-color-border-strong)] bg-[var(--app-color-surface-overlay)] text-[var(--app-color-text-primary)]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-[var(--app-color-text-primary)]">Authenticator required</DialogTitle>
          <DialogDescription className="text-left text-[var(--app-color-text-tertiary)]">
            Enter the 6-digit code from your authenticator app to continue. This adds a second factor to your session
            before connecting a bank.
          </DialogDescription>
        </DialogHeader>
        <Input
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={12}
          placeholder="000000"
          value={code}
          onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="app-input h-14 rounded-xl text-center text-lg tracking-widest"
        />
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-[var(--app-color-border-strong)]">
            Cancel
          </Button>
          <Button
            type="button"
            disabled={code.length < 6 || submitting}
            onClick={() => void onSubmit()}
            style={{ backgroundColor: "var(--app-color-action-primary-bg)", color: "var(--app-color-action-primary-fg)" }}
            className="font-black"
          >
            {submitting ? "Verifying…" : "Verify"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
