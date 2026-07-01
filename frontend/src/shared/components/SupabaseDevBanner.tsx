import { AlertTriangle } from "lucide-react";
import { isSupabaseEnvConfigured } from "@/config/supabaseEnv";

/**
 * In dev only: warns when Supabase env vars are missing so auth hits localhost:54321
 * (fails with "failed to fetch" unless Supabase CLI is running).
 */
export function SupabaseDevBanner() {
  if (!import.meta.env.DEV) return null;
  if (isSupabaseEnvConfigured()) return null;

  return (
    <div
      role="status"
      className="fixed bottom-6 left-6 z-[200] max-w-md rounded-2xl border border-amber-500/40 bg-[#1a1508] p-4 text-left text-sm text-amber-100 shadow-2xl"
    >
      <div className="flex gap-2">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Supabase not configured</p>
          <p className="mt-2 text-xs leading-relaxed text-amber-50/90">
            Create <code className="rounded bg-black/30 px-1">frontend/.env</code> with{" "}
            <code className="rounded bg-black/30 px-1">VITE_SUPABASE_URL</code> and{" "}
            <code className="rounded bg-black/30 px-1">VITE_SUPABASE_ANON_KEY</code> from your Supabase project
            (Dashboard → Settings → API). Restart <code className="rounded bg-black/30 px-1">npm run dev</code> after
            saving. Sign-in with Google needs the same project + OAuth settings in Supabase.
          </p>
        </div>
      </div>
    </div>
  );
}
