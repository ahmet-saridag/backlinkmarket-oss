"use client";

import { useSyncExternalStore } from "react";

/**
 * The list state (search, filters, sort, page) lives in the URL's query string, but changing it does not
 * navigate: the address is updated in place and the data comes from the query cache (or one small request),
 * so a tab or filter switch never waits on a full server-rendered page.
 */
const EVENT = "list-url-change";

const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  window.addEventListener("popstate", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("popstate", cb);
  };
};

/** The current `?query` string (without the leading "?"). `serverSearch` is what the server rendered with. */
export function useUrlSearch(serverSearch: string): string {
  return useSyncExternalStore(
    subscribe,
    () => window.location.search.replace(/^\?/, ""),
    () => serverSearch,
  );
}

type Value = string | number | boolean | string[] | null | undefined;

/** The query string a patch would produce, without touching the address bar (for prefetching). */
export function searchWith(patch: Record<string, Value>): string {
  const next = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(patch)) {
    const empty = value === null || value === undefined || value === "" || value === false || (Array.isArray(value) && value.length === 0);
    if (empty) next.delete(key);
    else next.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  if (!("page" in patch)) next.delete("page");
  return next.toString();
}

/** Merge a patch into the current query string and write it to the address bar without navigating. */
export function patchUrlSearch(patch: Record<string, Value>) {
  const next = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(patch)) {
    const empty = value === null || value === undefined || value === "" || value === false || (Array.isArray(value) && value.length === 0);
    if (empty) next.delete(key);
    else next.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  if (!("page" in patch)) next.delete("page");
  const qs = next.toString();
  window.history.replaceState(window.history.state, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
  window.dispatchEvent(new Event(EVENT));
}
