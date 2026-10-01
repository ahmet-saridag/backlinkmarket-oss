import { APP_URL, SITE_DESCRIPTION, SITE_NAME } from "@/lib/app-url";
import { categoryLabels } from "@/lib/labels";
import { finalPrice } from "@/lib/market-price";
import type { MarketSite } from "@/lib/types";

/** One reused Organization node (same @id everywhere), so every page's schema points at the same publisher. */
export const organizationJsonLd = () => ({
  "@type": "Organization",
  "@id": `${APP_URL}/#organization`,
  name: SITE_NAME,
  url: APP_URL,
  description: SITE_DESCRIPTION,
  logo: { "@type": "ImageObject", url: `${APP_URL}/icons/icon-512.png`, width: 512, height: 512 },
});

export const websiteJsonLd = () => ({
  "@type": "WebSite",
  "@id": `${APP_URL}/#website`,
  url: APP_URL,
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  publisher: { "@id": `${APP_URL}/#organization` },
  inLanguage: "en",
  // The search box on the home page reads ?q= — this is what lets a search engine offer it directly.
  potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: `${APP_URL}/?q={search_term_string}` }, "query-input": "required name=search_term_string" },
});

/** The listings on the current page of the marketplace as an ItemList. */
export const listingsItemListJsonLd = (sites: MarketSite[]) => ({
  "@type": "ItemList",
  name: "Backlink listings",
  itemListElement: sites.map((s, i) => ({ "@type": "ListItem", position: i + 1, url: `${APP_URL}/listing/${s.domain}`, name: s.domain })),
});

/** A listing as a Product with one Offer per placement category. */
export function listingJsonLd(s: MarketSite) {
  const url = `${APP_URL}/listing/${s.domain}`;
  return [
    {
      "@type": "Product",
      "@id": `${url}#product`,
      name: `Backlink placements on ${s.domain}`,
      description: `Domain Rating ${s.dr}, ${s.niches.join(", ")} site (${s.country}). Placements: ${s.listings.map((l) => categoryLabels[l.category]).join(", ") || "none listed"}.`,
      url,
      brand: { "@type": "Brand", name: s.domain },
      category: s.niches[0],
      ...(s.listings.length
        ? {
            offers: s.listings.map((l) => ({
              "@type": "Offer",
              name: categoryLabels[l.category],
              price: finalPrice(l),
              priceCurrency: "USD",
              availability: "https://schema.org/InStock",
              url,
              seller: { "@id": `${APP_URL}/#organization` },
            })),
          }
        : {}),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: APP_URL },
        { "@type": "ListItem", position: 2, name: s.domain, item: url },
      ],
    },
  ];
}
