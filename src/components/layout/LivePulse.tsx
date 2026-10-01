"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const EVERY_MS = 45_000;

/** While the page is open, asks every so often whether something of yours changed, and refreshes the page data if so. */
export function LivePulse() {
  const router = useRouter();
  const last = useRef<string | null>(null);

  useEffect(() => {
    let stopped = false;
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/pulse", { cache: "no-store" });
        if (!res.ok || stopped) return;
        const { v } = (await res.json()) as { v: string };
        if (last.current !== null && v !== last.current) router.refresh();
        last.current = v;
      } catch {
        // offline or a blip: try again next time
      }
    };
    void check();
    const id = setInterval(check, EVERY_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      stopped = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
  }, [router]);

  return null;
}
