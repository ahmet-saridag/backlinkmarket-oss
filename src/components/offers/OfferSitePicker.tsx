"use client";

import { displayTraffic } from "@/lib/traffic-ranges";
import { useMemo, useState } from "react";
import Link from "next/link";
import { CircleCheck, CircleX, Search, TriangleAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Callout } from "@/components/shared/Callout";
import { allPassed } from "@/components/shared/ConditionList";
import { EmptyState } from "@/components/shared/EmptyState";
import { SiteLabel } from "@/components/shared/SiteFavicon";
import { compact, drHeat, heatText, trafficHeat } from "@/lib/heat";
import { cn } from "@/lib/utils";
import type { ConditionCheck, MarketSite, UserSite } from "@/lib/types";

/** Checks that are about the account, not the site (same answer for every site). */
const ACCOUNT_CHECKS = new Set(["Concurrent open offer limit"]);
type MarketKind = "paid" | "exchange";
/** Up to this many sites are listed plainly; more get tabs + search. */
const FEW = 8;

/** One short chip per failed check, e.g. "DR 12 · needs 20". */
function reasonChip(c: ConditionCheck, mine: UserSite, site: MarketSite): string {
  const r = site.requirements;
  switch (c.label) {
    case "Minimum DR":
      return `DR ${mine.dr} · needs ${r.minDr}+`;
    case "Minimum organic traffic":
      return `Traffic ${displayTraffic(mine.traffic)} · needs ${compact(r.minTraffic)}+`;
    case "Category / niche":
      return `Niche ${mine.niches.slice(0, 2).join("/")} not accepted`;
    case "No open offer with this site":
      return "Offer already open";
    case "Your DR/niche within their accepted range": {
      const [lo, hi] = site.acceptedDr;
      return mine.dr < lo || mine.dr > hi ? `DR ${mine.dr} · they take ${lo}–${hi}` : "No shared niche";
    }
    case "Their DR/niche within your accepted range": {
      const t = mine.exchangeTerms;
      return `Their DR ${site.dr} · you take ${t?.drMin ?? 0}–${t?.drMax ?? 100}`;
    }
    case "Your site is open to Exchange":
      return "Exchange is off for this site";
    case "Your site is active":
      return "Paused";
    default:
      return c.label;
  }
}

export interface SiteEligibility {
  site: UserSite;
  checks: ConditionCheck[];
  eligible: boolean;
  failed: ConditionCheck[];
}

export function useEligibility(mySites: UserSite[], checksBySite: Record<string, ConditionCheck[]>) {
  return useMemo(() => {
    const rows: SiteEligibility[] = mySites.map((s) => {
      const checks = checksBySite[s.id] ?? [];
      return {
        site: s,
        checks,
        eligible: allPassed(checks),
        failed: checks.filter((c) => !c.passed && c.severity !== "info"),
      };
    });
    return rows.sort((a, b) => b.site.dr - a.site.dr);
  }, [mySites, checksBySite]);
}

/**
 * Step 1 of a Paid offer: which of your sites the link is for. Eligible sites are pickable; the rest
 * are listed with the exact requirement they miss, so 30 fits and 20 misses stay readable.
 */
