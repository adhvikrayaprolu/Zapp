import * as React from "react";
import { motion } from "motion/react";
import {
  BarChart3,
  ChevronRight,
  Plus,
  TrendingUp,
  ZapOff,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";

import { ElectricCard } from "@/features/home";
import {
  AppButton,
  AppInput,
  AppPage,
  EmptyState,
  FormField,
  LoadingState,
  MetricCard,
  SectionHeader,
  StatusChip,
  Surface,
} from "@/shared/components/system";
import { COLORS } from "@/shared/theme";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";

import { toast } from "sonner";

import {
  RawInferredAPI,
  ComputedAPI,
  SubscriptionValuationsAPI,
  ItemValuationsAPI,
} from "@/api";
import { normalizeModelValueScore } from "@/shared/valuation";
import type {
  RawInferred,
  Computed,
  SubscriptionValuation,
  ItemValuation,
} from "@/api";

const OVERVIEW_BARS = [
  { name: "Development Tools", val: 85, color: COLORS.electricGreen, sub: "Essential Utility" },
  { name: "Content Streaming", val: 32, color: COLORS.electricRed, sub: "High Overlap Risk" },
  { name: "Lifestyle Apps", val: 58, color: COLORS.electricBlue, sub: "Healthy Engagement" },
];

function RawInferredSection() {
  const [data, setData] = React.useState<RawInferred[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    RawInferredAPI.list()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load inferred data.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <LoadingState label="Loading inferred insights..." lines={3} compact />;
  }

  if (data.length === 0) {
    return <EmptyState title="No inferred insights yet." description="Signals will appear here once enough activity has been analyzed." />;
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {data.map((item) => (
        <ElectricCard
          key={item.id}
          semanticColor={COLORS.electricCyan}
          elevation={1}
          className="p-6"
        >
          <div className="mb-2 app-mini-label">
            Inferred #{item.id}
          </div>
          <div className="space-y-2">
            {Object.entries(item)
              .filter(([k]) => k !== "id")
              .map(([key, val]) => (
                <div key={key} className="flex justify-between gap-4">
                  <span className="text-xs text-[var(--app-color-text-tertiary)]">{key}</span>
                  <span className="truncate text-sm font-bold text-[var(--app-color-text-primary)]">
                    {typeof val === "object" ? JSON.stringify(val) : String(val)}
                  </span>
                </div>
              ))}
          </div>
        </ElectricCard>
      ))}
    </div>
  );
}

function ComputedSection() {
  const [data, setData] = React.useState<Computed[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    ComputedAPI.list()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load computed insights.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <LoadingState label="Loading computed insights..." lines={3} compact />;
  }

  if (data.length === 0) {
    return <EmptyState title="No computed insights yet." description="Derived utility signals will appear here when the backend has enough source data." />;
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {data.map((item) => (
        <ElectricCard
          key={item.id}
          semanticColor={COLORS.electricGreen}
          elevation={1}
          className="p-6"
        >
          <div className="mb-2 app-mini-label">
            Computed #{item.id}
          </div>
          <div className="space-y-2">
            {Object.entries(item)
              .filter(([k]) => k !== "id")
              .map(([key, val]) => (
                <div key={key} className="flex justify-between gap-4">
                  <span className="text-xs text-[var(--app-color-text-tertiary)]">{key}</span>
                  <span className="truncate text-sm font-bold text-[var(--app-color-text-primary)]">
                    {typeof val === "object" ? JSON.stringify(val) : String(val)}
                  </span>
                </div>
              ))}
          </div>
        </ElectricCard>
      ))}
    </div>
  );
}

function ValuationCard({
  score,
  recommendation,
  confidence,
  evidenceJson,
  reasoningJson,
}: {
  score?: number | null;
  recommendation?: string;
  confidence?: number | null;
  evidenceJson?: Record<string, unknown>;
  reasoningJson?: Record<string, unknown>;
}) {
  const normalizedScore = normalizeModelValueScore(score);
  const confidencePercent =
    confidence == null ? null : Math.round(Math.min(1, Math.max(0, confidence)) * 100);
  const evidenceText = evidenceJson ? JSON.stringify(evidenceJson, null, 2) : null;
  const reasoningText = reasoningJson ? JSON.stringify(reasoningJson, null, 2) : null;

  return (
    <Surface variant="inset" padding="md" className="space-y-4 rounded-[1.75rem]">
      {normalizedScore != null && (
        <div className="space-y-2">
          <div className="app-mini-label">
            Personal Value Score
          </div>
          <span className="text-lg font-black text-[var(--app-color-text-primary)]">{normalizedScore}/150</span>
        </div>
      )}

      {recommendation && (
        <div className="space-y-2">
          <div className="app-mini-label">
            Recommendation
          </div>
          <span
            className="inline-block rounded-xl px-4 py-2 text-sm font-bold"
            style={{
              backgroundColor: `${COLORS.electricCyan}20`,
              color: COLORS.electricCyan,
              border: `1px solid ${COLORS.electricCyan}40`,
            }}
          >
            {recommendation}
          </span>
        </div>
      )}

      {confidencePercent != null && (
        <div className="space-y-2">
          <div className="app-mini-label">
            Confidence
          </div>
          <div className="flex items-center gap-3">
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-[var(--app-color-surface-base)]">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${confidencePercent}%`,
                  backgroundColor: COLORS.electricCyan,
                }}
              />
            </div>
            <span className="text-sm font-black text-[var(--app-color-text-primary)]">{confidencePercent}%</span>
          </div>
        </div>
      )}

      {evidenceText && (
        <div className="space-y-2">
          <div className="app-mini-label">
            Evidence
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-[var(--app-radius-control)] bg-[var(--app-color-surface-base)] p-4 text-sm leading-relaxed text-[var(--app-color-text-secondary)]">
            {evidenceText}
          </pre>
        </div>
      )}

      {reasoningText && (
        <div className="space-y-2">
          <div className="app-mini-label">
            Reasoning
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-[var(--app-radius-control)] bg-[var(--app-color-surface-base)] p-4 text-sm leading-relaxed text-[var(--app-color-text-secondary)]">
            {reasoningText}
          </pre>
        </div>
      )}
    </Surface>
  );
}

