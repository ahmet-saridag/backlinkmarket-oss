import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { SitesTable } from "@/components/sites/SitesTable";
import { loadSites } from "@/lib/list-loaders";
import type { SP } from "@/lib/list-params";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "My Sites · Backlink Market" };

export default async function SitesPage({ searchParams }: PageProps<"/sites">) {
  const props = await loadSites((await searchParams) as SP);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        title="My Sites"
        description="Sites you've added and the markets they're listed in."
        actions={
          <Link href="/sites/new" className={cn(buttonVariants(), "rounded-full")}>
            <Plus className="size-4" /> Add Site
          </Link>
        }
      />
      <SitesTable {...props} />
    </div>
  );
}
