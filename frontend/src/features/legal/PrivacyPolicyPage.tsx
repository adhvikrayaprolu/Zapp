import * as React from "react";
import { ArrowUpRight, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { usePrivacyPolicyMeta } from "@/config/privacy";
import { AppButton, SectionHeader, Surface } from "@/shared/components/system";
import { Separator } from "@/shared/components/ui/separator";

type PolicySection = {
  id: string;
  title: string;
  content: React.ReactNode;
};

const BACK_TO_TOP_ID = "privacy-policy-top";

/**
 * Public privacy policy. Wording is factual for an early-stage product; not legal advice.
 */
export function PrivacyPolicyPage() {
  const meta = usePrivacyPolicyMeta();

  const sections = React.useMemo<PolicySection[]>(
    () => [
      {
        id: "information-we-collect",
        title: "1. Information we collect",
        content: (
          <p>
            We collect information you provide (such as name, email, and account preferences), authentication data managed
            by our identity provider, and, if you choose to connect a bank, financial account and transaction information
            made available through Plaid, as authorized by you.
          </p>
        ),
      },
      {
        id: "how-we-use-information",
        title: "2. How we use information",
        content: (
          <p>
            We use information to operate the Zapp service, personalize insights, maintain security, communicate with you
            about your account, and comply with law. We do not sell your personal information for cross-context behavioral
            advertising.
          </p>
        ),
      },
      {
        id: "financial-data-and-plaid",
        title: "3. Financial data and Plaid",
        content: (
          <p>
            When you connect a financial institution, you interact with Plaid&apos;s connection flow. Plaid&apos;s collection
            and use of data is governed by Plaid&apos;s policies. We receive only the categories of data you authorize and that
            Plaid makes available to us. Linking a bank is optional.
          </p>
        ),
      },
      {
        id: "data-sharing",
        title: "4. Data sharing",
        content: (
          <p>
            We share data with service providers who help us run the product (for example, hosting, authentication, and
            analytics), and with Plaid when you connect accounts. We may disclose information if required by law or to
            protect rights and safety. We do not sell your personal information.
          </p>
        ),
      },
      {
        id: "data-retention",
        title: "5. Data retention",
        content: (
          <p>
            We retain information as long as your account is active and as needed to provide the service, meet legal
            obligations, and resolve disputes. Specific retention periods may be implemented on our systems; contact us for
            deletion requests as described below.
          </p>
        ),
      },
      {
        id: "data-security",
        title: "6. Data security",
        content: (
          <p>
            We use industry-standard safeguards appropriate to the nature of our service, including transport encryption
            for data in transit between your browser and our APIs when properly configured. No method of transmission or
            storage is 100% secure; we cannot guarantee absolute security.
          </p>
        ),
      },
      {
        id: "your-choices",
        title: "7. Your choices",
        content: (
          <p>
            You may update certain profile information in the app, disconnect linked banks, and request account deletion or
            privacy inquiries by emailing {meta.privacyEmail}. We will respond subject to applicable law and verification
            of your request.
          </p>
        ),
      },
      {
        id: "contact",
        title: "8. Contact",
        content: (
          <p>
            Questions: {meta.supportEmail}. Privacy-specific requests: {meta.privacyEmail}.
          </p>
        ),
      },
      {
        id: "changes",
        title: "9. Changes",
        content: (
          <p>
            We may update this policy; the version and effective date at the top will change when we do. Continued use of
            the service after changes may constitute acceptance where permitted by law.
          </p>
        ),
      },
    ],
    [meta.privacyEmail, meta.supportEmail]
  );

  return (
    <main
      id={BACK_TO_TOP_ID}
      className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 print:max-w-none print:px-0 print:py-0"
      aria-labelledby="privacy-policy-title"
      data-testid="privacy-policy-page"
    >
      <div className="flex justify-start print:hidden">
        <AppButton asChild variant="quiet" size="sm" className="pl-2">
          <Link to="/login">
            <ChevronLeft className="size-4" aria-hidden="true" />
            Back
          </Link>
        </AppButton>
      </div>

      <Surface
        variant="panel"
        padding="lg"
        className="privacy-policy-shell print:border-0 print:bg-transparent print:p-0 print:shadow-none"
      >
        <div className="grid gap-8 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:items-start">
          <nav
            aria-label="Privacy policy sections"
            className="privacy-policy-nav app-surface-inset rounded-[var(--app-radius-control)] p-5 lg:sticky lg:top-6 print:hidden"
          >
            <div className="space-y-3">
              <p className="app-label">On this page</p>
              <ol className="space-y-2">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a className="privacy-policy-anchor-link" href={`#${section.id}`}>
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </nav>

          <article className="min-w-0">
            <header className="space-y-6">
              <SectionHeader
                level={1}
                eyebrow="Legal"
                title={<span id="privacy-policy-title">Privacy Policy</span>}
                description="How Zapp collects, uses, shares, and protects information when you use the product."
                titleClassName="app-page-title"
              />

              <Surface variant="inset" padding="md" className="privacy-policy-meta grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <dl className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1">
                    <dt className="app-mini-label">Version</dt>
                    <dd className="text-sm font-semibold text-[var(--app-color-text-primary)]">{meta.version}</dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="app-mini-label">Effective date</dt>
                    <dd className="text-sm font-semibold text-[var(--app-color-text-primary)]">{meta.effectiveDate}</dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="app-mini-label">Privacy contact</dt>
                    <dd className="text-sm font-semibold text-[var(--app-color-text-primary)] break-words">{meta.privacyEmail}</dd>
                  </div>
                </dl>

                <a
                  href={`mailto:${meta.privacyEmail}`}
                  className="privacy-policy-contact-link"
                >
                  Contact privacy team
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </a>
              </Surface>
            </header>

            <div className="privacy-policy-document mt-8 space-y-6">
              {sections.map((section, index) => (
                <React.Fragment key={section.id}>
                  <section
                    id={section.id}
                    aria-labelledby={`${section.id}-heading`}
                    className="privacy-policy-section scroll-mt-24"
                  >
                    <div className="space-y-3">
                      <h2 id={`${section.id}-heading`} className="app-card-title text-base sm:text-lg">
                        {section.title}
                      </h2>
                      <div className="privacy-policy-copy">{section.content}</div>
                    </div>
                  </section>
                  {index < sections.length - 1 ? (
                    <Separator
                      className="privacy-policy-divider bg-[color:color-mix(in_srgb,var(--app-color-border-strong)_80%,transparent)]"
                    />
                  ) : null}
                </React.Fragment>
              ))}
            </div>

            <footer className="mt-8 flex flex-col gap-4 border-t border-[var(--app-color-border-subtle)] pt-6 print:hidden sm:flex-row sm:items-center sm:justify-between">
              <p className="app-helper max-w-2xl">
                If you have questions about this notice or need help with a privacy request, email {meta.privacyEmail}.
              </p>
              <a className="privacy-policy-anchor-link text-sm font-semibold" href={`#${BACK_TO_TOP_ID}`}>
                Back to top
              </a>
            </footer>
          </article>
        </div>
      </Surface>
    </main>
  );
}
