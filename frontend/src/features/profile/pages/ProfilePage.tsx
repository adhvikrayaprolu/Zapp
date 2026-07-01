import * as React from "react";
import { motion } from "motion/react";
import { User, Mail, LogOut, Pencil, Plus, X, ChevronDown, Shield } from "lucide-react";
import { useAuth } from "@/features/auth";
import { getDisplayNameInitials, resolveDisplayName } from "@/features/auth/displayName";
import { MfaEnrollmentCard } from "@/features/auth/components/MfaEnrollmentCard";
import { PrivacyPolicyLink, PrivacyPolicyMetaLine } from "@/shared/components/PrivacyPolicyLink";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  PreferencesAPI,
  RawExplicitAPI,
  type Preference,
  type PreferenceCreate,
  type RawExplicit,
} from "@/api";
import { COLORS, GLOWS } from "@/shared/theme";
import { displayPlanLabel } from "@/shared/subscriptionTier";
import {
  AppButton,
  AppInput,
  AppSelect,
  EmptyState,
  FormField,
  LoadingState,
  SectionHeader,
  StatusChip,
  Surface,
} from "@/shared/components/system";
import { cn } from "@/shared/components/ui/utils";

const FINANCIAL_FIELDS: { key: keyof RawExplicit; label: string }[] = [
  { key: "life_stage", label: "Life Stage" },
  { key: "household_size", label: "Household Size" },
  { key: "location_zip", label: "Location (ZIP)" },
  { key: "income_range", label: "Income Range" },
  { key: "monthly_fixed_expenses", label: "Monthly Fixed Expenses" },
  { key: "financial_goal", label: "Financial Goal" },
  { key: "risk_tolerance", label: "Risk Tolerance" },
  { key: "budget_style", label: "Budget Style" },
  { key: "value_priority_cost", label: "Value: Cost" },
  { key: "value_priority_quality", label: "Value: Quality" },
  { key: "value_priority_sustainability", label: "Value: Sustainability" },
  { key: "self_report_research_habit", label: "Research Habit" },
];

const VALUE_TYPES: Preference["value_type"][] = ["bool", "int", "float", "string", "json"];

function parsePreferenceValue(raw: string, type: Preference["value_type"]): string | number | boolean | object {
  if (type === "bool") return raw.toLowerCase() === "true" || raw === "1";
  if (type === "int") return parseInt(raw, 10) || 0;
  if (type === "float") return parseFloat(raw) || 0;
  if (type === "json") {
    try {
      return JSON.parse(raw) as object;
    } catch {
      return raw;
    }
  }
  return raw;
}

