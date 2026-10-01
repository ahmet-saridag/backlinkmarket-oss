import * as React from "react";
import { Body, Button, Container, Head, Html, Img, Link, Preview, Section, Text } from "@react-email/components";
import { APP_URL } from "@/lib/app-url";
import { prefNames, type Pref, type Tone } from "@/emails/types";

/* ---------- design tokens ---------- */

const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const mono = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const ink = "#111418";
const muted = "#667085";
const line = "#e4e7ec";

const tones: Record<Tone, { c: string; bg: string; bar: string }> = {
  info: { c: "#0369a1", bg: "#f0f9ff", bar: "#38bdf8" },
  success: { c: "#15803d", bg: "#f0fdf4", bar: "#22c55e" },
  warn: { c: "#b45309", bg: "#fffbeb", bar: "#f59e0b" },
  danger: { c: "#b91c1c", bg: "#fef2f2", bar: "#ef4444" },
  neutral: { c: "#475467", bg: "#f2f4f7", bar: "#98a2b3" },
};

/** Dark mode: most clients honour prefers-color-scheme; the rest keep the light design, which is fully readable. */
const darkCss = `
  .bm-page{background-color:#0a0b0d !important}
  .bm-card{background-color:#15171a !important;border-color:#2a2e34 !important}
  .bm-text{color:#f3f4f6 !important}
  .bm-muted{color:#9aa3af !important}
  .bm-line{border-color:#2a2e34 !important}
  .bm-soft{background-color:#1b1e22 !important;border-color:#2a2e34 !important}
  .bm-btn{background-color:#ffffff !important;color:#111418 !important}
  .bm-info-bg{background-color:#0b2230 !important}.bm-info-c{color:#7dd3fc !important}
  .bm-success-bg{background-color:#0d2418 !important}.bm-success-c{color:#86efac !important}
  .bm-warn-bg{background-color:#2a1f08 !important}.bm-warn-c{color:#fcd34d !important}
  .bm-danger-bg{background-color:#2c1111 !important}.bm-danger-c{color:#fca5a5 !important}
  .bm-neutral-bg{background-color:#1f2328 !important}.bm-neutral-c{color:#cbd5e1 !important}
`;

const css = `
  :root{color-scheme:light dark;supported-color-schemes:light dark}
  a{text-decoration:none}
  @media (prefers-color-scheme: dark){${darkCss}}
  @media only screen and (max-width:620px){.bm-pad{padding:24px 20px !important}.bm-h1{font-size:23px !important}.bm-col{display:block !important;width:100% !important}}
`;

/* ---------- the shell every email sits in ---------- */