function ValuationsSection({
  shouldStartAddingItem,
  onItemCreateIntentHandled,
}: {
  shouldStartAddingItem: boolean;
  onItemCreateIntentHandled: () => void;
}) {
  const [subVals, setSubVals] = React.useState<SubscriptionValuation[]>([]);
  const [itemVals, setItemVals] = React.useState<ItemValuation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [addingItem, setAddingItem] = React.useState(false);
  const [newItem, setNewItem] = React.useState({ itemName: "", amount: "" });

  React.useEffect(() => {
    let cancelled = false;

    Promise.all([SubscriptionValuationsAPI.list(), ItemValuationsAPI.list()])
      .then(([subs, items]) => {
        if (!cancelled) {
          setSubVals(subs);
          setItemVals(items);
        }
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load valuations.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!shouldStartAddingItem) return;
    setAddingItem(true);
    onItemCreateIntentHandled();
  }, [onItemCreateIntentHandled, shouldStartAddingItem]);

  const handleAddItem = async () => {
    if (!newItem.itemName.trim()) {
      toast.error("Description is required.");
      return;
    }

    try {
      const created = await ItemValuationsAPI.create({
        item_name: newItem.itemName,
        observed_price: newItem.amount ? Number(newItem.amount) : undefined,
      });

      setItemVals((prev) => [...prev, created]);
      setNewItem({ itemName: "", amount: "" });
      setAddingItem(false);
      onItemCreateIntentHandled();
      toast.success("Item valuation added.");
    } catch {
      toast.error("Failed to add item valuation.");
    }
  };

  if (loading) {
    return <LoadingState label="Loading valuations..." lines={3} compact />;
  }

  const hasAny = subVals.length > 0 || itemVals.length > 0;

  return (
    <div className="space-y-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h3 className="app-card-title text-2xl">Valuations</h3>
          <p className="app-helper max-w-2xl">Review current subscription and item valuation output, or add a new item to score.</p>
        </div>
        {!addingItem && (
          <AppButton
            type="button"
            variant="info"
            onClick={() => {
              setAddingItem(true);
              onItemCreateIntentHandled();
            }}
            className="gap-2"
          >
            <Plus size={16} />
            New Item Valuation
          </AppButton>
        )}
      </div>

      {addingItem && (
        <Surface variant="panel" padding="lg" className="space-y-5">
          <div className="space-y-1">
            <h4 className="app-card-title">Add Item Valuation</h4>
            <p className="app-helper">Create an item entry to evaluate a one-off purchase against your current utility patterns.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Description">
              <AppInput
                value={newItem.itemName}
                onChange={(e) =>
                  setNewItem((prev) => ({ ...prev, itemName: e.target.value }))
                }
                placeholder="e.g. New laptop"
              />
            </FormField>

            <FormField label="Amount ($)">
              <AppInput
                type="number"
                value={newItem.amount}
                onChange={(e) =>
                  setNewItem((prev) => ({ ...prev, amount: e.target.value }))
                }
                placeholder="0"
              />
            </FormField>
          </div>

          <div className="flex flex-wrap gap-3">
            <AppButton
              type="button"
              onClick={handleAddItem}
            >
              Add Item
            </AppButton>
            <AppButton
              type="button"
              variant="outline"
              onClick={() => {
                setAddingItem(false);
                setNewItem({ itemName: "", amount: "" });
                onItemCreateIntentHandled();
              }}
            >
              Cancel
            </AppButton>
          </div>
        </Surface>
      )}

      {!hasAny && !addingItem && (
        <EmptyState title="No valuations yet." description="Add an item valuation to start comparing one-off purchases alongside subscription value signals." />
      )}

      {subVals.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-lg font-black text-white">Subscription Valuations</h4>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {subVals.map((v) => (
              <ValuationCard
                key={v.id}
                score={v.personal_value_score}
                recommendation={v.recommendation}
                confidence={v.confidence}
                evidenceJson={v.evidence_json}
                reasoningJson={v.explanation_json}
              />
            ))}
          </div>
        </div>
      )}

      {itemVals.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-lg font-black text-white">Item Valuations</h4>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {itemVals.map((v) => (
              <ValuationCard
                key={v.id}
                score={v.personal_value_score}
                recommendation={v.recommendation}
                confidence={v.confidence}
                evidenceJson={v.evidence_json}
                reasoningJson={v.reasoning_json}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");

  const activeTab =
    tabParam === "insights" || tabParam === "valuations" ? tabParam : "overview";

  const shouldStartAddingItem =
    activeTab === "valuations" && searchParams.get("create") === "item";

  const handleTabChange = React.useCallback(
    (nextTab: string) => {
      const nextParams = new URLSearchParams(searchParams);

      if (nextTab === "overview") {
        nextParams.delete("tab");
      } else {
        nextParams.set("tab", nextTab);
      }

      if (nextTab !== "valuations") {
        nextParams.delete("create");
      }

      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const clearItemCreateIntent = React.useCallback(() => {
    if (!searchParams.has("create")) return;

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("create");
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  return (
    <AppPage>
      <SectionHeader
        level={1}
        eyebrow="Intelligence"
        title="Analytics"
        titleClassName="app-page-title"
        description="A semantic overview of utility overlap, spending patterns, and AI-generated efficiency signals."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <MetricCard
          label="Tracked Stacks"
          value="3"
          detail="Major software and subscription clusters currently analyzed."
        />
        <MetricCard
          label="Highest Overlap"
          value="85%"
          detail="The strongest duplicate-utility signal in the current sample."
        />
        <MetricCard
          label="Watchlist"
          value="2 items"
          detail="Subscriptions or tools showing weak recent utility."
        />
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="valuations">Valuations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-8">
          <div className="relative grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="space-y-8 lg:col-span-8">
              <ElectricCard semanticColor={COLORS.electricBlue} className="relative z-20">
                <div className="mb-16 flex items-center justify-between">
                  <div>
                    <h3 className="app-section-title text-[2rem]">
                      Utility Overlap Analysis
                    </h3>
                    <div className="mt-2 app-mini-label">
                      Subscription Stacking
                    </div>
                  </div>
                  <StatusChip tone="info">Live Snapshot</StatusChip>
                </div>

                <div className="space-y-14 px-4">
                  {OVERVIEW_BARS.map((bar, i) => (
                    <div key={i} className="space-y-5">
                      <div className="flex items-end justify-between">
                        <div>
                          <div className="text-2xl font-black tracking-tight text-[var(--app-color-text-primary)]">
                            {bar.name}
                          </div>
                          <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-[var(--app-color-text-tertiary)]">
                            {bar.sub}
                          </div>
                        </div>
                        <div
                          className="text-4xl font-black"
                          style={{ color: bar.color }}
                        >
                          {bar.val}%
                        </div>
                      </div>

                      <div className="relative h-5 overflow-hidden rounded-full bg-[var(--app-color-surface-inset)]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${bar.val}%` }}
                          transition={{
                            duration: 2,
                            delay: i * 0.3,
                            ease: [0.23, 1, 0.32, 1],
                          }}
                          className="h-full rounded-full"
                          style={{
                            backgroundColor: bar.color,
                            boxShadow: `0 0 18px ${bar.color}66`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </ElectricCard>

              <div className="relative h-[400px]">
                <ElectricCard
                  semanticColor={COLORS.electricCyan}
                  className="pointer-events-none absolute inset-0 z-10 translate-x-4 translate-y-8 opacity-40 grayscale"
                  elevation={0}
                >
                  <div className="h-40" />
                </ElectricCard>

                <ElectricCard
                  semanticColor={COLORS.electricCyan}
                  className="absolute inset-0 z-30"
                >
                  <div className="mb-10 flex items-center justify-between">
                    <h3 className="app-card-title text-2xl">Transaction History</h3>
                    <StatusChip tone="neutral">Sample Feed</StatusChip>
                  </div>

                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Surface
                        key={i}
                        variant="inset"
                        padding="md"
                        className="flex cursor-pointer items-center justify-between rounded-[2.5rem] border-transparent transition-all hover:border-[var(--app-color-border-strong)]"
                      >
                        <div className="flex items-center gap-8">
                          <div
                            className="h-2 w-2 rounded-full shadow-[0_0_12px_color-mix(in_srgb,var(--app-accent-cyan-soft)_35%,transparent)]"
                            style={{ backgroundColor: COLORS.electricCyan }}
                          />
                          <span className="text-xl font-black tracking-tight text-[var(--app-color-text-primary)]">
                            AWS Infrastructure
                          </span>
                        </div>
                        <div className="flex items-center gap-12">
                          <span className="text-2xl font-black text-[var(--app-color-text-primary)]">
                            $12.45
                          </span>
                          <ChevronRight
                            size={20}
                            className="text-[var(--app-color-text-tertiary)]"
                          />
                        </div>
                      </Surface>
                    ))}
                  </div>
                </ElectricCard>
              </div>
            </div>

            <div className="space-y-8 lg:col-span-4">
              <div className="flex items-center gap-2 px-6">
                <div
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: "var(--app-accent-purple-soft)" }}
                />
                <h3 className="app-mini-label tracking-[0.4em]">
                  Zapp CFO Intelligence
                </h3>
              </div>

              <ElectricCard
                className="border-l-4 p-10"
                style={{ borderLeftColor: COLORS.electricGreen }}
                semanticColor={COLORS.electricGreen}
                elevation={1}
              >
                <div className="mb-8 flex items-center gap-5">
                  <div
                    className="rounded-2xl p-4"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${COLORS.electricGreen} 10%, transparent)`,
                    }}
                  >
                    <TrendingUp size={28} style={{ color: COLORS.electricGreen }} />
                  </div>
                  <h4 className="text-2xl font-black tracking-tight text-[var(--app-color-text-primary)]">
                    Efficiency Insight
                  </h4>
                </div>
                <p className="text-lg font-medium leading-relaxed text-[var(--app-color-text-secondary)]">
                  &quot;Your ChatGPT Plus usage has reached{" "}
                  <span className="font-black text-[var(--app-color-text-primary)]">
                    $0.14/query
                  </span>
                  . This aligns perfectly with your goals.&quot;
                </p>
              </ElectricCard>

              <ElectricCard
                className="border-l-4 p-10"
                style={{ borderLeftColor: COLORS.electricRed }}
                semanticColor={COLORS.electricRed}
                elevation={1}
              >
                <div className="mb-8 flex items-center gap-5">
                  <div
                    className="rounded-2xl p-4"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${COLORS.electricRed} 10%, transparent)`,
                    }}
                  >
                    <ZapOff size={28} style={{ color: COLORS.electricRed }} />
                  </div>
                  <h4 className="text-2xl font-black tracking-tight text-[var(--app-color-text-primary)]">
                    Low Value Item
                  </h4>
                </div>
                <p className="text-lg font-medium leading-relaxed text-[var(--app-color-text-secondary)]">
                  &quot;Your Disney+ utility has dropped 80% this month. Cost per
                  hour is now{" "}
                  <span className="font-black text-[var(--app-color-text-primary)]">
                    $12.40
                  </span>
                  .&quot;
                </p>
              </ElectricCard>

              <Surface variant="panel" padding="md" className="space-y-4">
                <div className="flex items-center gap-3">
                  <BarChart3
                    size={18}
                    className="text-[var(--app-accent-cyan-soft)]"
                  />
                  <div className="app-card-title">Signal Summary</div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="app-helper">Overlap risk</span>
                    <StatusChip tone="warning">Elevated</StatusChip>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="app-helper">Transaction quality</span>
                    <StatusChip tone="success">Healthy</StatusChip>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="app-helper">Recommendation freshness</span>
                    <StatusChip tone="info">This week</StatusChip>
                  </div>
                </div>
              </Surface>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="mt-8">
          <div className="space-y-10">
            <div>
              <h3 className="mb-4 app-card-title text-2xl">
                Raw Inferred Insights
              </h3>
              <RawInferredSection />
            </div>

            <div>
              <h3 className="mb-4 app-card-title text-2xl">
                Computed Insights
              </h3>
              <ComputedSection />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="valuations" className="mt-8">
          <ValuationsSection
            shouldStartAddingItem={shouldStartAddingItem}
            onItemCreateIntentHandled={clearItemCreateIntent}
          />
        </TabsContent>
      </Tabs>
    </AppPage>
  );
}
