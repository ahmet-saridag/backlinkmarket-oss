import type { Category, CategoryListing, MarketSite } from "@/lib/types";

export const finalPrice = (l: CategoryListing) => Math.round(l.price * (1 - l.discountPct / 100));
export const listing = (s: MarketSite, c: Category) => s.listings.find((l) => l.category === c);

/** The price that matters for filters and sorting: the chosen categories' cheapest, or the site's cheapest overall. */
export const priceFor = (s: MarketSite, cats: Category[]) => {
  const ls = (cats.length ? s.listings.filter((l) => cats.includes(l.category)) : s.listings).map(finalPrice);
  return ls.length ? Math.min(...ls) : Infinity;
};
