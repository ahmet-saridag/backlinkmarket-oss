import type { Metadata } from "next";
import { LogsView } from "@/components/logs/LogsView";
import { loadLogs } from "@/lib/list-loaders";
import type { SP } from "@/lib/list-params";

export const metadata: Metadata = { title: "Logs · Backlink Market" };

export default async function LogsPage({ searchParams }: PageProps<"/logs">) {
  return <LogsView {...await loadLogs((await searchParams) as SP)} />;
}
