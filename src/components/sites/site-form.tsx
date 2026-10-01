"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Callout } from "@/components/shared/Callout";
import { Field } from "@/components/shared/Field";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { SimpleSelect, toOptions } from "@/components/shared/SimpleSelect";
import { SitemapSearch } from "@/components/shared/SitemapSearch";
import {
  aiPolicyLabels,
  categories,
  categoryLabels,
  marketCountries,
  durationLabels,
  durations,
  formatUsd,
  languages,
  niches,
  periodLabels,
  periods,
} from "@/lib/labels";
import { sellerPriceLimits } from "@/lib/market-rules";
import { cn } from "@/lib/utils";
import type {
  AiPolicy,
  Category,
  ExchangeTerms,
  LinkDuration,
  MarketType,
  SiteCategoryConfig,
  SlotPeriod,
  UserSite,
} from "@/lib/types";

/* ---------- form state (strings for number inputs) ---------- */

export interface CategoryFormState {
  enabled: boolean;
  price: string;
  duration: LinkDuration;
  dofollowFee: string;
  discountPct: string;
  notes: string;
  minWords: string;
  maxWords: string;
  aiPolicy: AiPolicy;
  pages: string[];
  reviewProcess: string;
  reviewProductRequirement: string;
}

export interface SlotFormState {
  id: string;
  page: string;
  maxLinks: string;
  period: SlotPeriod;
  note: string;
  lockedByOfferId?: string;
}

export interface SiteFormState {
  markets: MarketType[];
  cats: Record<Category, CategoryFormState>;
  drMin: string;
  drMax: string;
  trafficMin: string;
  trafficMax: string;
  multiLink: boolean;
  wantedPage: string;
  wantedAnchor: string;
  specifyPages: boolean;
  slots: SlotFormState[];
  generalCapacity: boolean;
  capacityMax: string;
  capacityPeriod: SlotPeriod;
  niches: string[];
  language: string;
  country: string;
}

export type SetSiteForm = (patch: Partial<SiteFormState> | ((f: SiteFormState) => Partial<SiteFormState>)) => void;

const emptyCategory = (): CategoryFormState => ({
  enabled: false,
  price: "",
  duration: "forever",
  dofollowFee: "",
  discountPct: "0",
  notes: "",
  minWords: "1000",
  maxWords: "2000",
  aiPolicy: "ai_assisted",
  pages: [],
  reviewProcess: "",
  reviewProductRequirement: "",
});

const str = (n: number | undefined | null) => (n === undefined || n === null ? "" : String(n));

export function emptySiteForm(): SiteFormState {
  return {
    markets: [],
    cats: Object.fromEntries(categories.map((c) => [c, emptyCategory()])) as Record<Category, CategoryFormState>,
    drMin: "20",
    drMax: "60",
    trafficMin: "100",
    trafficMax: "",
    multiLink: false,
    wantedPage: "",
    wantedAnchor: "",
    specifyPages: false,
    slots: [],
    generalCapacity: false,
    capacityMax: "3",
    capacityPeriod: "monthly",
    niches: [],
    language: "English",
    country: "Global",
  };
}

const categoryToForm = (c: SiteCategoryConfig): CategoryFormState => ({
  enabled: true,
  price: str(c.price),
  duration: c.duration,
  dofollowFee: str(c.dofollowFee),
  discountPct: str(c.discountPct),
  notes: c.notes,
  minWords: str(c.minWords ?? 1000),
  maxWords: str(c.maxWords ?? 2000),
  aiPolicy: c.aiPolicy ?? "ai_assisted",
  pages: c.pages ?? [],
  reviewProcess: c.reviewProcess ?? "",
  reviewProductRequirement: c.reviewProductRequirement ?? "",
});

