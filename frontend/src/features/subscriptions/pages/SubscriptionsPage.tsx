import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, CreditCard, Calendar, Loader2, Plus, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { SpotifyIntegrationSection } from "../components/SpotifyIntegrationSection";
import { cn } from "@/shared/components/ui/utils";
import { COLORS, UI_PATTERNS } from "@/shared/theme";
import { getValuePresentation, normalizeModelValueScore } from "@/shared/valuation";
import {
  SubscriptionsAPI,
  MerchantsAPI,
  SubscriptionValuationsAPI,
  ValueScoresAPI,
  type Subscription,
  type Merchant,
  type SubscriptionValuation,
} from "@/api";
import { ApiError } from "@/api/client";
import { usePanelActions } from "@/features/dashboard/context/PanelContext";
import { toast } from "sonner";
import {
  AppPage,
  AppButton,
  AppInput,
  AppSheet,
  AppSheetBody,
  AppSheetContent,
  AppSheetDescription,
  AppSheetFooter,
  AppSheetHeader,
  AppSheetTitle,
  AppSelect,
  AppTextarea,
  EmptyState,
  FormField,
  InlineNotice,
  LoadingState,
  SectionHeader,
  StatusChip,
  Surface,
  ValueScoreMeter,
} from "@/shared/components/system";

const BILLING_CYCLES = ["weekly", "monthly", "yearly", "other"];
const INITIAL_VISIBLE_SUBSCRIPTIONS = 12;

function formatConfidencePercent(confidence?: number | null) {
  if (confidence == null) return null;
  return Math.round(Math.min(1, Math.max(0, confidence)) * 100);
}

function formatValuationJson(value?: Record<string, unknown>) {
  if (!value || Object.keys(value).length === 0) return null;
  return JSON.stringify(value, null, 2);
}

function getStatusColor(status: string) {
  const s = (status || "").toLowerCase();
  if (s.includes("active") || s.includes("optimal")) return COLORS.electricGreen;
  if (s.includes("underused") || s.includes("cancel")) return COLORS.electricRed;
  return COLORS.electricBlue;
}

function extractApiErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const raw = err.rawBody;
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const first = Object.values(parsed)[0];
        if (Array.isArray(first) && typeof first[0] === "string") return first[0];
        if (typeof first === "string") return first;
      } catch {
      }
    }
    return err.message || "Failed to save subscription.";
  }
  if (!(err instanceof Error)) return "Failed to save subscription.";
  return err.message || "Failed to save subscription.";
}

type AddSubscriptionForm = {
  merchantName: string;
  amount: string;
  billing_cycle: string;
  status: string;
  started_at: string;
  notes: string;
};

function createEmptySubscriptionForm(): AddSubscriptionForm {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return {
    merchantName: "",
    amount: "",
    billing_cycle: "monthly",
    status: "active",
    started_at: `${y}-${m}-${day}`,
    notes: "",
  };
}

function deriveSubscriptionDisplayValueScore(
  sub: Subscription,
  valuations: SubscriptionValuation[]
) {
  const valuationScore = valuations.find(
    (valuation) =>
      typeof valuation.personal_value_score === "number" &&
      Number.isFinite(valuation.personal_value_score)
  )?.personal_value_score;

  if (typeof valuationScore === "number") {
    return normalizeModelValueScore(valuationScore);
  }

  if (typeof sub.value_score !== "number" || !Number.isFinite(sub.value_score)) {
    return null;
  }

  return normalizeModelValueScore(sub.value_score);
}

