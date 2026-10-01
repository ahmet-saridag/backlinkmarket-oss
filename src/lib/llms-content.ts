import { APP_URL, SITE_DESCRIPTION } from "@/lib/app-url";
import { categoryLabels, durationLabels, formatUsd, marketLabels } from "@/lib/labels";
import { finalPrice } from "@/lib/market-price";
import { displayTraffic } from "@/lib/traffic-ranges";
import type { MarketSite } from "@/lib/types";

const cheapest = (s: MarketSite) => (s.listings.length ? Math.min(...s.listings.map(finalPrice)) : null);

export const ABOUT = `Backlink Market is a marketplace for backlinks with three ways to trade:

- **Paid Market** — buy a placement (guest post, link insertion, review or footer link) on a verified site. The buyer pays the seller directly by wire, PayPal, USDT or bank transfer. Backlink Market never holds or moves the money; the seller confirms the payment arrived and then delivers the link.
- **Exchange** — swap links 1:1 with another site. No money changes hands: each side places a link on their own site pointing to the other.
- **ABC Pool** — three-way link loops (A links to B, B to C, C back to A) so nobody links back directly. Each site can host its own pool and join up to 10.

Every listed site is ownership-verified (a token file on the domain), shows a Domain Rating read from Ahrefs and a self-reported organic traffic range, and every delivered link is scanned to confirm it stays live and dofollow.`;

export function listingLine(s: MarketSite): string {
  const from = cheapest(s);
  const bits = [`DR ${s.dr}`, `${displayTraffic(s.traffic)} organic visits/month`, s.niches.slice(0, 3).join(", "), s.country];
  if (from !== null) bits.push(`placements from ${formatUsd(from)}`);
  bits.push(`open to: ${s.markets.map((m) => marketLabels[m]).join(", ")}`);
  return `- [${s.domain}](${APP_URL}/listing/${s.domain}): ${bits.filter(Boolean).join(" · ")}`;
}

export function listingSection(s: MarketSite): string {
  const cats = s.listings.length
    ? s.listings
        .map((l) => `  - ${categoryLabels[l.category]}: ${formatUsd(finalPrice(l))}${l.discountPct ? ` (${l.discountPct}% off ${formatUsd(l.price)})` : ""} · link stays ${durationLabels[l.duration].toLowerCase()}${l.requirements.length ? ` · ${l.requirements.join("; ")}` : ""}`)
        .join("\n")
    : "  - No paid placements — this site trades links through Exchange or ABC pools";
  return `### ${s.domain}

- Page: ${APP_URL}/listing/${s.domain}
- Domain Rating: ${s.dr} (Ahrefs) · Organic traffic: ${displayTraffic(s.traffic)}/month (self-reported range)
- Open to: ${s.markets.map((m) => marketLabels[m]).join(", ")}
- Niches: ${s.niches.join(", ") || "—"} · Language: ${s.language} · Country: ${s.country}
- Listed: ${(s.listedAt ?? "").slice(0, 10)}${s.seller ? ` · Seller: ${s.seller.name}` : ""}
- Placements:
${cats}`;
}

export const intro = (title: string) => `# Backlink Market

> ${SITE_DESCRIPTION}

${title}`;
