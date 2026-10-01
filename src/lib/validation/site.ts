import { z } from "zod";
import { categories, countries, durations, languages, niches, periods } from "@/lib/labels";
import { trafficRanges, type TrafficRangeValue } from "@/lib/traffic-ranges";
import { sellerPriceLimits } from "@/lib/market-rules";
import { payoutSchema } from "@/lib/validation/account";

const trafficRangeValues = trafficRanges.map((r) => r.value) as [TrafficRangeValue, ...TrafficRangeValue[]];

const categoryConfigSchema = z.object({
  category: z.enum(categories as [string, ...string[]]),
  price: z.number().min(sellerPriceLimits.min, `The minimum price is $${sellerPriceLimits.min}.`).max(sellerPriceLimits.max, `The maximum price is $${sellerPriceLimits.max.toLocaleString("en-US")}.`),
  duration: z.enum(durations as [string, ...string[]]),
  dofollowFee: z.number().min(0).max(10_000),
  discountPct: z.number().min(0).max(90),
  notes: z.string().max(500),
  minWords: z.number().int().min(0).max(20_000).optional(),
  maxWords: z.number().int().min(0).max(20_000).optional(),
  aiPolicy: z.enum(["not_accepted", "ai_assisted", "any"]).optional(),
  pages: z.array(z.string().max(500)).max(200).optional(),
  reviewProcess: z.string().max(500).optional(),
  reviewProductRequirement: z.string().max(500).optional(),
}).refine((c) => Math.round(c.price * (1 - c.discountPct / 100) * 100) / 100 >= sellerPriceLimits.min, {
  message: `After the discount the price can't go below $${sellerPriceLimits.min}.`,
  path: ["price"],
});

const slotSchema = z.object({
  id: z.string().max(60),
  page: z.string().max(500),
  maxLinks: z.number().int().positive().max(100),
  period: z.enum(periods as [string, ...string[]]),
  note: z.string().max(300).optional(),
  lockedByOfferId: z.string().max(60).optional(),
});

const exchangeTermsSchema = z
  .object({
    drMin: z.number().int().min(0).max(100),
    drMax: z.number().int().min(0).max(100),
    trafficMin: z.number().int().min(0),
    trafficMax: z.number().int().min(0).nullable(),
    multiLinkCompensation: z.boolean(),
    wantedPage: z.string().trim().max(500).optional(),
    wantedAnchor: z.string().trim().max(100).optional(),
    specifyPages: z.boolean(),
    slots: z.array(slotSchema).max(50),
    generalCapacity: z.object({ maxLinks: z.number().int().positive().max(100), period: z.enum(periods as [string, ...string[]]) }).nullable(),
  })
  .refine((t) => t.drMin <= t.drMax, "DR min can't exceed DR max.")
  .refine((t) => t.trafficMax === null || t.trafficMin <= t.trafficMax, "Traffic min can't exceed traffic max.");

export const createSiteSchema = z.object({
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/, "Not a valid domain."),
  trafficRange: z.enum(trafficRangeValues),
  markets: z.array(z.enum(["paid", "exchange", "abc"])).min(1, "Pick at least one market."),
  niches: z.array(z.enum(niches as [string, ...string[]])).min(1, "Pick at least one niche."),
  language: z.enum(languages as [string, ...string[]]),
  country: z.enum(["Global", ...countries] as [string, ...string[]]),
  categories: z.array(categoryConfigSchema).max(categories.length),
  exchangeTerms: exchangeTermsSchema.nullable(),
  /** Required when listing on Paid Market and the account has no payout account yet. */
  payout: payoutSchema.optional(),
});
export type CreateSiteInput = z.infer<typeof createSiteSchema>;

/** Editing an existing site: everything but the domain and its verified metrics. */
export const updateSiteSchema = createSiteSchema.omit({ domain: true, trafficRange: true, payout: true });
export type UpdateSiteInput = z.infer<typeof updateSiteSchema>;