export function EmailShell({
  preview,
  pref = "offers",
  reason,
  children,
  forceDark = false,
}: {
  preview: string;
  pref?: Pref;
  /** Why this reader is getting it, in one clause: "you sent an offer to x.com" */
  reason?: string;
  children: React.ReactNode;
  forceDark?: boolean;
}) {
  const settings = `${APP_URL}/account#notifications`;
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <style>{css}</style>
        {forceDark && <style>{darkCss}</style>}
      </Head>
      <Preview>{preview}</Preview>
      <Body className="bm-page" style={{ margin: 0, padding: 0, fontFamily: font }}>
        {/* The page colour lives on our own table: the Body component moves its style into an inner cell the dark rules can't reach */}
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} className="bm-page" style={{ backgroundColor: "#eef0f3" }}>
          <tbody>
            <tr>
              <td style={{ padding: "28px 12px" }}>
        <Container style={{ maxWidth: 600, margin: "0 auto" }}>
          {/* brand row */}
          <Section style={{ padding: "0 4px 16px" }}>
            <table role="presentation" cellPadding={0} cellSpacing={0} style={{ width: "100%" }}>
              <tbody>
                <tr>
                  <td style={{ width: 36, verticalAlign: "middle" }}>
                    <Img src={`${APP_URL}/apple-icon.png`} width={32} height={32} alt="Backlink Market" style={{ borderRadius: 9, display: "block" }} />
                  </td>
                  <td style={{ verticalAlign: "middle", paddingLeft: 10 }}>
                    <Text className="bm-text" style={{ margin: 0, fontSize: 15, fontWeight: 700, color: ink, letterSpacing: "-0.01em" }}>
                      Backlink Market
                    </Text>
                  </td>
                  <td style={{ verticalAlign: "middle", textAlign: "right" }}>
                    <Link href={APP_URL} className="bm-muted" style={{ fontSize: 12, color: muted }}>
                      backlinkmarket.co
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* the card */}
          <Section className="bm-card bm-pad" style={{ backgroundColor: "#ffffff", border: `1px solid ${line}`, borderRadius: 20, padding: "36px 36px 32px" }}>
            {children}
          </Section>

          {/* footer */}
          <Section style={{ padding: "20px 8px 0", textAlign: "center" }}>
            <Text className="bm-muted" style={{ margin: "0 0 6px", fontSize: 12, lineHeight: "18px", color: muted }}>
              {reason ? `You're getting this because ${reason}. ` : ""}
              {pref === "always" ? (
                "It's an account-safety message, so it can't be switched off."
              ) : pref === "internal" ? (
                "Internal alert for the Backlink Market team."
              ) : (
                <>
                  Choose which emails you get under{" "}
                  <Link href={settings} className="bm-muted" style={{ color: muted, textDecoration: "underline" }}>
                    Account → Notifications
                  </Link>{" "}
                  ({prefNames[pref]}).
                </>
              )}
            </Text>
            <Text className="bm-muted" style={{ margin: 0, fontSize: 12, lineHeight: "18px", color: muted }}>
              <Link href={`${APP_URL}/buyer-rules`} className="bm-muted" style={{ color: muted, textDecoration: "underline" }}>
                Buyer rules
              </Link>{" "}
              ·{" "}
              <Link href={`${APP_URL}/seller-rules`} className="bm-muted" style={{ color: muted, textDecoration: "underline" }}>
                Seller rules
              </Link>{" "}
              · Backlink Market never holds or moves your money.
            </Text>
          </Section>
        </Container>
              </td>
            </tr>
          </tbody>
        </table>
      </Body>
    </Html>
  );
}

/* ---------- building blocks ---------- */

export function Hero({ icon, tone = "info", eyebrow, title, subtitle }: { icon: string; tone?: Tone; eyebrow: string; title: string; subtitle?: React.ReactNode }) {
  const t = tones[tone];
  return (
    <Section style={{ marginBottom: 22 }}>
      <table role="presentation" cellPadding={0} cellSpacing={0} style={{ marginBottom: 16 }}>
        <tbody>
          <tr>
            <td data-skip-in-text="true" className={`bm-${tone}-bg`} style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: t.bg, textAlign: "center", fontSize: 24, lineHeight: "48px" }}>
              {icon}
            </td>
            <td style={{ paddingLeft: 12, verticalAlign: "middle" }}>
              <Text className={`bm-${tone}-c`} style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: t.c }}>
                {eyebrow}
              </Text>
            </td>
          </tr>
        </tbody>
      </table>
      <Text className="bm-text bm-h1" style={{ margin: 0, fontSize: 28, lineHeight: "34px", fontWeight: 750, letterSpacing: "-0.025em", color: ink }}>
        {title}
      </Text>
      {subtitle && (
        <Text className="bm-muted" style={{ margin: "10px 0 0", fontSize: 16, lineHeight: "25px", color: muted }}>
          {subtitle}
        </Text>
      )}
    </Section>
  );
}

export function Greeting({ name }: { name?: string }) {
  return (
    <Text className="bm-text" style={{ margin: "0 0 14px", fontSize: 15, lineHeight: "24px", color: ink }}>
      {name ? `Hi ${name},` : "Hi,"}
    </Text>
  );
}

export function P({ children, small = false }: { children: React.ReactNode; small?: boolean }) {
  return (
    <Text className={small ? "bm-muted" : "bm-text"} style={{ margin: "0 0 14px", fontSize: small ? 13 : 15, lineHeight: small ? "20px" : "24px", color: small ? muted : ink }}>
      {children}
    </Text>
  );
}

export function B({ children }: { children: React.ReactNode }) {
  return <strong style={{ fontWeight: 650 }}>{children}</strong>;
}

