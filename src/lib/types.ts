// Domain types shared by the database mappers and the UI.
// Privacy rule: site domains are always public; e-mail addresses never appear in any type.

export type MarketType = "paid" | "exchange" | "abc";
export type Category = "guest_post" | "link_insertion" | "review" | "footer_link";
export type LinkDuration = "forever" | "12m" | "6m";
export type SlotPeriod = "daily" | "weekly" | "monthly" | "yearly";

export type OfferStatus =
  | "SENT"
  | "ACCEPTED"
  /** Paid market: the buyer marked that they sent payment directly to the seller — no escrow */
  | "PAYMENT_RECEIVED"
  | "DELIVERED"
  | "ACTIVE_MONITORING"
  /** Monitoring spotted a problem — 3–7 day verification window */
  | "ANOMALY_CHECK"
  | "COMPLETED"
  /** Terminal: intentional removal → seller banned */
  | "VIOLATED_BANNED"
  /** Terminal: site permanently down, intent unclear → no ban */
  | "VIOLATED_NO_BAN"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED";

/* ---------- Notifications ---------- */

export type NotificationKind =
  | "offer_accepted"
  | "offer_received"
  | "exchange_match"
  | "payment_received"
  | "payout_released"
  | "link_verified"
  | "link_missing"
  | "partner_penalized"
  /** You got penalty points (and maybe a suspension) */
  | "penalty"
  | "offer_expired"
  | "abc_room"
  | "offer_declined"
  | "offer_withdrawn"
  | "payment_sent";

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  /** One line of context: amounts, deadlines, what happens next */
  detail?: string;
  domain?: string;
  market?: MarketType;
  /** Where the notification leads (offer, backlink, market…) */
  href?: string;
  time: string;
  /** When it happened (ISO) — compared with when you last opened the bell */
  at: string;
  read: boolean;
}

/* ---------- Trust & standing ---------- */

export type ViolationType =
  | "seller_no_response_72h"
  | "buyer_payment_not_sent"
  | "seller_no_delivery_72h"
  | "one_sided_delivery"
  /** A live link was taken down (or changed) and not put back within the 7-day window: 3 points at once */
  | "link_removed"
  /** Fraudulent/fake delivery: 3 points at once → immediate suspension */
  | "delivery_rejected";

export interface Violation {
  id: string;
  type: ViolationType;
  offerId: string;
  date: string;
  points: number;
}

export interface AccountStanding {
  penaltyPoints: number;
  /** Suspension threshold */
  maxPoints: number;
  /** Points count within a monthly window */
  windowStartedAt: string;
  windowResetsAt: string;
  violations: Violation[];
  /** Set when the account is suspended */
  suspendedUntil: string | null;
}

/* ---------- Sites ---------- */

export interface SiteMetrics {
  dr: number;
  /** Monthly organic visits */
  traffic: number;
  /** 0–100, lower is better */
  spamScore: number;
}

export type AiPolicy = "not_accepted" | "ai_assisted" | "any";

/** A category the owner sells on Paid Market, with its terms. */
export interface SiteCategoryConfig {
  category: Category;
  price: number;
  duration: LinkDuration;
  /** Extra fee per additional dofollow link */
  dofollowFee: number;
  discountPct: number;
  /** Optional free-text conditions, e.g. "no gambling/adult content" */
  notes: string;
  // Guest Post
  minWords?: number;
  maxWords?: number;
  aiPolicy?: AiPolicy;
  // Link Insertion: pages open for insertion (from sitemap)
  pages?: string[];
  // Review: free text, e.g. "1 week, I test the product"
  reviewProcess?: string;
  reviewProductRequirement?: string;
}

/** A page with its own exchange capacity. */
export interface SiteSlot {
  id: string;
  page: string;
  maxLinks: number;
  period: SlotPeriod;
  used: number;
  /** Optional note, e.g. "only in the SEO tools section" */
  note?: string;
  /** Set while an active offer uses this slot — it can't be edited or removed */
  lockedByOfferId?: string;
}

export interface Capacity {
  maxLinks: number;
  period: SlotPeriod;
}

/** Exchange/ABC terms — these markets only work through Link Insertion. */
export interface ExchangeTerms {
  drMin: number;
  drMax: number;
  trafficMin: number;
  /** null = no upper limit */
  trafficMax: number | null;
  multiLinkCompensation: boolean;
  /** Page and anchor this site wants its incoming exchange link to use (optional) */
  wantedPage?: string;
  wantedAnchor?: string;
  /** false = the whole sitemap is open */
  specifyPages: boolean;
  slots: SiteSlot[];
  generalCapacity: Capacity | null;
}

