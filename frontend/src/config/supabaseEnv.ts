/**
 * True when both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set (hosted or custom project).
 * When false in dev, the client uses local CLI defaults — auth will fail unless `supabase start` is running.
 */
export function isSupabaseEnvConfigured(): boolean {
  const url = (import.meta.env.VITE_SUPABASE_URL ?? "").trim();
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();
  return !!(url && anonKey);
}
