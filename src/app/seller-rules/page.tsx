import type { Metadata } from "next";
import { RulesPage } from "@/components/landing/RulesPage";
import { penaltyRules } from "@/lib/standing-rules";

export const metadata: Metadata = {
  title: "Seller Rules · Backlink Market",
  description: "What you agree to when you list a site: ownership, honest numbers, direct payment, delivery within 72 hours and links that stay live.",
  alternates: { canonical: "/seller-rules" },
};

export default function SellerRulesPage() {
  return (
    <RulesPage
      title="Seller Rules"
      intro="You agree to these when you list a site on Backlink Market — in Paid Market, Exchange or ABC pools."
      other={{ href: "/buyer-rules", label: "Buyer Rules" }}
      sections={[
        {
          title: "Only list sites you control",
          rules: [
            "You must be able to publish a file on the domain: we ask you to place a verification file on it and we check it before the site is added, and again when you submit.",
            "A live domain belongs to one account. You can't list a domain someone else already lists, and you can't list a site to sell links you don't control.",
            "Keep the site live, reachable and crawlable (with a sitemap). A site that goes down permanently ends the deals on it.",
          ],
        },
        {
          title: "Numbers must be honest",
          rules: [
            "Domain Rating is read from Ahrefs and refreshed every day. You can't change it.",
            "Monthly organic traffic is the range you choose when you add the site. Pick the range that is true; misstating it is grounds for removal.",
            "Niche, language, country, prices and the requirements you write for buyers must describe the site as it is.",
            "Paid Market needs a Domain Rating of 20 or higher.",
          ],
        },
        {
          title: "You are paid directly — we never hold money",
          rules: [
            "Paid Market buyers pay you directly by the method on your payout account: wire, PayPal, USDT (Tron or Ethereum) or bank transfer. No other method is accepted.",
            "Backlink Market doesn't hold, move or refund money and can't see whether a payment was sent. You confirm the payment only after it has actually reached you.",
            "Keep your payout details correct. A buyer who pays the details you gave has paid you.",
          ],
        },
        {
          title: "Answer and deliver on time",
          rules: [
            "Accept or decline an offer promptly. Accepting is a promise to deliver what the brief says.",
            "After the payment is confirmed (Paid) or the offer is accepted (Exchange and ABC), you have 72 hours to publish the link(s). You only tell us the page where we can't know it (a guest post or a review); then we check the page ourselves and put the offer live.",
            "Deliver what was agreed: the page, the target URL and the anchor text in the brief, as a dofollow link, on a page that is publicly accessible and can be indexed.",
            "Extra dofollow links in an order are priced with your listing; deliver each of them.",
          ],
        },
        {
          title: "Links stay where you put them",
          rules: [
            "Every delivered link is checked when it is submitted and re-read regularly. It must stay live, dofollow and with the agreed anchor for the duration on your listing (forever, 12 months or 6 months).",
            "If a scan finds the link gone or changed you have 7 days to put it back. If it isn't back after that, it counts as a violation.",
            "Removing a link on purpose, swapping it for nofollow or changing the anchor to get out of a deal is a violation.",
          ],
        },
        {
          title: "Penalty points",
          rules: [
            `Each violation — not responding, not delivering within 72 hours, a link removed and not restored, one-sided delivery on Exchange or ABC — adds ${penaltyRules.pointsPerViolation} point in the current month.`,
            `At ${penaltyRules.suspensionThreshold} points the account is suspended for ${penaltyRules.suspensionDays} days: no new offers, swaps or pools while suspended.`,
            "A delivery that is fake or fraudulent (a link that was never really placed, a page that isn't public, a cloaked link) is an immediate suspension.",
          ],
        },
        {
          title: "Exchange and ABC pools",
          rules: [
            "Exchange and ABC use Link Insertion only, and nothing is paid: you place a link on your site and receive one on someone else's.",
            "In Exchange each side places its own link within 72 hours of acceptance. In an ABC pool the three sites link in a loop (A to B, B to C, C to A) and nobody links back directly.",
            "A domain can be in up to 10 pools at a time, and an account takes one seat per pool — two of your own domains can't share a pool. The page and anchor you choose for the link you receive must be on your own site.",
          ],
        },
        {
          title: "Content that isn't allowed",
          rules: [
            "You may not sell or place links to casino and gambling, CBD or adult sites unless your listing says so and the buyer's brief is the same.",
            "No link to malware, phishing, illegal goods or anything you wouldn't put on your own site. We can remove a listing or account that does this without notice.",
          ],
        },
        {
          title: "Disputes",
          rules: [
            "Payments go between you and the buyer. If one of you doesn't do what the offer says, the other can stop the deal, and the violation is recorded against the party at fault.",
            "Backlink Market doesn't reverse payments or arbitrate money; it records who did and didn't keep to the offer.",
          ],
        },
      ]}
    />
  );
}
