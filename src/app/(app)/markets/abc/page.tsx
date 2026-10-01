import type { Metadata } from "next";
import { AbcRules } from "@/components/markets/AbcPool";
import { AbcPoolBoard } from "@/components/markets/AbcPoolBoard";
import { PageHeader } from "@/components/shared/PageHeader";
import { loadAbc } from "@/lib/list-loaders";
import type { SP } from "@/lib/list-params";

export const metadata: Metadata = { title: "ABC Pool · Backlink Market" };

export default async function AbcPage({ searchParams }: PageProps<"/markets/abc">) {
  const props = await loadAbc((await searchParams) as SP);
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <PageHeader
        title="ABC Pool"
        description="Three-way link loops: A links to B, B to C, C back to A. Each of your sites can host its own pool, and you can join other pools."
      />
      <AbcRules />
      <AbcPoolBoard {...props} />
    </div>
  );
}