export function siteToForm(site: UserSite): SiteFormState {
  const base = emptySiteForm();
  const t = site.exchangeTerms;
  return {
    ...base,
    markets: site.markets,
    cats: Object.fromEntries(
      categories.map((c) => {
        const cfg = site.categories.find((x) => x.category === c);
        return [c, cfg ? categoryToForm(cfg) : emptyCategory()];
      }),
    ) as Record<Category, CategoryFormState>,
    ...(t && {
      drMin: str(t.drMin),
      drMax: str(t.drMax),
      trafficMin: str(t.trafficMin),
      trafficMax: str(t.trafficMax),
      multiLink: t.multiLinkCompensation,
      wantedPage: t.wantedPage ?? "",
      wantedAnchor: t.wantedAnchor ?? "",
      specifyPages: t.specifyPages,
      slots: t.slots.map((s) => ({
        id: s.id,
        page: s.page,
        maxLinks: str(s.maxLinks),
        period: s.period,
        note: s.note ?? "",
        lockedByOfferId: s.lockedByOfferId,
      })),
      generalCapacity: t.generalCapacity !== null,
      capacityMax: str(t.generalCapacity?.maxLinks ?? 3),
      capacityPeriod: t.generalCapacity?.period ?? "monthly",
    }),
    niches: site.niches,
    language: site.language,
    country: site.country,
  };
}

/* ---------- validation ---------- */

export const usesExchangeTerms = (f: SiteFormState) => f.markets.includes("exchange") || f.markets.includes("abc");

/** Enabled categories → the payload the create/edit actions send to the server. */
export function formToCategories(f: SiteFormState): SiteCategoryConfig[] {
  return categories
    .filter((c) => f.cats[c].enabled)
    .map((c) => {
      const x = f.cats[c];
      const base: SiteCategoryConfig = {
        category: c,
        price: Number(x.price) || 0,
        duration: x.duration,
        dofollowFee: Number(x.dofollowFee) || 0,
        discountPct: Number(x.discountPct) || 0,
        notes: x.notes,
      };
      if (c === "guest_post") return { ...base, minWords: Number(x.minWords) || 0, maxWords: Number(x.maxWords) || 0, aiPolicy: x.aiPolicy };
      if (c === "link_insertion") return { ...base, pages: x.pages };
      if (c === "review") return { ...base, reviewProcess: x.reviewProcess, reviewProductRequirement: x.reviewProductRequirement };
      return base;
    });
}

/** Exchange/ABC terms → the payload the create/edit actions send to the server. `null` when neither market is picked. */
export function formToExchangeTerms(f: SiteFormState): ExchangeTerms | null {
  if (!usesExchangeTerms(f)) return null;
  return {
    drMin: Number(f.drMin) || 0,
    drMax: Number(f.drMax) || 0,
    trafficMin: Number(f.trafficMin) || 0,
    trafficMax: f.trafficMax === "" ? null : Number(f.trafficMax),
    multiLinkCompensation: f.multiLink,
    wantedPage: f.wantedPage.trim() || undefined,
    wantedAnchor: f.wantedAnchor.trim() || undefined,
    specifyPages: f.specifyPages,
    slots: f.slots.map((s) => ({
      id: s.id,
      page: s.page,
      maxLinks: Number(s.maxLinks) || 1,
      period: s.period,
      used: 0,
      note: s.note || undefined,
      lockedByOfferId: s.lockedByOfferId,
    })),
    generalCapacity: f.generalCapacity ? { maxLinks: Number(f.capacityMax) || 1, period: f.capacityPeriod } : null,
  };
}

/** Why a category's price can't be saved, or null. The same floor and ceiling apply to an offer total. */
export function priceProblem(x: { price: string; discountPct: string }): string | null {
  const { min, max } = sellerPriceLimits;
  const price = Number(x.price);
  if (x.price === "" || !Number.isFinite(price)) return "Enter a price.";
  if (price < min) return `The minimum price is ${formatUsd(min)}.`;
  if (price > max) return `The maximum price is ${formatUsd(max)}.`;
  const discount = Number(x.discountPct) || 0;
  const net = Math.round(price * (1 - discount / 100) * 100) / 100;
  if (net < min) return `After the ${discount}% discount the price is ${formatUsd(net)} — it can't go below ${formatUsd(min)}.`;
  return null;
}

