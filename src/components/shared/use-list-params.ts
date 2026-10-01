"use client";

import { useIsFetching } from "@tanstack/react-query";
import { patchUrlSearch } from "@/lib/query/url-state";

/**
 * List state lives in the URL, but changing it doesn't navigate: `set` merges a patch into the query string
 * in place (several calls in one tick accumulate) and resets to page 1 unless the patch is about paging.
 * The list's data then comes from the query cache or a small request — see `useLiveList`.
 * `pending` is true while a list request is in flight.
 */
export function useListParams() {
  const pending = useIsFetching({ queryKey: ["list"] }) > 0;
  const set = patchUrlSearch;
  const clear = (keys: string[]) => patchUrlSearch(Object.fromEntries(keys.map((k) => [k, null])));
  return { set, clear, pending };
}
