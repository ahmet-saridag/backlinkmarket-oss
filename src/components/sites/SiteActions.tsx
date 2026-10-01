"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { archiveSite, setSiteStatus } from "@/app/(app)/sites/[domain]/actions";
import { DeleteSiteDialog } from "@/components/sites/DeleteSiteDialog";
import { PauseSiteDialog } from "@/components/sites/PauseSiteDialog";
import { toast } from "@/lib/toast";
import type { UserSite } from "@/lib/types";

/** Delete and Pause/Resume, shown top-right on the site's edit page. */
export function SiteActions({ site }: { site: UserSite }) {
  const [status, setStatus] = useState(site.status);
  const [deleting, setDeleting] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const current = { ...site, status };
  const paused = status === "paused";
  return (
    <>
      <Button variant="outline" className="rounded-full text-red-600 dark:text-red-400" onClick={() => setDeleting(true)}>
        <Trash2 className="size-3.5" /> Delete
      </Button>
      <Button variant="outline" className="rounded-full" disabled={pending} onClick={() => setPausing(true)}>
        {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
        {paused ? "Resume" : "Pause"}
      </Button>
      <PauseSiteDialog
        site={current}
        mode={paused ? "resume" : "pause"}
        open={pausing}
        onOpenChange={setPausing}
        onConfirm={() => {
          const next = paused ? "active" : "paused";
          setPausing(false);
          startTransition(async () => {
            const result = await setSiteStatus(site.id, next);
            if (result.ok) {
              setStatus(next);
              toast.success(next === "paused" ? "Site paused" : "Site resumed");
              router.push(`/sites/${site.domain}`);
            } else {
              toast.error(result.error ?? "Couldn't update the site.");
            }
          });
        }}
      />
      <DeleteSiteDialog
        site={deleting ? current : null}
        onOpenChange={setDeleting}
        onDeleted={() => {
          startTransition(async () => {
            const result = await archiveSite(site.id);
            if (result.ok) {
              toast.success(`${site.domain} deleted`);
              router.push("/sites");
            } else {
              toast.error(result.error ?? "Couldn't delete the site.");
            }
          });
        }}
      />
    </>
  );
}
