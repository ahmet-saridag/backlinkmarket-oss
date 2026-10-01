import { allCountries, allLanguages } from "@/lib/geo-data";
import type { AiPolicy, Category, LinkDuration, MarketType, SlotPeriod } from "@/lib/types";

export const categoryLabels: Record<Category, string> = {
  guest_post: "Guest Post",
  link_insertion: "Link Insertion",
  review: "Review",
  footer_link: "Footer Link",
};

export const durationLabels: Record<LinkDuration, string> = {
  forever: "Forever",
  "12m": "12 months",
  "6m": "6 months",
};

export const periodLabels: Record<SlotPeriod, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

export const aiPolicyLabels: Record<AiPolicy, string> = {
  not_accepted: "Not accepted",
  ai_assisted: "AI-assisted OK",
  any: "No preference",
};

export const marketLabels: Record<MarketType, string> = {
  paid: "Paid",
  exchange: "Exchange",
  abc: "ABC",
};

export const categories = Object.keys(categoryLabels) as Category[];
export const durations = Object.keys(durationLabels) as LinkDuration[];
export const periods = Object.keys(periodLabels) as SlotPeriod[];

export const niches = [
  "SEO",
  "AI",
  "SaaS",
  "Marketing",
  "Finance",
  "Crypto",
  "Health",
  "Travel",
  "E-commerce",
  "Tech",
  "Education",
  "Business",
  "Legal",
  "Real Estate",
  "Insurance",
  "Automotive",
  "Fashion",
  "Beauty",
  "Home & Garden",
  "Food & Drink",
  "Sports",
  "Fitness",
  "Gaming",
  "Entertainment",
  "News & Media",
  "Parenting",
  "Pets",
  "B2B",
  "HR & Recruiting",
  "Career",
  "Productivity",
  "Design",
  "Photography",
  "Music",
  "Art & Culture",
  "Science",
  "Environment & Sustainability",
  "Non-profit",
  "Religion & Spirituality",
  "Politics",
  "Manufacturing & Industrial",
  "Construction",
  "Logistics & Supply Chain",
  "Aviation",
  "Energy",
  "Agriculture",
  "Dating & Relationships",
  "Events & Weddings",
  "Lifestyle",
];

export const languages = allLanguages;
/** Account country: a real country. */
export const countries = allCountries;
/** A site's target market can also be "Global". */
export const marketCountries = ["Global", ...allCountries];

/** Whole dollars print without cents ($250); fractional amounts keep them ($76.50). */
export const formatUsd = (n: number) => {
  const cents = Math.round(n * 100);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
};

/** Round to whole cents, avoiding float noise. */
export const roundCents = (n: number) => Math.round(n * 100) / 100;

export const formatNumber = (n: number) => new Intl.NumberFormat("en-US").format(n);
