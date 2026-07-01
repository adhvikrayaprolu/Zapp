import { createClient } from "@supabase/supabase-js";
import { getValidatedUrlOrThrow, resolveSupabaseUrl } from "@/config/apiEnv";

/**
 * Default URL/key for Supabase CLI local dev (`supabase start` → http://127.0.0.1:54321).
 * In development, if env vars are missing or incomplete, we use these so the bundle loads
 * (avoids a white screen). Use frontend/.env for a hosted Supabase project.
 */
const LOCAL_SUPABASE_URL = "http://127.0.0.1:54321";
const LOCAL_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const supabaseUrl = getValidatedUrlOrThrow(resolveSupabaseUrl());
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // Keep browser sessions in memory only. This reduces token exposure from
    // persistent localStorage at the cost of requiring re-auth on full reload.
    persistSession: false,
  },
});