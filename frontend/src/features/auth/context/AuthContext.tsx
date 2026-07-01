import * as React from "react";
import { flushSync } from "react-dom";
import { apiRequest, ApiError, getApiConfigurationError } from "@/api/client";
import { fetchAuthAssurance, type AuthAssuranceResponse } from "@/api/compliance.api";
import { resolveDisplayName } from "@/features/auth/displayName";
import { emitAuditEvent } from "@/shared/audit/audit";
import {
  enrollTotpFactor as mfaEnrollTotp,
  getMfaSnapshot,
  unenrollFactor as mfaUnenroll,
  verifyMfaChallenge as mfaVerifyChallenge,
  verifyTotpEnrollment as mfaVerifyTotpEnrollment,
  type MfaSnapshot,
} from "@/features/auth/mfa/mfaOperations";

/** GET /api/auth/me/ — canonical session user from Django. */
export type MeResponse = {
  id: number;
  email: string;
  username: string;
  supabase_uid: string | null;
  name?: string;
  tier?: string;
  created_at?: string;
  /** Authenticator assurance level from server session (e.g. aal1 / aal2). */
  aal?: string | null;
  last_step_up_at?: number | null;
  logged_in_at?: number | null;
  mfa_pending?: boolean;
  mfa_enrollment_required?: boolean;
  next_step?: string | null;
  post_mfa_step?: string | null;
  onboarding_completed?: boolean;
  onboarding_required?: boolean;
};

export type User = {
  id: number | string;
  supabaseUid: string;
  username: string;
  name: string;
  email: string;
  tier?: string;
  createdAt: string;
};

export type BackendUserProfile = {
  id: number;
  email: string;
  name: string;
  username: string;
  supabase_uid: string;
};

export type AuthNextStep = "mfa_setup" | "mfa_verify" | "onboarding_survey" | "dashboard" | null;
export type AuthPostMfaStep = "onboarding_survey" | "dashboard" | null;

export type RefreshSessionResult = {
  hasSession: boolean;
  me: MeResponse | null;
  nextStep: AuthNextStep;
  postMfaStep: AuthPostMfaStep;
  nextRoute: string;
};

/** Why bank linking may be blocked (aligned with auth-assurance blocking_code + client checks). */
export type BankLinkGateReason =
  | "api_misconfigured"
  | "mfa_loading"
  | "auth_assurance_unavailable"
  | "mfa_not_enrolled"
  | "mfa_verification_needed"
  | "mfa_required"
  | null;

export type RefreshMfaResult = {
  gate: { can: boolean; reason: BankLinkGateReason };
  mfaSnapshot: MfaSnapshot | null;
};

type AuthContextValue = {
  user: User | null;
  backendUser: BackendUserProfile | null;
  nextStep: AuthNextStep;
  postMfaStep: AuthPostMfaStep;
  nextRoute: string;
  isAuthenticated: boolean;
  /** True after the first session check has completed; use to avoid redirecting before bootstrap. */
  isAuthReady: boolean;
  refreshSession: () => Promise<RefreshSessionResult>;
  login: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string; nextRoute?: string; nextStep?: AuthNextStep }>;
  signUp: (data: SignUpData) => Promise<{ ok: boolean; error?: string; requiresVerification?: boolean }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<Pick<User, "name" | "tier">>) => Promise<{ ok: boolean; error?: string }>;
  /** MFA / strong-auth state for Plaid and bank linking. */
  mfaSnapshot: MfaSnapshot | null;
  mfaLoading: boolean;
  mfaError: string | null;
  authAssurance: AuthAssuranceResponse | null;
  refreshMfa: () => Promise<RefreshMfaResult>;
  /** True when auth-assurance reports banking_allowed (and checks pass). */
  canLinkBank: boolean;
  bankLinkGateReason: BankLinkGateReason;
  enrollTotpFactor: () => ReturnType<typeof mfaEnrollTotp>;
  verifyTotpEnrollment: (factorId: string, code: string) => ReturnType<typeof mfaVerifyTotpEnrollment>;
  verifyMfaChallenge: (factorId: string, code: string) => ReturnType<typeof mfaVerifyChallenge>;
  unenrollMfaFactor: (factorId: string) => Promise<void>;
};