export function validateSiteForm(f: SiteFormState) {
  const enabled = categories.filter((c) => f.cats[c].enabled);
  const categoriesOk =
    !f.markets.includes("paid") ||
    (enabled.length > 0 &&
      enabled.every((c) => {
        const x = f.cats[c];
        if (priceProblem(x)) return false;
        if (c === "guest_post" && Number(x.maxWords) < Number(x.minWords)) return false;
        return true;
      }));
  const nicheOk = f.niches.length > 0 && !!f.language && !!f.country;
  const exchangeOk =
    !usesExchangeTerms(f) ||
    ((!f.markets.includes("exchange") || !!f.wantedAnchor.trim()) &&
      Number(f.drMin) <= Number(f.drMax) &&
      (f.trafficMax === "" || Number(f.trafficMin) <= Number(f.trafficMax)) &&
      (!f.specifyPages || f.slots.length > 0 || f.generalCapacity));
  return { markets: f.markets.length > 0, categories: categoriesOk && nicheOk, exchange: exchangeOk };
}

/* ---------- sections ---------- */

export function MarketsSection({
  form,
  setForm,
  paidAllowed,
  paidBlockedReason,
  payoutConnected,
}: {
  form: SiteFormState;
  setForm: SetSiteForm;
  paidAllowed: boolean;
  paidBlockedReason?: string;
  payoutConnected: boolean;
}) {
  const toggle = (m: MarketType, on: boolean) =>
    setForm((f) => ({ markets: on ? [...f.markets, m] : f.markets.filter((x) => x !== m) }));
  return (
    <div className="flex flex-col gap-2">
      {!paidAllowed && paidBlockedReason && (
        <Callout variant="warning" title="Paid Market isn't available for this site">
          {paidBlockedReason}
        </Callout>
      )}
      <Tooltip disabled={paidAllowed}>
        <TooltipTrigger render={<div />}>
          <OptionRow
            checked={form.markets.includes("paid")}
            disabled={!paidAllowed}
            onChange={(on) => toggle("paid", on)}
            title="Open for sale on Paid Market"
            description="Buyers pay you per placement. All four categories are available."
          />
        </TooltipTrigger>
        <TooltipContent>Paid Market requires DR 20+.</TooltipContent>
      </Tooltip>
      {form.markets.includes("paid") && !payoutConnected && (
        <Callout variant="warning" className="-mt-1 ml-7 py-2 text-xs">
          Paid Market needs a payout account — add one in{" "}
          <Link href="/account" className="underline underline-offset-2">
            Account
          </Link>{" "}
          before saving.
        </Callout>
      )}
      <OptionRow
        checked={form.markets.includes("exchange")}
        onChange={(on) => toggle("exchange", on)}
        title="Open to the Exchange (1:1) pool"
        description="Link Insertion only."
      />
      <OptionRow
        checked={form.markets.includes("abc")}
        onChange={(on) => toggle("abc", on)}
        title="Open to the ABC (3+ party) pool"
        description="Link Insertion only. Your site gets its own pool automatically, and you can join others."
      />
    </div>
  );
}

const categoryScope: Record<Category, string> = {
  guest_post: "Paid only — Exchange/ABC don't use this category",
  link_insertion: "The one category valid on Paid, Exchange and ABC",
  review: "Paid only — Exchange/ABC don't use this category",
  footer_link: "Paid only — sitewide, not available on Exchange/ABC",
};

