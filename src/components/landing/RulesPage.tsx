import Link from "next/link";
import { PublicHeader } from "@/components/landing/public-ui";

export interface RuleSection {
  title: string;
  rules: React.ReactNode[];
}

/** A plain reading page for the rules a person agrees to before selling or buying. */
export function RulesPage({ title, intro, sections, other }: { title: string; intro: string; sections: RuleSection[]; other: { href: string; label: string } }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pb-20 md:px-6">
      <PublicHeader />
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-medium tracking-tight">{title}</h1>
        <p className="text-[15px] text-muted-foreground">{intro}</p>
      </div>
      {sections.map((s, i) => (
        <section key={s.title} className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">
            {i + 1}. {s.title}
          </h2>
          <ul className="flex flex-col gap-2 text-[15px] leading-relaxed">
            {s.rules.map((r, j) => (
              <li key={j} className="flex gap-2.5">
                <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/60" aria-hidden />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="border-t pt-6 text-sm text-muted-foreground">
        Also read the{" "}
        <Link href={other.href} className="underline underline-offset-2 hover:text-foreground">
          {other.label}
        </Link>
        . These rules describe how the marketplace works today and can change; the version on this page is the current one.
      </p>
    </main>
  );
}
