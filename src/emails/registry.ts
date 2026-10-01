import type { EmailDef } from "@/emails/define";
import { accountEmails } from "@/emails/templates/account";
import { closureEmails } from "@/emails/templates/closures";
import { deliveryEmails } from "@/emails/templates/delivery";
import { monitoringEmails } from "@/emails/templates/monitoring";
import { offerEmails } from "@/emails/templates/offers";
import { opsEmails } from "@/emails/templates/ops";
import { paymentEmails } from "@/emails/templates/payments";
import { penaltyEmails } from "@/emails/templates/penalties";
import { poolEmails } from "@/emails/templates/pools";
import { siteEmails } from "@/emails/templates/sites";

/** Every email Backlink Market can send, in the order of docs/email-events.md. */
export const emails: EmailDef[] = [
  ...offerEmails,
  ...paymentEmails,
  ...deliveryEmails,
  ...closureEmails,
  ...monitoringEmails,
  ...penaltyEmails,
  ...poolEmails,
  ...siteEmails,
  ...accountEmails,
  ...opsEmails,
];

export const emailById = (id: string) => emails.find((e) => e.id === id);
