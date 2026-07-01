import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  X,
  Calendar,
  Coffee,
  ShoppingBag,
  Car,
  Zap as ZapIcon,
  ChevronDown,
  Wallet,
  ChevronUp,
  Flame,
  TrendingDown,
  Sparkles,
  Pencil,
  Trash2,
  MessageSquare,
} from "lucide-react";
import { COLORS } from "@/shared/theme";
import {
  formatDateLabel,
  formatLocalDateYYYYMMDD,
  getLocalDateKey,
  parseDateForDisplay,
} from "@/shared/date";
import { deriveTransactionValueScore } from "@/shared/transaction-valuation";
import { getValuePresentation } from "@/shared/valuation";
import { ElectricCard } from "@/features/home/components/ElectricCard";
import { usePanelActions } from "@/features/dashboard/context/PanelContext";
import { cn } from "@/shared/components/ui/utils";
import { ApiError } from "@/api/client";
import { TransactionsAPI, type Transaction, type NewTransaction } from "@/api/transactions.api";
import { BankingAPI } from "@/api/banking.api";
import { BankingSection } from "@/features/banking";
import { useMergedTransactions } from "../hooks/useMergedTransactions";
import type { DisplayTransaction } from "../utils/normalizeBankTransaction";
import { resolveStatedMonthlyIncome } from "../utils/statedMonthlyIncome";
import { RawExplicitAPI } from "@/api/users.api";
import { TransactionFeedbackModal } from "../components/TransactionFeedbackModal";
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
  EmptyState,
  FormField,
  LoadingState,
  MetricCard,
  SectionHeader,
  StatusChip,
  Surface,
  ValueScoreMeter,
  appButtonVariants,
  useInViewport,
} from "@/shared/components/system";
import { toast } from "sonner";

function createEmptyTransactionForm(): NewTransaction {
  return {
    description_raw: "",
    amount: "",
    direction: "spend",
    category: "other",
    occurred_at: formatLocalDateYYYYMMDD(new Date()),
    satisfaction_rating: null,
  };
}

const CATEGORY_OPTIONS = [
  { value: "eating_out", label: "Eating Out", icon: Coffee, color: COLORS.electricYellow },
  { value: "groceries", label: "Groceries", icon: ShoppingBag, color: COLORS.electricGreen },
  { value: "transport", label: "Transport", icon: Car, color: COLORS.electricCyan },
  { value: "subscriptions", label: "Subscriptions", icon: ZapIcon, color: COLORS.electricRed },
  { value: "shopping", label: "Shopping", icon: ShoppingBag, color: COLORS.electricBlue },
  { value: "bills", label: "Bills", icon: Wallet, color: COLORS.electricPurple },
  { value: "entertainment", label: "Entertainment", icon: ZapIcon, color: COLORS.electricYellow },
  { value: "health", label: "Health", icon: ZapIcon, color: COLORS.electricGreen },
  { value: "education", label: "Education", icon: ZapIcon, color: COLORS.electricCyan },
  { value: "other", label: "Other", icon: ZapIcon, color: COLORS.electricPurple },
];

