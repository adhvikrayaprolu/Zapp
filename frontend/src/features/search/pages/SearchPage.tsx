import * as React from "react";
import { Search, Zap, TrendingDown } from "lucide-react";
import { ElectricCard } from "@/features/home";
import { BuyAdvisorModal } from "@/features/dashboard/components/BuyAdvisorModal";
import { useMergedTransactions } from "@/features/transactions/hooks/useMergedTransactions";
import { COLORS } from "@/shared/theme";
import { getValuePresentation } from "@/shared/valuation";
import {
  AppButton,
  AppInput,
  AppPage,
  EmptyState,
  IconBadge,
  LoadingState,
  SectionHeader,
  Surface,
} from "@/shared/components/system";
import { MIN_RATED_PURCHASES, rankCategoriesByValue, type CategoryValue } from "../utils/categoryValue";

const TRANSACTION_POOL_LIMIT = 300;
const CATEGORIES_PER_CARD = 3;

function CategoryList({ categories }: { categories: CategoryValue[] }) {
  return (
    <div className="space-y-6">
      {categories.map((item) => {
        const color = getValuePresentation(item.averageScore).accentColor;
        return (
          <Surface
            key={item.category}
            variant="inset"
            padding="md"
            className="flex items-center justify-between"
            style={{ borderColor: `${color}22` }}
          >
            <div>
              <div className="text-xl font-black text-[var(--app-color-text-secondary)]">{item.label}</div>
              <div className="app-helper text-xs">
                {item.ratedCount} rated purchase{item.ratedCount === 1 ? "" : "s"}
              </div>
            </div>
            <span className="font-black text-3xl" style={{ color, filter: `drop-shadow(0 0 10px ${color}60)` }}>
              {item.averageScore}
            </span>
          </Surface>
        );
      })}
    </div>
  );
}

export function SearchPage() {
  const [query, setQuery] = React.useState("");
  const [advisorOpen, setAdvisorOpen] = React.useState(false);
  const { transactions, loading } = useMergedTransactions({ limit: TRANSACTION_POOL_LIMIT });

  const ranked = React.useMemo(() => rankCategoriesByValue(transactions), [transactions]);
  const best = ranked.slice(0, CATEGORIES_PER_CARD);
  // Lowest first, never repeating a category already shown as best.
  const lowest = ranked.slice(CATEGORIES_PER_CARD).slice(-CATEGORIES_PER_CARD).reverse();

  const notEnoughData = !loading && ranked.length === 0;

  return (
    <AppPage width="default" spacing="relaxed" className="pt-10">
      <SectionHeader
        level={1}
        align="center"
        eyebrow="Decision support"
        title="Decision Engine"
        titleClassName="app-page-title"
        description="Check a purchase before you commit, and see where your money has bought the most and least value."
      />

      <Surface variant="overlay" padding="md" className="overflow-hidden">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setAdvisorOpen(true);
          }}
        >
          <AppInput
            type="text"
            size="hero"
            placeholder="What are you thinking of buying?"
            aria-label="What are you thinking of buying?"
            value={query}
            maxLength={120}
            onChange={(event) => setQuery(event.target.value)}
            startAdornment={<Search size={32} className="text-[var(--app-accent-cyan)]" />}
            endAdornment={
              <AppButton type="submit" variant="hero" size="hero" className="min-w-[10rem]">
                Evaluate
              </AppButton>
            }
            className="border-transparent bg-transparent shadow-none focus-visible:border-transparent focus-visible:ring-0"
          />
        </form>
      </Surface>

      {loading && <LoadingState label="Loading your purchase history..." lines={3} compact />}

      {notEnoughData && (
        <EmptyState
          title="Not enough rated purchases yet"
          description={`Rate a few purchases in each category (at least ${MIN_RATED_PURCHASES}) to see where you get the most value.`}
        />
      )}

      {!loading && ranked.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <ElectricCard semanticColor={COLORS.electricGreen} className="p-12" elevation={1}>
            <div className="flex items-center gap-5 mb-10">
              <IconBadge tone="green" size="md">
                <Zap />
              </IconBadge>
              <h4 className="app-section-title text-[1.75rem]">Your best value</h4>
            </div>
            <CategoryList categories={best} />
          </ElectricCard>

          <ElectricCard semanticColor={COLORS.electricRed} className="p-12" elevation={1}>
            <div className="flex items-center gap-5 mb-10">
              <IconBadge tone="red" size="md">
                <TrendingDown />
              </IconBadge>
              <h4 className="app-section-title text-[1.75rem]">Your lowest value</h4>
            </div>
            {lowest.length > 0 ? (
              <CategoryList categories={lowest} />
            ) : (
              <p className="app-helper">Rate purchases in more categories to compare.</p>
            )}
          </ElectricCard>
        </div>
      )}

      <BuyAdvisorModal isOpen={advisorOpen} onClose={() => setAdvisorOpen(false)} initialItem={query.trim()} />
    </AppPage>
  );
}
