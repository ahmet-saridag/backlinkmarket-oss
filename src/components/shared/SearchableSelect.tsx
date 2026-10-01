"use client";

import { useMemo } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { cn } from "@/lib/utils";
import type { SelectOption } from "@/components/shared/SimpleSelect";

/** Type-to-filter select for long lists (countries, languages, time zones). */
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Search…",
  className,
  id,
}: {
  value: string | null;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  id?: string;
}) {
  const selected = useMemo(() => options.find((o) => o.value === value) ?? null, [options, value]);
  return (
    <Combobox
      items={options}
      value={selected}
      onValueChange={(o) => o && onChange((o as SelectOption).value)}
      itemToStringLabel={(o) => (o as SelectOption).label}
      itemToStringValue={(o) => (o as SelectOption).value}
    >
      <ComboboxInput id={id} placeholder={placeholder} className={cn("w-full", className)} />
      <ComboboxContent>
        <ComboboxEmpty>No matches.</ComboboxEmpty>
        <ComboboxList>
          {(o: SelectOption) => (
            <ComboboxItem key={o.value} value={o}>
              {o.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
