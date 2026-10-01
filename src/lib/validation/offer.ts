import { z } from "zod";
import { categories } from "@/lib/labels";

const briefLineSchema = z.object({
  category: z.enum(categories as [string, ...string[]]),
  targetUrl: z.string().trim().max(2000).optional(),
  anchor: z.string().trim().max(300).optional(),
  topic: z.string().trim().max(300).optional(),
  /** Link Insertion: the seller's page the link goes into */
  sellerPage: z.string().trim().max(2000).optional(),
  /** Review */
  productInfo: z.string().trim().max(1000).optional(),
  accessDetails: z.string().trim().max(1000).optional(),
  extras: z.array(z.object({ url: z.url("Enter a valid URL.").max(2000), anchor: z.string().trim().min(1).max(300) })).max(2),
});
export type BriefLineInput = z.infer<typeof briefLineSchema>;

/**
 * A Paid Market offer. The amount is deliberately NOT part of the input — the server prices the
 * offer from the seller's actual listing, so a buyer can't name their own price.
 */
export const sendOfferSchema = z.object({
  type: z.literal("paid"),
  buyerSiteId: z.uuid(),
  sellerSiteId: z.uuid(),
  lines: z.array(briefLineSchema).min(1, "Pick at least one category.").max(4),
  message: z.string().trim().max(500, "Keep the message under 500 characters.").optional(),
});
export type SendOfferInput = z.infer<typeof sendOfferSchema>;

/** `urls` holds the page the seller published on, per ordered category — only for lines whose page we couldn't know. */
export const deliverLinkSchema = z.object({
  offerId: z.uuid(),
  urls: z.record(z.string(), z.string().max(2000)).default({}),
});

const pageUrl = z.url("Enter a full page URL.").max(2000);

/** An Exchange offer: one link each way. Nothing is priced. */
export const sendExchangeSchema = z.object({
  buyerSiteId: z.uuid(),
  sellerSiteId: z.uuid(),
  /** Their page that will host the link to you, and the page of yours it points to */
  hostPage: pageUrl.or(z.literal("")),
  targetUrl: pageUrl,
  anchor: z.string().trim().min(1, "Enter the anchor text.").max(300),
  /** Your page that will host the link to them, and the page of theirs it points to */
  giveHostPage: pageUrl.or(z.literal("")),
  giveTargetUrl: pageUrl,
  giveAnchor: z.string().trim().min(1, "Enter the anchor text.").max(300),
  /** A note to the other side, shown on the offer */
  message: z.string().trim().max(500, "Keep the message under 500 characters.").optional(),
});
export type SendExchangeInput = z.infer<typeof sendExchangeSchema>;

export const setPoolLinkSchema = z.object({
  roomId: z.uuid(),
  siteId: z.uuid(),
  targetUrl: pageUrl,
  anchor: z.string().trim().min(1, "Enter the anchor text.").max(300),
});

export const joinPoolSchema = z.object({
  roomId: z.uuid(),
  siteId: z.uuid(),
  targetUrl: pageUrl,
  anchor: z.string().trim().min(1, "Enter the anchor text.").max(300),
});

/** Why either side may pull out of an accepted swap before any link is live. */
export const swapWithdrawReasons = [
  "I can't place the link in time",
  "I changed my mind",
  "The site or the page no longer fits",
  "Something else",
];

/** Why a buyer may withdraw after the seller accepted; the seller sees the one picked. */
export const withdrawReasons = [
  "I can't pay with the method they accept",
  "I changed my mind",
  "The price or the terms don't work for me",
  "Something else",
];
