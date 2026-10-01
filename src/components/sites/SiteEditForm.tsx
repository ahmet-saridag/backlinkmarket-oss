"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Callout } from "@/components/shared/Callout";
import { updateSite } from "@/app/(app)/sites/[domain]/actions";
import {
  CategoriesSection,
  ExchangeTermsSection,
  MarketsSection,
  NicheSection,
  formToCategories,
  formToExchangeTerms,
  siteToForm,
  usesExchangeTerms,
  validateSiteForm,
  type SetSiteForm,
  type SiteFormState,
} from "@/components/sites/site-form";
import { formatNumber } from "@/lib/labels";
import { useUser } from "@/components/account/user-context";
import { toast } from "@/lib/toast";
import { trafficRangeLabelFor } from "@/lib/traffic-ranges";
import { cn } from "@/lib/utils";
import type { UserSite } from "@/lib/types";

export function SiteEditForm({ site, sitemapPages }: { site: UserSite; sitemapPages: string[] }) {
  const user = useUser();
  const router = useRouter();
  const [form, setFormState] = useState<SiteFormState>(() => siteToForm(site));
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const setForm: SetSiteForm = (patch) => {
    setError("");
    setFormState((f) => ({ ...f, ...(typeof patch === "function" ? patch(f) : patch) }));
  };

  const save = () => {
    setError("");
    startTransition(async () => {
      const result = await updateSite(site.id, {
        markets: form.markets,
        niches: form.niches,
        language: form.language,
        country: form.country,
        categories: formToCategories(form),
        exchangeTerms: formToExchangeTerms(form),
      });
      if (result.ok) {
        toast.success("Changes saved");
        router.push(`/sites/${site.domain}`);
      } else {
        const message = result.error ?? Object.values(result.fieldErrors ?? {})[0] ?? "Couldn't save changes.";
        setError(message);
        toast.error(message);
      }
    });
  };

  const v = validateSiteForm(form);
  const valid = v.markets && v.categories && v.exchange && (!form.markets.includes("paid") || user.payoutConnected);
  const paidAllowed = site.dr >= 20 && site.traffic > 0;

  return (
    <div className="flex flex-col gap-6">
      <Callout title="Existing offers keep their terms">
        Every offer carries a snapshot of its terms (price, duration, DR range) from the moment it was sent. Changes here only
        apply to new offers.
      </Callout>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Markets</CardTitle>
          <CardDescription>Turning a market off delists the site there; running deals aren&apos;t affected.</CardDescription>
        </CardHeader>
        <CardContent>
          <MarketsSection
            form={form}
            setForm={setForm}
            paidAllowed={paidAllowed}
            paidBlockedReason={`Paid Market needs a Domain Rating of 20 or higher and a traffic range — this site is at DR ${site.dr} with ${trafficRangeLabelFor(site.traffic) ?? formatNumber(site.traffic)} traffic. DR is re-read every day, so it opens up once the site qualifies.`}
            payoutConnected={user.payoutConnected}
          />
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Categories & niche</CardTitle>
          <CardDescription>Closing a category doesn&apos;t break an existing deal.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <NicheSection form={form} setForm={setForm} />
          {form.markets.includes("paid") && <CategoriesSection form={form} setForm={setForm} sitemapPages={sitemapPages} />}
        </CardContent>
      </Card>

      {usesExchangeTerms(form) && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Exchange & ABC terms</CardTitle>
            <CardDescription>New slots can always be added. Slots used by an active offer stay locked until it finishes.</CardDescription>
          </CardHeader>
          <CardContent>
            <ExchangeTermsSection
              form={form}
              setForm={setForm}
              sitemapPages={sitemapPages}
              sitemapPageCount={site.sitemapPageCount}
            />
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        {error && (
          <span role="alert" className="text-sm text-destructive">
            {error}
          </span>
        )}
        <Link href={`/sites/${site.domain}`} className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}>
          Cancel
        </Link>
        <Button className="rounded-full" disabled={!valid || pending} onClick={save}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
