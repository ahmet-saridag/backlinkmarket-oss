import type { Metadata } from "next";
import { RulesPage } from "@/components/landing/RulesPage";
import { offerLimits, platformLimits } from "@/lib/market-rules";
import { penaltyRules } from "@/lib/standing-rules";

export const metadata: Metadata = {
  title: "Buyer Rules · Backlink Market",
  description: "What you agree to when you send an offer: your own site, a clear brief, direct payment to the seller and a check of the delivered link.",
  alternates: { canonical: "/buyer-rules" },
};

export default function BuyerRulesPage() {
  return (
    <RulesPage
      title="Buyer Rules"
      intro="You agree to these when you send an offer to buy a placement, swap links or join a pool."
      other={{ href: "/seller-rules", label: "Seller Rules" }}
      sections={[
        {
          title: "Offer for your own site",
          rules: [
            "The link is for a site you have added and verified on your account. You can't send an offer for a site you don't control or to a site of your own.",
            "Your site must be active and meet what the seller asks for (Domain Rating, traffic, niche) — the offer form shows each check.",
            `You can have up to ${offerLimits.max} open offers at once, and one open offer per pair of sites.`,
            `You can send up to ${offerLimits.perDay} offers (Paid and Exchange) per 24 hours.`,
          ],
        },
        {
          title: "A clear brief and a fair price",
          rules: [
            "For each category say where the link should point (a page on your site) and the anchor text. Reviews need the product information and access details.",
            `The price is the seller's listing price for the categories you choose, after their discount. You can't set your own price. An offer total must be between $${platformLimits.minTotal} and $${platformLimits.maxTotal.toLocaleString("en-US")}.`,
            "You can't cancel an offer for the first hour after sending it; after that you can cancel it while it is still waiting for the seller.",
          ],
        },
        {
          title: "Pay the seller directly",
          rules: [
            "Once the seller accepts you'll see their payout details. Pay them yourself by that method — wire, PayPal, USDT (Tron or Ethereum) or bank transfer — for the full amount of the offer.",
            "Backlink Market doesn't hold or move the money and can't see it. Mark the payment as sent only after you've sent it.",
            `Not sending the payment in time counts as a violation and adds ${penaltyRules.pointsPerViolation} penalty point to your account.`,
          ],
        },
        {
          title: "We check the delivery, not you",
          rules: [
            "When the seller says the link is placed, we open their page ourselves and check every ordered link: it must be there, dofollow and use the agreed anchor. You don't verify anything — you're told when it's live.",
            "If the check fails the seller sees exactly what's missing and the offer stays open until it's fixed or the 72 hours run out.",
            "After that the links are re-read regularly. If one disappears, the seller has 7 days to restore it before it counts against them.",
          ],
        },
        {
          title: "Exchange and ABC pools",
          rules: [
            "Nothing is paid. You place a link on your own site for the site you're swapping with (or the next site in the pool) within 72 hours, and you verify the link you receive.",
            `Leaving your side undone — placing nothing, or only your half of a swap — is a violation. ${penaltyRules.suspensionThreshold} points in a month suspends the account for ${penaltyRules.suspensionDays} days.`,
          ],
        },
        {
          title: "What you can't buy or send",
          rules: [
            "No links from your site to malware, phishing or illegal content, and no casino, CBD or adult targets unless the seller's listing accepts them.",
            "Don't use the marketplace to send spam, run link schemes that harm the seller's site or misuse a seller's payout details.",
          ],
        },
      ]}
    />
  );
}