export interface UserSite extends SiteMetrics {
  id: string;
  domain: string;
  /** DR change over the last 30 days */
  drChange30d: number;
  /** When Ahrefs was last read for this site (the next reading is 24 hours after it) */
  drCheckedAt?: string;
  markets: MarketType[];
  status: "active" | "paused";
  niches: string[];
  language: string;
  country: string;
  sitemapPageCount: number;
  verifiedAt: string;
  /** When the site was added (ISO timestamp) */
  createdAt: string;
  categories: SiteCategoryConfig[];
  exchangeTerms: ExchangeTerms | null;
}

/* ---------- Markets ---------- */

export interface CategoryListing {
  category: Category;
  price: number;
  duration: LinkDuration;
  /** Extra fee per additional dofollow link */
  dofollowFee: number;
  discountPct: number;
  /** Seller's requirements shown read-only to buyers */
  requirements: string[];
  /** Link Insertion: pages the seller opened for insertion; empty = whole sitemap */
  pages?: string[];
  /** Category-specific requirements, shown read-only in the buyer's brief */
  minWords?: number;
  maxWords?: number;
  aiPolicy?: AiPolicy;
  reviewProcess?: string;
}

export interface SellerRequirements {
  minDr: number;
  minTraffic: number;
  niches: string[];
  bannedContent: string[];
  maxConcurrentOffers: number;
}

export interface Seller {
  name: string;
  /** The seller's profile photo (their account image), if they have one */
  avatarUrl: string;
  memberSince: string;
  verified: boolean;
  /** How this seller is paid — the method only, never the address (buyers see that after the seller accepts) */
  payoutMethod?: PayoutMethod;
  payoutNetwork?: string;
  /** Links this seller has placed that are live or done, and deals that went wrong (unanswered offers, violations) */
  deals: number;
  failedDeals: number;
}

export interface MarketSite extends SiteMetrics {
  id: string;
  domain: string;
  seller?: Seller;
  /** YYYY-MM-DD the listing went live (for "New" badges) */
  listedAt?: string;
  niches: string[];
  language: string;
  country: string;
  /** Completion rate, 0–100 */
  reputation: number;
  completedDeals: number;
  fastResponder: boolean;
  markets: MarketType[];
  listings: CategoryListing[];
  requirements: SellerRequirements;
  /** Seller's free-text condition note, shown read-only to the other side */
  conditionNote?: string;
  /** Exchange: DR range this site accepts from partners */
  acceptedDr: [number, number];
  /** Exchange: monthly organic traffic the site accepts from partners (max null = no upper limit) */
  acceptedTraffic: [number, number | null];
  /** Exchange: whether the other side accepts multi-link compensation */
  multiLinkCompensation: boolean;
  wantedPage?: string;
  wantedAnchor?: string;
  /** false = whole sitemap is open for exchanges */
  specifyPages: boolean;
  exchangeSlots: ExchangeSlot[];
  generalCapacity: Capacity | null;
  sitemapPageCount: number;
}

export type ExchangeSlot = SiteSlot;

export interface ConditionCheck {
  label: string;
  passed: boolean;
  detail?: string;
  /** "info" checks are shown (with a warning) but never block the flow. Default: blocking. */
  severity?: "blocking" | "info";
}

/* ---------- Offers ---------- */

export interface LinkStatus {
  live: boolean;
  dofollow: boolean;
  anchorMatches: boolean;
  lastScan: string;
}

/** One category of an offer as the buyer briefed it, priced from the seller's listing. */
export interface OfferBriefLine {
  category: Category;
  targetUrl?: string;
  anchor?: string;
  topic?: string;
  sellerPage?: string;
  productInfo?: string;
  accessDetails?: string;
  extras: { url: string; anchor: string }[];
  duration: LinkDuration;
  price: number;
  discountPct: number;
  net: number;
  extraFee: number;
  total: number;
}

/** The loop an ABC offer is part of. Seat i places a link on its site for seat i+1, and the last for the first. */
export interface PoolContext {
  ref: string;
  seats: { seat: number; domain: string; dr: number; mine: boolean }[];
  /** The link you place (you host it) and the link you receive, with where each stands */
  give?: { ref: string; status: OfferStatus; domain: string };
  get?: { ref: string; status: OfferStatus; domain: string };
}

/** What we found when we opened the seller's page(s): ok = every link was there; null while we are still looking. */
export interface DeliveryCheck {
  attempt: number;
  startedAt: string;
  at?: string;
  ok: boolean | null;
  problems: { label: string; reason: string }[];
}

