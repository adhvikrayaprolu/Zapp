import * as React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart2, CreditCard, Sparkles, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { ElectricCard } from "@/features/home";
import { AppLogo } from "@/shared/components/brand/AppLogo";
import { LazyImage, Reveal, RevealStagger } from "@/shared/components/system";
import { Button } from "@/shared/components/ui/button";
import { COLORS, GLOWS } from "@/shared/theme";

type Feature = {
  title: string;
  body: string;
  icon: LucideIcon;
  color: string;
};

const FEATURES: Feature[] = [
  {
    title: "Transactions Insight",
    body: "See where your money actually goes, with spend broken down the way you think about it.",
    icon: BarChart2,
    color: COLORS.electricBlue,
  },
  {
    title: "Subscriptions & Value Score",
    body: "Know which subscriptions earn their keep and which ones quietly drain your budget.",
    icon: CreditCard,
    color: COLORS.electricCyan,
  },
  {
    title: "AI Assistant",
    body: "Ask Zapp before you buy. Get a clear, personal read on whether something is worth it.",
    icon: Sparkles,
    color: COLORS.electricPurple,
  },
  {
    title: "Habits & Rewards",
    body: "Build better money habits with monthly targets, streaks, and badges that keep you on track.",
    icon: Trophy,
    color: COLORS.electricGreen,
  },
];

export function MarketingLandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0B1220] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-[-8%] top-[-12%] h-[28rem] w-[28rem] rounded-full blur-3xl"
          style={{ backgroundColor: `${COLORS.electricBlue}16` }}
        />
        <div
          className="absolute right-[-10%] top-[2%] h-[24rem] w-[24rem] rounded-full blur-3xl"
          style={{ backgroundColor: `${COLORS.electricCyan}12` }}
        />
        <div
          className="absolute bottom-[-12%] left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full blur-3xl"
          style={{ backgroundColor: `${COLORS.electricPurple}10` }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_56%)]" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col items-center gap-16 px-5 py-16 text-center sm:px-8 sm:py-20">
        {/* Hero */}
        <Reveal className="flex flex-col items-center gap-6" y={20} duration={0.5}>
          <AppLogo showWordmark size={64} wordmarkClassName="text-[2.6rem] sm:text-[3.2rem]" />
          <h1 className="mx-auto max-w-3xl text-4xl font-black tracking-[-0.065em] text-white sm:text-5xl lg:text-6xl">
            Spend with intent.
            <br />
            Zapp scores it before you buy.
          </h1>
          <p className="mx-auto max-w-2xl text-base font-medium leading-7 text-gray-300 sm:text-lg">
            Zapp is your personal finance copilot — transactions, subscriptions, value scores, and an
            AI assistant that tells you whether a purchase is actually worth it.
          </p>

          <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
            <Button
              asChild
              className="h-12 rounded-2xl border-0 px-7 text-[11px] font-black uppercase tracking-[0.22em] text-[#08111E] transition-all duration-300 hover:scale-[1.02]"
              style={{
                backgroundColor: COLORS.electricCyan,
                boxShadow: `0 0 0 1px rgba(34,240,255,0.1), ${GLOWS.soft(COLORS.electricCyan)}`,
              }}
            >
              <Link to="/signup">
                Sign up
                <ArrowRight size={15} />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-12 rounded-2xl border-white/15 bg-white/[0.03] px-7 text-[11px] font-black uppercase tracking-[0.22em] text-white transition-all duration-300 hover:bg-white/[0.07]"
            >
              <Link to="/login">Log in</Link>
            </Button>
          </div>
        </Reveal>

        {/* Feature highlights */}
        <section className="w-full">
          <Reveal className="mb-8">
            <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-100/60">
              What Zapp does
            </h2>
          </Reveal>
          <RevealStagger className="grid w-full gap-4 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <ElectricCard
                key={feature.title}
                semanticColor={feature.color}
                elevation={0}
                className="flex h-full flex-col gap-3 border border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(16,26,46,0.88))] p-6 text-left"
              >
                <span
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/6"
                  style={{ backgroundColor: `${feature.color}14` }}
                >
                  <feature.icon size={18} style={{ color: feature.color }} />
                </span>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100/60">
                  {feature.title}
                </p>
                <p className="text-sm leading-6 text-gray-300">{feature.body}</p>
              </ElectricCard>
            ))}
          </RevealStagger>
        </section>

        {/* Below-the-fold visual (lazy-loaded, WebP) */}
        <Reveal className="flex flex-col items-center gap-5">
          <LazyImage
            src="/logo-mark.png"
            webpSrc="/logo-mark.webp"
            alt="Zapp mark"
            width={200}
            height={200}
            aspectRatio="1 / 1"
            className="h-[200px] w-[200px] object-contain opacity-90"
            wrapperClassName="rounded-3xl border border-white/6 bg-white/[0.02] p-6"
          />
          <p className="mx-auto max-w-xl text-sm leading-6 text-gray-400">
            Built for people who want to misjudge value less often. Join the waitlist or jump
            straight in.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] font-black uppercase tracking-[0.22em]">
            <Link to="/signup" className="text-cyan-200 transition-colors hover:text-cyan-100">
              Get started
            </Link>
            <span className="text-white/20">·</span>
            <Link to="/waitlist" className="text-gray-300 transition-colors hover:text-white">
              Join the waitlist
            </Link>
          </div>
        </Reveal>

        <footer className="mt-4 flex flex-col items-center gap-2 text-center text-sm text-gray-400">
          <p>Zapp © 2026</p>
          <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.18em]">
            <Link to="/privacy" className="transition-colors hover:text-white">
              Privacy
            </Link>
            <span className="text-white/20">·</span>
            <Link to="/login" className="transition-colors hover:text-white">
              Log in
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
