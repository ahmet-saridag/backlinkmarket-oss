import "server-only";
import { render } from "@react-email/render";
import { buildProps, type EmailContext } from "@/emails/build";
import { emailById } from "@/emails/registry";
import type { Pref } from "@/emails/types";

/** Groups a person can switch off; everything else is always sent. A group they never chose to switch off counts as on, except the weekly summary. */
const switchable: Pref[] = ["offers", "deadlines", "pools", "missing", "payouts", "disputes", "monitoring", "site", "digest"];

export type Prepared = { skip: string } | { skip?: undefined; to: string; subject: string; html: string; text: string };

/** Everything needed to send one outbox row — or the reason it must not go. */
export async function prepareEmail(ctx: EmailContext): Promise<Prepared> {
  const template = ctx.outbox.template;
  const def = emailById(template);
  if (!def) return { skip: `unknown template ${template}` };
  if (!ctx.to.email) return { skip: "the recipient has no email address" };

  if (switchable.includes(def.pref)) {
    const v = ctx.to.prefs?.[def.pref];
    const on = def.pref === "digest" ? v === true : v !== false;
    if (!on) return { skip: `switched off: ${def.pref}` };
  }

  const built = buildProps(template, ctx);
  if (typeof built.skip === "string") return { skip: built.skip };
  const element = def.render(built.props);
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { to: ctx.to.email, subject: def.subject(built.props), html, text };
}