function FinancialEditForm({
  data,
  onSave,
  onCancel,
}: {
  data: RawExplicit;
  onSave: (d: RawExplicit) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = React.useState<Partial<RawExplicit>>(data);
  const [submitting, setSubmitting] = React.useState(false);

  const set = <K extends keyof RawExplicit>(key: K, val: RawExplicit[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const updated = await RawExplicitAPI.patch(data.id, form);
      onSave(updated);
      toast.success("Financial profile updated.");
    } catch {
      toast.error("Failed to update.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
        {FINANCIAL_FIELDS.map(({ key, label }) => {
          const isNum =
            key === "household_size" ||
            key === "monthly_fixed_expenses" ||
            key === "self_report_research_habit" ||
            key.startsWith("value_priority");

          return (
            <FormField key={key} label={label}>
              <AppInput
                value={form[key] ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  set(key, (isNum ? (v === "" ? null : Number(v)) : v) as RawExplicit[typeof key]);
                }}
                type={isNum ? "number" : "text"}
              />
            </FormField>
          );
        })}
      </div>
      <div className="flex gap-2">
        <AppButton type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save"}
        </AppButton>
        <AppButton type="button" variant="outline" onClick={onCancel}>
          Cancel
        </AppButton>
      </div>
    </form>
  );
}

function PreferenceAddForm({
  form,
  onChange,
  onSubmit,
  onCancel,
}: {
  form: PreferenceCreate;
  onChange: (f: PreferenceCreate) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <Surface variant="inset" padding="md" className="rounded-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Key">
          <AppInput
            value={form.key}
            onChange={(e) => onChange({ ...form, key: e.target.value })}
            placeholder="e.g. theme"
          />
        </FormField>
        <FormField label="Value type">
          <AppSelect
            value={form.value_type}
            onValueChange={(value) => onChange({ ...form, value_type: value as Preference["value_type"] })}
            options={VALUE_TYPES.map((t) => ({ value: t, label: t }))}
          />
        </FormField>
        <FormField label="Value">
          <AppInput
            value={typeof form.value === "object" ? JSON.stringify(form.value) : String(form.value)}
            onChange={(e) => onChange({ ...form, value: parsePreferenceValue(e.target.value, form.value_type) })}
            placeholder={form.value_type === "json" ? '{"key": "value"}' : "Value"}
          />
        </FormField>
        <div className="flex gap-2">
          <AppButton type="submit">Add</AppButton>
          <AppButton type="button" variant="outline" onClick={onCancel}>
            Cancel
          </AppButton>
        </div>
      </form>
    </Surface>
  );
}

const FinancialProfileSection = React.memo(function FinancialProfileSection({
  financialLoading,
  rawExplicit,
  editingFinancial,
  onStartEdit,
  onSave,
  onCancel,
  sectionClassName,
}: {
  financialLoading: boolean;
  rawExplicit: RawExplicit[];
  editingFinancial: RawExplicit | null;
  onStartEdit: () => void;
  onSave: (updated: RawExplicit) => void;
  onCancel: () => void;
  /** Override default top border when nested in a card. */
  sectionClassName?: string;
}) {
  const hasData = !financialLoading && rawExplicit.length > 0;
  return (
    <section
      className={cn(
        "space-y-4 border-t border-[var(--app-color-border-subtle)] pt-8",
        sectionClassName
      )}
    >
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-black uppercase tracking-[0.18em] text-[var(--app-color-text-secondary)]">
            Financial context
          </h3>
          {hasData && !editingFinancial && (
            <AppButton type="button" variant="quietAccent" size="sm" onClick={onStartEdit} className="gap-1">
              <Pencil size={14} />
              Edit
            </AppButton>
          )}
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-[var(--app-color-text-tertiary)]">
          Saved from onboarding—used to personalize insights. You can update these fields anytime.
        </p>
        {hasData && (
          <p className="text-xs font-bold text-[var(--app-color-text-secondary)]">
            Your financial context is on file.
          </p>
        )}
      </div>
      {financialLoading && (
        <LoadingState label="Loading financial profile..." lines={2} compact />
      )}
      {!financialLoading && rawExplicit.length === 0 && (
        <EmptyState title="No profile data yet" description="Complete onboarding to set your financial profile." />
      )}
      {hasData && !editingFinancial && (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
          {FINANCIAL_FIELDS.map(({ key, label }) => {
            const val = rawExplicit[0][key];
            return (
              <Surface key={key} variant="inset" padding="sm" className="space-y-1 rounded-xl">
                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--app-color-text-tertiary)]">
                  {label}
                </div>
                <div className="text-sm font-semibold text-[var(--app-color-text-primary)]">
                  {val == null || val === "" ? "—" : String(val)}
                </div>
              </Surface>
            );
          })}
        </div>
      )}
      {editingFinancial ? <FinancialEditForm data={editingFinancial} onSave={onSave} onCancel={onCancel} /> : null}
    </section>
  );
});