export type SignUpData = {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

function mapMeToUser(me: MeResponse): User {
  return {
    id: me.id,
    supabaseUid: me.supabase_uid ?? "",
    username: me.username,
    name: resolveDisplayName(me.name, me.username),
    email: me.email,
    tier: me.tier,
    createdAt: me.created_at ?? "",
  };
}

function mapMeToBackend(me: MeResponse): BackendUserProfile {
  return {
    id: me.id,
    email: me.email,
    name: resolveDisplayName(me.name, me.username),
    username: me.username,
    supabase_uid: me.supabase_uid ?? "",
  };
}

function normalizeNextStep(value: unknown): AuthNextStep {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (raw === "mfa_setup") return "mfa_setup";
  if (raw === "mfa_verify") return "mfa_verify";
  if (raw === "onboarding_survey") return "onboarding_survey";
  if (raw === "dashboard") return "dashboard";
  return null;
}

function normalizePostMfaStep(value: unknown): AuthPostMfaStep {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (raw === "onboarding_survey") return "onboarding_survey";
  if (raw === "dashboard") return "dashboard";
  return null;
}

function resolveOnboardingStep(me: MeResponse): "onboarding_survey" | "dashboard" {
  if (typeof me.onboarding_required === "boolean") {
    return me.onboarding_required ? "onboarding_survey" : "dashboard";
  }
  if (typeof me.onboarding_completed === "boolean") {
    return me.onboarding_completed ? "dashboard" : "onboarding_survey";
  }
  return "dashboard";
}

function deriveNextStepFromMe(me: MeResponse): Exclude<AuthNextStep, null> {
  const explicit = normalizeNextStep(me.next_step);
  if (explicit) return explicit;
  if (me.mfa_pending) {
    return me.mfa_enrollment_required ? "mfa_setup" : "mfa_verify";
  }
  return resolveOnboardingStep(me);
}

function derivePostMfaStepFromMe(
  me: MeResponse,
  nextStep: Exclude<AuthNextStep, null>
): AuthPostMfaStep {
  if (nextStep !== "mfa_setup" && nextStep !== "mfa_verify") {
    return null;
  }
  const explicit = normalizePostMfaStep(me.post_mfa_step);
  if (explicit) {
    return explicit;
  }
  return resolveOnboardingStep(me);
}

export function routeForNextStep(nextStep: AuthNextStep): string {
  if (nextStep === "mfa_setup") return "/mfa/setup";
  if (nextStep === "mfa_verify") return "/mfa/verify";
  if (nextStep === "onboarding_survey") return "/onboarding";
  return "/";
}

type SignUpApiResponse = {
  requires_verification?: boolean;
  email_confirmation_required?: boolean;
  user?: MeResponse;
};

type GateOpts = { loading: boolean; fetchFailed: boolean };

export function computeBankLinkGateFromAssurance(
  apiErr: string | null,
  assurance: AuthAssuranceResponse | null,
  opts: GateOpts
): { can: boolean; reason: BankLinkGateReason } {
  if (apiErr) return { can: false, reason: "api_misconfigured" };
  if (opts.loading) return { can: false, reason: "mfa_loading" };
  if (opts.fetchFailed || assurance === null) return { can: false, reason: "auth_assurance_unavailable" };
  if (!assurance.banking_allowed) {
    const code = assurance.blocking_code;
    if (code === "mfa_not_enrolled") return { can: false, reason: "mfa_not_enrolled" };
    if (code === "mfa_verification_needed") return { can: false, reason: "mfa_verification_needed" };
    if (code === "mfa_required") return { can: false, reason: "mfa_required" };
    return { can: false, reason: "mfa_required" };
  }
  return { can: true, reason: null };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [backendUser, setBackendUser] = React.useState<BackendUserProfile | null>(null);
  const [nextStep, setNextStep] = React.useState<AuthNextStep>(null);
  const [postMfaStep, setPostMfaStep] = React.useState<AuthPostMfaStep>(null);
  const [authLoading, setAuthLoading] = React.useState(true);
  const [mfaSnapshot, setMfaSnapshot] = React.useState<MfaSnapshot | null>(null);
  const [mfaLoading, setMfaLoading] = React.useState(false);
  const [mfaError, setMfaError] = React.useState<string | null>(null);
  const [authAssurance, setAuthAssurance] = React.useState<AuthAssuranceResponse | null>(null);
  const backendUserRef = React.useRef<BackendUserProfile | null>(null);
  /** Sync with `user` so `refreshMfa` can run immediately after login before re-render. */
  const userRef = React.useRef<User | null>(null);

  const updateBackendUser = React.useCallback((profile: BackendUserProfile | null) => {
    backendUserRef.current = profile;
    setBackendUser(profile);
  }, []);

  const applyMe = React.useCallback(
    (me: MeResponse | null) => {
      if (!me) {
        userRef.current = null;
        setUser(null);
        updateBackendUser(null);
        setNextStep(null);
        setPostMfaStep(null);
        return;
      }
      const resolvedNextStep = deriveNextStepFromMe(me);
      const u = mapMeToUser(me);
      userRef.current = u;
      setUser(u);
      updateBackendUser(mapMeToBackend(me));
      setNextStep(resolvedNextStep);
      setPostMfaStep(derivePostMfaStepFromMe(me, resolvedNextStep));
    },
    [updateBackendUser]
  );

  const refreshSession = React.useCallback(async () => {
    try {
      const me = await apiRequest<MeResponse>("/api/auth/me/", { requireAuth: true });
      flushSync(() => {
        applyMe(me);
      });
      const resolvedNextStep = deriveNextStepFromMe(me);
      return {
        hasSession: true,
        me,
        nextStep: resolvedNextStep,
        postMfaStep: derivePostMfaStepFromMe(me, resolvedNextStep),
        nextRoute: routeForNextStep(resolvedNextStep),
      } satisfies RefreshSessionResult;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        flushSync(() => {
          applyMe(null);
        });
        return {
          hasSession: false,
          me: null,
          nextStep: null,
          postMfaStep: null,
          nextRoute: "/login",
        } satisfies RefreshSessionResult;
      }
      throw e;
    }
  }, [applyMe]);

  const refreshMfa = React.useCallback(async () => {
    if (!userRef.current) {
      setMfaSnapshot(null);
      setAuthAssurance(null);
      setMfaError(null);
      return {
        gate: computeBankLinkGateFromAssurance(getApiConfigurationError(), null, { loading: false, fetchFailed: false }),
        mfaSnapshot: null as MfaSnapshot | null,
      };
    }
    setMfaLoading(true);
    setMfaError(null);
    let snap: MfaSnapshot | null = null;
    try {
      try {
        snap = await getMfaSnapshot();
        setMfaSnapshot(snap);
      } catch (e) {
        setMfaSnapshot(null);
        setAuthAssurance(null);
        setMfaError(e instanceof Error ? e.message : "MFA status unavailable");
        return {
          gate: computeBankLinkGateFromAssurance(getApiConfigurationError(), null, { loading: false, fetchFailed: true }),
          mfaSnapshot: null,
        };
      }
      try {
        const assurance = await fetchAuthAssurance();
        setAuthAssurance(assurance);
        setMfaError(null);
        return {
          gate: computeBankLinkGateFromAssurance(getApiConfigurationError(), assurance, { loading: false, fetchFailed: false }),
          mfaSnapshot: snap,
        };
      } catch (e) {
        setAuthAssurance(null);
        setMfaError(e instanceof Error ? e.message : "Security check failed");
        return {
          gate: computeBankLinkGateFromAssurance(getApiConfigurationError(), null, { loading: false, fetchFailed: true }),
          mfaSnapshot: snap,
        };
      }
    } finally {
      setMfaLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await refreshSession();
      } finally {
        if (mounted) setAuthLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [refreshSession]);

  React.useEffect(() => {
    if (user) {
      void refreshMfa();
    } else {
      setMfaSnapshot(null);
      setAuthAssurance(null);
      setMfaError(null);
    }
  }, [user, refreshMfa]);

  const login = React.useCallback(
    async (email: string, password: string) => {
      try {
        await apiRequest<MeResponse>("/api/auth/login/", {
          method: "POST",
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password,
          }),
        });
        const refreshed = await refreshSession();
        if (!refreshed.hasSession || !refreshed.me) {
          throw new Error("Sign in did not create a valid session.");
        }
        await refreshMfa();

        emitAuditEvent({
          event_name: "auth.login",
          outcome: "success",
          actor_id: refreshed.me.supabase_uid,
          source_system: "frontend-web",
          action: "login",
          resource_type: "session",
          metadata: { auth_provider: "django_session" },
        });

        return {
          ok: true as const,
          nextRoute: refreshed.nextRoute,
          nextStep: refreshed.nextStep,
        };
      } catch (e) {
        const message = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Sign in failed.";
        emitAuditEvent({
          event_name: "auth.login",
          outcome: "failure",
          actor_id: null,
          source_system: "frontend-web",
          action: "login",
          resource_type: "session",
          error_message: message,
          metadata: { auth_provider: "django_session", email_domain: email.trim().toLowerCase().split("@")[1] ?? null },
        });
        return { ok: false as const, error: message };
      }
    },
    [refreshMfa, refreshSession]
  );

  const signUp = React.useCallback(async (data: SignUpData) => {
    if (data.password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
    if (data.confirmPassword !== undefined && data.password !== data.confirmPassword) {
      return { ok: false, error: "Passwords do not match." };
    }

    try {
      const resp = await apiRequest<SignUpApiResponse>("/api/auth/signup/", {
        method: "POST",
        body: JSON.stringify({
          email: data.email.trim().toLowerCase(),
          password: data.password,
          name: data.name.trim(),
        }),
      });

      const needsVerify =
        resp.requires_verification === true || resp.email_confirmation_required === true;
      if (!needsVerify) {
        await refreshSession();
      }

      emitAuditEvent({
        event_name: "auth.signup",
        outcome: "success",
        actor_id: resp.user?.supabase_uid ?? null,
        source_system: "frontend-web",
        action: "signup",
        resource_type: "account",
        metadata: { auth_provider: "django_session", verification_required: needsVerify },
      });

      return { ok: true as const, requiresVerification: needsVerify };
    } catch (e) {
      const message = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Sign up failed.";
      emitAuditEvent({
        event_name: "auth.signup",
        outcome: "failure",
        actor_id: null,
        source_system: "frontend-web",
        action: "signup",
        resource_type: "account",
        error_message: message,
        metadata: { auth_provider: "django_session", email_domain: data.email.trim().toLowerCase().split("@")[1] ?? null },
      });
      return { ok: false as const, error: message };
    }
  }, [refreshSession]);

  const logout = React.useCallback(async () => {
    const actorId = userRef.current?.supabaseUid ?? backendUserRef.current?.supabase_uid ?? null;
    try {
      await apiRequest<null>("/api/auth/logout/", { method: "POST" });
    } catch {
      // Still clear local state so the UI can recover.
    }
    applyMe(null);
    emitAuditEvent({
      event_name: "auth.logout",
      outcome: "success",
      actor_id: actorId,
      source_system: "frontend-web",
      action: "logout",
      resource_type: "session",
    });
  }, [applyMe]);

  const enrollTotpFactor = React.useCallback(() => mfaEnrollTotp(), []);

  const verifyTotpEnrollment = React.useCallback(
    async (factorId: string, code: string) => {
      const result = await mfaVerifyTotpEnrollment(factorId, code);
      await refreshMfa();
      return result;
    },
    [refreshMfa]
  );

  const verifyMfaChallenge = React.useCallback(
    (factorId: string, code: string) => mfaVerifyChallenge(factorId, code),
    []
  );

  const unenrollMfaFactor = React.useCallback(
    async (factorId: string) => {
      await mfaUnenroll(factorId);
      await refreshMfa();
    },
    [refreshMfa]
  );

  const { can: canLinkBank, reason: bankLinkGateReason } = React.useMemo(() => {
    const fetchFailed = !mfaLoading && !!mfaError && authAssurance === null;
    return computeBankLinkGateFromAssurance(getApiConfigurationError(), authAssurance, {
      loading: mfaLoading,
      fetchFailed,
    });
  }, [mfaLoading, mfaError, authAssurance]);

  const nextRoute = React.useMemo(() => {
    if (!user) return "/login";
    return routeForNextStep(nextStep);
  }, [user, nextStep]);

  const updateProfile = React.useCallback(
    async (data: Partial<Pick<User, "name" | "tier">>) => {
      try {
        const me = await apiRequest<MeResponse>("/api/auth/me/", {
          requireAuth: true,
          method: "PATCH",
          body: JSON.stringify({
            ...(data.name !== undefined ? { name: data.name } : {}),
            ...(data.tier !== undefined ? { tier: data.tier } : {}),
          }),
        });
        applyMe(me);
        emitAuditEvent({
          event_name: "account.profile_update",
          outcome: "success",
          actor_id: me.supabase_uid,
          source_system: "frontend-web",
          action: "update_profile",
          resource_type: "account",
          metadata: { updated_fields: Object.keys(data) },
        });
        return { ok: true as const };
      } catch (e) {
        const message = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Update failed.";
        emitAuditEvent({
          event_name: "account.profile_update",
          outcome: "failure",
          actor_id: userRef.current?.supabaseUid ?? null,
          source_system: "frontend-web",
          action: "update_profile",
          resource_type: "account",
          error_message: message,
          metadata: { updated_fields: Object.keys(data) },
        });
        return { ok: false as const, error: message };
      }
    },
    [applyMe]
  );

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      backendUser,
      nextStep,
      postMfaStep,
      nextRoute,
      isAuthenticated: !!user,
      isAuthReady: !authLoading,
      refreshSession,
      login,
      signUp,
      logout,
      updateProfile,
      mfaSnapshot,
      mfaLoading,
      mfaError,
      authAssurance,
      refreshMfa,
      canLinkBank,
      bankLinkGateReason,
      enrollTotpFactor,
      verifyTotpEnrollment,
      verifyMfaChallenge,
      unenrollMfaFactor,
    }),
    [
      user,
      backendUser,
      nextStep,
      postMfaStep,
      nextRoute,
      authLoading,
      refreshSession,
      login,
      signUp,
      logout,
      updateProfile,
      mfaSnapshot,
      mfaLoading,
      mfaError,
      authAssurance,
      refreshMfa,
      canLinkBank,
      bankLinkGateReason,
      enrollTotpFactor,
      verifyTotpEnrollment,
      verifyMfaChallenge,
      unenrollMfaFactor,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
