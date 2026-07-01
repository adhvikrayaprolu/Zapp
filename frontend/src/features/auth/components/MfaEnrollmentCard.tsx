import * as React from "react";
import { Shield, Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Image } from "@/shared/components/system";
import { toast } from "sonner";

/**
 * TOTP MFA enrollment and management. Actual enforcement also depends on Supabase project settings and backend policy.
 */
export function MfaEnrollmentCard() {
  const {
    mfaSnapshot,
    mfaLoading,
    mfaError,
    refreshMfa,
    enrollTotpFactor,
    verifyTotpEnrollment,
    unenrollMfaFactor,
  } = useAuth();

  const [enrolling, setEnrolling] = React.useState(false);
  const [factorId, setFactorId] = React.useState<string | null>(null);
  const [qr, setQr] = React.useState<string | null>(null);
  const [totpSecret, setTotpSecret] = React.useState<string | null>(null);
  const [code, setCode] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const verified = mfaSnapshot?.factors.filter((f) => f.status === "verified") ?? [];
  const pending = mfaSnapshot?.factors.filter((f) => f.status !== "verified") ?? [];

  const startEnroll = async () => {
    setEnrolling(true);
    setQr(null);
    setTotpSecret(null);
    setFactorId(null);
    setCode("");
    try {
      const data = await enrollTotpFactor();
      const id = (data as { id: string }).id;
      const totp = (data as { totp?: { qr_code?: string; secret?: string } }).totp;
      const qrData = totp?.qr_code ?? null;
      setFactorId(id);
      setQr(qrData);
      setTotpSecret(totp?.secret ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start MFA enrollment.");
    } finally {
      setEnrolling(false);
    }
  };

  const completeEnroll = async () => {
    if (!factorId || code.length < 6) {
      toast.error("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setSubmitting(true);
    try {
      await verifyTotpEnrollment(factorId, code);
      toast.success("Two-factor authentication is enabled.");
      setQr(null);
      setTotpSecret(null);
      setFactorId(null);
      setCode("");
      await refreshMfa();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Remove this authenticator? You will need it to connect banks until you add a new one.")) return;
    try {
      await unenrollMfaFactor(id);
      toast.success("Authenticator removed.");
      await refreshMfa();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove.");
    }
  };

  const accentButtonStyle = {
    backgroundColor: "var(--app-color-action-primary-bg)",
    color: "var(--app-color-action-primary-fg)",
  } as React.CSSProperties;

  return (
    <div className="pt-8 border-t border-[var(--app-color-border-subtle)]">
      <h3 className="mb-2 flex items-center gap-2 text-lg font-black text-[var(--app-color-text-primary)]">
        <Shield size={18} className="text-[var(--app-accent-cyan-soft)]" />
        Two-factor authentication
      </h3>
      <p className="mb-4 max-w-xl text-xs text-[var(--app-color-text-tertiary)]">
        Adding an authenticator app is required before connecting a bank. This strengthens your sign-in; server-side
        policies may apply additional checks.
      </p>
      {mfaLoading && (
        <div className="flex items-center gap-2 text-sm text-[var(--app-color-text-tertiary)]">
          <Loader2 size={16} className="animate-spin" /> Loading security status…
        </div>
      )}
      {mfaError && <p className="mb-2 text-sm text-[var(--app-color-status-warning)]">{mfaError}</p>}
      {!mfaLoading && mfaSnapshot?.currentLevel && (
        <p className="mb-3 text-xs text-[var(--app-color-text-tertiary)]">
          Current session assurance:{" "}
          <span className="font-mono text-[var(--app-color-text-secondary)]">{mfaSnapshot.currentLevel}</span>
          {mfaSnapshot.nextLevel ? (
            <>
              {" "}
              (next step: <span className="font-mono">{mfaSnapshot.nextLevel}</span>)
            </>
          ) : null}
        </p>
      )}
      {!mfaLoading && pending.length > 0 && (
        <div className="mb-4 rounded-xl border border-[color:color-mix(in_srgb,var(--app-color-status-warning)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--app-color-status-warning)_12%,transparent)] p-3 text-xs text-[var(--app-color-text-secondary)]">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--app-color-status-warning)]">Pending setup</p>
          <p>
            Finish verifying your authenticator in this browser, or remove the incomplete factor and start again.
          </p>
        </div>
      )}
      {!mfaLoading && verified.length > 0 && (
        <ul className="mb-4 space-y-2">
          {verified.map((f) => (
            <li
              key={f.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--app-color-border-subtle)] bg-[var(--app-color-surface-inset)] px-4 py-2"
            >
              <span className="text-sm font-bold text-[var(--app-color-text-primary)]">{f.friendlyName}</span>
              <span className="text-[10px] font-black uppercase text-[var(--app-color-status-success)]">Active</span>
              <Button type="button" variant="ghost" size="sm" className="text-[var(--app-color-status-danger)]" onClick={() => void remove(f.id)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
      {!mfaLoading && verified.length === 0 && !qr && (
        <Button
          type="button"
          onClick={() => void startEnroll()}
          disabled={enrolling}
          className="rounded-xl font-bold"
          style={accentButtonStyle}
        >
          {enrolling ? "Starting…" : "Set up authenticator app"}
        </Button>
      )}
      {qr && factorId && (
        <div className="mt-4 space-y-4 rounded-xl border border-[var(--app-color-border-subtle)] bg-[var(--app-color-surface-inset)] p-4">
          <p className="text-sm text-[var(--app-color-text-secondary)]">Scan this QR code in Google Authenticator, Authy, or another TOTP app.</p>
          {qr.startsWith("data:") ? (
            <Image src={qr} alt="MFA QR" width={192} height={192} className="h-48 w-48 rounded-lg border border-[var(--app-color-border-subtle)] bg-white p-2" />
          ) : (
            <div className="break-all text-xs text-[var(--app-color-text-tertiary)]">{qr}</div>
          )}
          {totpSecret && (
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--app-color-text-tertiary)]">Or enter key manually</p>
              <code className="block break-all rounded-lg border border-[var(--app-color-border-subtle)] bg-[var(--app-color-surface-strong)] px-3 py-2 font-mono text-xs text-[var(--app-accent-cyan-soft)]">
                {totpSecret}
              </code>
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-[var(--app-color-text-tertiary)]">Verification code</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="app-input h-10 rounded-xl"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => void completeEnroll()}
              disabled={submitting || code.length < 6}
              style={accentButtonStyle}
            >
              {submitting ? "Verifying…" : "Confirm"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-[var(--app-color-border-strong)]"
              onClick={() => {
                setQr(null);
                setTotpSecret(null);
                setFactorId(null);
                setCode("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
