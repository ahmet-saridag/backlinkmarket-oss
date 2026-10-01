import type { Metadata } from "next";
import { BacklinksView } from "@/components/backlinks/BacklinksView";
import { loadBacklinks } from "@/lib/list-loaders";
import type { SP } from "@/lib/list-params";

export const metadata: Metadata = { title: "Backlinks · Backlink Market" };

export default async function BacklinksPage({ searchParams }: PageProps<"/backlinks">) {
  return <BacklinksView {...await loadBacklinks((await searchParams) as SP)} />;
}
