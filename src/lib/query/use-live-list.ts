"use client";

import { useEffect, useRef, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUrlSearch } from "@/lib/query/url-state";

/**
 * A server-rendered list that then follows the URL: the first paint uses the props the server rendered,
 * every later filter / tab / page change is read from the cache or fetched from /api/lists/<name>.
 * The previous page stays on screen (dimmed) while a new one loads. Returns the props for the view.
 */
export function useLiveList<T>(list: string, initial: T): { data: T; fetching: boolean } {
  const client = useQueryClient();
  const search = useUrlSearch("");
  // The query string the server rendered `initial` for: whatever the address was when this view first mounted
  const [first] = useState(() => {
    const search = typeof window === "undefined" ? "" : window.location.search.replace(/^\?/, "");
    // Every time this list opens, the server has just rendered it: that is newer than anything the cache kept from an
    // earlier visit (a site added since, an offer that changed), so it replaces the cached copy for this address.
    if (typeof window !== "undefined") {
      client.invalidateQueries({ queryKey: ["list", list], refetchType: "none" }); // other filter states of this list are stale too
      client.setQueryData(["list", list, search], initial);
    }
    return search;
  });

  const { data, isFetching } = useQuery<T>({
    queryKey: ["list", list, search],
    queryFn: async ({ signal }) => {
      const res = await fetch(`/api/lists/${list}${search ? `?${search}` : ""}`, { signal });
      if (!res.ok) throw new Error(`Couldn't load ${list}`);
      return (await res.json()) as T;
    },
    initialData: search === first ? initial : undefined,
    placeholderData: keepPreviousData,
  });

  // The server re-rendered the page (after an action's router.refresh()): its data is newer than the cache.
  const seen = useRef(initial);
  useEffect(() => {
    if (seen.current === initial) return;
    seen.current = initial;
    client.setQueryData(["list", list, window.location.search.replace(/^\?/, "")], initial);
    client.invalidateQueries({ queryKey: ["list", list], refetchType: "none" });
  }, [initial, client, list]);

  return { data: data ?? initial, fetching: isFetching };
}

/** Warm the cache for a list state (e.g. a tab) before it is clicked. */
export function usePrefetchList(list: string) {
  const client = useQueryClient();
  return (search: string) =>
    client.prefetchQuery({
      queryKey: ["list", list, search],
      queryFn: async () => {
        const res = await fetch(`/api/lists/${list}${search ? `?${search}` : ""}`);
        if (!res.ok) throw new Error(`Couldn't load ${list}`);
        return res.json();
      },
    });
}
