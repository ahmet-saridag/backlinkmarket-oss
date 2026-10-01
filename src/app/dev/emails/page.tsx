import { notFound } from "next/navigation";
import { emails } from "@/emails/registry";
import type { Group } from "@/emails/define";

// Every email template, rendered with sample content — development only.
export const dynamic = "force-dynamic";
export const metadata = { title: "Email templates", robots: { index: false, follow: false } };

const groups: Group[] = ["Offers", "Payments", "Delivery", "Closures", "Monitoring", "Penalties", "Pools", "Sites & DR", "Account", "Internal"];

export default async function EmailPreviewPage({ searchParams }: { searchParams: Promise<{ theme?: string; only?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { theme, only } = await searchParams;
  const dark = theme === "dark";
  const shown = only ? emails.filter((e) => e.id === only) : emails;
  const variantCount = emails.reduce((n, e) => n + e.variants.length, 0);

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-8 px-5 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Email templates</h1>
          <p className="text-sm text-muted-foreground">
            {emails.length} templates · {variantCount} variants. Preview only — nothing is sent from here.
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <a className="rounded-full border px-3 py-1.5 hover:bg-muted" href={`/dev/emails${only ? `?only=${only}` : ""}`}>
            Light
          </a>
          <a className="rounded-full border px-3 py-1.5 hover:bg-muted" href={`/dev/emails?theme=dark${only ? `&only=${only}` : ""}`}>
            Dark
          </a>
          {only && (
            <a className="rounded-full border px-3 py-1.5 hover:bg-muted" href="/dev/emails">
              All
            </a>
          )}
        </div>
      </header>

      <nav className="flex flex-wrap gap-1.5">
        {emails.map((e) => (
          <a key={e.id} href={`#${e.id}`} className="rounded-full border px-2.5 py-1 font-mono text-xs hover:bg-muted" title={e.name}>
            {e.id}
          </a>
        ))}
      </nav>

      {groups.map((g) => {
        const list = shown.filter((e) => e.group === g);
        if (!list.length) return null;
        return (
          <section key={g} className="flex flex-col gap-6">
            <h2 className="border-b pb-2 text-lg font-medium">{g}</h2>
            {list.map((e) => (
              <article key={e.id} id={e.id} className="flex flex-col gap-4 scroll-mt-6">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="rounded-md bg-foreground px-2 py-0.5 font-mono text-xs text-background">{e.id}</span>
                  <h3 className="text-base font-medium">{e.name}</h3>
                  <span className="text-xs text-muted-foreground">
                    to {e.to} · {e.pref} · {e.priority}
                  </span>
                </div>
                <div className="flex gap-5 overflow-x-auto pb-2">
                  {e.variants.map((v) => (
                    <figure key={v.key} className="flex shrink-0 flex-col gap-2" style={{ width: 640 }}>
                      <figcaption className="flex flex-col gap-0.5 text-xs">
                        <span className="font-medium">{v.label}</span>
                        <span className="text-muted-foreground">Subject: {v.subject}</span>
                      </figcaption>
                      <iframe
                        title={`${e.id} ${v.label}`}
                        src={`/dev/emails/render?id=${e.id}&v=${v.key}${dark ? "&theme=dark" : ""}`}
                        loading="lazy"
                        className="h-[820px] w-full rounded-2xl border bg-white"
                      />
                    </figure>
                  ))}
                </div>
              </article>
            ))}
          </section>
        );
      })}
    </div>
  );
}