export interface Offer {
  id: string;
  /** Short reference shown in the UI (the first 8 characters of the id) */
  ref: string;
  type: MarketType;
  direction: "sent" | "received";
  status: OfferStatus;
  yourDomain: string;
  counterpartyDomain: string;
  categories: Category[];
  anchor: string;
  targetUrl: string;
  /** USD, paid market only */
  amount?: number;
  createdAt: string;
  /** Minutes left before a SENT offer can be cancelled; 0 = cooldown over */
  cooldownMinutesLeft: number;
  deliveredUrl?: string;
  linkStatus?: LinkStatus;
  /** Paid Market: the buyer's proof of payment (a private file) and the reference they gave */
  paymentProofPath?: string;
  paymentReference?: string;
  /** Paid Market: when the buyer said they'd sent the payment (waiting on the seller to confirm it arrived) */
  paymentSentAt?: string;
  /** Where the seller placed each ordered link, for lines whose page we couldn't know (category -> page URL) */
  deliveries?: Record<string, string>;
  /** ABC: the pool this link belongs to — who sits where, and your two links in it */
  pool?: PoolContext;
  /** Our last look at the seller's page(s) — see `DeliveryCheck` */
  deliveryCheck?: DeliveryCheck;
  /** The other side's site, as listed */
  /** The person behind the other site */
  counterpartyOwner?: Seller & { email?: string; country?: string };
  counterpartySite?: { dr: number; traffic: number; niches: string[]; language: string; country: string; spamScore: number; listedAt: string; markets: string[] };
  /** A note from the person who proposed, for the other side */
  message?: string;
  /** Why the buyer withdrew after the seller accepted */
  cancelReason?: string;
  /** Per-category brief and price breakdown (Paid Market) */
  brief?: OfferBriefLine[];
  /** Exchange: the link going the other way (the paired offer's brief) */
  reciprocalBrief?: OfferBriefLine;
  /** ANOMALY_CHECK */
  anomaly?: {
    issue: "link_missing" | "nofollow" | "site_down";
    detectedAt: string;
    windowEndsAt: string;
  };
  /** You are the account that a system decision (72 hours, removed link) penalised */
  penalizedViewer?: boolean;
  /** VIOLATED_* — terminal violation */
  violation?: { reason: string; decidedAt: string; /** The account that was penalised, and what it got */ kind?: "partner_failed"; /** The link was already up when it was closed */ delivered?: boolean; userId?: string; points?: number; suspendedUntil?: string | null };
  timeline: { status: OfferStatus; at: string }[];
}

/* ---------- Backlinks & payments ---------- */

export interface Backlink {
  id: string;
  /** given = link on your site to someone else; received = link on their site to yours */
  direction: "given" | "received";
  /** Paid: money for the link · Exchange / ABC: a link in return */
  market: MarketType;
  sourceDomain: string;
  sourcePage: string;
  targetDomain: string;
  /** Anchor text found on the page at the last scan */
  anchor: string;
  /** Domain Rating of the other side (the partner) */
  partnerDr: number;
  category: Category;
  live: boolean;
  lastScan: string;
  duration: LinkDuration;
  /** null = forever */
  daysLeft: number | null;
  status: "active" | "completed";
  offerId: string;
  /** Short reference of that offer (its page address) */
  offerRef: string;
  /** When the deal behind this link was created */
  addedAt: string;
  /** Set when a scan finds the link gone (YYYY-MM-DD); the side that removed it has 7 days to put it back */
  missingSince?: string;
  /** Set when the restore deadline passed without the link coming back */
  penalty?: { at: string; points: number };
}

export interface Payment {
  id: string;
  date: string;
  type: "received" | "sent";
  amount: number;
  description: string;
  offerId: string;
  /** Short reference of the offer (its page address); missing once the offer is archived */
  offerRef?: string;
  /** "pending" = accepted, waiting on the seller to confirm the payment landed */
  status: "completed" | "pending" | "refunded";
  /** How the money moved: the seller's payout method for that deal */
  provider: PayoutMethod;
}

/* ---------- Account ---------- */

export interface AccountProfile {
  displayName: string;
  username: string;
  country: string;
  language: string;
  /** IANA time zone id, e.g. "Europe/Istanbul" */
  timezone: string;
  memberSince: string;
  email: string;
  /** Identity verification: what was checked and when */
  verification: { method: string; verifiedAt: string };
}

/**
 * How a seller gets paid on Paid Market. The buyer pays this address directly — there's
 * no escrow and no other method: wire, PayPal, USDT or bank transfer only.
 */
export type PayoutMethod = "wire" | "paypal" | "crypto" | "bank_transfer";

export interface PayoutAccount {
  connected: boolean;
  method?: PayoutMethod;
  accountHolder?: string;
  /** Wire / bank transfer: SWIFT/BIC. Crypto: the USDT network ("Tron (TRC-20)" or "Ethereum (ERC-20)"). */
  network?: string;
  /** PayPal: e-mail. Crypto: wallet address. Wire / bank transfer: IBAN or account number. */
  address?: string;
}

/** The seller's payout details, shown to the buyer of an accepted Paid Market offer so they can pay. */
export interface PayoutDetails {
  method: PayoutMethod;
  /** Not set for crypto wallets */
  accountHolder?: string;
  network?: string;
  address: string;
}