export function CategoriesSection({
  form,
  setForm,
  sitemapPages,
}: {
  form: SiteFormState;
  setForm: SetSiteForm;
  sitemapPages: string[];
}) {
  const update = (c: Category, patch: Partial<CategoryFormState>) =>
    setForm((f) => ({ cats: { ...f.cats, [c]: { ...f.cats[c], ...patch } } }));

  return (
    <div className="flex flex-col gap-3">
      {categories.map((c) => {
        const x = form.cats[c];
        return (
          <div key={c} className={cn("rounded-xl border", x.enabled && "bg-muted/30")}>
            <label className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
              <Checkbox checked={x.enabled} onCheckedChange={(v) => update(c, { enabled: v })} />
              <span className="font-medium">{categoryLabels[c]}</span>
              <span className="text-xs text-muted-foreground sm:ml-auto">{categoryScope[c]}</span>
            </label>
            {x.enabled && (
              <div className="flex flex-col gap-4 border-t px-4 py-4">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Field label="Price (USD)" hint={priceProblem(x) ? undefined : `${formatUsd(sellerPriceLimits.min)}–${formatUsd(sellerPriceLimits.max)}`}>
                    <Input
                      type="number"
                      min={sellerPriceLimits.min}
                      max={sellerPriceLimits.max}
                      value={x.price}
                      aria-invalid={!!priceProblem(x) && x.price !== ""}
                      onChange={(e) => update(c, { price: e.target.value })}
                      placeholder="120"
                    />
                    {x.price !== "" && priceProblem(x) && (
                      <p role="alert" className="text-xs text-destructive">
                        {priceProblem(x)}
                      </p>
                    )}
                  </Field>
                  <Field label="Duration">
                    <SimpleSelect
                      value={x.duration}
                      onChange={(v) => update(c, { duration: v as LinkDuration })}
                      options={toOptions(durations, durationLabels)}
                    />
                  </Field>
                  <Field label="+ Dofollow fee (USD)">
                    <Input type="number" min={0} value={x.dofollowFee} onChange={(e) => update(c, { dofollowFee: e.target.value })} placeholder="25" />
                  </Field>
                  <Field label="Discount %">
                    <Input type="number" min={0} max={90} value={x.discountPct} onChange={(e) => update(c, { discountPct: e.target.value })} />
                  </Field>
                </div>

                {c === "guest_post" && (
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Content length (words)" hint="min – max">
                      <div className="flex items-center gap-2">
                        <Input type="number" min={300} value={x.minWords} onChange={(e) => update(c, { minWords: e.target.value })} aria-label="Minimum words" />
                        <span className="text-muted-foreground">–</span>
                        <Input type="number" min={300} value={x.maxWords} onChange={(e) => update(c, { maxWords: e.target.value })} aria-label="Maximum words" />
                      </div>
                    </Field>
                    <Field label="AI content policy">
                      <SimpleSelect
                        value={x.aiPolicy}
                        onChange={(v) => update(c, { aiPolicy: v as AiPolicy })}
                        options={toOptions(Object.keys(aiPolicyLabels), aiPolicyLabels)}
                      />
                    </Field>
                  </div>
                )}

                {c === "link_insertion" && (
                  sitemapPages.length === 0 ? (
                    <p className="rounded-xl bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
                      No sitemap was found, so there is no list of pages to pick from — buyers type the page of yours they want their link on. Add a sitemap later and re-open this page to restrict it to chosen pages.
                    </p>
                  ) : (
                    <Field label="Link Insertion selected — search and pick your pages" hint={`${x.pages.length} selected`}>
                      <SitemapSearch
                        pages={sitemapPages}
                        selected={x.pages}
                        onToggle={(p) => update(c, { pages: x.pages.includes(p) ? x.pages.filter((y) => y !== p) : [...x.pages, p] })}
                      />
                    </Field>
                  )
                )}

                {c === "review" && (
                  <div className="grid gap-3">
                    <Field label="Review process & turnaround" hint="Shown read-only to buyers in their brief.">
                      <Textarea
                        value={x.reviewProcess}
                        onChange={(e) => update(c, { reviewProcess: e.target.value })}
                        placeholder="e.g. Reviewed within 72 hours, I test the product"
                      />
                    </Field>
                    <Field label="Product/service requirement">
                      <Input
                        value={x.reviewProductRequirement}
                        onChange={(e) => update(c, { reviewProductRequirement: e.target.value })}
                        placeholder="e.g. Free account or 14-day trial access required"
                      />
                    </Field>
                  </div>
                )}

                <Field label="Category notes / conditions (optional)">
                  <Textarea
                    value={x.notes}
                    onChange={(e) => update(c, { notes: e.target.value })}
                    placeholder='e.g. "No gambling/adult content"'
                    rows={3}
                  />
                </Field>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function NicheSection({ form, setForm }: { form: SiteFormState; setForm: SetSiteForm }) {
  const toggle = (n: string) =>
    setForm((f) => ({ niches: f.niches.includes(n) ? f.niches.filter((x) => x !== n) : [...f.niches, n] }));
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_320px]">
      <Field label="Niche / relevancy (select all that apply)">
        <div className="flex flex-wrap gap-2">
          {niches.map((n) => {
            const on = form.niches.includes(n);
            return (
              <button
                key={n}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(n)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  on ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {n}
              </button>
            );
          })}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Language">
          <SearchableSelect value={form.language} onChange={(v) => setForm({ language: v })} options={toOptions(languages)} placeholder="Search languages…" />
        </Field>
        <Field label="Country / market">
          <SearchableSelect value={form.country} onChange={(v) => setForm({ country: v })} options={toOptions(marketCountries)} placeholder="Search countries…" />
        </Field>
      </div>
    </div>
  );
}

export function ExchangeTermsSection({
  form,
  setForm,
  sitemapPages,
  sitemapPageCount,
}: {
  form: SiteFormState;
  setForm: SetSiteForm;
  sitemapPages: string[];
  sitemapPageCount: number;
}) {
  const togglePage = (page: string) =>
    setForm((f) => {
      const existing = f.slots.find((s) => s.page === page);
      if (existing?.lockedByOfferId) return {};
      return {
        slots: existing
          ? f.slots.filter((s) => s.page !== page)
          : [...f.slots, { id: `new-${page}`, page, maxLinks: "1", period: "monthly", note: "" }],
      };
    });
  const updateSlot = (id: string, patch: Partial<SlotFormState>) =>
    setForm((f) => ({ slots: f.slots.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Accepted DR range">
          <div className="flex items-center gap-2">
            <Input type="number" min={0} value={form.drMin} onChange={(e) => setForm({ drMin: e.target.value })} aria-label="Minimum DR" />
            <span className="text-muted-foreground">–</span>
            <Input type="number" min={0} value={form.drMax} onChange={(e) => setForm({ drMax: e.target.value })} aria-label="Maximum DR" />
          </div>
        </Field>
        <Field label="Accepted traffic range (monthly)">
          <div className="flex items-center gap-2">
            <Input type="number" min={0} value={form.trafficMin} onChange={(e) => setForm({ trafficMin: e.target.value })} aria-label="Minimum traffic" />
            <span className="text-muted-foreground">–</span>
            <Input
              type="number"
              min={0}
              value={form.trafficMax}
              placeholder="No limit"
              onChange={(e) => setForm({ trafficMax: e.target.value })}
              aria-label="Maximum traffic"
            />
          </div>
        </Field>
      </div>

      <ToggleRow
        checked={form.multiLink}
        onChange={(v) => setForm({ multiLink: v })}
        title="Open to multi-link compensation"
        description="Would you accept a partner outside your DR range if they give you enough links?"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Link you want to receive — page" hint="Optional. Partners see it when they propose a swap.">
          <Input value={form.wantedPage} onChange={(e) => setForm({ wantedPage: e.target.value })} placeholder="https://yoursite.com/…" />
        </Field>
        <Field label={form.markets.includes("exchange") ? "Link you want to receive — anchor *" : "Link you want to receive — anchor"} hint={form.markets.includes("exchange") ? "Required for Exchange. The anchor text partners must use." : "Optional. The anchor text partners should use."}>
          <Input value={form.wantedAnchor} onChange={(e) => setForm({ wantedAnchor: e.target.value })} placeholder="e.g. best link building tools" maxLength={100} />
        </Field>
      </div>

      <div className="rounded-xl border">
        <ToggleRow
          checked={form.specifyPages}
          onChange={(v) => setForm({ specifyPages: v })}
          title="Specify pages"
          description='Off means "I can link from any page" — your whole sitemap is open. Turn on to restrict.'
          className="border-0"
        />
        {!form.specifyPages && (
          <p className="border-t px-4 py-3 text-xs text-muted-foreground">
            {sitemapPageCount > 0 ? `Your entire sitemap (${sitemapPageCount} pages) is open to this market.` : "Your whole site is open to this market — no sitemap was found, so partners type the page they want."}
          </p>
        )}
        {form.specifyPages && (
          <div className="flex flex-col gap-4 border-t px-4 py-4">
            <p className="text-xs text-muted-foreground">
              Use exact slots, general capacity, or both together.
            </p>
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-medium">Exact slots</span>
              {sitemapPages.length > 0 ? (
                <SitemapSearch
                  pages={sitemapPages}
                  selected={form.slots.map((s) => s.page)}
                  onToggle={togglePage}
                  placeholder="Search your sitemap to add a slot…"
                />
              ) : (
                <ManualSlot onAdd={(page) => !form.slots.some((x) => x.page === page) && togglePage(page)} />
              )}
              {form.slots.length === 0 && <p className="text-xs text-muted-foreground">No exact slots yet.</p>}
            </div>
            {form.slots.length > 0 && (
              <div className="flex flex-col gap-2">
                <ul className="flex flex-col gap-2">
                  {form.slots.map((s) => {
                    const locked = !!s.lockedByOfferId;
                    return (
                      <li key={s.id} className={cn("flex flex-col gap-2 rounded-lg border px-3 py-2", locked && "bg-muted/40")}>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate font-mono text-xs">
                            {locked && <Lock className="size-3 shrink-0" />}
                            {s.page}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">max</span>
                            <Input
                              type="number"
                              min={1}
                              className="w-16"
                              value={s.maxLinks}
                              disabled={locked}
                              onChange={(e) => updateSlot(s.id, { maxLinks: e.target.value })}
                            />
                            <span className="text-xs text-muted-foreground">links /</span>
                            <SimpleSelect
                              className="w-28"
                              value={s.period}
                              disabled={locked}
                              onChange={(v) => updateSlot(s.id, { period: v as SlotPeriod })}
                              options={toOptions(periods, periodLabels)}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Remove slot"
                              disabled={locked}
                              onClick={() => togglePage(s.page)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                        <Input
                          value={s.note}
                          disabled={locked}
                          onChange={(e) => updateSlot(s.id, { note: e.target.value })}
                          placeholder='Page note (optional), e.g. "only in the SEO tools section"'
                          className="h-7 text-xs"
                        />
                        {locked && (
                          <span className="text-[11px] text-muted-foreground">
                            Locked — used by active offer {s.lockedByOfferId} until it finishes.
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="flex flex-col gap-3 rounded-lg border border-dashed px-3 py-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={form.generalCapacity} onCheckedChange={(v) => setForm({ generalCapacity: v })} />
                <Plus className="size-3.5" /> Add general capacity for other pages
              </label>
              <p className="-mt-2 pl-6 text-xs text-muted-foreground">
                No URL needed — any other page in your sitemap, up to this limit.
              </p>
              {form.generalCapacity && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">max dofollow links</span>
                  <Input
                    type="number"
                    min={1}
                    className="w-16"
                    value={form.capacityMax}
                    onChange={(e) => setForm({ capacityMax: e.target.value })}
                  />
                  <span className="text-xs text-muted-foreground">per</span>
                  <SimpleSelect
                    className="w-28"
                    value={form.capacityPeriod}
                    onChange={(v) => setForm({ capacityPeriod: v as SlotPeriod })}
                    options={toOptions(periods, periodLabels)}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Note: whoever makes an offer must always pick one specific page at offer time — a blank or &ldquo;any page&rdquo; offer isn&apos;t possible.
      </p>
    </div>
  );
}

/* ---------- small pieces ---------- */

function OptionRow({
  checked,
  disabled,
  onChange,
  title,
  description,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (on: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <label
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-muted/40",
        checked && "bg-muted/40",
      )}
    >
      <Checkbox checked={checked} disabled={disabled} onCheckedChange={onChange} className="mt-0.5" />
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

function ToggleRow({
  checked,
  onChange,
  title,
  description,
  className,
}: {
  checked: boolean;
  onChange: (on: boolean) => void;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <label className={cn("flex cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3", className)}>
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

/** Without a sitemap there's no list to pick from: type the page's address instead. */
function ManualSlot({ onAdd }: { onAdd: (page: string) => void }) {
  const [value, setValue] = useState("");
  const ok = /^https?:\/\/\S+$/.test(value.trim());
  return (
    <div className="flex gap-2">
      <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="https://yoursite.com/a-page — no sitemap found, so type the page" />
      <Button
        type="button"
        variant="outline"
        className="rounded-full"
        disabled={!ok}
        onClick={() => {
          onAdd(value.trim());
          setValue("");
        }}
      >
        <Plus className="size-4" /> Add
      </Button>
    </div>
  );
}
