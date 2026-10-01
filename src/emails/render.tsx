import "server-only";
import { render } from "@react-email/render";
import { emailById } from "@/emails/registry";

/** An email as it would be sent: subject, HTML and a plain-text twin. Nothing is sent from here. */
export async function renderEmail(id: string, variant?: string, opts: { forceDark?: boolean } = {}) {
  const def = emailById(id);
  if (!def) return null;
  const v = def.variants.find((x) => x.key === variant) ?? def.variants[0];
  const element = def.render(v.props, opts);
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { subject: v.subject, html, text };
}