export function Mono({ children }: { children: React.ReactNode }) {
  return (
    <span className="bm-soft" style={{ fontFamily: mono, fontSize: "0.88em", backgroundColor: "#f2f4f7", border: `1px solid ${line}`, borderRadius: 6, padding: "1px 6px", wordBreak: "break-all" }}>
      {children}
    </span>
  );
}

/** A tinted box with a coloured edge: warnings, deadlines, good news. */
export function Callout({ tone = "info", title, children }: { tone?: Tone; title?: string; children?: React.ReactNode }) {
  const t = tones[tone];
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} style={{ width: "100%", margin: "0 0 16px" }}>
      <tbody>
        <tr>
          <td className={`bm-${tone}-bg`} style={{ backgroundColor: t.bg, borderLeft: `4px solid ${t.bar}`, borderRadius: 12, padding: "14px 16px" }}>
            {title && (
              <Text className={`bm-${tone}-c`} style={{ margin: children ? "0 0 4px" : 0, fontSize: 14, fontWeight: 700, color: t.c }}>
                {title}
              </Text>
            )}
            {children && (
              <Text className="bm-text" style={{ margin: 0, fontSize: 14, lineHeight: "22px", color: ink }}>
                {children}
              </Text>
            )}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export function Cta({ href, children, tone = "neutral", secondary }: { href: string; children: React.ReactNode; tone?: "neutral" | "success" | "danger" | "warn"; secondary?: { href: string; label: string } }) {
  const bg = tone === "success" ? "#16a34a" : tone === "danger" ? "#dc2626" : tone === "warn" ? "#d97706" : "#181818";
  return (
    <Section style={{ margin: "22px 0 8px" }}>
      <Button href={href} className={tone === "neutral" ? "bm-btn" : undefined} style={{ backgroundColor: bg, color: "#ffffff", fontSize: 15, fontWeight: 650, borderRadius: 999, padding: "14px 28px", display: "inline-block", textDecoration: "none" }}>
        {children}
      </Button>
      {secondary && (
        <Link href={secondary.href} className="bm-muted" style={{ display: "inline-block", marginLeft: 16, fontSize: 14, color: muted, textDecoration: "underline" }}>
          {secondary.label}
        </Link>
      )}
    </Section>
  );
}

export function Rule() {
  return <hr className="bm-line" style={{ border: 0, borderTop: `1px solid ${line}`, margin: "22px 0" }} />;
}

