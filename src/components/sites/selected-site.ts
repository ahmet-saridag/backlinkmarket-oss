"use client";

import { useSyncExternalStore } from "react";

// The site the header tracks (DR + monitoring). "all" = every site. Remembered per browser.
const STORAGE_KEY = "header-site";
let memoryValue = "";
const listeners = new Set<() => void>();

function read() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? memoryValue;
  } catch {
    return memoryValue;
  }
}

export function setHeaderSite(id: string) {
  memoryValue = id;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** Selected site id, "all", or "" when nothing was picked yet (callers fall back to the primary site). */
export const useHeaderSiteId = () => useSyncExternalStore(subscribe, read, () => "");
