import * as React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { getApiBaseUrl } from "@/api/client";
import { DemoLoginAPI } from "@/api/users.api";
import { AppButton, AppInput, FormField, SectionHeader, Surface } from "@/shared/components/system";
import { PrivacyPolicyLink } from "@/shared/components/PrivacyPolicyLink";
import { AppLogo } from "@/shared/components/brand/AppLogo";

const NAMED_LOOPBACK_HOST = "local" + "host";

function isLoopbackHostname(hostname: string) {
  return hostname === NAMED_LOOPBACK_HOST || hostname === "127.0.0.1" || hostname === "[::1]";
}

function assertCompatibleOAuthAuthorizeUrl(authorizeUrl: string, apiBaseUrl: string) {
  try {
    const authorize = new URL(authorizeUrl);
    const redirectTo = authorize.searchParams.get("redirect_to");
    if (!redirectTo) return;

    const redirectUrl = new URL(redirectTo);
    const apiUrl = new URL(apiBaseUrl);
    if (isLoopbackHostname(redirectUrl.hostname) && isLoopbackHostname(apiUrl.hostname) && redirectUrl.hostname !== apiUrl.hostname) {
      throw new Error(
        `Google auth is misconfigured for local development. Backend OAuth callback host (${redirectUrl.hostname}) does not match API host (${apiUrl.hostname}). Align VITE_API_URL and SUPABASE_OAUTH_REDIRECT_URI.`
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Google auth is misconfigured for local development.")) {
      throw error;
    }
  }
}

export function buildOAuthRedirectUriAfter(apiBaseUrl: string, locationLike: Pick<Location, "origin">) {
  const redirectUrl = new URL("/auth/callback", `${locationLike.origin}/`);

  try {
    const apiUrl = new URL(apiBaseUrl);
    if (isLoopbackHostname(apiUrl.hostname) && isLoopbackHostname(redirectUrl.hostname) && apiUrl.hostname !== redirectUrl.hostname) {
      redirectUrl.hostname = apiUrl.hostname;
    }
  } catch {
    // Fall back to the current origin when the API URL is invalid.
  }

  return redirectUrl.toString();
}

export function LoginPage() {
  const { login, loginAsDemo, isAuthenticated, isAuthReady, nextRoute } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  // Which sign-in options this environment supports (null while loading). The demo
  // account is development-only; email/Google need Supabase to be configured.
  const [options, setOptions] = React.useState<{ demo: boolean; password: boolean } | null>(null);

  React.useEffect(() => {
    let active = true;
    DemoLoginAPI.status()
      .then((res) => {
        if (active) setOptions({ demo: res?.enabled === true, password: res?.password_login_configured !== false });
      })
      .catch(() => {
        if (active) setOptions({ demo: false, password: true });
      });
    return () => {
      active = false;
    };
  }, []);
  const demoOnly = options?.demo === true && !options.password;

  React.useEffect(() => {
    if (isAuthReady && isAuthenticated) navigate(nextRoute, { replace: true });
  }, [isAuthReady, isAuthenticated, navigate, nextRoute]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.ok) {
      toast.success("Welcome back!");
      navigate(result.nextRoute ?? "/", { replace: true });
    } else {
      toast.error(result.error);
    }
  };

  const handleDemoSignIn = async () => {
    if (loading) return;
    setLoading(true);
    const result = await loginAsDemo();
    setLoading(false);
    if (result.ok) {
      toast.success("Signed in to the demo account");
      navigate(result.nextRoute ?? "/", { replace: true });
    } else {
      toast.error(result.error);
    }
  };

  const handleGoogleSignIn = async () => {
    if (loading) return;
    setLoading(true);
    const apiBaseUrl = getApiBaseUrl();

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/oauth/start/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: "google",
          redirect_uri_after: buildOAuthRedirectUriAfter(apiBaseUrl, window.location),
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | { authorize_url?: string; detail?: string }
        | null;

      if (!response.ok || !data?.authorize_url) {
        throw new Error(data?.detail || "Google sign-in is unavailable right now.");
      }

      assertCompatibleOAuthAuthorizeUrl(data.authorize_url, apiBaseUrl);
      window.location.assign(data.authorize_url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Google sign-in failed.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg"
      >
        <Surface variant="overlay" padding="xl" className="backdrop-blur-xl">
          <div className="mb-8 flex justify-center">
            <AppLogo size={104} />
          </div>

          <SectionHeader
            level={1}
            align="center"
            eyebrow="Welcome back"
            title="Sign in"
            description={
              demoOnly
                ? "Explore Zapp with a demo account full of sample activity."
                : "Enter your credentials to continue."
            }
            titleClassName="app-page-title text-[2.5rem] sm:text-[3rem]"
            className="mb-8"
          />

            {options === null && <div className="min-h-[18rem]" aria-busy="true" />}

            {options?.demo && (
              <AppButton
                type="button"
                size="md"
                onClick={handleDemoSignIn}
                disabled={loading}
                className="mb-3 w-full"
              >
                Try the demo account
              </AppButton>
            )}

            {options?.password && (
            <>
            <AppButton
              type="button"
              variant="outline"
              size="md"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full border-[var(--app-color-border-strong)] bg-[var(--app-color-surface-base)]"
            >
              {loading ? "Starting Google sign-in..." : "Continue with Google"}
            </AppButton>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--app-color-border-subtle)]" />
            <span className="app-label text-[var(--app-color-text-tertiary)]">or</span>
            <div className="h-px flex-1 bg-[var(--app-color-border-subtle)]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <FormField label="Email" htmlFor="login-email">
              <AppInput
                id="login-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </FormField>

            <FormField label="Password" htmlFor="login-password">
              <AppInput
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </FormField>

            <AppButton type="submit" disabled={loading} size="lg" className="w-full">
              {loading ? "Signing in..." : "Sign in"}
            </AppButton>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--app-color-text-secondary)]">
            Don't have an account?{" "}
            <NavLink
              to="/signup"
              className="font-semibold text-[var(--app-accent-cyan)] transition-colors hover:opacity-90"
            >
              Sign up
            </NavLink>
          </p>
            </>
            )}

          <p className="mt-4 text-center text-xs text-gray-600">
            <PrivacyPolicyLink className="text-gray-500 hover:text-gray-400" />
          </p>
        </Surface>
      </motion.div>
    </div>
  );
}
