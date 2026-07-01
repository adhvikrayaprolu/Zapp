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
import { Checkbox } from "@/shared/components/ui/checkbox";
import { getFinancialConsentDisclosure, usePrivacyPolicyMeta } from "@/config/privacy";
import { PrivacyPolicyLink } from "@/shared/components/PrivacyPolicyLink";

type BankConnectionConsentModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  submitting?: boolean;
};

/**
 * Explicit consent before Plaid link-token creation. Does not replace backend logging or legal review.
 */
export function BankConnectionConsentModal({
  open,
  onOpenChange,
  onConfirm,
  submitting = false,
}: BankConnectionConsentModalProps) {
  const [accepted, setAccepted] = React.useState(false);
  const meta = usePrivacyPolicyMeta();
  const disclosure = React.useMemo(() => getFinancialConsentDisclosure(meta), [meta]);

  React.useEffect(() => {
    if (!open) setAccepted(false);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-[var(--app-color-border-strong)] bg-[var(--app-color-surface-overlay)] text-[var(--app-color-text-primary)]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-[var(--app-color-text-primary)]">Connect your bank</DialogTitle>
          {/* asChild: Radix Description renders a <p> by default; use a div to avoid invalid <p> inside <p>. */}
          <DialogDescription asChild>
            <div className="space-y-3 text-left text-sm text-[var(--app-color-text-secondary)]">
              <p>
                {disclosure.intro}
              </p>
              <p className="text-xs text-[var(--app-color-text-tertiary)]">
                {disclosure.policyReference} Our <PrivacyPolicyLink className="text-[var(--app-accent-cyan-soft)]" /> contains the current
                version and effective date.
              </p>
              <div
                className="rounded-xl border border-[var(--app-color-border-subtle)] bg-[var(--app-color-surface-inset)] px-3 py-2.5 text-xs text-[var(--app-color-text-tertiary)]"
                data-testid="bank-consent-policy-meta"
              >
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--app-color-text-tertiary)]">Privacy policy</p>
                <p>
                  Version <span className="font-mono text-[var(--app-color-text-secondary)]">{meta.version}</span>
                  <span className="mx-2 text-[var(--app-color-text-faint)]">·</span>
                  Effective <span className="text-[var(--app-color-text-secondary)]">{meta.effectiveDate}</span>
                </p>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-3 py-2">
          <Checkbox
            id="bank-consent"
            checked={accepted}
            onCheckedChange={(v) => setAccepted(v === true)}
            className="mt-1 border-[var(--app-color-border-strong)] data-[state=checked]:border-[var(--app-accent-cyan-soft)] data-[state=checked]:bg-[var(--app-accent-cyan-soft)]"
          />
          <label htmlFor="bank-consent" className="cursor-pointer text-sm leading-snug text-[var(--app-color-text-secondary)]">
            {disclosure.checkboxLabel}
          </label>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-[var(--app-color-border-strong)] text-[var(--app-color-text-secondary)]"
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!accepted || submitting}
            onClick={() => void onConfirm()}
            className="font-black"
            style={{ backgroundColor: "var(--app-color-action-primary-bg)", color: "var(--app-color-action-primary-fg)" }}
          >
            {submitting ? "Saving…" : "Continue to bank connection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