function AddPanel({
  onClose,
  onAdded,
  merchants,
}: {
  onClose: () => void;
  onAdded: (s: Subscription) => void;
  merchants: Merchant[];
}) {
  const [form, setForm] = React.useState<AddSubscriptionForm>(() => createEmptySubscriptionForm());
  const [submitting, setSubmitting] = React.useState(false);

  const set = <K extends keyof AddSubscriptionForm>(key: K, val: AddSubscriptionForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = async () => {
    const merchantName = (form.merchantName || "").trim();
    if (!merchantName) {
      toast.error("Please enter a merchant name.");
      return;
    }

    const normalized = merchantName.toLowerCase();
    const match =
      merchants.find((m) => m.name.toLowerCase() === normalized) ??
      merchants.find(
        (m) =>
          m.name.toLowerCase().includes(normalized) ||
          normalized.includes(m.name.toLowerCase())
      );

    if (!match) {
      toast.error("Merchant not found in catalog. Pick an existing merchant name.");
      return;
    }

    const amt = Number(form.amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    if (!form.started_at) {
      toast.error("Please enter a start date.");
      return;
    }

    setSubmitting(true);
    try {
      const sub = await SubscriptionsAPI.create({
        merchant: match.id,
        merchant_name: merchantName,
        amount: amt,
        billing_cycle: form.billing_cycle,
        status: form.status,
        started_at: `${form.started_at}T00:00:00Z`,
        notes: form.notes,
      });
      toast.success("Subscription added!");
      onAdded(sub);
      onClose();
    } catch (err) {
      toast.error(extractApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppSheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <AppSheetContent className="flex w-full max-w-lg flex-col rounded-none border-l shadow-2xl">
        <AppSheetHeader className="gap-2 border-b border-[var(--app-color-border-subtle)]">
          <div>
            <AppSheetTitle>Add Subscription</AppSheetTitle>
            <AppSheetDescription>
              Create a manual subscription entry from the merchant catalog and recurring billing details.
            </AppSheetDescription>
            <div className="app-eyebrow mt-3 text-[var(--app-accent-cyan)]">
              Manual Entry
            </div>
          </div>
        </AppSheetHeader>

        <AppSheetBody className="space-y-7 pt-6">
          <FormField label="Merchant" helperText="Pick an existing merchant from the catalog.">
            <AppInput
              type="text"
              placeholder="e.g. Netflix, Spotify"
              value={form.merchantName}
              onChange={(e) => set("merchantName", e.target.value)}
              list="merchant-options"
            />
            <datalist id="merchant-options">
              {merchants.map((m) => (
                <option key={m.id} value={m.name} />
              ))}
            </datalist>
          </FormField>

          <div className="grid gap-6 sm:grid-cols-2">
            <FormField label="Amount ($)">
              <AppInput
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
              />
            </FormField>

            <FormField label="Billing Cycle">
              <AppSelect
                value={form.billing_cycle}
                onValueChange={(value) => set("billing_cycle", value)}
                options={BILLING_CYCLES.map((c) => ({
                  value: c,
                  label: c.charAt(0).toUpperCase() + c.slice(1),
                }))}
              />
            </FormField>
          </div>

          <FormField label="Start Date">
            <AppInput
              type="date"
              value={form.started_at}
              onChange={(e) => set("started_at", e.target.value)}
              startAdornment={<Calendar size={18} />}
            />
          </FormField>

          <FormField
            label={
              <>
                Notes <span className="text-[var(--app-color-text-tertiary)]">(optional)</span>
              </>
            }
          >
            <AppTextarea
              placeholder="e.g. Premium plan, shared with family"
              value={form.notes || ""}
              onChange={(e) => set("notes", e.target.value)}
              className="resize-none"
            />
          </FormField>
        </AppSheetBody>

        <AppSheetFooter className="mt-auto border-t border-[var(--app-color-border-subtle)]">
          <AppButton
            onClick={handleSubmit}
            disabled={submitting}
            variant="hero"
            size="hero"
            className="w-full text-sm"
          >
            {submitting ? "Saving..." : "Add Subscription"}
          </AppButton>
        </AppSheetFooter>
      </AppSheetContent>
    </AppSheet>
  );
}

const SubscriptionCard = React.memo(function SubscriptionCard({
  sub,
  valuations,
  index,
  expanded,
  name,
  onToggle,
  onDelete,
}: {
  sub: Subscription;
  valuations: SubscriptionValuation[];
  index: number;
  expanded: boolean;
  name: string;
  onToggle: (id: number) => void;
  onDelete: (sub: Subscription, e: React.MouseEvent) => void;
}) {
  const cost = Number(sub.amount) || 0;
  const statusColor = getStatusColor(sub.status);
  const valuationWithScore = valuations.find(
    (valuation) =>
      typeof valuation.personal_value_score === "number" &&
      Number.isFinite(valuation.personal_value_score)
  );
  const valueScore = deriveSubscriptionDisplayValueScore(sub, valuations);
  const value = getValuePresentation(valueScore);
  const primaryValuation = valuationWithScore ?? valuations[0];
  const recommendation = primaryValuation?.recommendation?.trim() || value.tone;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: Math.min(index, 6) * 0.03, duration: 0.18, ease: "easeOut" }}
      whileHover={{ zIndex: 50, rotateX: 0 }}
      onClick={() => onToggle(sub.id)}
      className={cn(
        "relative group cursor-pointer transition-all duration-500",
        expanded && "z-[60] !translate-y-[-100px]"
      )}
      style={expanded ? undefined : { zIndex: 10 - (index % 10) }}
    >
      <Surface
        variant="card"
        padding="lg"
        className="flex items-center justify-between gap-6 rounded-[2rem] shadow-2xl"
        accentColor={statusColor}
      >
        <div className="flex min-w-0 flex-1 items-center gap-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--app-color-border-subtle)] bg-[var(--app-color-surface-inset)]">
            <CreditCard size={32} style={{ color: statusColor }} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h4 className="text-2xl font-black text-[var(--app-color-text-primary)]">{name}</h4>
              <StatusChip
                tone="neutral"
                style={{
                  color: value.accentColor,
                  borderColor: `${value.accentColor}40`,
                  backgroundColor: value.trackColor,
                }}
              >
                {value.label}
              </StatusChip>
            </div>

            <span
              className="text-[10px] font-black uppercase tracking-widest"
              style={{ color: statusColor }}
            >
              {sub.status || "Active"}
            </span>

            <p className="mt-3 max-w-xl truncate text-sm font-medium text-[var(--app-color-text-secondary)]">
              {recommendation}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-10">
          <div className="text-center">
            <div className={cn(UI_PATTERNS.eyebrow, "mb-1 text-xs")}>Cost</div>
            <div className="text-2xl font-black text-[var(--app-color-text-primary)]">
              ${cost.toFixed(2)}
            </div>
          </div>

          <div className="min-w-[240px] shrink-0 text-right">
            {valueScore != null ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-end gap-x-2.5 gap-y-0.5">
                  <span className="text-lg font-bold tabular-nums tracking-tight text-[var(--app-color-text-secondary)]">
                    Value
                  </span>
                  <span
                    className="text-lg font-black tabular-nums tracking-tight"
                    style={{ color: value.accentColor }}
                  >
                    {value.displayScoreText}
                  </span>
                </div>
                <ValueScoreMeter score={valueScore} accentColor={value.accentColor} />
              </div>
            ) : (
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--app-color-text-tertiary)]">
                No score yet
              </div>
            )}
          </div>

          <AppButton
            onClick={(e) => onDelete(sub, e)}
            variant="quietDanger"
            size="icon"
            className="rounded-xl"
            aria-label={`Delete ${name}`}
          >
            <X size={20} />
          </AppButton>
        </div>
      </Surface>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4 overflow-hidden rounded-[2rem]"
          >
            <Surface variant="panel" padding="lg" className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <div>
                  <div className={cn(UI_PATTERNS.eyebrow, "mb-4 text-[10px] text-[var(--app-color-text-tertiary)]")}>
                    Billing
                  </div>
                  <p className="text-sm font-medium leading-relaxed text-[var(--app-color-text-secondary)]">
                    {sub.billing_cycle} · Started{" "}
                    {sub.started_at ? new Date(sub.started_at).toLocaleDateString("en-US") : "—"}
                  </p>
                </div>

                <div>
                  <div className={cn(UI_PATTERNS.eyebrow, "mb-4 text-[10px] text-[var(--app-color-text-tertiary)]")}>
                    Notes
                  </div>
                  <p className="text-sm font-medium leading-relaxed text-[var(--app-color-text-secondary)]">
                    {sub.notes || "—"}
                  </p>
                </div>

                <Surface variant="inset" padding="md" className="rounded-[1.5rem] md:col-span-2">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                      <div className={UI_PATTERNS.eyebrow}>Value score</div>
                      {valueScore != null ? (
                        <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                          <span className="text-lg font-bold tabular-nums tracking-tight text-[var(--app-color-text-secondary)]">
                            Value
                          </span>
                          <span
                            className="text-lg font-black tabular-nums tracking-tight"
                            style={{ color: value.accentColor }}
                          >
                            {value.displayScoreText}
                          </span>
                        </div>
                      ) : (
                        <div className="mt-2 text-sm font-bold text-[var(--app-color-text-secondary)]">
                          No score yet
                        </div>
                      )}
                    </div>

                    <StatusChip
                      tone="neutral"
                      style={{
                        color: value.accentColor,
                        borderColor: `${value.accentColor}40`,
                        backgroundColor: value.trackColor,
                      }}
                    >
                      {value.label}
                    </StatusChip>
                  </div>

                  {valueScore != null ? <ValueScoreMeter score={valueScore} accentColor={value.accentColor} /> : null}

                  <p className="mt-3 text-sm font-medium text-[var(--app-color-text-secondary)]">
                    {value.tone}
                  </p>
                </Surface>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className={cn(UI_PATTERNS.eyebrow, "text-[var(--app-color-text-tertiary)]")}>
                    Recommendation & Evidence
                  </div>
                  <AppButton
                    variant="danger"
                    size="sm"
                    onClick={(e) => onDelete(sub, e)}
                  >
                    Cancel Service
                  </AppButton>
                </div>

                {valuations.length === 0 && (
                  <Surface
                    variant="inset"
                    padding="md"
                    className="rounded-[1.5rem] text-sm text-[var(--app-color-text-tertiary)]"
                  >
                    No valuation evidence yet for this subscription.
                  </Surface>
                )}

                {valuations.map((valuation) => (
                  <Surface
                    key={valuation.id}
                    variant="inset"
                    padding="md"
                    className="rounded-[1.5rem]"
                  >
                    {valuation.recommendation && (
                      <div className="mb-4">
                        <div className={cn(UI_PATTERNS.eyebrow, "mb-2")}>
                          Recommendation
                        </div>
                        <p className="text-sm font-bold text-[var(--app-color-text-primary)]">
                          {valuation.recommendation}
                        </p>
                      </div>
                    )}

                    {formatConfidencePercent(valuation.confidence) != null && (
                      <div className="mb-4">
                        <div className={cn(UI_PATTERNS.eyebrow, "mb-2")}>
                          Confidence
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--app-color-surface-base)]">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${formatConfidencePercent(valuation.confidence)}%`,
                                backgroundColor: COLORS.electricCyan,
                              }}
                            />
                          </div>
                          <span className="text-sm font-black text-white">
                            {formatConfidencePercent(valuation.confidence)}%
                          </span>
                        </div>
                      </div>
                    )}

                    {valuation.personal_value_score != null && (
                      <div className="mb-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                          Personal Value Score
                        </div>
                        <p className="text-sm font-bold text-white">
                          {normalizeModelValueScore(valuation.personal_value_score) ?? "—"}/150
                        </p>
                      </div>
                    )}

                    {formatValuationJson(valuation.evidence_json as Record<string, unknown> | undefined) && (
                      <div>
                        <div className={cn(UI_PATTERNS.eyebrow, "mb-2")}>
                          Evidence
                        </div>
                        <pre className="overflow-x-auto whitespace-pre-wrap text-sm text-gray-300 leading-relaxed">
                          {formatValuationJson(valuation.evidence_json as Record<string, unknown> | undefined)}
                        </pre>
                      </div>
                    )}

                    {formatValuationJson(valuation.explanation_json as Record<string, unknown> | undefined) && (
                      <div className="mt-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                          Explanation
                        </div>
                        <pre className="overflow-x-auto whitespace-pre-wrap text-sm text-gray-300 leading-relaxed">
                          {formatValuationJson(valuation.explanation_json as Record<string, unknown> | undefined)}
                        </pre>
                      </div>
                    )}
                  </Surface>
                ))}
              </div>
            </Surface>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export function SubscriptionsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setRightPanelOpen } = usePanelActions();

  const [subscriptions, setSubscriptions] = React.useState<Subscription[]>([]);
  const [merchants, setMerchants] = React.useState<Merchant[]>([]);
  const [subscriptionValuations, setSubscriptionValuations] = React.useState<
    SubscriptionValuation[]
  >([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [expandedId, setExpandedId] = React.useState<number | null>(null);
  const [isAddPanelOpen, setIsAddPanelOpen] = React.useState(false);
  const [visibleCount, setVisibleCount] = React.useState(INITIAL_VISIBLE_SUBSCRIPTIONS);
  const [scoring, setScoring] = React.useState(false);

  const refreshScoresAndSubscriptions = React.useCallback(async () => {
    const [subs, valuations] = await Promise.all([
      SubscriptionsAPI.list(),
      SubscriptionValuationsAPI.list().catch(() => [] as SubscriptionValuation[]),
    ]);
    setSubscriptions(subs);
    setSubscriptionValuations(valuations);
  }, []);

  const handleRecomputeValueScores = React.useCallback(async () => {
    setScoring(true);
    try {
      await ValueScoresAPI.recompute();
      await refreshScoresAndSubscriptions();
      toast.success("Value scores updated.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        toast.error("Value score model is not available on the server (add trained checkpoint).");
      } else {
        toast.error("Could not update value scores.");
      }
    } finally {
      setScoring(false);
    }
  }, [refreshScoresAndSubscriptions]);

  React.useEffect(() => {
    setRightPanelOpen(isAddPanelOpen);
    return () => setRightPanelOpen(false);
  }, [isAddPanelOpen, setRightPanelOpen]);

  React.useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;

    setLoading(true);
    setError(null);

    Promise.all([
      SubscriptionsAPI.list({ signal: ac.signal }),
      MerchantsAPI.list({ signal: ac.signal }),
    ])
      .then(([subs, mchs]) => {
        if (!cancelled) {
          setSubscriptions(subs);
          setMerchants(mchs);
        }

        return SubscriptionValuationsAPI.list()
          .then((valuations) => {
            if (!cancelled) {
              setSubscriptionValuations(valuations);
            }
          })
          .catch(() => {
            if (!cancelled) {
              setSubscriptionValuations([]);
            }
          });
      })
      .catch((err) => {
        if (cancelled || (err instanceof DOMException && err.name === "AbortError")) return;

        const msg =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to load subscriptions.";

        setError(msg);
        toast.error("Failed to load subscriptions.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, []);

  React.useEffect(() => {
    if (location.pathname === "/subscriptions/new") {
      setIsAddPanelOpen(true);
    }
  }, [location.pathname]);

  const closeAddPanel = React.useCallback(() => {
    setIsAddPanelOpen(false);
    if (location.pathname === "/subscriptions/new") {
      navigate("/subscriptions", { replace: true });
    }
  }, [location.pathname, navigate]);

  const handleDelete = async (sub: Subscription, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Cancel "${sub.merchant_name || "this subscription"}"?`)) return;

    try {
      await SubscriptionsAPI.remove(sub.id);
      setSubscriptions((prev) => prev.filter((s) => s.id !== sub.id));
      setSubscriptionValuations((prev) =>
        prev.filter((valuation) => valuation.subscription !== sub.id)
      );
      setExpandedId((id) => (id === sub.id ? null : id));
      toast.success("Subscription removed.");
    } catch {
      toast.error("Failed to remove subscription.");
    }
  };

  const handleAdded = (sub: Subscription) => {
    setSubscriptions((prev) => [sub, ...prev]);
  };

  const merchantMap = React.useMemo(
    () => Object.fromEntries(merchants.map((m) => [m.id, m])),
    [merchants]
  );

  const valuationsBySubscription = React.useMemo(
    () =>
      subscriptionValuations.reduce<Record<number, SubscriptionValuation[]>>((acc, valuation) => {
        if (valuation.subscription == null) return acc;
        const key = valuation.subscription;
        acc[key] = acc[key] ? [...acc[key], valuation] : [valuation];
        return acc;
      }, {}),
    [subscriptionValuations]
  );

  const subscriptionCards = React.useMemo(
    () =>
      subscriptions.map((sub) => ({
        sub,
        name: sub.merchant_name || merchantMap[sub.merchant]?.name || `Subscription #${sub.id}`,
        valuations: valuationsBySubscription[sub.id] ?? [],
      })),
    [subscriptions, merchantMap, valuationsBySubscription]
  );

  React.useEffect(() => {
    setVisibleCount((prev) =>
      Math.min(
        Math.max(prev, INITIAL_VISIBLE_SUBSCRIPTIONS),
        subscriptionCards.length || INITIAL_VISIBLE_SUBSCRIPTIONS
      )
    );
  }, [subscriptionCards.length]);

  return (
    <AppPage>
      <SpotifyIntegrationSection />

      {loading && (
        <LoadingState label="Loading subscriptions..." lines={4} />
      )}

      {!loading && error && (
        <InlineNotice
          tone="danger"
          icon={<AlertCircle size={18} />}
          title="Couldn't load subscriptions."
          description={error}
          action={
            <AppButton type="button" variant="outline" onClick={() => window.location.reload()} className="w-full sm:w-auto">
              Retry
            </AppButton>
          }
        />
      )}

      {!loading && !error && (
        <>
          <SectionHeader
            level={1}
            eyebrow="Recurring spend"
            title="Active Subscriptions"
            titleClassName="app-page-title"
            description={
              <span className="inline-flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: COLORS.electricGreen,
                    boxShadow: `0 0 8px ${COLORS.electricGreen}`,
                  }}
                />
                Monitoring {subscriptions.length} active connection{subscriptions.length !== 1 ? "s" : ""}
              </span>
            }
            action={
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <AppButton
                  variant="outline"
                  size="sm"
                  disabled={scoring || subscriptions.length === 0}
                  onClick={() => void handleRecomputeValueScores()}
                >
                  {scoring ? <Loader2 size={16} className="animate-spin" /> : null}
                  <span>{scoring ? "Updating..." : "Update Value Scores"}</span>
                </AppButton>

                <AppButton onClick={() => setIsAddPanelOpen(true)} variant="info" size="md">
                  <Plus size={18} strokeWidth={3} />
                  <span>Add Subscription</span>
                </AppButton>
              </div>
            }
          />

          {subscriptions.length === 0 && (
            <motion.div>
              <EmptyState
                title="No subscriptions yet"
                description="Add your first subscription to track recurring costs and value scores."
                action={
                  <AppButton onClick={() => setIsAddPanelOpen(true)} variant="info" size="md">
                    <Plus size={18} strokeWidth={3} />
                    <span>Add Subscription</span>
                  </AppButton>
                }
              />
            </motion.div>
          )}

          <div className="relative perspective-[2000px] py-6 md:py-10">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="relative mx-auto max-w-5xl space-y-[-40px]"
            >
              {subscriptionCards.slice(0, visibleCount).map(({ sub, name, valuations }, index) => (
                <SubscriptionCard
                  key={sub.id}
                  sub={sub}
                  valuations={valuations}
                  index={index}
                  expanded={expandedId === sub.id}
                  name={name}
                  onToggle={(id) => setExpandedId((current) => (current === id ? null : id))}
                  onDelete={handleDelete}
                />
              ))}
            </motion.div>
          </div>

          {visibleCount < subscriptionCards.length && (
            <div className="flex justify-center">
              <AppButton
                variant="outline"
                onClick={() =>
                  setVisibleCount((prev) =>
                    Math.min(prev + INITIAL_VISIBLE_SUBSCRIPTIONS, subscriptionCards.length)
                  )
                }
              >
                Load More Subscriptions
              </AppButton>
            </div>
          )}

          <AnimatePresence>
            {isAddPanelOpen && (
              <AddPanel onClose={closeAddPanel} onAdded={handleAdded} merchants={merchants} />
            )}
          </AnimatePresence>
        </>
      )}
    </AppPage>
  );
}