const PreferencesSection = React.memo(function PreferencesSection({
  prefsLoading,
  preferences,
  addingPref,
  newPref,
  onStartAdd,
  onChangePref,
  onSubmitPref,
  onCancelAdd,
  onRemovePref,
  embedded,
}: {
  prefsLoading: boolean;
  preferences: Preference[];
  addingPref: boolean;
  newPref: PreferenceCreate;
  onStartAdd: () => void;
  onChangePref: (value: PreferenceCreate) => void;
  onSubmitPref: () => void;
  onCancelAdd: () => void;
  onRemovePref: (id: number) => Promise<void>;
  /** When true, omit top border (used inside Advanced disclosure). */
  embedded?: boolean;
}) {
  return (
    <section className={embedded ? "space-y-4" : "space-y-4 border-t border-[var(--app-color-border-subtle)] pt-8"}>
      <div className="flex items-center justify-between">
        <h3 className={embedded ? "text-sm font-black uppercase tracking-[0.18em] text-[var(--app-color-text-secondary)]" : "app-card-title"}>
          App preferences
        </h3>
        {!prefsLoading && !addingPref && (
          <AppButton type="button" variant="quietAccent" size="sm" onClick={onStartAdd} className="gap-1">
            <Plus size={14} />
            Add
          </AppButton>
        )}
      </div>
      <p className="text-sm text-[var(--app-color-text-tertiary)]">
        Optional key/value entries for UI or behavior flags. Most people never need this.
      </p>
      {prefsLoading && (
        <LoadingState label="Loading preferences..." lines={2} compact />
      )}
      {!prefsLoading && preferences.length === 0 && !addingPref && (
        <EmptyState title="No saved settings yet." description="Add keys here only if you know you need them." />
      )}
      {!prefsLoading && preferences.length > 0 && (
        <div className="mb-4 space-y-2">
          {preferences.map((p) => (
            <Surface key={p.id} variant="inset" padding="sm" className="flex items-center justify-between rounded-xl">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                <span className="text-xs font-black uppercase text-[var(--app-color-text-tertiary)]">{p.key}</span>
                <span className="min-w-0 truncate text-sm font-semibold text-[var(--app-color-text-primary)]">
                  {typeof p.value === "object" ? JSON.stringify(p.value) : String(p.value)}
                </span>
                <StatusChip tone="neutral">{p.value_type}</StatusChip>
              </div>
              <AppButton
                type="button"
                onClick={() => void onRemovePref(p.id)}
                variant="quietDanger"
                size="sm"
                className="h-8 w-8 shrink-0 rounded-lg px-0"
              >
                <X size={14} />
              </AppButton>
            </Surface>
          ))}
        </div>
      )}
      {addingPref ? (
        <PreferenceAddForm form={newPref} onChange={onChangePref} onSubmit={onSubmitPref} onCancel={onCancelAdd} />
      ) : null}
    </section>
  );
});

