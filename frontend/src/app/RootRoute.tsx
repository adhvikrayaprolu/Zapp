import { Navigate } from "react-router-dom";

import { useAuth } from "@/features/auth";
import { MarketingLandingPage } from "@/features/marketing";

/**
 * Root route ("/").
 *
 * - Anonymous visitors see the public marketing landing page.
 * - Authenticated users are redirected to the dashboard home at /home.
 *
 * Gated on `isAuthReady` so we never flash the landing page (or a redirect)
 * before auth state has resolved.
 */
export function RootRoute() {
  const { isAuthenticated, isAuthReady } = useAuth();

  if (!isAuthReady) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  return <MarketingLandingPage />;
}
