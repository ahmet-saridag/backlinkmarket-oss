"use server";

import { countPayments, parsePaymentFilters } from "@/lib/payments-data";

/** How many payments an export with these filters would contain. */
export async function countExport(filters: Record<string, string>): Promise<number> {
  return countPayments(parsePaymentFilters(filters));
}