export function ProfilePage() {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = React.useState(user?.name ?? "");
  const [saving, setSaving] = React.useState(false);

  const [rawExplicit, setRawExplicit] = React.useState<RawExplicit[]>([]);
  const [preferences, setPreferences] = React.useState<Preference[]>([]);
  const [financialLoading, setFinancialLoading] = React.useState(true);
  const [prefsLoading, setPrefsLoading] = React.useState(true);
  const [editingFinancial, setEditingFinancial] = React.useState<RawExplicit | null>(null);
  const [addingPref, setAddingPref] = React.useState(false);
  const [newPref, setNewPref] = React.useState<PreferenceCreate>({
    key: "",
    value: "",
    value_type: "string",
  });

  React.useEffect(() => {
    if (user) {
      setName(user.name);
    }
  }, [user]);

  React.useEffect(() => {
    let cancelled = false;
    RawExplicitAPI.list()
      .then((data) => {
        if (!cancelled) setRawExplicit(data);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load financial profile.");
      })
      .finally(() => {
        if (!cancelled) setFinancialLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    PreferencesAPI.list()
      .then((data) => {
        if (!cancelled) setPreferences(data);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load preferences.");
      })
      .finally(() => {
        if (!cancelled) setPrefsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await updateProfile({ name: name.trim() });
      if (result.ok) {
        toast.success("Profile updated");
      } else {
        toast.error(result.error ?? "Failed to update profile.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out");
    navigate("/login", { replace: true });
  };

  const handleFinancialSave = React.useCallback((updated: RawExplicit) => {
    setRawExplicit((prev) => (prev[0]?.id === updated.id ? [updated, ...prev.slice(1)] : [updated]));
    setEditingFinancial(null);
  }, []);

  const handleRemovePreference = React.useCallback(async (id: number) => {
    try {
      await PreferencesAPI.remove(id);
      setPreferences((prev) => prev.filter((x) => x.id !== id));
      toast.success("Preference removed.");
    } catch {
      toast.error("Failed to remove preference.");
    }
  }, []);

  const handleSubmitPreference = React.useCallback(async () => {
    if (!newPref.key.trim()) {
      toast.error("Key is required.");
      return;
    }
    try {
      const created = await PreferencesAPI.create(newPref);
      setPreferences((prev) => [...prev, created]);
      setNewPref({ key: "", value: "", value_type: "string" });
      setAddingPref(false);
      toast.success("Preference added.");
    } catch {
      toast.error("Failed to add preference.");
    }
  }, [newPref]);

  const handleCancelPreference = React.useCallback(() => {
    setAddingPref(false);
    setNewPref({ key: "", value: "", value_type: "string" });
  }, []);

  if (!user) return null;

  const displayName = resolveDisplayName(name, user.username);
  const initials = getDisplayNameInitials(displayName);
  const planLabel = displayPlanLabel(user.tier);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="mx-auto max-w-4xl space-y-6"
    >
      <SectionHeader
        level={1}
        eyebrow="Account"
        title="Profile"
        titleClassName="app-page-title"
        description="Your name, plan, security, and saved context—in one place."
      />

      {/* Identity hero — visually separate from the old single tall card */}
      <div
        className={cn(
          "relative overflow-hidden rounded-[2rem] border shadow-2xl",
          "border-[color:color-mix(in_srgb,var(--app-accent-cyan-soft)_35%,transparent)]",
          "bg-[var(--app-color-surface-base)]"
        )}
        style={{ boxShadow: `${GLOWS.ambient()}, 0 0 80px color-mix(in srgb, var(--app-accent-cyan-soft) 8%, transparent)` }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background: `linear-gradient(135deg, color-mix(in srgb, ${COLORS.electricCyan} 22%, transparent) 0%, transparent 45%, color-mix(in srgb, ${COLORS.electricBlue} 18%, transparent) 100%)`,
          }}
        />
        <div className="relative z-10 flex flex-col gap-8 p-8 sm:flex-row sm:items-center sm:gap-10 md:p-10">
          <div
            className="mx-auto flex h-[5.5rem] w-[5.5rem] shrink-0 items-center justify-center rounded-2xl border-2 border-white/25 text-3xl font-black tracking-tight text-[var(--app-color-text-inverse)] shadow-2xl sm:mx-0 sm:h-28 sm:w-28 sm:text-4xl"
            style={{
              background: `linear-gradient(to bottom right, ${COLORS.electricCyan}, ${COLORS.electricBlue})`,
              boxShadow: GLOWS.soft(COLORS.electricCyan),
            }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--app-accent-cyan-soft)]">
              Your account
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--app-color-text-primary)] sm:text-3xl">
              {displayName}
            </h2>
            <p className="mt-2 flex items-center justify-center gap-2 text-sm text-[var(--app-color-text-tertiary)] sm:justify-start">
              <Mail className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              <span className="truncate">{user.email}</span>
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--app-color-text-tertiary)]">
                Plan
              </span>
              <StatusChip tone="info" className="text-[11px]">
                {planLabel}
              </StatusChip>
              <span className="w-full text-[11px] text-[var(--app-color-text-faint)] sm:w-auto">
                Billing controls coming later — this is your access level for now.
              </span>
            </div>
          </div>
        </div>
      </div>

      <Surface
        variant="panel"
        padding="lg"
        className="rounded-3xl border border-[var(--app-color-border-strong)]"
        style={{ boxShadow: GLOWS.ambient() }}
      >
        <div className="mb-6 flex items-center gap-2">
          <User className="h-4 w-4 text-[var(--app-accent-cyan-soft)]" aria-hidden />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--app-color-text-tertiary)]">
              Edit profile
            </p>
            <p className="mt-1 text-sm text-[var(--app-color-text-tertiary)]">
              Email and plan are shown in the banner above. Only your display name is saved here.
            </p>
          </div>
        </div>
        <form onSubmit={handleSave} className="space-y-6">
          <FormField
            label={
              <span className="flex items-center gap-2">
                <User className="h-3.5 w-3.5" />
                Display name
              </span>
            }
          >
            <AppInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </FormField>
          <AppButton type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </AppButton>
        </form>
      </Surface>

      <Surface
        variant="panel"
        padding="lg"
        className="rounded-3xl border border-[var(--app-color-border-strong)]"
        style={{ boxShadow: GLOWS.ambient() }}
      >
        <div className="mb-5 flex items-center gap-2">
          <Shield className="h-4 w-4 text-[var(--app-accent-cyan-soft)]" aria-hidden />
          <h3 className="text-sm font-black uppercase tracking-[0.18em] text-[var(--app-color-text-secondary)]">
            Security
          </h3>
        </div>
        <MfaEnrollmentCard />
      </Surface>

      <Surface
        variant="panel"
        padding="lg"
        className="rounded-3xl border border-[var(--app-color-border-strong)]"
        style={{ boxShadow: GLOWS.ambient() }}
      >
        <FinancialProfileSection
          sectionClassName="border-0 pt-0"
          financialLoading={financialLoading}
          rawExplicit={rawExplicit}
          editingFinancial={editingFinancial}
          onStartEdit={() => setEditingFinancial(rawExplicit[0] ?? null)}
          onSave={handleFinancialSave}
          onCancel={() => setEditingFinancial(null)}
        />
      </Surface>

      <details
        className={cn(
          "group overflow-hidden rounded-3xl border shadow-lg",
          "border-[color:color-mix(in_srgb,var(--app-accent-purple-soft)_35%,transparent)]",
          "bg-[color-mix(in_srgb,var(--app-color-surface-inset)_70%,transparent)]"
        )}
        style={{
          boxShadow: `0 0 40px color-mix(in srgb, var(--app-accent-purple-soft) 12%, transparent), ${GLOWS.ambient()}`,
        }}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-6 py-5 text-left [&::-webkit-details-marker]:hidden md:px-8">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--app-color-text-tertiary)]">
              Advanced
            </span>
            <p className="mt-1 text-base font-black text-[var(--app-color-text-primary)]">
              App preferences (key / value)
            </p>
            <p className="mt-1 max-w-xl text-xs text-[var(--app-color-text-tertiary)]">
              Power-user key/value flags. Leave closed unless you know you need this.
            </p>
          </div>
          <ChevronDown className="h-5 w-5 shrink-0 text-[var(--app-accent-purple-soft)] transition-transform duration-200 group-open:rotate-180" />
        </summary>
        <div className="border-t border-[var(--app-color-border-subtle)] px-6 pb-6 pt-2 md:px-8">
          <PreferencesSection
            embedded
            prefsLoading={prefsLoading}
            preferences={preferences}
            addingPref={addingPref}
            newPref={newPref}
            onStartAdd={() => setAddingPref(true)}
            onChangePref={setNewPref}
            onSubmitPref={handleSubmitPreference}
            onCancelAdd={handleCancelPreference}
            onRemovePref={handleRemovePreference}
          />
        </div>
      </details>

      <Surface
        variant="panel"
        padding="lg"
        className="rounded-3xl border border-[var(--app-color-border-subtle)]"
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--app-color-text-tertiary)]">
          <PrivacyPolicyMetaLine className="mb-0" />
          <span className="text-[var(--app-color-border-strong)]">·</span>
          <PrivacyPolicyLink className="text-[var(--app-accent-cyan-soft)] font-bold hover:underline" />
        </div>
        <div className="mt-6">
          <AppButton
            type="button"
            variant="outline"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 text-[var(--app-color-text-secondary)]"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </AppButton>
        </div>
      </Surface>
    </motion.div>
  );
}
