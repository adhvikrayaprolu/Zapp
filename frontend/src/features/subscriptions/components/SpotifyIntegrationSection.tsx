import * as React from "react";
import { motion } from "motion/react";
import { Loader2, Music, RefreshCw, Unplug, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { COLORS, GLOWS } from "@/shared/theme";
import { cn } from "@/shared/components/ui/utils";
import { useSpotifyIntegration } from "../hooks/useSpotifyIntegration";

function formatSynced(iso?: string | null) {
  if (!iso) return "Never";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function SpotifyIntegrationSection() {
  const { status, insights, loading, actionLoading, error, connect, sync, disconnect, reload } =
    useSpotifyIntegration();

  const connected = status?.connected === true;
  const syncState = (status?.sync_status ?? "idle").toLowerCase();
  const syncing = syncState === "syncing" || syncState === "pending";
  const needsReconnect =
    status?.requires_reconnect === true ||
    syncState === "reconnect_required" ||
    status?.health === "error";

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[2rem] border border-[var(--app-color-border-strong)] bg-[var(--app-color-surface-base)] p-8"
      style={{ boxShadow: GLOWS.ambient(0.35) }}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[var(--app-color-border-subtle)]"
            style={{
              background: `linear-gradient(135deg, #1DB95433, ${COLORS.electricGreen}22)`,
              boxShadow: GLOWS.soft("#1DB954"),
            }}
          >
            <Music className="h-7 w-7 text-[#1DB954]" />
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tight text-[var(--app-color-text-primary)]">Spotify</h3>
            <p className="mt-1 max-w-xl text-sm font-medium text-[var(--app-color-text-tertiary)]">
              Connect Spotify to enrich subscription intelligence with listening activity (no in-app player). OAuth is
              handled securely by our servers.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          {!connected && (
            <Button
              type="button"
              disabled={loading || actionLoading}
              onClick={() => void connect()}
              className="rounded-2xl bg-[#1DB954] font-black uppercase tracking-widest text-[#0B1220] hover:bg-[#1ed760]"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect Spotify"}
            </Button>
          )}
          {connected && (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={actionLoading || syncing}
                onClick={() => void sync()}
                className="rounded-2xl border-[var(--app-color-border-strong)]"
              >
                {syncing || actionLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Sync now
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={actionLoading}
                onClick={() => void disconnect()}
                className="rounded-2xl text-[var(--app-color-status-danger)] hover:bg-[color:color-mix(in_srgb,var(--app-color-status-danger)_10%,transparent)] hover:text-[var(--app-color-status-danger)]"
              >
                <Unplug className="mr-2 h-4 w-4" />
                Disconnect
              </Button>
            </>
          )}
        </div>
      </div>

      {loading && (
        <div className="mt-6 flex items-center gap-2 text-sm text-[var(--app-color-text-tertiary)]">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--app-accent-cyan-soft)]" />
          Checking Spotify connection…
        </div>
      )}

      {error && !loading && (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-[color:color-mix(in_srgb,var(--app-accent-yellow-soft)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--app-accent-yellow-soft)_14%,transparent)] px-4 py-3 text-sm text-[var(--app-color-text-secondary)]">
          <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--app-accent-yellow-soft)]" />
          <span>{error}</span>
          <Button type="button" variant="outline" size="sm" className="border-[var(--app-color-border-strong)]" onClick={() => void reload()}>
            Retry
          </Button>
        </div>
      )}

      {connected && status && !loading && (
        <div className="mt-6 grid gap-4 border-t border-[var(--app-color-border-subtle)] pt-6 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--app-color-text-tertiary)]">Account</p>
            <p className="text-lg font-black text-[var(--app-color-text-primary)]">{status.display_name ?? "Spotify account"}</p>
            <div className="flex flex-wrap gap-2 text-xs text-[var(--app-color-text-tertiary)]">
              {status.country && (
                <span className="rounded-full border border-[var(--app-color-border-subtle)] bg-[var(--app-color-surface-inset)] px-2 py-0.5">{status.country}</span>
              )}
              {status.product && (
                <span className="rounded-full border border-[var(--app-color-border-subtle)] bg-[var(--app-color-surface-inset)] px-2 py-0.5">{status.product}</span>
              )}
            </div>
            {status.scopes && status.scopes.length > 0 && (
              <p className="text-[10px] leading-relaxed text-[var(--app-color-text-faint)]">
                Scopes: {status.scopes.slice(0, 6).join(", ")}
                {status.scopes.length > 6 ? "…" : ""}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--app-color-text-tertiary)]">Sync</p>
            <p className="text-sm text-[var(--app-color-text-secondary)]">
              Last synced: <span className="font-bold text-[var(--app-color-text-primary)]">{formatSynced(status.last_synced_at)}</span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest",
                  needsReconnect && "border-[color:color-mix(in_srgb,var(--app-color-status-danger)_40%,transparent)] bg-[color:color-mix(in_srgb,var(--app-color-status-danger)_12%,transparent)] text-[var(--app-color-status-danger)]",
                  !needsReconnect && status.health === "warning" && "border-[color:color-mix(in_srgb,var(--app-accent-yellow-soft)_40%,transparent)] bg-[color:color-mix(in_srgb,var(--app-accent-yellow-soft)_12%,transparent)] text-[var(--app-accent-yellow-soft)]",
                  !needsReconnect && (status.health === "ok" || !status.health) && "border-[color:color-mix(in_srgb,var(--app-color-status-success)_35%,transparent)] text-[var(--app-color-status-success)]"
                )}
              >
                {needsReconnect ? (
                  <>
                    <AlertTriangle className="h-3 w-3" /> Reconnect required
                  </>
                ) : syncing ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" /> Syncing
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3 w-3" /> {status.sync_status ?? "idle"}
                  </>
                )}
              </span>
              {status.message && <span className="text-xs text-[var(--app-color-text-tertiary)]">{status.message}</span>}
            </div>
          </div>
        </div>
      )}

      {connected && insights && (insights.active_listening_days != null || insights.summary) && (
        <div className="mt-6 rounded-2xl border border-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_22%,transparent)] bg-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_7%,transparent)] p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--app-accent-cyan-soft)]">Spotify insights</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {insights.active_listening_days != null && (
              <div>
                <p className="text-[10px] font-bold uppercase text-[var(--app-color-text-tertiary)]">Active days</p>
                <p className="text-2xl font-black text-[var(--app-color-text-primary)]">{insights.active_listening_days}</p>
              </div>
            )}
            {insights.recent_usage_trend && (
              <div>
                <p className="text-[10px] font-bold uppercase text-[var(--app-color-text-tertiary)]">Recent trend</p>
                <p className="text-lg font-black capitalize text-[var(--app-color-text-primary)]">{String(insights.recent_usage_trend)}</p>
              </div>
            )}
            {insights.estimated_utilization != null && (
              <div>
                <p className="text-[10px] font-bold uppercase text-[var(--app-color-text-tertiary)]">Est. utilization</p>
                <p className="text-2xl font-black text-[var(--app-color-text-primary)]">
                  {typeof insights.estimated_utilization === "number"
                    ? `${Math.round(insights.estimated_utilization * 100)}%`
                    : insights.estimated_utilization}
                </p>
              </div>
            )}
            {insights.cost_per_active_day != null && (
              <div>
                <p className="text-[10px] font-bold uppercase text-[var(--app-color-text-tertiary)]">Cost / active day</p>
                <p className="text-2xl font-black text-[var(--app-color-text-primary)]">
                  ${Number(insights.cost_per_active_day).toFixed(2)}
                </p>
              </div>
            )}
          </div>
          {insights.summary && <p className="mt-3 text-sm text-[var(--app-color-text-tertiary)]">{insights.summary}</p>}
        </div>
      )}
    </motion.section>
  );
}
