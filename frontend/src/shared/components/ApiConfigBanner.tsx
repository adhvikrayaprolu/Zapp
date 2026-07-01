import { AlertTriangle } from "lucide-react";
import { getApiConfigurationError } from "@/api/client";

/** Surfaces insecure or missing production API configuration (frontend check only). */
export function ApiConfigBanner() {
  const err = getApiConfigurationError();
  if (!err) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-6 right-6 z-[200] max-w-sm rounded-2xl border border-red-500/40 bg-[#1a0a0a] p-4 text-left text-sm text-red-100 shadow-2xl"
    >
      <div className="flex gap-2">
        <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" />
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-red-400">API configuration</p>
          <p className="mt-1">{err}</p>
        </div>
      </div>
    </div>
  );
}