export function OfferSitePicker({
  market,
  rows,
  selectedId,
  onSelect,
  kind = "paid",
}: {
  market: MarketSite;
  rows: SiteEligibility[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  kind?: MarketKind;
}) {
  const [tab, setTab] = useState<"eligible" | "blocked">("eligible");
  const [query, setQuery] = useState("");

  const eligible = rows.filter((r) => r.eligible);
  const blocked = rows.filter((r) => !r.eligible);
  // An account-wide failure (e.g. offer limit) blocks every site the same way — say it once.
  const accountBlock = rows[0]?.failed.find((c) => ACCOUNT_CHECKS.has(c.label));
  const wantedNiches = kind === "paid" ? market.requirements.niches : market.niches;

  // A handful of sites fit on screen as-is; tabs and search only pay off for long lists.
  const many = rows.length > FEW;
  const q = query.trim().toLowerCase();
  const list = many ? (tab === "eligible" ? eligible : blocked).filter((x) => !q || x.site.domain.includes(q)) : [...eligible, ...blocked];

  if (rows.length === 1) return <SingleSite market={market} row={rows[0]} accountBlock={accountBlock} kind={kind} />;
  const selected = rows.find((x) => x.site.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <Blockers market={market} accountBlock={accountBlock} noneQualify={eligible.length === 0} kind={kind} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Your sites */}
        <div className="flex min-w-0 flex-col self-start overflow-hidden rounded-2xl border bg-card">
          {many && (
            <div className="flex flex-col gap-2 border-b p-2.5 sm:flex-row sm:items-center">
              <div className="flex rounded-full bg-muted p-0.5 text-[13px]" role="tablist">
                <TabBtn on={tab === "eligible"} onClick={() => setTab("eligible")}>
                  <CircleCheck className="size-3.5 text-green-600 dark:text-green-400" /> Can offer
                  <Count>{eligible.length}</Count>
                </TabBtn>
                <TabBtn on={tab === "blocked"} onClick={() => setTab("blocked")}>
                  <CircleX className="size-3.5 text-red-600 dark:text-red-400" /> Don&apos;t qualify
                  <Count>{blocked.length}</Count>
                </TabBtn>
              </div>
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find one of your sites…"
                  aria-label="Find one of your sites"
                  className="pl-8"
                />
              </div>
            </div>
          )}

          {list.length === 0 ? (
            <EmptyState
              icon={tab === "eligible" ? CircleX : CircleCheck}
              title={q ? "No site matches" : tab === "eligible" ? "None of your sites qualify" : "All your sites qualify"}
              description={
                q
                  ? "Try another domain."
                  : tab === "eligible"
                    ? "See what's missing under “Don't qualify”."
                    : "Pick any site under “Can offer”."
              }
            />
          ) : (
            <ul className={cn("divide-y", many && "max-h-[440px] overflow-y-auto")} role="listbox" aria-label="Your sites">
              {list.map((x) => {
                const on = x.site.id === selectedId;
                return (
                  <li key={x.site.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={on}
                      onClick={() => onSelect(x.site.id)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-muted/50",
                        on && "bg-muted/70",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-4 shrink-0 place-items-center rounded-full border",
                          on && (x.eligible ? "border-foreground" : "border-red-500"),
                        )}
                        aria-hidden
                      >
                        {on && <span className={cn("size-2 rounded-full", x.eligible ? "bg-foreground" : "bg-red-500")} />}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <SiteLabel
                          domain={x.site.domain}
                          className={cn("text-[13px] font-medium", !x.eligible && "text-muted-foreground")}
                        />
                        {x.eligible ? (
                          <span className="flex flex-wrap gap-1 pl-5">
                            {x.site.niches.map((n) => (
                              <span
                                key={n}
                                className={cn(
                                  "rounded-full px-1.5 text-[10px]",
                                  wantedNiches.includes(n)
                                    ? "bg-green-500/15 text-green-700 dark:text-green-400"
                                    : "bg-muted text-muted-foreground",
                                )}
                              >
                                {n}
                              </span>
                            ))}
                          </span>
                        ) : (
                          <span className="flex flex-wrap gap-1 pl-5">
                            {x.failed
                              .filter((c) => !ACCOUNT_CHECKS.has(c.label))
                              .map((c) => (
                                <span
                                  key={c.label}
                                  className="rounded-full bg-red-500/10 px-1.5 text-[10px] text-red-700 dark:text-red-400"
                                >
                                  {reasonChip(c, x.site, market)}
                                </span>
                              ))}
                          </span>
                        )}
                      </span>
                      <span className="flex shrink-0 gap-4 text-right tabular-nums">
                        <Metric label="DR" value={x.site.dr} style={drHeat(x.site.dr)} />
                        <Metric label="Traffic" value={displayTraffic(x.site.traffic)} style={trafficHeat(x.site.traffic)} className="w-12" />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Checks for the picked site */}
        <div className="flex flex-col gap-3 lg:sticky lg:top-4 lg:self-start">
          {selected ? (
            <>
              <div className="flex items-center justify-between gap-2 rounded-2xl border bg-card px-4 py-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[11px] text-muted-foreground">Offering from</span>
                  <SiteLabel domain={selected.site.domain} className="font-medium" />
                </div>
                <StatusPill ok={selected.eligible} fails={selected.failed.length} />
              </div>
              <CheckList checks={selected.checks} />
              {!selected.eligible && (
                <p className="px-1 text-xs text-muted-foreground">
                  This site can&apos;t make the offer.
                  {eligible.length > 0 &&
                    (many ? ` Pick one under “Can offer” — ${eligible.length} of your sites qualify.` : " Pick one marked as qualifying.")}
                </p>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-1 rounded-2xl border border-dashed px-4 py-10 text-center">
              <span className="text-sm font-medium">Pick one of your sites</span>
              <span className="text-xs text-muted-foreground">Its checks against {market.domain} show here.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Only one site on the account: no picking, just whether it qualifies and why. */
function SingleSite({
  market,
  row,
  accountBlock,
  kind,
}: {
  market: MarketSite;
  row: SiteEligibility;
  accountBlock?: ConditionCheck;
  kind: MarketKind;
}) {
  const siteFails = row.failed.filter((c) => !ACCOUNT_CHECKS.has(c.label));
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[11px] text-muted-foreground">{kind === "paid" ? "The link goes to your site" : "You trade from"}</span>
            <SiteLabel domain={row.site.domain} size={18} className="gap-2 text-base font-medium" />
          </div>
          <div className="flex items-center gap-5">
            <span className="flex gap-4 text-right tabular-nums">
              <Metric label="DR" value={row.site.dr} style={drHeat(row.site.dr)} />
              <Metric label="Traffic" value={displayTraffic(row.site.traffic)} style={trafficHeat(row.site.traffic)} className="w-12" />
            </span>
            <StatusPill ok={row.eligible} fails={row.failed.length} />
          </div>
        </div>
        <Accepts market={market} kind={kind} />
      </div>

      <Blockers market={market} accountBlock={accountBlock} noneQualify={siteFails.length > 0} single kind={kind} />
      <CheckList
        checks={row.checks}
        className="md:grid md:grid-cols-2 md:divide-y-0 md:[&>li]:border-b md:[&>li:nth-last-child(-n+2)]:border-b-0"
      />
    </div>
  );
}

function Accepts({ market, kind }: { market: MarketSite; kind: MarketKind }) {
  const r = market.requirements;
  if (kind === "exchange") {
    return (
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-muted-foreground">{market.domain} trades with:</span>
        <Req>
          DR {market.acceptedDr[0]}–{market.acceptedDr[1]}
        </Req>
        <Req>A shared niche: {market.niches.join(", ")}</Req>
        <Req muted>
          {market.language}, {market.country}
        </Req>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="text-muted-foreground">{market.domain} accepts:</span>
      <Req>DR {r.minDr}+</Req>
      <Req>{compact(r.minTraffic)}+ visits/mo</Req>
      <Req>{r.niches.join(", ")}</Req>
      {r.bannedContent.length > 0 && <Req muted>No {r.bannedContent.join(", ").toLowerCase()}</Req>}
    </div>
  );
}

/** Why nothing can be sent: the account is at its limit, or no site meets the seller's bar. */
function Blockers({
  market,
  accountBlock,
  noneQualify,
  single,
  kind,
}: {
  market: MarketSite;
  accountBlock?: ConditionCheck;
  noneQualify: boolean;
  single?: boolean;
  kind: MarketKind;
}) {
  if (accountBlock) {
    return (
      <Callout variant="danger" title="You can't send new offers right now">
        {accountBlock.label}: {accountBlock.detail}. Close an open offer first.
      </Callout>
    );
  }
  if (!noneQualify) return null;
  return (
    <Callout
      variant="danger"
      title={single ? `Your site doesn't meet ${market.domain}'s requirements` : `None of your sites meet ${market.domain}'s requirements`}
    >
      See the failed checks below. You can{" "}
      <Link href="/sites/new" className="underline underline-offset-2">
        add another site
      </Link>{" "}
      or browse {kind === "paid" ? "sellers with a lower bar in the" : "other sites in"}{" "}
      <Link href={`/markets/${kind}`} className="underline underline-offset-2">
        {kind === "paid" ? "Paid Market" : "Exchange"}
      </Link>
      .
    </Callout>
  );
}

function StatusPill({ ok, fails }: { ok: boolean; fails: number }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
        ok ? "bg-green-500/15 text-green-700 dark:text-green-400" : "bg-red-500/15 text-red-700 dark:text-red-400",
      )}
    >
      {ok ? "All checks pass" : `${fails} check${fails > 1 ? "s" : ""} fail`}
    </span>
  );
}

function CheckList({ checks, className }: { checks: ConditionCheck[]; className?: string }) {
  return (
    <ul className={cn("divide-y rounded-2xl border bg-card", className)}>
      {checks.map((c) => (
        <li key={c.label} className="flex items-start gap-2.5 px-4 py-2.5">
          {c.passed ? (
            <CircleCheck className="mt-0.5 size-4 shrink-0 text-green-600 dark:text-green-400" aria-label="Passed" />
          ) : c.severity === "info" ? (
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-label="Warning" />
          ) : (
            <CircleX className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" aria-label="Failed" />
          )}
          <span className="flex min-w-0 flex-col">
            <span
              className={cn(
                "text-[13px]",
                !c.passed && (c.severity === "info" ? "text-amber-700 dark:text-amber-400" : "text-red-700 dark:text-red-400"),
              )}
            >
              {c.label}
              {!c.passed && c.severity === "info" && <span className="ml-1.5 text-[11px] text-muted-foreground">doesn&apos;t block</span>}
            </span>
            {c.detail && <span className="text-xs text-muted-foreground">{c.detail}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Req({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return <span className={cn("rounded-full border px-2 py-0.5", muted ? "text-muted-foreground" : "font-medium")}>{children}</span>;
}

function TabBtn({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={on}
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 whitespace-nowrap transition-colors sm:flex-none",
        on ? "bg-card font-medium shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Count({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground tabular-nums">{children}</span>;
}

function Metric({
  label,
  value,
  style,
  className,
}: {
  label: string;
  value: React.ReactNode;
  style: React.CSSProperties;
  className?: string;
}) {
  return (
    <span className={cn("flex w-8 flex-col", className)} style={style}>
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-semibold", heatText)}>{value}</span>
    </span>
  );
}
