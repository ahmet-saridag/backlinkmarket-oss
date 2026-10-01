"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Check, CircleCheck, Copy, Loader2, ShieldAlert } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Callout } from "@/components/shared/Callout";
import { Field, ReadOnlyValue } from "@/components/shared/Field";
import { SimpleSelect } from "@/components/shared/SimpleSelect";
import { Stepper } from "@/components/shared/Stepper";
import {
  checkDomain,
  checkSitemapForDomain,
  createSite,
  getVerificationToken,
  verifyOwnership,
} from "@/app/(app)/sites/new/actions";
import {
  CategoriesSection,
  ExchangeTermsSection,
  MarketsSection,
  NicheSection,
  emptySiteForm,
  formToCategories,
  formToExchangeTerms,
  usesExchangeTerms,
  validateSiteForm,
  type SetSiteForm,
  type SiteFormState,
} from "@/components/sites/site-form";
import { normalizeDomain, VERIFICATION_FILE_PATH } from "@/lib/domain";
import { toast } from "@/lib/toast";
import { PayoutFields, emptyPayoutDraft, type PayoutDraft } from "@/components/account/PayoutFields";
import { fieldErrors, payoutSchema } from "@/lib/validation/account";
import { trafficRanges, type TrafficRangeValue } from "@/lib/traffic-ranges";
import { cn } from "@/lib/utils";
import type { SiteMetrics } from "@/lib/types";
import { SiteFavicon } from "@/components/shared/SiteFavicon";

type StepId = "url" | "verify" | "sitemap" | "listing" | "exchange";

const stepLabels: Record<StepId, string> = {
  url: "Site URL",
  verify: "Verify & metrics",
  sitemap: "Sitemap",
  listing: "Markets & categories",
  exchange: "Exchange/ABC terms",
};

