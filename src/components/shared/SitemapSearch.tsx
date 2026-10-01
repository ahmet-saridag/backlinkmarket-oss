"use client";

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Search box over a site's sitemap URLs with single or multi selection. */
export function SitemapSearch({
  pages,
  selected,
  onToggle,
  placeholder = "Search pages from sitemap…",
}: {
  pages: string[];
  selected: string[];
  onToggle: (page: string) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const results = useMemo(
    () => pages.filter((p) => p.toLowerCase().includes(q.toLowerCase())).slice(0, 100),
    [pages, q],
  );
  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="pl-8" />
      </div>
      <ul className="max-h-48 divide-y overflow-y-auto rounded-lg border">
        {results.length === 0 && <li className="px-3 py-2 text-xs text-muted-foreground">No pages match.</li>}
        {results.map((p) => {
          const on = selected.includes(p);
          return (
            <li key={p}>
              <button
                type="button"
                onClick={() => onToggle(p)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left font-mono text-xs hover:bg-muted/60",
                  on && "bg-muted",
                )}
              >
                <span className={cn("grid size-4 place-items-center rounded border", on && "border-primary bg-primary text-primary-foreground")}>
                  {on && <Check className="size-3" />}
                </span>
                <span className="truncate">{p}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