/** A site, as a small chip with its favicon. */
export function SiteChip({ domain, strong = true }: { domain: string; strong?: boolean }) {
  return (
    <span style={{ whiteSpace: "nowrap" }}>
      <Img src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`} width={18} height={18} alt="" style={{ display: "inline-block", verticalAlign: "-4px", borderRadius: 5, marginRight: 6 }} />
      <span className="bm-text" style={{ fontWeight: strong ? 650 : 500, color: ink }}>
        {domain}
      </span>
    </span>
  );
}

/** Market + reference, for the top of a card. */
export function Tag({ children, tone = "neutral" }: { children: React.ReactNode; tone?: Tone }) {
  const t = tones[tone];
  return (
    <span className={`bm-${tone}-bg bm-${tone}-c`} style={{ display: "inline-block", backgroundColor: t.bg, color: t.c, fontSize: 11, fontWeight: 650, borderRadius: 999, padding: "3px 10px", letterSpacing: "0.02em" }}>
      {children}
    </span>
  );
}

/** A soft panel that groups facts. */
export function Panel({ title, tag, children }: { title?: React.ReactNode; tag?: React.ReactNode; children: React.ReactNode }) {
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} style={{ width: "100%", margin: "0 0 16px" }}>
      <tbody>
        <tr>
          <td className="bm-soft" style={{ backgroundColor: "#f8f9fb", border: `1px solid ${line}`, borderRadius: 16, padding: "16px 18px" }}>
            {(title || tag) && (
              <table role="presentation" cellPadding={0} cellSpacing={0} style={{ width: "100%", marginBottom: 10 }}>
                <tbody>
                  <tr>
                    <td className="bm-text" style={{ fontSize: 14, fontWeight: 700, color: ink }}>
                      {title}
                    </td>
                    <td style={{ textAlign: "right" }}>{tag}</td>
                  </tr>
                </tbody>
              </table>
            )}
            {children}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/** Label / value rows. */
export function Facts({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} style={{ width: "100%" }}>
      <tbody>
        {rows.map(([k, v], i) => (
          <tr key={i}>
            <td className="bm-muted" style={{ padding: "6px 12px 6px 0", fontSize: 13, color: muted, width: "34%", verticalAlign: "top" }}>
              <p style={{ margin: 0 }}>
                {k}
                <span style={{ display: "none", fontSize: 0, maxHeight: 0, overflow: "hidden" }}>: </span>
              </p>
            </td>
            <td className="bm-text" style={{ padding: "6px 0", fontSize: 14, color: ink, verticalAlign: "top", lineHeight: "20px" }}>
              <p style={{ margin: 0 }}>{v}</p>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** One link: who hosts it, who it points to, where, with what text. */
export function LinkFlow({ from, to, page, target, anchor, label, tone = "neutral" }: { from: string; to: string; page?: string; target?: string; anchor?: string; label?: string; tone?: Tone }) {
  return (
    <Panel tag={label ? <Tag tone={tone}>{label}</Tag> : undefined} title={undefined}>
      <table role="presentation" cellPadding={0} cellSpacing={0} style={{ width: "100%", marginBottom: page || target || anchor ? 10 : 0 }}>
        <tbody>
          <tr>
            <td style={{ fontSize: 14 }}>
              <SiteChip domain={from} />
            </td>
            <td className="bm-muted" style={{ textAlign: "center", fontSize: 18, color: muted, padding: "0 10px" }}>
              →
            </td>
            <td style={{ fontSize: 14, textAlign: "right" }}>
              <SiteChip domain={to} />
            </td>
          </tr>
        </tbody>
      </table>
      {(page || target || anchor) && (
        <Facts
          rows={[
            ...(page ? ([["Sits on", <Mono key="p">{page}</Mono>]] as [string, React.ReactNode][]) : []),
            ...(target ? ([["Points to", <Mono key="t">{target}</Mono>]] as [string, React.ReactNode][]) : []),
            ...(anchor ? ([["Anchor text", <span key="a">“{anchor}”</span>]] as [string, React.ReactNode][]) : []),
          ]}
        />
      )}
    </Panel>
  );
}

/** A big number with a label: "24 hours left". */
export function Countdown({ value, label, tone = "warn" }: { value: string; label: string; tone?: Tone }) {
  const t = tones[tone];
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} style={{ width: "100%", margin: "0 0 16px" }}>
      <tbody>
        <tr>
          <td className={`bm-${tone}-bg`} style={{ backgroundColor: t.bg, borderRadius: 16, padding: "18px 20px", textAlign: "center" }}>
            <Text className={`bm-${tone}-c`} style={{ margin: 0, fontSize: 36, lineHeight: "40px", fontWeight: 800, letterSpacing: "-0.03em", color: t.c }}>
              {value}
            </Text>
            <Text className="bm-text" style={{ margin: "4px 0 0", fontSize: 13, color: ink }}>
              {label}
            </Text>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/** Numbered steps. */
export function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} style={{ width: "100%", margin: "0 0 12px" }}>
      <tbody>
        {items.map((it, i) => (
          <tr key={i}>
            <td data-skip-in-text="true" style={{ width: 34, verticalAlign: "top", padding: "5px 0" }}>
              <span className="bm-soft bm-text" style={{ display: "inline-block", width: 24, height: 24, lineHeight: "24px", textAlign: "center", borderRadius: 999, backgroundColor: "#f2f4f7", border: `1px solid ${line}`, fontSize: 12, fontWeight: 700, color: ink }}>
                {i + 1}
              </span>
            </td>
            <td className="bm-text" style={{ padding: "5px 0", fontSize: 14, lineHeight: "22px", color: ink, verticalAlign: "top" }}>
              <p style={{ margin: 0 }}>
                <span style={{ display: "none", fontSize: 0, maxHeight: 0, overflow: "hidden" }}>{i + 1}. </span>
                {it}
              </p>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** What someone wrote to the reader. */
export function Quote({ from, children }: { from: string; children: React.ReactNode }) {
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} style={{ width: "100%", margin: "0 0 16px" }}>
      <tbody>
        <tr>
          <td className="bm-soft" style={{ backgroundColor: "#f8f9fb", border: `1px solid ${line}`, borderRadius: 16, padding: "14px 18px" }}>
            <Text className="bm-muted" style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 650, color: muted }}>
              Message from {from}
            </Text>
            <Text className="bm-text" style={{ margin: 0, fontSize: 15, lineHeight: "23px", color: ink, fontStyle: "italic" }}>
              “{children}”
            </Text>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/** Three boxes for the three penalty points. */
export function PenaltyMeter({ points, max = 3 }: { points: number; max?: number }) {
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} style={{ width: "100%", margin: "0 0 16px" }}>
      <tbody>
        <tr>
          {Array.from({ length: max }).map((_, i) => (
            <td key={i} style={{ padding: i ? "0 0 0 6px" : 0 }}>
              <div style={{ height: 10, borderRadius: 999, backgroundColor: i < points ? (points >= max ? "#ef4444" : "#f59e0b") : "#e4e7ec" }} />
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

/** A row of figures: weekly summary, DR. */
export function Stats({ items }: { items: { label: string; value: React.ReactNode; tone?: Tone; hint?: string }[] }) {
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} style={{ width: "100%", margin: "0 0 16px", borderCollapse: "separate", borderSpacing: 0 }}>
      <tbody>
        <tr>
          {items.map((s, i) => (
            <td key={i} className="bm-soft bm-col" style={{ backgroundColor: "#f8f9fb", border: `1px solid ${line}`, borderRadius: 14, padding: "12px 14px", width: `${100 / items.length}%`, verticalAlign: "top" }}>
              <Text className="bm-muted" style={{ margin: 0, fontSize: 12, color: muted }}>
                {s.label}
              </Text>
              <Text className={s.tone ? `bm-${s.tone}-c` : "bm-text"} style={{ margin: "2px 0 0", fontSize: 26, lineHeight: "30px", fontWeight: 750, letterSpacing: "-0.02em", color: s.tone ? tones[s.tone].c : ink }}>
                {s.value}
              </Text>
              {s.hint && (
                <Text className="bm-muted" style={{ margin: "2px 0 0", fontSize: 11, color: muted }}>
                  {s.hint}
                </Text>
              )}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

/** A short checklist of what we looked at. */
export function Checks({ items }: { items: { ok: boolean; label: string }[] }) {
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} style={{ width: "100%", margin: "0 0 12px" }}>
      <tbody>
        {items.map((c, i) => (
          <tr key={i}>
            <td style={{ width: 26, padding: "3px 0", fontSize: 15, color: c.ok ? "#16a34a" : "#dc2626", verticalAlign: "top" }}>{c.ok ? "✓" : "✕"}</td>
            <td className="bm-text" style={{ padding: "3px 0", fontSize: 14, color: ink }}>
              {c.label}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** The three sites of an ABC pool, in the order they give. */
export function PoolLoop({ seats, you }: { seats: string[]; you: string }) {
  return (
    <Panel>
      <table role="presentation" cellPadding={0} cellSpacing={0} style={{ width: "100%" }}>
        <tbody>
          {seats.map((d, i) => (
            <tr key={d}>
              <td style={{ padding: "7px 0", fontSize: 14 }}>
                <SiteChip domain={d} />
                {d === you && (
                  <span style={{ marginLeft: 8 }}>
                    <Tag tone="info">you</Tag>
                  </span>
                )}
              </td>
              <td className="bm-muted" style={{ padding: "7px 0", fontSize: 13, color: muted, textAlign: "right" }}>
                links to <b>{seats[(i + 1) % seats.length]}</b>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

/** A plain list of problems we found. */
export function Problems({ items }: { items: { label: string; reason: string }[] }) {
  return (
    <>
      {items.map((p, i) => (
        <Callout key={i} tone="danger" title={p.label}>
          {p.reason}
        </Callout>
      ))}
    </>
  );
}
