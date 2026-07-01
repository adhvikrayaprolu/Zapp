import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Smartphone, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { AppLogo } from "@/shared/components/brand/AppLogo";
import { AppButton, AppInput, AppSelect, FormField, Image, SectionHeader, Surface } from "@/shared/components/system";

function normalizeCode(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

function postMfaLabelForStep(postMfaStep: string | null) {
  if (postMfaStep === "onboarding_survey") {
    return "After MFA, you'll continue to onboarding.";
  }
  if (postMfaStep === "dashboard") {
    return "After MFA, you'll continue to your dashboard.";
  }
  return null;
}

function isVerifiedFactor(status: string) {
  return status.trim().toLowerCase() === "verified";
}

function resolveMfaRoute(nextStep: string | null, nextRoute: string, mfaSnapshot: { factors: Array<{ status: string }> } | null) {
  if (nextStep === "mfa_setup") {
    return "/mfa/setup";
  }
  if (nextStep === "mfa_verify") {
    const verifiedFactors = (mfaSnapshot?.factors ?? []).filter((factor) => isVerifiedFactor(factor.status));
    if (mfaSnapshot && verifiedFactors.length === 0) {
      return "/mfa/setup";
    }
    return "/mfa/verify";
  }
  return nextRoute;
}

function MfaShell({
  title,
  description,
  postMfaLabel,
  mfaLoading,
  mfaError,
  signingOut,
  onSignOut,
  children,
}: {
  title: string;
  description: string;
  postMfaLabel: string | null;
  mfaLoading: boolean;
  mfaError: string | null;
  signingOut: boolean;
  onSignOut: () => Promise<void>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        <Surface variant="overlay" padding="xl" className="space-y-6 backdrop-blur-xl">
          <div className="flex justify-center">
            <AppLogo size={96} />
          </div>

          <SectionHeader
            level={1}
            align="center"
            eyebrow="Security check"
            title={title}
            description={description}
            className="mb-2"
          />

          {postMfaLabel ? (
            <p className="text-center text-xs font-semibold text-[var(--app-color-text-tertiary)]">{postMfaLabel}</p>
          ) : null}

          {mfaLoading ? (
            <div className="flex items-center justify-center gap-2 text-sm text-[var(--app-color-text-secondary)]">
              <Loader2 size={16} className="animate-spin" />
              Loading MFA status...
            </div>
          ) : null}

          {mfaError ? <p className="text-center text-sm text-amber-400">{mfaError}</p> : null}

          {children}

          <div className="border-t border-[var(--app-color-border-subtle)] pt-4">
            <AppButton variant="outline" onClick={() => void onSignOut()} disabled={signingOut} className="w-full">
              {signingOut ? "Signing out..." : "Sign out and use another account"}
            </AppButton>
          </div>
        </Surface>
      </div>
    </div>
  );
}

function useMfaPageGuard(expectedStep: "mfa_setup" | "mfa_verify") {
  const navigate = useNavigate();
  const {
    isAuthReady,
    isAuthenticated,
    nextStep,
    postMfaStep,
    nextRoute,
    mfaSnapshot,
    mfaLoading,
    mfaError,
    refreshSession,
    logout,
  } = useAuth();
  const [signingOut, setSigningOut] = React.useState(false);
  const resolvedRoute = React.useMemo(
    () => resolveMfaRoute(nextStep, nextRoute, mfaSnapshot),
    [mfaSnapshot, nextRoute, nextStep]
  );
  const expectedRoute = expectedStep === "mfa_setup" ? "/mfa/setup" : "/mfa/verify";

  React.useEffect(() => {
    if (!isAuthReady) return;
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }
    if (resolvedRoute !== expectedRoute) {
      navigate(resolvedRoute, { replace: true });
    }
  }, [expectedRoute, isAuthReady, isAuthenticated, navigate, resolvedRoute]);

  const continueAfterMfa = React.useCallback(async () => {
    const session = await refreshSession();
    if (!session.hasSession) {
      navigate("/login", { replace: true });
      return;
    }
    navigate(session.nextRoute, { replace: true });
  }, [navigate, refreshSession]);

  const handleSignOut = React.useCallback(async () => {
    setSigningOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setSigningOut(false);
    }
  }, [logout, navigate]);

  return {
    isAuthReady,
    isAuthenticated,
    postMfaLabel: postMfaLabelForStep(postMfaStep),
    mfaSnapshot,
    mfaLoading,
    mfaError,
    signingOut,
    continueAfterMfa,
    handleSignOut,
  };
}

