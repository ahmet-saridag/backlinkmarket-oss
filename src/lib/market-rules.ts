import type { MarketSite, UserSite } from "@/lib/types";


/** How many offers you can have open at once. */
export const offerLimits = { max: 10, perDay: 100 };

/** Platform-wide bounds for a single Paid Market offer total (USD). */
export const platformLimits = { minTotal: 10, maxTotal: 50000 };

/** What a seller may charge for one placement (after their discount): the same floor and ceiling as an offer total. */
export const sellerPriceLimits = { min: platformLimits.minTotal, max: platformLimits.maxTotal };


const inRange = (dr: number, traffic: number, [drMin, drMax]: [number, number], [tMin, tMax]: [number, number | null]) =>
  dr >= drMin && dr <= drMax && traffic >= tMin && (tMax === null || traffic <= tMax);

/** Exchange is mutual: the listed site must accept one of yours, and you must accept it back. */
export function exchangeFits(site: MarketSite, mySites: UserSite[]): boolean {
  return mySites.some(
    (m) =>
      inRange(m.dr, m.traffic, site.acceptedDr, site.acceptedTraffic) &&
      inRange(site.dr, site.traffic, [m.exchangeTerms?.drMin ?? 0, m.exchangeTerms?.drMax ?? 100], [m.exchangeTerms?.trafficMin ?? 0, m.exchangeTerms?.trafficMax ?? null]),
  );
}

/** Why a site can't join a pool (or swap with a site) whose owner accepts only some DR / traffic — empty when it fits. */
export function rangeProblem(site: { dr: number; traffic: number }, terms: { drMin?: number; drMax?: number; trafficMin?: number; trafficMax?: number | null } | null | undefined): string | null {
  if (!terms) return null;
  const drMin = terms.drMin ?? 0;
  const drMax = terms.drMax ?? 100;
  if (site.dr < drMin || site.dr > drMax) return `DR ${site.dr} is outside the accepted DR ${drMin}–${drMax}`;
  const tMin = terms.trafficMin ?? 0;
  const tMax = terms.trafficMax ?? null;
  if (site.traffic < tMin || (tMax !== null && site.traffic > tMax)) return "its traffic is outside the accepted range";
  return null;
}
