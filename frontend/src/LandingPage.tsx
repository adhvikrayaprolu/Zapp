import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { submitWaitlistSignup } from "@/api/waitlist.api";
import "@/styles/landing.css";

const fallbackDemoVideoUrl =
  "https://drive.google.com/file/d/1qQUz1jCqbmXztDwHBCopLaOQPJzMhOva/view?usp=sharing";
const demoVideoUrl =
  (import.meta.env.VITE_DEMO_VIDEO_URL as string | undefined)?.trim() ?? fallbackDemoVideoUrl;

function toEmbedUrl(url: string): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : url;
    }

    if (parsed.hostname === "youtu.be") {
      const id = parsed.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : url;
    }

    if (parsed.hostname.includes("vimeo.com") && !parsed.hostname.includes("player.")) {
      const id = parsed.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : url;
    }

    if (parsed.hostname.includes("drive.google.com")) {
      const parts = parsed.pathname.split("/").filter(Boolean);
      const fileIndex = parts.indexOf("file");
      const driveId =
        fileIndex >= 0 && parts[fileIndex + 1] === "d" ? parts[fileIndex + 2] : null;

      return driveId ? `https://drive.google.com/file/d/${driveId}/preview` : url;
    }

    return url;
  } catch {
    return null;
  }
}

function useMotionSafe() {
  const reduced = useReducedMotion();
  return {
    reduced: Boolean(reduced),
    duration: reduced ? 0.01 : 0.45,
    spring: reduced
      ? { type: "tween" as const, duration: 0.01 }
      : { type: "spring" as const, stiffness: 320, damping: 30 },
  };
}

function PageBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div
        className="animate-zapp-aurora absolute -left-[20%] -top-[30%] h-[70vmin] w-[70vmin] rounded-full opacity-45 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, rgba(34,211,238,0.55), transparent 55%)",
        }}
      />
      <div
        className="animate-zapp-aurora-2 absolute -right-[15%] top-[10%] h-[60vmin] w-[60vmin] rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at 60% 40%, rgba(168,85,247,0.45), transparent 55%)",
        }}
      />
      <div
        className="animate-zapp-aurora absolute bottom-[-20%] left-[20%] h-[55vmin] w-[55vmin] rounded-full opacity-35 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(74,222,128,0.28), transparent 60%)",
        }}
      />

      <div
        className="animate-zapp-grid absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(148,163,184,0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(148,163,184,0.08) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, black, transparent)",
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.38] mix-blend-soft-light"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")",
          backgroundSize: "220px 220px",
        }}
      />
    </div>
  );
}