/** `payoutConnected`: the account already has a payout account, so Paid Market needs nothing more. */
export function AddSiteWizard({ payoutConnected }: { payoutConnected: boolean }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [pending, startTransition] = useTransition();

  // steps 1–3
  const [url, setUrl] = useState("");
  const [spam, setSpam] = useState<{ passed: boolean; reason?: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [verified, setVerified] = useState(false);
  const [metrics, setMetrics] = useState<SiteMetrics | null>(null);
  const [metricsFromApi, setMetricsFromApi] = useState(true);
  const [drNote, setDrNote] = useState<string | null>(null);
  const [trafficRange, setTrafficRange] = useState<TrafficRangeValue | "">("");
  const [txtToken, setTxtToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasSitemap, setHasSitemap] = useState<boolean | null>(null);
  const [sitemapPages, setSitemapPages] = useState<string[]>([]);

  // steps 4+
  const [payoutDraft, setPayoutDraft] = useState<PayoutDraft>(emptyPayoutDraft);
  const [payoutAttempted, setPayoutAttempted] = useState(false);
  const [form, setFormState] = useState<SiteFormState>(emptySiteForm);
  const setForm: SetSiteForm = (patch) =>
    setFormState((f) => ({ ...f, ...(typeof patch === "function" ? patch(f) : patch) }));

  const domain = normalizeDomain(url);
  // Traffic is self-reported now, so it can't gate eligibility — only DR (from Ahrefs) does.
  const paidAllowed = metrics !== null && metrics.dr >= 20;

  const steps = useMemo<StepId[]>(() => {
    const s: StepId[] = ["url", "verify", "sitemap", "listing"];
    if (usesExchangeTerms(form)) s.push("exchange");
    return s;
  }, [form]);
  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  const sections = validateSiteForm(form);
  // Selling on Paid Market means buyers pay you directly: an account with no payout details yet must add them here.
  const needsPayout = form.markets.includes("paid") && !payoutConnected;
  const payoutParsed = payoutSchema.safeParse(payoutDraft);
  const payoutErrors = payoutAttempted && !payoutParsed.success ? fieldErrors(payoutParsed.error) : {};
  const stepValid: Record<StepId, boolean> = {
    url: spam?.passed === true,
    verify: verified && metrics !== null && trafficRange !== "",
    // A sitemap is nice to have (it lets buyers pick exact pages) but never a reason to stop someone adding their site
    sitemap: true,
    listing: sections.markets && sections.categories && (!needsPayout || payoutParsed.success),
    exchange: sections.exchange,
  };
  const canSubmit = steps.every((s) => stepValid[s]);

  const resetChecks = () => {
    setSpam(null);
    setVerified(false);
    setMetrics(null);
    setTxtToken(null);
    setCopied(false);
    setHasSitemap(null);
    setSitemapPages([]);
  };

  const runSpamCheck = () => {
    setChecking(true);
    checkDomain(url)
      .then(async (result) => {
        setSpam(result.passed ? { passed: true } : { passed: false, reason: result.reason });
        if (result.passed) {
          setMetrics({ dr: result.metrics.dr, spamScore: result.metrics.spamScore, traffic: 0 });
          setMetricsFromApi(result.metricsFromApi);
          setDrNote(result.drNote);
          const token = await getVerificationToken(result.domain);
          setTxtToken(token);
          setStepIndex((i) => (i === 0 ? i + 1 : i));
        }
      })
      .finally(() => setChecking(false));
  };

  const verifyDomain = () => {
    setChecking(true);
    verifyOwnership(domain)
      .then(async ({ verified: ok }) => {
        setVerified(ok);
        if (!ok) return;
        const sitemap = await checkSitemapForDomain(domain);
        setHasSitemap(sitemap.found);
        setSitemapPages(sitemap.pages);
      })
      .finally(() => setChecking(false));
  };

  const copyToken = () => {
    if (!txtToken) return;
    navigator.clipboard?.writeText(txtToken).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const recheckSitemap = () => {
    setChecking(true);
    checkSitemapForDomain(domain)
      .then((sitemap) => {
        setHasSitemap(sitemap.found);
        setSitemapPages(sitemap.pages);
      })
      .finally(() => setChecking(false));
  };

  const submit = () => {
    if (!trafficRange) return;
    setSubmitError("");
    startTransition(async () => {
      const result = await createSite({
        domain,
        trafficRange,
        markets: form.markets,
        niches: form.niches,
        language: form.language,
        country: form.country,
        categories: formToCategories(form),
        exchangeTerms: formToExchangeTerms(form),
        payout: needsPayout && payoutParsed.success ? payoutParsed.data : undefined,
      });
      if (result.ok) {
        toast.success(`${domain} added`);
        setSubmitted(true);
      } else {
        const message = result.error ?? Object.values(result.fieldErrors ?? {})[0] ?? "Couldn't add this site.";
        setSubmitError(message);
        toast.error(message);
      }
    });
  };

  if (submitted) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <CircleCheck className="size-10 text-score-hot" />
          <h2 className="flex items-center gap-2 text-xl font-medium">
            <SiteFavicon domain={domain} size={20} />
            {domain} was added
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            It will appear in{" "}
            {form.markets.map((m) => ({ paid: "Paid Market", exchange: "Exchange", abc: "ABC" })[m]).join(", ")} once our crawler
            finishes the first scan (usually under 10 minutes).
          </p>
          <Link href="/sites" className={cn(buttonVariants(), "mt-2 rounded-full")}>
            Back to My Sites
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Stepper steps={steps.map((s) => stepLabels[s])} current={stepIndex} />

      <Card className="rounded-2xl">
        {step === "url" && (
          <>
            <CardHeader>
              <CardTitle>Site URL</CardTitle>
              <CardDescription>Enter the site you want to list. We check it resolves and pull its Ahrefs Domain Rating.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Field
                label="Site URL"
                htmlFor="site-url"
                hint="We check the domain resolves and pull its Domain Rating from Ahrefs before anything else."
              >
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    {/* Site's favicon once the input looks like a domain */}
                    {/\.[a-z]{2,}$/i.test(domain) && (
                      <SiteFavicon domain={domain} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2" />
                    )}
                    <Input
                      id="site-url"
                      value={url}
                      placeholder="https://yoursite.com"
                      className={cn(/\.[a-z]{2,}$/i.test(domain) && "pl-8")}
                      onChange={(e) => {
                        setUrl(e.target.value);
                        resetChecks();
                      }}
                    />
                  </div>
                  <Button onClick={runSpamCheck} disabled={!domain.includes(".") || checking} className="rounded-full">
                    {checking && <Loader2 className="size-4 animate-spin" />}
                    Check domain
                  </Button>
                </div>
              </Field>
              {spam?.passed && <Callout title="Domain check passed">{domain} resolves and its rating was read.</Callout>}
              {spam && !spam.passed && (
                <Callout variant="danger" title="Domain check failed">
                  {spam.reason} This site can&apos;t be listed.
                </Callout>
              )}
            </CardContent>
          </>
        )}

        {step === "verify" && (
          <>
            <CardHeader>
              <CardTitle>Verify domain</CardTitle>
              <CardDescription>
                Upload a text file to your site so we can confirm you control it — no DNS access needed.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_2fr]">
                <Field label="File path">
                  <ReadOnlyValue className="overflow-x-auto font-mono text-xs whitespace-nowrap">{VERIFICATION_FILE_PATH}</ReadOnlyValue>
                </Field>
                <Field label="File contents (exact)">
                  <div className="flex gap-2">
                    <ReadOnlyValue className="flex-1 font-mono text-xs">{txtToken ?? "Loading…"}</ReadOnlyValue>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label={copied ? "Copied" : "Copy contents"}
                      disabled={!txtToken}
                      onClick={copyToken}
                    >
                      {copied ? <Check className="size-3.5 text-green-600 dark:text-green-400" /> : <Copy className="size-3.5" />}
                    </Button>
                    {copied && <span className="self-center text-xs text-green-700 dark:text-green-400">Copied</span>}
                  </div>
                </Field>
              </div>
              {domain && (
                <p className="text-xs text-muted-foreground">
                  Publish it at{" "}
                  <span className="font-mono">
                    https://{domain}
                    {VERIFICATION_FILE_PATH}
                  </span>{" "}
                  — the file must contain only the token above, nothing else.
                </p>
              )}
              <div className="flex items-center gap-3">
                <Button onClick={verifyDomain} disabled={verified || checking || !txtToken} className="rounded-full">
                  {checking && <Loader2 className="size-4 animate-spin" />}
                  {verified ? "Verified" : "Verify now"}
                </Button>
                {verified && (
                  <span className="flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400">
                    <CircleCheck className="size-4" /> File found
                  </span>
                )}
                {verified === false && checking === false && txtToken && (
                  <span className="text-xs text-muted-foreground">File not found or contents didn&apos;t match — check the path and try again.</span>
                )}
              </div>
              {metrics && (
                <div className="flex flex-col gap-2">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="DR">
                      <ReadOnlyValue>{metrics.dr}</ReadOnlyValue>
                    </Field>
                    <Field label="Monthly traffic" hint="Self-reported — no reliable free traffic API exists for third-party sites. Required.">
                      <SimpleSelect
                        value={trafficRange || null}
                        onChange={(v) => setTrafficRange(v as TrafficRangeValue)}
                        options={[...trafficRanges]}
                        placeholder="Pick a range…"
                      />
                    </Field>
                  </div>
                  {metricsFromApi ? (
                    <p className="text-xs text-muted-foreground">
                      <a href="https://ahrefs.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
                        Domain Rating by Ahrefs
                      </a>{" "}
                      · refreshed daily.
                    </p>
                  ) : (
                    <Callout variant="warning" title={drNote ? "This site has no Domain Rating of its own" : "Ahrefs unavailable"}>
                      {drNote
                        ? `${drNote} You can still list it in Exchange and ABC pools; Paid Market needs a Domain Rating of 20 or higher, so it stays closed for this address.`
                        : "DR was set to 0 automatically. You can continue — Paid Market stays disabled until a later refresh returns a real value."}
                    </Callout>
                  )}
                </div>
              )}
            </CardContent>
          </>
        )}

        {step === "sitemap" && (
          <>
            <CardHeader>
              <CardTitle>Sitemap check</CardTitle>
              <CardDescription>A sitemap is optional — it lets buyers and exchange partners pick exact pages from a list.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {hasSitemap ? (
                <Callout title={`Sitemap found — https://${domain}/sitemap.xml`}>{sitemapPages.length} pages indexed.</Callout>
              ) : (
                <>
                  <Callout title="No sitemap found — you can still add your site">
                    We couldn&apos;t find https://{domain}/sitemap.xml or https://{domain}/sitemap_index.xml. That&apos;s fine: without one, buyers and
                    exchange partners type the page they want instead of picking it from a list. If you add a sitemap later you can re-check it here.
                  </Callout>
                  <Button variant="outline" className="w-fit rounded-full" onClick={recheckSitemap} disabled={checking}>
                    {checking && <Loader2 className="size-4 animate-spin" />}
                    Re-check sitemap
                  </Button>
                </>
              )}
            </CardContent>
          </>
        )}

        {step === "listing" && (
          <>
            <CardHeader>
              <CardTitle>Markets & categories</CardTitle>
              <CardDescription>Choose where this site is listed, then set the terms for each. Select at least one market.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <MarketsSection
                form={form}
                setForm={setForm}
                paidAllowed={paidAllowed}
                paidBlockedReason={`Paid Market needs a Domain Rating of 20 or higher, and this site is at ${metrics?.dr ?? "–"}. You can still list it in Exchange and ABC pools — DR is re-read every day, so Paid Market opens up once the site reaches 20.`}
                payoutConnected
              />
              {needsPayout && (
                <div className="flex flex-col gap-3 rounded-xl border px-4 py-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">Payout account</span>
                    <span className="text-xs text-muted-foreground">
                      Buyers pay you directly, so Paid Market needs one — wire, PayPal, USDT or bank transfer. It&apos;s saved to your
                      account and you can change it later in Account.
                    </span>
                  </div>
                  <PayoutFields
                    draft={payoutDraft}
                    onChange={(next) => {
                      setPayoutAttempted(true);
                      setPayoutDraft(next);
                    }}
                    errors={payoutErrors}
                    idPrefix="add-site-payout"
                  />
                </div>
              )}
              {form.markets.length > 0 && (
                <div className="flex flex-col gap-6 border-t pt-6">
                  <NicheSection form={form} setForm={setForm} />
                  {form.markets.includes("paid") && <CategoriesSection form={form} setForm={setForm} sitemapPages={sitemapPages} />}
                </div>
              )}
            </CardContent>
          </>
        )}

        {step === "exchange" && (
          <>
            <CardHeader>
              <CardTitle>Exchange & ABC terms</CardTitle>
              <CardDescription>These markets only work through Link Insertion.</CardDescription>
            </CardHeader>
            <CardContent>
              <ExchangeTermsSection form={form} setForm={setForm} sitemapPages={sitemapPages} sitemapPageCount={sitemapPages.length} />
            </CardContent>
          </>
        )}
      </Card>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          By continuing you agree to the{" "}
          <a href="/seller-rules" target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-foreground">
            Seller Rules
          </a>
          .
        </p>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-full" disabled={stepIndex === 0} onClick={() => setStepIndex((i) => i - 1)}>
            Back
          </Button>
          {isLast ? (
            <Button className="rounded-full" disabled={!canSubmit || pending} onClick={submit}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Add Site
            </Button>
          ) : (
            <Button className="rounded-full" disabled={!stepValid[step]} onClick={() => setStepIndex((i) => i + 1)}>
              Continue
            </Button>
          )}
        </div>
      </div>
      {submitError && (
        <p role="alert" className="flex items-center gap-1.5 text-xs text-destructive">
          <ShieldAlert className="size-3.5" /> {submitError}
        </p>
      )}
    </div>
  );
}
