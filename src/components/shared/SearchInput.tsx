"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useListParams } from "@/components/shared/use-list-params";
import { cn } from "@/lib/utils";

/** Search box that writes `q` to the URL after a short pause, so the server does the searching. */
export function SearchInput({
  value,
  placeholder,
  className,
  param = "q",
  compact,
}: {
  value: string;
  placeholder: string;
  className?: string;
  param?: string;
  compact?: boolean;
}) {
  const { set } = useListParams();
  const [text, setText] = useState(value);
  const committed = useRef(value);

  // Follow the URL when it changes from elsewhere (e.g. "Clear all")
  useEffect(() => {
    if (value !== committed.current) {
      committed.current = value;
      setText(value);
    }
  }, [value]);

  useEffect(() => {
    if (text.trim() === committed.current) return;
    const t = setTimeout(() => {
      committed.current = text.trim();
      set({ [param]: text.trim() });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <div className={cn("relative flex-1", className)}>
      <Search className={cn("pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground", compact ? "left-2 size-3" : "left-2.5 size-3.5")} />
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} className={compact ? "h-7 pl-7 text-xs" : "pl-8"} aria-label={placeholder} />
    </div>
  );
}
