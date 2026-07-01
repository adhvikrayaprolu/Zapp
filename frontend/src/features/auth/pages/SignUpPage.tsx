import * as React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { AppButton, AppInput, FormField, SectionHeader, Surface } from "@/shared/components/system";
import { PrivacyPolicyLink } from "@/shared/components/PrivacyPolicyLink";
import { AppLogo } from "@/shared/components/brand/AppLogo";

export function SignUpPage() {
  const { signUp, isAuthenticated, isAuthReady } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (isAuthReady && isAuthenticated) navigate("/", { replace: true });
  }, [isAuthReady, isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await signUp({ name, email, password, confirmPassword });
    setLoading(false);
    if (result.ok) {
      if (result.requiresVerification) {
        toast.success("Check your email to verify your account.");
        return;
      }
      toast.success("Account created. Welcome to Zapp!");
      navigate("/", { replace: true });
    } else {
      toast.error(result.error);
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
            eyebrow="Create your account"
            title="Join Zapp"
            description="Enter your details to get started."
            titleClassName="app-page-title text-[2.5rem] sm:text-[3rem]"
            className="mb-8"
          />

          <form onSubmit={handleSubmit} className="space-y-5">
            <FormField label="Full name" htmlFor="signup-name">
              <AppInput
                id="signup-name"
                type="text"
                placeholder="Alex Chen"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </FormField>
            <FormField label="Email" htmlFor="signup-email">
              <AppInput
                id="signup-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </FormField>
            <FormField label="Password" htmlFor="signup-password" helperText="Use at least 6 characters.">
              <AppInput
                id="signup-password"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </FormField>
            <FormField label="Confirm password" htmlFor="signup-confirm">
              <AppInput
                id="signup-confirm"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </FormField>
            <AppButton type="submit" disabled={loading} size="lg" className="w-full">
              {loading ? "Creating account..." : "Sign up"}
            </AppButton>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--app-color-text-secondary)]">
            Already have an account?{" "}
            <NavLink
              to="/login"
              className="font-semibold text-[var(--app-accent-cyan)] transition-colors hover:opacity-90"
            >
              Sign in
            </NavLink>
          </p>
          <p className="mt-4 text-center text-xs text-gray-600">
            <PrivacyPolicyLink className="text-gray-500 hover:text-gray-400" />
          </p>
        </Surface>
      </motion.div>
    </div>
  );
}