export function MfaPage() {
  const navigate = useNavigate();
  const { isAuthReady, isAuthenticated, nextStep, nextRoute, mfaSnapshot } = useAuth();
  const resolvedRoute = React.useMemo(
    () => resolveMfaRoute(nextStep, nextRoute, mfaSnapshot),
    [mfaSnapshot, nextRoute, nextStep]
  );

  React.useEffect(() => {
    if (!isAuthReady) return;
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }
    navigate(resolvedRoute, { replace: true });
  }, [isAuthReady, isAuthenticated, navigate, resolvedRoute]);

  return null;
}

export function MfaSetupPage() {
  const {
    isAuthReady,
    isAuthenticated,
    postMfaLabel,
    mfaLoading,
    mfaError,
    signingOut,
    continueAfterMfa,
    handleSignOut,
  } = useMfaPageGuard("mfa_setup");
  const { enrollTotpFactor, verifyTotpEnrollment, refreshMfa, mfaSnapshot } = useAuth();
  const [setupFactorId, setSetupFactorId] = React.useState<string | null>(null);
  const [setupQrCode, setSetupQrCode] = React.useState<string | null>(null);
  const [setupSecret, setSetupSecret] = React.useState<string | null>(null);
  const [setupCode, setSetupCode] = React.useState("");
  const [enrolling, setEnrolling] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!isAuthenticated || mfaLoading || mfaSnapshot) return;
    void refreshMfa();
  }, [isAuthenticated, mfaLoading, mfaSnapshot, refreshMfa]);

  const handleStartSetup = async () => {
    setEnrolling(true);
    setSetupFactorId(null);
    setSetupQrCode(null);
    setSetupSecret(null);
    setSetupCode("");
    try {
      const payload = await enrollTotpFactor();
      setSetupFactorId(payload.id);
      setSetupQrCode(payload.totp?.qr_code ?? null);
      setSetupSecret(payload.totp?.secret ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start MFA setup.");
    } finally {
      setEnrolling(false);
    }
  };

  const handleConfirmSetup = async () => {
    if (!setupFactorId || setupCode.length < 6) {
      toast.error("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setSubmitting(true);
    try {
      await verifyTotpEnrollment(setupFactorId, setupCode);
      toast.success("MFA is now enabled.");
      await continueAfterMfa();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verification failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthReady || !isAuthenticated) {
    return null;
  }

  return (
    <MfaShell
      title="Set up your authenticator app"
      description="Scan a QR code, save the backup secret, then confirm with a 6-digit code."
      postMfaLabel={postMfaLabel}
      mfaLoading={mfaLoading}
      mfaError={mfaError}
      signingOut={signingOut}
      onSignOut={handleSignOut}
    >
      <div className="space-y-4">
        {!setupFactorId ? (
          <AppButton onClick={handleStartSetup} disabled={enrolling} size="lg" className="w-full">
            <Smartphone size={16} />
            {enrolling ? "Starting setup..." : "Set up authenticator app"}
          </AppButton>
        ) : (
          <div className="space-y-4 rounded-[var(--app-radius-panel)] border border-[var(--app-color-border-subtle)] p-4">
            <p className="text-sm text-[var(--app-color-text-secondary)]">
              Scan the QR code in Google Authenticator, Authy, or another TOTP app.
            </p>
            {setupQrCode?.startsWith("data:") ? (
              <Image src={setupQrCode} alt="MFA QR code" width={192} height={192} className="mx-auto h-48 w-48 rounded-lg" />
            ) : (
              <p className="break-all text-xs text-[var(--app-color-text-tertiary)]">{setupQrCode}</p>
            )}
            {setupSecret ? (
              <p className="break-all text-xs text-[var(--app-color-text-tertiary)]">
                Manual key: <span className="font-mono text-[var(--app-color-text-secondary)]">{setupSecret}</span>
              </p>
            ) : null}
            <FormField label="Verification code" htmlFor="mfa-setup-code">
              <AppInput
                id="mfa-setup-code"
                value={setupCode}
                onChange={(event) => setSetupCode(normalizeCode(event.target.value))}
                placeholder="000000"
                inputMode="numeric"
              />
            </FormField>
            <AppButton onClick={handleConfirmSetup} disabled={submitting || setupCode.length < 6} className="w-full">
              <ShieldCheck size={16} />
              {submitting ? "Verifying..." : "Confirm and continue"}
            </AppButton>
          </div>
        )}
      </div>
    </MfaShell>
  );
}

export function MfaVerifyPage() {
  const navigate = useNavigate();
  const {
    isAuthReady,
    isAuthenticated,
    postMfaLabel,
    mfaSnapshot,
    mfaLoading,
    mfaError,
    signingOut,
    continueAfterMfa,
    handleSignOut,
  } = useMfaPageGuard("mfa_verify");
  const { refreshMfa, verifyMfaChallenge } = useAuth();
  const verifiedFactors = React.useMemo(
    () => (mfaSnapshot?.factors ?? []).filter((factor) => isVerifiedFactor(factor.status)),
    [mfaSnapshot]
  );
  const [selectedFactorId, setSelectedFactorId] = React.useState<string | null>(null);
  const [verifyCode, setVerifyCode] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!isAuthenticated || mfaLoading || mfaSnapshot) return;
    void refreshMfa();
  }, [isAuthenticated, mfaLoading, mfaSnapshot, refreshMfa]);

  React.useEffect(() => {
    if (!isAuthenticated || mfaLoading || !mfaSnapshot) return;
    if (verifiedFactors.length === 0) {
      navigate("/mfa/setup", { replace: true });
    }
  }, [isAuthenticated, mfaLoading, mfaSnapshot, navigate, verifiedFactors]);

  React.useEffect(() => {
    if (!selectedFactorId && verifiedFactors.length > 0) {
      setSelectedFactorId(verifiedFactors[0].id);
    }
  }, [selectedFactorId, verifiedFactors]);

  const factorOptions = React.useMemo(
    () =>
      verifiedFactors.map((factor) => ({
        value: factor.id,
        label: factor.friendlyName,
      })),
    [verifiedFactors]
  );

  const handleVerifySignIn = async () => {
    if (!selectedFactorId || verifyCode.length < 6) {
      toast.error("Enter your 6-digit authenticator code.");
      return;
    }
    setSubmitting(true);
    try {
      await verifyMfaChallenge(selectedFactorId, verifyCode);
      toast.success("MFA verified.");
      await continueAfterMfa();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not verify MFA.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthReady || !isAuthenticated) {
    return null;
  }

  return (
    <MfaShell
      title="Enter authenticator code"
      description="Choose a verified authenticator and enter the current 6-digit code."
      postMfaLabel={postMfaLabel}
      mfaLoading={mfaLoading}
      mfaError={mfaError}
      signingOut={signingOut}
      onSignOut={handleSignOut}
    >
      {mfaLoading || verifiedFactors.length > 0 ? (
        <div className="space-y-4">
          <FormField label="Authenticator app">
            <AppSelect
              value={selectedFactorId ?? undefined}
              onValueChange={setSelectedFactorId}
              placeholder="Choose an authenticator"
              options={factorOptions}
            />
          </FormField>
          <FormField label="Verification code" htmlFor="mfa-verify-code">
            <AppInput
              id="mfa-verify-code"
              value={verifyCode}
              onChange={(event) => setVerifyCode(normalizeCode(event.target.value))}
              placeholder="000000"
              inputMode="numeric"
            />
          </FormField>
          <AppButton
            onClick={handleVerifySignIn}
            disabled={submitting || verifyCode.length < 6 || !selectedFactorId}
            size="lg"
            className="w-full"
          >
            <ShieldCheck size={16} />
            {submitting ? "Verifying..." : "Verify and continue"}
          </AppButton>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 text-sm text-[var(--app-color-text-secondary)]">
          <Loader2 size={16} className="animate-spin" />
          Redirecting to authenticator setup...
        </div>
      )}
    </MfaShell>
  );
}