function WaitlistCard() {
  const { reduced } = useMotionSafe();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [status, setStatus] = React.useState<"idle" | "loading" | "success">("idle");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Name is required";
    if (!email.trim()) next.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = "Enter a valid email";

    setErrors(next);
    if (Object.keys(next).length) return;

    setStatus("loading");

    try {
      const response = await submitWaitlistSignup({
        name: name.trim(),
        email: email.trim(),
        source: "landing_page",
      });

      toast.success(response.created ? "You're on the waitlist." : "You're already on the waitlist.");
      setName("");
      setEmail("");
      setStatus("success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong. Please try again in a moment.";
      toast.error(message);
      setStatus("idle");
    }
  }

  return (
    <motion.article
      id="waitlist"
      initial={reduced ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="zapp-glass zapp-glow flex h-full flex-col rounded-[2rem] p-7 text-left md:p-8"
    >
      <div className="mb-6">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-300/90">
          Waitlist open
        </p>
        <h2 className="text-2xl font-black tracking-[-0.04em] text-[var(--z-fg)]">
          Get early access
        </h2>
        <p className="mt-3 max-w-lg text-base leading-7 text-[var(--z-fg-muted)]">
          Join the list to try Zapp first and see how we score purchases before you spend.
        </p>
        <p className="mt-3 text-sm font-semibold leading-6 text-emerald-300">
          The first 50 signups get Zapp Pro free.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-1 flex-col justify-between gap-4" noValidate>
        <div className="space-y-4">
          <div>
            <label htmlFor="wl-name" className="zapp-label">
              Name
            </label>
            <input
              id="wl-name"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="zapp-input"
              placeholder="Enter your name"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "err-name" : undefined}
            />
            {errors.name && (
              <p id="err-name" className="mt-1.5 text-xs text-rose-400">
                {errors.name}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="wl-email" className="zapp-label">
              Email
            </label>
            <input
              id="wl-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="zapp-input"
              placeholder="Enter your email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "err-email" : undefined}
            />
            {errors.email && (
              <p id="err-email" className="mt-1.5 text-xs text-rose-400">
                {errors.email}
              </p>
            )}
          </div>
        </div>

        <motion.button
          type="submit"
          disabled={status === "loading"}
          className="zapp-submit mt-2 inline-flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
          whileTap={status === "loading" || reduced ? undefined : { scale: 0.985 }}
        >
          {status === "loading" ? "Joining..." : "Join the waitlist"}
          <ArrowRight size={15} />
        </motion.button>
      </form>

      {status === "success" && (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 text-sm font-medium text-emerald-400/95"
        >
          Thanks — you&apos;re on the list. We&apos;ll be in touch soon.
        </motion.p>
      )}
    </motion.article>
  );
}

function DemoCard() {
  const { reduced } = useMotionSafe();
  const embedSrc = toEmbedUrl(demoVideoUrl);

  return (
    <motion.article
      id="demo"
      initial={reduced ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: reduced ? 0 : 0.06, ease: [0.22, 1, 0.36, 1] }}
      className="zapp-glass zapp-glow-subtle flex h-full flex-col rounded-[2rem] p-7 text-left md:p-8"
    >
      <div className="mb-5">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.28em] text-violet-300/90">
          Demo
        </p>
        <h2 className="text-2xl font-black tracking-[-0.04em] text-[var(--z-fg)]">
          See Zapp in action
        </h2>
      </div>

      <motion.div
        className="overflow-hidden rounded-[1.5rem] border border-[var(--z-border)] bg-black/30 shadow-inner"
        initial={false}
        whileHover={reduced ? undefined : { scale: 1.01 }}
        transition={{ duration: 0.35 }}
      >
        <div className="aspect-video w-full min-h-[360px]">
          <iframe
            title="Product demo video"
            src={embedSrc ?? toEmbedUrl(fallbackDemoVideoUrl) ?? undefined}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </motion.div>
    </motion.article>
  );
}

const features = [
  {
    title: "ASK BEFORE YOU BUY",
    body: "Get a value score before you spend.",
  },
  {
    title: "SNAP AND DECIDE",
    body: "Take a picture and let Zapp judge it.",
  },
  {
    title: "KEEP IT SIMPLE",
    body: "Lower score = lower value. Higher score = better value.",
  },
];

export default function LandingPage() {
  const { reduced, duration } = useMotionSafe();

  return (
    <div className="zapp-landing-shell relative min-h-dvh font-sans antialiased" data-theme="dark">
      <PageBackground />

      <main className="px-5 pb-16 pt-10 md:px-8 md:pb-24 md:pt-14">
        <section className="mx-auto max-w-6xl">
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-4xl text-center"
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--z-border)] bg-[var(--z-surface)] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--z-fg-muted)]">
              <Sparkles size={12} className="text-cyan-300" />
              Waitlist open
            </div>

            <h1 className="text-balance text-[2.4rem] font-black leading-[1.02] tracking-tight text-[var(--z-fg)] sm:text-6xl md:text-7xl">
              <span>Zapp - </span>
              <span className="text-gradient-electric">Your Personal CFO</span>
            </h1>
          </motion.div>

          <div className="mt-12 grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
            <WaitlistCard />
            <DemoCard />
          </div>

          <motion.div
            initial={reduced ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-14 max-w-3xl text-center"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[var(--z-fg-muted)]">
              Why this works
            </p>
            <h2 className="mt-3 text-balance text-3xl font-black tracking-tight text-[var(--z-fg)] md:text-4xl">
              Make better buying decisions,
              <br className="hidden md:block" /> before the charge hits.
            </h2>
          </motion.div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <motion.article
                key={feature.title}
                initial={reduced ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
                className="zapp-glass rounded-[1.7rem] p-7 text-left"
              >
                <p className="text-[12px] font-black uppercase tracking-[0.22em] text-cyan-100/80">
                  {feature.title}
                </p>
                <p className="mt-4 max-w-[18rem] text-lg font-medium leading-8 text-[var(--z-fg)]">
                  {feature.body}
                </p>
              </motion.article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--z-border)] px-5 py-10 text-center text-sm text-[var(--z-fg-muted)] md:px-8">
        <p className="text-[var(--z-fg)]">Zapp © 2026</p>
        <p className="mt-1">
          <span className="font-semibold text-[var(--z-fg)]">Contact:</span> siddhantshankar@zappai.com
        </p>
      </footer>
    </div>
  );
}