function getCategoryMeta(value: string) {
  return CATEGORY_OPTIONS.find((c) => c.value === value) ?? CATEGORY_OPTIONS[CATEGORY_OPTIONS.length - 1];
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const INITIAL_VISIBLE_GROUPS = 8;

type Filters = {
  category: string;
  direction: string;
  date_from: string;
  date_to: string;
};

const EMPTY_FILTERS: Filters = {
  category: "",
  direction: "",
  date_from: "",
  date_to: "",
};

function transactionMatchesToolbarFilters(tx: DisplayTransaction, filters: Filters): boolean {
  if (filters.category && tx.category !== filters.category) return false;
  if (filters.direction && tx.direction !== filters.direction) return false;
  return true;
}

type TransactionRowViewModel = {
  tx: DisplayTransaction;
  categoryLabel: string;
  categoryColor: string;
  categoryIcon: (typeof CATEGORY_OPTIONS)[number]["icon"];
  timeLabel: string;
  heading: string;
  directionLabel: string;
  satisfactionLabel: string | null;
  amountText: string;
  isIncome: boolean;
  valueScore: number | null;
  valueDisplayScoreText: string;
  valueLabel: string;
  valueTone: string;
  valueColor: string;
};

type TransactionGroupViewModel = {
  date: string;
  dateLabel: string;
  rows: TransactionRowViewModel[];
};

function formatDayLabel(date: string) {
  return formatDateLabel(date, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const SpendingCalendar = React.memo(function SpendingCalendar({
  transactions,
  selectedDate,
  onSelectDate,
}: {
  transactions: DisplayTransaction[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = React.useState(28);
  const [hoveredDate, setHoveredDate] = React.useState<string | null>(null);

  const NUM_WEEKS = 18;
  const GAP = 4;
  const DAY_LABEL_WIDTH = 36;

  React.useEffect(() => {
    const calc = () => {
      if (!containerRef.current) return;
      const available = containerRef.current.clientWidth - DAY_LABEL_WIDTH - 8;
      const size = Math.floor((available - GAP * (NUM_WEEKS - 1)) / NUM_WEEKS);
      setCellSize(Math.max(size, 20));
    };

    calc();

    const ro = new ResizeObserver(calc);
    if (containerRef.current) ro.observe(containerRef.current);

    return () => ro.disconnect();
  }, []);

  const { todayStr, spendByDay, maxValue, weeks, monthLabelByWeek, thisWeekSpend, biggestDay, streak } =
    React.useMemo(() => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStrMemo = formatLocalDateYYYYMMDD(today);

      const startDate = new Date(today);
      startDate.setDate(today.getDate() - today.getDay() - 7 * (NUM_WEEKS - 1));

      const allDaysMemo: string[] = [];
      const cursor = new Date(startDate);

      while (cursor <= today) {
        allDaysMemo.push(formatLocalDateYYYYMMDD(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }

      const spendByDayMemo: Record<string, number> = {};
      for (const tx of transactions) {
        const day = getLocalDateKey(tx.occurred_at);
        if (tx.direction === "spend") {
          spendByDayMemo[day] = (spendByDayMemo[day] ?? 0) + Math.abs(Number(tx.amount));
        }
      }

      const weeksMemo: string[][] = [];
      for (let i = 0; i < allDaysMemo.length; i += 7) {
        weeksMemo.push(allDaysMemo.slice(i, i + 7));
      }

      const seenMonths = new Set<string>();
      const monthLabelByWeekMemo: Record<number, string> = {};
      weeksMemo.forEach((week, wi) => {
        for (const date of week) {
          const d = parseDateForDisplay(date);
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          if (!seenMonths.has(key)) {
            seenMonths.add(key);
            monthLabelByWeekMemo[wi] = d.toLocaleDateString("en-US", { month: "short" });
            break;
          }
        }
      });

      const thisWeekStart = new Date(today);
      thisWeekStart.setDate(today.getDate() - today.getDay());

      const thisWeekSpendMemo = allDaysMemo
        .filter((d) => d >= formatLocalDateYYYYMMDD(thisWeekStart))
        .reduce((s, d) => s + (spendByDayMemo[d] ?? 0), 0);

      const biggestDayMemo = Object.entries(spendByDayMemo).sort((a, b) => b[1] - a[1])[0];

      let streakMemo = 0;
      for (let i = allDaysMemo.length - 1; i >= 0; i--) {
        if (!spendByDayMemo[allDaysMemo[i]]) streakMemo++;
        else break;
      }

      return {
        allDays: allDaysMemo,
        todayStr: todayStrMemo,
        spendByDay: spendByDayMemo,
        maxValue: Math.max(...Object.values(spendByDayMemo), 1),
        weeks: weeksMemo,
        monthLabelByWeek: monthLabelByWeekMemo,
        thisWeekSpend: thisWeekSpendMemo,
        biggestDay: biggestDayMemo,
        streak: streakMemo,
      };
    }, [transactions, NUM_WEEKS]);

  const getColor = React.useCallback(
    (value: number, isSelected: boolean) => {
      if (isSelected) return COLORS.electricCyan;
      if (!value) return "rgba(255,255,255,0.05)";
      const t = value / maxValue;
      if (t < 0.25) return `${COLORS.electricCyan}35`;
      if (t < 0.5) return `${COLORS.electricCyan}60`;
      if (t < 0.75) return `${COLORS.electricCyan}85`;
      return COLORS.electricCyan;
    },
    [maxValue]
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Surface variant="inset" padding="sm" className="flex items-center gap-3 rounded-2xl">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${COLORS.electricCyan}15` }}
          >
            <TrendingDown size={18} style={{ color: COLORS.electricCyan }} />
          </div>
          <div>
            <div className="text-[9px] font-black uppercase tracking-widest text-[var(--app-color-text-tertiary)]">This Week</div>
            <div className="text-2xl font-black text-[var(--app-color-text-primary)]">${thisWeekSpend.toFixed(0)}</div>
          </div>
        </Surface>

        <Surface variant="inset" padding="sm" className="flex items-center gap-3 rounded-2xl">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${COLORS.electricRed}15` }}
          >
            <Flame size={18} style={{ color: COLORS.electricRed }} />
          </div>
          <div>
            <div className="text-[9px] font-black uppercase tracking-widest text-[var(--app-color-text-tertiary)]">Peak Day</div>
            <div className="text-2xl font-black text-[var(--app-color-text-primary)]">
                {biggestDay ? `$${biggestDay[1].toFixed(0)}` : "—"}
              </div>
              {biggestDay && (
                <div className="mt-0.5 text-[9px] font-bold text-[var(--app-color-text-tertiary)]">
                  {formatDateLabel(biggestDay[0], {
                    month: "short",
                    day: "numeric",
                  })}
              </div>
            )}
          </div>
        </Surface>

        <Surface variant="inset" padding="sm" className="flex items-center gap-3 rounded-2xl">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${COLORS.electricGreen}15` }}
          >
            <Sparkles size={18} style={{ color: COLORS.electricGreen }} />
          </div>
          <div>
            <div className="text-[9px] font-black uppercase tracking-widest text-[var(--app-color-text-tertiary)]">No-Spend Streak</div>
            <div className="text-2xl font-black text-[var(--app-color-text-primary)]">
              {streak} {streak === 1 ? "day" : "days"}
            </div>
          </div>
        </Surface>
      </div>

      <div ref={containerRef} style={{ width: "100%" }}>
        <div style={{ display: "flex", gap: GAP, alignItems: "flex-start", width: "100%" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: GAP,
              paddingTop: 22,
              flexShrink: 0,
              width: DAY_LABEL_WIDTH,
            }}
          >
            {DAY_LABELS.map((label, i) => (
              <div
                key={label}
                style={{
                  height: cellSize,
                  display: "flex",
                  alignItems: "center",
                  fontSize: 10,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--app-color-text-tertiary)",
                  opacity: i % 2 === 0 ? 1 : 0,
                  userSelect: "none",
                }}
              >
                {label}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", gap: GAP, marginBottom: 6, height: 16 }}>
              {weeks.map((_, wi) => (
                <div
                  key={wi}
                  style={{
                    width: cellSize,
                    flexShrink: 0,
                    fontSize: 10,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: monthLabelByWeek[wi] ? COLORS.electricCyan : "transparent",
                    userSelect: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {monthLabelByWeek[wi] ?? ""}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: GAP }}>
              {weeks.map((week, wi) => (
                <div
                  key={wi}
                  style={{ display: "flex", flexDirection: "column", gap: GAP, flexShrink: 0 }}
                >
                  {week.map((date) => {
                    const spend = spendByDay[date] ?? 0;
                    const isSelected = selectedDate === date;
                    const isFuture = date > todayStr;
                    const isToday = date === todayStr;
                    const isHovered = hoveredDate === date;

                    return (
                      <div
                        key={date}
                        style={{ width: cellSize, height: cellSize, position: "relative" }}
                        onMouseEnter={() => !isFuture && setHoveredDate(date)}
                        onMouseLeave={() => setHoveredDate(null)}
                      >
                        <div
                          onClick={() => !isFuture && onSelectDate(isSelected ? null : date)}
                          style={{
                            width: "100%",
                            height: "100%",
                            borderRadius: Math.max(4, cellSize * 0.2),
                            backgroundColor: isFuture ? "transparent" : getColor(spend, isSelected),
                            boxShadow: isSelected ? `0 0 12px ${COLORS.electricCyan}60` : undefined,
                            outline: isToday && !isSelected ? "2px solid var(--app-color-border-strong)" : undefined,
                            outlineOffset: -1,
                            cursor: isFuture ? "default" : "pointer",
                          }}
                        />
                        {isHovered && !isFuture && (
                          <div
                            style={{
                              position: "absolute",
                              bottom: "100%",
                              left: "50%",
                              transform: "translateX(-50%)",
                              marginBottom: 6,
                              zIndex: 9999,
                              pointerEvents: "none",
                            }}
                          >
                            <div
                              style={{
                                background: "var(--app-color-surface-overlay)",
                                border: "1px solid var(--app-color-border-strong)",
                                borderRadius: 10,
                                padding: "6px 10px",
                                boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <div style={{ fontSize: 11, fontWeight: 900, color: "var(--app-color-text-primary)" }}>
                                {formatDateLabel(date, {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                })}
                                {isToday && (
                                  <span style={{ marginLeft: 6, color: COLORS.electricCyan }}>· Today</span>
                                )}
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  marginTop: 2,
                                  color: spend > 0 ? COLORS.electricCyan : "var(--app-color-text-tertiary)",
                                }}
                              >
                                {spend > 0 ? `$${spend.toFixed(2)} spent` : "No spend"}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selectedDate && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AppButton
          onClick={() => onSelectDate(null)}
            variant="quietAccent"
            size="sm"
            className="h-auto px-0 py-0 text-[10px] uppercase tracking-widest"
          >
            <X size={10} />
            Showing{" "}
            {formatDateLabel(selectedDate, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}{" "}
            · Clear
          </AppButton>
        </motion.div>
      )}

      <div
        className="flex items-center gap-2"
        style={{
          fontSize: 9,
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--app-color-text-tertiary)",
        }}
      >
        <span>Less</span>
        <div style={{ display: "flex", gap: 3 }}>
          {[
            "rgba(255,255,255,0.05)",
            `${COLORS.electricCyan}35`,
            `${COLORS.electricCyan}60`,
            `${COLORS.electricCyan}85`,
            COLORS.electricCyan,
          ].map((bg, i) => (
            <div
              key={i}
              style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: bg }}
            />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
});

function AddPanel({
  onClose,
  onAdded,
  onUpdated,
  editingTransaction,
}: {
  onClose: () => void;
  onAdded: (tx: Transaction) => void;
  onUpdated?: (tx: Transaction) => void;
  editingTransaction?: DisplayTransaction | null;
}) {
  const canEdit = editingTransaction?.source === "manual" && typeof editingTransaction.id === "number";

  const [form, setForm] = React.useState<NewTransaction>(() =>
    editingTransaction && canEdit
      ? {
          description_raw: editingTransaction.description_raw,
          amount: editingTransaction.amount,
          direction: editingTransaction.direction,
          category: editingTransaction.category,
          occurred_at: getLocalDateKey(editingTransaction.occurred_at),
          satisfaction_rating: editingTransaction.satisfaction_rating,
        }
      : createEmptyTransactionForm()
  );

  const [categoryOpen, setCategoryOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (editingTransaction && canEdit) {
      setForm({
        description_raw: editingTransaction.description_raw,
        amount: editingTransaction.amount,
        direction: editingTransaction.direction,
        category: editingTransaction.category,
        occurred_at: getLocalDateKey(editingTransaction.occurred_at),
        satisfaction_rating: editingTransaction.satisfaction_rating,
      });
    } else {
      setForm(createEmptyTransactionForm());
    }
  }, [editingTransaction, canEdit]);

  const set = <K extends keyof NewTransaction>(key: K, val: NewTransaction[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const selectedCat = getCategoryMeta(form.category);
  const isEdit = !!editingTransaction && canEdit;

  const handleSubmit = async () => {
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    if (!form.description_raw.trim()) {
      toast.error("Please enter a description.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = { ...form, occurred_at: `${form.occurred_at}T12:00:00Z` };

      if (isEdit && editingTransaction && typeof editingTransaction.id === "number") {
        const tx = await TransactionsAPI.patch(editingTransaction.id, payload);
        toast.success("Transaction updated!");
        onUpdated?.(tx);
      } else {
        const tx = await TransactionsAPI.create(payload);
        toast.success("Transaction added!");
        onAdded(tx);
      }

      onClose();
    } catch {
      toast.error(isEdit ? "Failed to update transaction." : "Failed to save transaction.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppSheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <AppSheetContent className="flex w-full max-w-lg flex-col rounded-none border-l shadow-2xl">
        <AppSheetHeader className="gap-2 border-b border-[var(--app-color-border-subtle)]">
          <div>
            <AppSheetTitle>{isEdit ? "Edit Transaction" : "Add Transaction"}</AppSheetTitle>
            <AppSheetDescription>
              {isEdit ? "Update a manual transaction and keep the feed consistent." : "Log a manual transaction with type, category, date, and satisfaction context."}
            </AppSheetDescription>
            <div className="mt-3 text-[10px] font-black uppercase tracking-[0.32em] text-[var(--app-accent-cyan-soft)]">
              {isEdit ? "Update" : "Manual Entry"}
            </div>
          </div>
        </AppSheetHeader>

        <AppSheetBody className="space-y-7 pt-6">
          <FormField label="Description">
            <AppInput
              type="text"
              placeholder="e.g. Sushi dinner with friends"
              value={form.description_raw}
              onChange={(e) => set("description_raw", e.target.value)}
            />
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

            <FormField label="Type">
              <Surface variant="inset" padding="sm" className="flex rounded-2xl p-1.5">
                {["spend", "income"].map((type) => (
                  <AppButton
                    key={type}
                    onClick={() => set("direction", type)}
                    variant={form.direction === type ? "primary" : "quiet"}
                    size="sm"
                    className="flex-1"
                  >
                    {type === "spend" ? "Expense" : "Income"}
                  </AppButton>
                ))}
              </Surface>
            </FormField>
          </div>

          <FormField label="Category" className="relative">
            <AppButton
              onClick={() => setCategoryOpen((o) => !o)}
              variant="outline"
              size="lg"
              className="w-full justify-between px-6 text-left"
            >
              <div className="flex items-center gap-3">
                <selectedCat.icon size={18} style={{ color: selectedCat.color }} />
                <span className="font-bold text-[var(--app-color-text-primary)]">{selectedCat.label}</span>
              </div>
              {categoryOpen ? (
                <ChevronUp size={18} className="text-[var(--app-color-text-tertiary)]" />
              ) : (
                <ChevronDown size={18} className="text-[var(--app-color-text-tertiary)]" />
              )}
            </AppButton>

            {categoryOpen && (
              <Surface
                variant="overlay"
                padding="none"
                className="absolute left-0 right-0 z-[200] mt-2 max-h-64 overflow-auto rounded-2xl"
                style={{ top: "100%" }}
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <AppButton
                    key={cat.value}
                    onClick={() => {
                      set("category", cat.value);
                      setCategoryOpen(false);
                    }}
                    variant="quiet"
                    size="lg"
                    className="w-full justify-start rounded-none px-6 text-left hover:bg-[var(--app-color-surface-inset)]"
                  >
                    <cat.icon size={16} style={{ color: cat.color }} />
                    <span className="text-sm font-bold text-[var(--app-color-text-primary)]">{cat.label}</span>
                  </AppButton>
                ))}
              </Surface>
            )}
          </FormField>

          <FormField label="Date">
              <AppInput
                type="date"
                value={form.occurred_at}
                onChange={(e) => set("occurred_at", e.target.value)}
                startAdornment={<Calendar size={18} />}
              />
          </FormField>

          <FormField label={<>Satisfaction <span className="text-[var(--app-color-text-tertiary)]">(optional)</span></>}>
            <div className="grid grid-cols-10 gap-1.5 sm:gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <AppButton
                  key={n}
                  onClick={() => set("satisfaction_rating", form.satisfaction_rating === n ? null : n)}
                  variant={form.satisfaction_rating === n ? "primary" : "secondary"}
                  size="sm"
                  className="min-w-0 px-0 text-[11px] tracking-normal sm:text-xs"
                >
                  {n}
                </AppButton>
              ))}
            </div>
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
            {submitting ? "Saving..." : isEdit ? "Update Transaction" : "Add Transaction"}
          </AppButton>
        </AppSheetFooter>
      </AppSheetContent>
    </AppSheet>
  );
}

const FilterBar = React.memo(function FilterBar({
  filters,
  onChange,
  onClear,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = React.useState<string | null>(null);
  const hasFilters = Object.values(filters).some(Boolean);

  React.useEffect(() => {
    if (!open) return;

    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-filterbar]")) setOpen(null);
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const btnClass = (active: boolean) =>
    cn(
      appButtonVariants({ variant: active ? "info" : "outline", size: "sm" }),
      "justify-between rounded-xl px-4 text-[10px] tracking-widest shadow-none",
      active
        ? ""
        : "border-[var(--app-color-border-subtle)] bg-[var(--app-color-surface-base)] text-[var(--app-color-text-secondary)]"
    );

  return (
    <div data-filterbar className="flex items-center gap-2 flex-wrap" style={{ position: "relative", zIndex: 100 }}>
      <div style={{ position: "relative" }}>
        <AppButton
          type="button"
          onClick={() => setOpen(open === "date" ? null : "date")}
          variant="outline"
          size="sm"
          className={btnClass(!!(filters.date_from || filters.date_to))}
        >
          {filters.date_from || filters.date_to
            ? `${filters.date_from || "…"} → ${filters.date_to || "…"}`
            : "Date Range"}
          <ChevronDown size={12} />
        </AppButton>

        {open === "date" && (
          <div
            style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 9999, minWidth: 220 }}
            className="app-surface-overlay space-y-3 rounded-2xl p-4 shadow-2xl"
          >
            <div className="space-y-1">
              <div className="text-[10px] font-black uppercase text-[var(--app-color-text-tertiary)]">From</div>
              <AppInput
                type="date"
                value={filters.date_from}
                onChange={(e) => onChange({ ...filters, date_from: e.target.value })}
                size="sm"
              />
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-black uppercase text-[var(--app-color-text-tertiary)]">To</div>
              <AppInput
                type="date"
                value={filters.date_to}
                onChange={(e) => onChange({ ...filters, date_to: e.target.value })}
                size="sm"
              />
            </div>
            <AppButton type="button" variant="quietAccent" size="sm" onClick={() => setOpen(null)} className="w-full justify-center">
              Apply
            </AppButton>
          </div>
        )}
      </div>

      <div style={{ position: "relative" }}>
        <AppButton
          type="button"
          onClick={() => setOpen(open === "cat" ? null : "cat")}
          variant="outline"
          size="sm"
          className={btnClass(!!filters.category)}
        >
          {filters.category ? getCategoryMeta(filters.category).label : "Category"}
          <ChevronDown size={12} />
        </AppButton>

        {open === "cat" && (
          <div
            style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 9999, minWidth: 180 }}
            className="app-surface-overlay overflow-hidden rounded-2xl shadow-2xl"
          >
            <AppButton
              type="button"
              onClick={() => {
                onChange({ ...filters, category: "" });
                setOpen(null);
              }}
              variant="quiet"
              size="sm"
              className="w-full justify-start rounded-none px-5 text-left text-[var(--app-color-text-tertiary)] hover:bg-[var(--app-color-surface-inset)]"
            >
              All
            </AppButton>

            {CATEGORY_OPTIONS.map((cat) => (
              <AppButton
                key={cat.value}
                type="button"
                onClick={() => {
                  onChange({ ...filters, category: cat.value });
                  setOpen(null);
                }}
                variant={filters.category === cat.value ? "secondary" : "quiet"}
                size="sm"
                className="w-full justify-start rounded-none px-5 text-left hover:bg-[var(--app-color-surface-inset)]"
              >
                <cat.icon size={14} style={{ color: cat.color }} />
                <span className="text-xs font-bold text-[var(--app-color-text-primary)]">{cat.label}</span>
              </AppButton>
            ))}
          </div>
        )}
      </div>

      <div style={{ position: "relative" }}>
        <AppButton
          type="button"
          onClick={() => setOpen(open === "type" ? null : "type")}
          variant="outline"
          size="sm"
          className={btnClass(!!filters.direction)}
        >
          {filters.direction
            ? filters.direction === "spend"
              ? "Expense"
              : filters.direction.charAt(0).toUpperCase() + filters.direction.slice(1)
            : "Type"}
          <ChevronDown size={12} />
        </AppButton>

        {open === "type" && (
          <div
            style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 9999, minWidth: 140 }}
            className="app-surface-overlay overflow-hidden rounded-2xl shadow-2xl"
          >
            {[
              { label: "All", value: "" },
              { label: "Expense", value: "spend" },
              { label: "Income", value: "income" },
              { label: "Refund", value: "refund" },
            ].map((opt) => (
              <AppButton
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange({ ...filters, direction: opt.value });
                  setOpen(null);
                }}
                variant={filters.direction === opt.value ? "secondary" : "quiet"}
                size="sm"
                className="w-full justify-start rounded-none px-5 text-left hover:bg-[var(--app-color-surface-inset)]"
              >
                {opt.label}
              </AppButton>
            ))}
          </div>
        )}
      </div>

      {hasFilters && (
        <AppButton type="button" variant="outline" size="sm" onClick={onClear}>
          <X size={12} /> Clear
        </AppButton>
      )}
    </div>
  );
});

const TransactionStats = React.memo(function TransactionStats({
  count,
  totalSpend,
  totalIncome,
  net,
  incomeLabel,
  incomeDetail,
}: {
  count: number;
  totalSpend: number;
  totalIncome: number;
  net: number;
  incomeLabel: string;
  incomeDetail?: string;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard label="Total Transactions" value={count} className="app-surface-card" />
      <MetricCard label="Total Spent" value={`$${totalSpend.toFixed(2)}`} className="app-surface-card" />
      <MetricCard
        label={incomeLabel}
        value={`$${totalIncome.toFixed(2)}`}
        detail={incomeDetail}
        className="app-surface-card"
      />
      <MetricCard
        label="Net"
        value={<span className={cn(net >= 0 ? "text-emerald-400" : "text-red-400")}>{net >= 0 ? "+" : ""}${net.toFixed(2)}</span>}
        className="app-surface-card"
      />
    </div>
  );
});

const TransactionToolbar = React.memo(function TransactionToolbar({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  onClearFilters,
}: {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  onClearFilters: () => void;
}) {
  return (
    <Surface variant="panel" padding="md" className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="group relative w-full xl:max-w-sm">
        <AppInput
          type="text"
          placeholder="Search transactions..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          startAdornment={<Search size={18} className="text-[var(--app-color-text-tertiary)] group-focus-within:text-[var(--app-accent-cyan-soft)] transition-colors" />}
        />
      </div>

      <div className="flex flex-1 flex-wrap items-center gap-3">
        <FilterBar filters={filters} onChange={onFiltersChange} onClear={onClearFilters} />
      </div>
    </Surface>
  );
});

const TransactionGroups = React.memo(function TransactionGroups({
  groups,
  loading,
  onEdit,
  onDelete,
  onFeedback,
  onScore,
  scoringTransactionId,
}: {
  groups: TransactionGroupViewModel[];
  loading: boolean;
  onEdit: (tx: DisplayTransaction) => void;
  onDelete: (tx: DisplayTransaction, e: React.MouseEvent) => void;
  onFeedback: (tx: DisplayTransaction) => void;
  onScore: (tx: DisplayTransaction, e: React.MouseEvent) => void;
  scoringTransactionId: string | number | null;
}) {
  const [expandedState, setExpandedState] = React.useState<Record<string, boolean>>({});
  const [visibleGroupCount, setVisibleGroupCount] = React.useState(INITIAL_VISIBLE_GROUPS);
  const groupKeys = React.useMemo(() => groups.map((group) => group.date), [groups]);

  React.useEffect(() => {
    setExpandedState((prev) => {
      const next: Record<string, boolean> = {};
      groupKeys.forEach((date, index) => {
        next[date] = prev[date] ?? index < INITIAL_VISIBLE_GROUPS;
      });
      return next;
    });

    setVisibleGroupCount((prev) => {
      if (groupKeys.length <= INITIAL_VISIBLE_GROUPS) return groupKeys.length;
      return prev >= groupKeys.length ? groupKeys.length : Math.max(INITIAL_VISIBLE_GROUPS, prev);
    });
  }, [groupKeys]);

  const visibleGroups = React.useMemo(
    () => groups.slice(0, visibleGroupCount),
    [groups, visibleGroupCount]
  );

  const hasMoreGroups = visibleGroupCount < groups.length;

  // Infinite scroll: reveal more date groups as the sentinel nears the viewport.
  const { ref: sentinelRef, inView: sentinelInView } = useInViewport<HTMLDivElement>({
    rootMargin: "400px",
    once: false,
  });

  React.useEffect(() => {
    if (sentinelInView && hasMoreGroups) {
      setVisibleGroupCount((prev) => Math.min(prev + INITIAL_VISIBLE_GROUPS, groups.length));
    }
  }, [sentinelInView, hasMoreGroups, groups.length]);

  const toggleGroup = React.useCallback((date: string) => {
    setExpandedState((prev) => ({ ...prev, [date]: !prev[date] }));
  }, []);

  if (loading) {
    return <LoadingState label="Loading transactions..." lines={4} compact />;
  }

  if (groups.length === 0) {
    return (
      <EmptyState
        title="No transactions found"
        description="Add your first transaction using the add button."
      />
    );
  }

  return (
    <div className="space-y-8">
      {visibleGroups.map((group) => {
        const isExpanded = expandedState[group.date] ?? false;

        return (
          <div key={group.date} className="space-y-4">
            <AppButton onClick={() => toggleGroup(group.date)} variant="quiet" className="group h-auto w-full justify-start gap-4 px-0 py-0 text-left">
              <div className="rounded-full border border-[var(--app-color-border-subtle)] bg-[var(--app-color-surface-base)] px-4 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-[var(--app-color-text-tertiary)]">
                {group.dateLabel}
              </div>
              <div className="h-px flex-1 bg-[var(--app-color-border-subtle)]" />
              <ChevronDown
                size={16}
                className={cn("text-[var(--app-color-text-tertiary)] transition-transform duration-300", !isExpanded && "-rotate-90")}
              />
            </AppButton>

            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-2"
                >
                  {group.rows.map((row) => {
                    const Icon = row.categoryIcon;
                    const isManual = row.tx.source === "manual";
                    const isScoring = scoringTransactionId === `${row.tx.source}-${row.tx.id}`;

                    return (
                      <Surface
                        key={`${row.tx.source}-${row.tx.id}`}
                        variant="inset"
                        padding="md"
                        className="group/tx flex items-start justify-between gap-4 rounded-[1.75rem] transition-all hover:border-[var(--app-color-border-strong)]"
                      >
                        <div
                          className={cn("flex items-center gap-5 flex-1", isManual && "cursor-pointer")}
                          onClick={() => {
                            if (isManual) onEdit(row.tx);
                          }}
                        >
                          <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover/tx:scale-110"
                            style={{ backgroundColor: `${row.categoryColor}15` }}
                          >
                            <Icon size={20} style={{ color: row.categoryColor }} />
                          </div>

                          <div>
                            <h4 className="text-lg font-black text-[var(--app-color-text-primary)]">{row.heading}</h4>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {row.tx.source === "bank" && <StatusChip tone="info">Bank</StatusChip>}
                              {row.valueScore != null && (
                                <StatusChip tone="neutral" style={{ color: row.valueColor, borderColor: `${row.valueColor}45` }}>
                                  {row.valueLabel}
                                </StatusChip>
                              )}
                              {row.satisfactionLabel && <StatusChip tone="info">{row.satisfactionLabel}</StatusChip>}
                            </div>
                          </div>
                        </div>

                         <div className="flex shrink-0 items-start gap-3">
                           <div className="flex w-full min-w-[12rem] max-w-[min(100%,30rem)] flex-col items-end gap-2 text-right">
                             <div
                               className={cn(
                                 "text-xl font-black tabular-nums",
                                 row.isIncome ? "text-emerald-400" : "text-[var(--app-color-text-primary)]"
                               )}
                             >
                               {row.amountText}
                             </div>
                              {row.valueScore != null ? (
                                <div className="w-full space-y-2">
                                  <div className="flex w-full flex-wrap items-center justify-end gap-x-2.5 gap-y-0.5">
                                    <span className="text-lg font-bold tabular-nums tracking-tight text-[var(--app-color-text-secondary)]">
                                      Value
                                    </span>
                                    <span
                                      className="text-lg font-black tabular-nums tracking-tight"
                                      style={{ color: row.valueColor }}
                                    >
                                      {row.valueDisplayScoreText}
                                    </span>
                                  </div>
                                  <ValueScoreMeter score={row.valueScore} accentColor={row.valueColor} />
                                </div>
                              ) : (
                                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--app-color-text-tertiary)]">
                                  Run score to save value score
                                </div>
                              )}
                            </div>

                            <div className="flex shrink-0 items-center gap-0.5 pt-0.5">
                            <AppButton
                              onClick={(e) => onScore(row.tx, e)}
                              variant="quiet"
                              size="sm"
                              disabled={isScoring}
                              className="h-10 w-10 rounded-xl px-0 text-[var(--app-color-text-tertiary)] hover:text-[var(--app-accent-cyan-soft)]"
                              title={row.valueScore == null ? "Run value score" : "Refresh value score"}
                            >
                              <Sparkles size={18} className={cn(isScoring && "animate-pulse")} />
                            </AppButton>
                            <AppButton
                              onClick={(e) => {
                                e.stopPropagation();
                                onFeedback(row.tx);
                            }}
                            variant="quiet"
                            size="sm"
                            className="h-10 w-10 rounded-xl px-0 text-[var(--app-color-text-tertiary)] hover:text-[var(--app-accent-cyan-soft)]"
                             title="Give feedback"
                           >
                             <MessageSquare size={18} />
                           </AppButton>

                           {isManual && (
                             <>
                              <AppButton
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEdit(row.tx);
                                }}
                                variant="quiet"
                                size="sm"
                                className="h-10 w-10 rounded-xl px-0 text-[var(--app-color-text-tertiary)] hover:text-[var(--app-accent-cyan-soft)]"
                                title="Edit"
                              >
                                <Pencil size={18} />
                              </AppButton>

                              <AppButton
                                onClick={(e) => onDelete(row.tx, e)}
                                variant="quiet"
                                size="sm"
                                className="h-10 w-10 rounded-xl px-0 text-[var(--app-color-text-tertiary)] hover:bg-red-500/10 hover:text-red-400"
                                 title="Delete"
                               >
                                 <Trash2 size={18} />
                               </AppButton>
                             </>
                           )}
                           </div>
                         </div>
                       </Surface>
                     );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {hasMoreGroups && (
        <div ref={sentinelRef} className="flex justify-center pt-2">
          {/* Auto-loads on scroll via IntersectionObserver; button is a fallback. */}
          <AppButton
            variant="outline"
            onClick={() => setVisibleGroupCount((prev) => Math.min(prev + INITIAL_VISIBLE_GROUPS, groups.length))}
          >
            Load More Dates
          </AppButton>
        </div>
      )}
    </div>
  );
});

export const TransactionsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setRightPanelOpen } = usePanelActions();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [isAddPanelOpen, setIsAddPanelOpen] = React.useState(false);
  const [editingTransaction, setEditingTransaction] = React.useState<DisplayTransaction | null>(null);
  const [feedbackTransaction, setFeedbackTransaction] = React.useState<DisplayTransaction | null>(null);
  const [scoringTransactionId, setScoringTransactionId] = React.useState<string | number | null>(null);
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);
  const [filters, setFilters] = React.useState<Filters>(EMPTY_FILTERS);
  const [profileMonthlyIncome, setProfileMonthlyIncome] = React.useState<number | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    RawExplicitAPI.list()
      .then((rows) => {
        if (cancelled || !rows.length) return;
        setProfileMonthlyIncome(resolveStatedMonthlyIncome(rows[0]));
      })
      .catch(() => {
        if (!cancelled) setProfileMonthlyIncome(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { transactions, loading, error, refetch } = useMergedTransactions({
    date_from: filters.date_from || undefined,
    date_to: filters.date_to || undefined,
  });

  const refetchTransactions = React.useCallback(() => {
    refetch();
  }, [refetch]);

  React.useEffect(() => {
    setRightPanelOpen(isAddPanelOpen);
    return () => setRightPanelOpen(false);
  }, [isAddPanelOpen, setRightPanelOpen]);

  React.useEffect(() => {
    if (error) toast.error("Failed to load transactions.");
  }, [error]);

  React.useEffect(() => {
    if (location.pathname === "/transactions/new") {
      setEditingTransaction(null);
      setIsAddPanelOpen(true);
    }
  }, [location.pathname]);

  const closePanel = React.useCallback(() => {
    setIsAddPanelOpen(false);
    setEditingTransaction(null);
    if (location.pathname === "/transactions/new") {
      navigate("/transactions", { replace: true });
    }
  }, [location.pathname, navigate]);

  const openAddPanel = React.useCallback(() => {
    setEditingTransaction(null);
    setIsAddPanelOpen(true);
  }, []);

  const handleEdit = React.useCallback((tx: DisplayTransaction) => {
    if (tx.source === "bank") return;
    setEditingTransaction(tx);
    setIsAddPanelOpen(true);
  }, []);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredTransactions = React.useMemo(() => {
    let list = transactions.filter((tx) => transactionMatchesToolbarFilters(tx, filters));
    if (normalizedSearch) {
      list = list.filter((tx) =>
        [tx.description_raw, tx.category].join(" ").toLowerCase().includes(normalizedSearch)
      );
    }
    return list;
  }, [transactions, filters, normalizedSearch]);

  const transactionGroups = React.useMemo<TransactionGroupViewModel[]>(
    () =>
      Array.from(
        filteredTransactions
          .reduce<Map<string, TransactionRowViewModel[]>>((acc, tx) => {
            const date = getLocalDateKey(tx.occurred_at);
            if (selectedDate && date !== selectedDate) return acc;

            const category = getCategoryMeta(tx.category);
            const isIncome = tx.direction === "income";
            const amount = Math.abs(Number(tx.amount));
            const valueScore = deriveTransactionValueScore(tx);
            const value = getValuePresentation(valueScore);

            const row: TransactionRowViewModel = {
              tx,
              categoryLabel: category.label,
              categoryColor: category.color,
              categoryIcon: category.icon,
              timeLabel: parseDateForDisplay(tx.occurred_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              heading: tx.description_raw || category.label,
              directionLabel: tx.direction,
              satisfactionLabel: tx.satisfaction_rating ? `★ ${tx.satisfaction_rating}/10` : null,
              amountText: `${isIncome ? "+" : "-"}$${amount.toFixed(2)}`,
              isIncome,
              valueScore,
              valueDisplayScoreText: value.displayScoreText,
              valueLabel: value.label,
              valueTone:
                valueScore == null ? "Waiting for satisfaction or regret data." : value.tone,
              valueColor: value.accentColor,
            };

            const existing = acc.get(date);
            if (existing) existing.push(row);
            else acc.set(date, [row]);

            return acc;
          }, new Map<string, TransactionRowViewModel[]>())
          .entries()
      )
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([date, rows]) => ({ date, dateLabel: formatDayLabel(date), rows })),
    [filteredTransactions, selectedDate]
  );

  const handleAdded = React.useCallback(
    (_tx: Transaction) => {
      refetchTransactions();
    },
    [refetchTransactions]
  );

  const handleUpdated = React.useCallback(
    (_tx: Transaction) => {
      refetchTransactions();
    },
    [refetchTransactions]
  );

  const handleDelete = React.useCallback(
    async (tx: DisplayTransaction, e: React.MouseEvent) => {
      e.stopPropagation();

      if (tx.source === "bank") return;
      if (typeof tx.id !== "number") return;
      if (!window.confirm(`Delete "${tx.description_raw || "this transaction"}"?`)) return;

      try {
        await TransactionsAPI.remove(tx.id);
        refetchTransactions();
        toast.success("Transaction deleted.");
      } catch {
        toast.error("Failed to delete transaction.");
      }
    },
    [refetchTransactions]
  );

  const handleScore = React.useCallback(
    async (tx: DisplayTransaction, e: React.MouseEvent) => {
      e.stopPropagation();
      const scoreKey = `${tx.source}-${tx.id}`;
      setScoringTransactionId(scoreKey);
      try {
        if (tx.source === "manual" && typeof tx.id === "number") {
          await TransactionsAPI.score(tx.id);
        } else {
          await BankingAPI.score(tx.id);
        }
        await refetchTransactions();
        toast.success("Value score updated.");
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to compute value score.";
        toast.error(msg);
      } finally {
        setScoringTransactionId((current) => (current === scoreKey ? null : current));
      }
    },
    [refetchTransactions]
  );

  const { totalSpend, totalIncome, net, incomeLabel, incomeDetail } = React.useMemo(() => {
    const totalSpendMemo = transactions
      .filter((t) => t.direction === "spend")
      .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);

    const incomeFromTransactions = transactions
      .filter((t) => t.direction === "income")
      .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);

    const usesProfile = profileMonthlyIncome != null && profileMonthlyIncome > 0;
    const totalIncomeMemo = usesProfile ? profileMonthlyIncome! : incomeFromTransactions;

    return {
      totalSpend: totalSpendMemo,
      totalIncome: totalIncomeMemo,
      net: totalIncomeMemo - totalSpendMemo,
      incomeLabel: usesProfile ? "Monthly income" : "Total Income",
      incomeDetail: usesProfile ? "From your onboarding" : undefined,
    };
  }, [transactions, profileMonthlyIncome]);

  return (
    <AppPage width="full" className="pb-40">
      <SectionHeader
        level={1}
        eyebrow="Spending intelligence"
        title="Transactions"
        titleClassName="app-page-title"
        description="Review synced bank activity, add manual entries, and score transaction value from one timeline."
        action={
          <AppButton type="button" onClick={openAddPanel} variant="info" size="md" className="w-full sm:w-auto">
            <Plus size={18} strokeWidth={3} />
            <span>Add Transaction</span>
          </AppButton>
        }
      />

      <BankingSection onTransactionsRefetch={refetchTransactions} />

      <TransactionStats
        count={transactions.length}
        totalSpend={totalSpend}
        totalIncome={totalIncome}
        net={net}
        incomeLabel={incomeLabel}
        incomeDetail={incomeDetail}
      />

      <div className="space-y-4">
        <h3 className="flex items-center gap-2 text-xl font-black tracking-tight text-[var(--app-color-text-primary)]">
          <Calendar size={20} className="text-[var(--app-accent-cyan-soft)]" /> Spending Calendar
        </h3>
        <ElectricCard className="p-8" elevation={0}>
          <SpendingCalendar
            transactions={transactions}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </ElectricCard>
      </div>

      <TransactionToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={() => setFilters(EMPTY_FILTERS)}
      />

      <TransactionGroups
        groups={transactionGroups}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onFeedback={setFeedbackTransaction}
        onScore={handleScore}
        scoringTransactionId={scoringTransactionId}
      />

      <AnimatePresence>
        {isAddPanelOpen && (
          <AddPanel
            onClose={closePanel}
            onAdded={handleAdded}
            onUpdated={handleUpdated}
            editingTransaction={editingTransaction}
          />
        )}
      </AnimatePresence>

      <TransactionFeedbackModal
        transaction={feedbackTransaction}
        open={!!feedbackTransaction}
        onOpenChange={(open) => {
          if (!open) setFeedbackTransaction(null);
        }}
        onSubmitted={refetchTransactions}
      />
    </AppPage>
  );
};
