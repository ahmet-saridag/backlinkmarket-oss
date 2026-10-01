import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { SiteActions } from "@/components/sites/SiteActions";
import { SiteEditForm } from "@/components/sites/SiteEditForm";
import { checkSitemap } from "@/lib/site-verification";
import { domainOfUserSite, getRealUserSite } from "@/lib/sites-data";
import { domainFromParam, isUuid } from "@/lib/domain";
import { SiteLabel } from "@/components/shared/SiteFavicon";

export const metadata: Metadata = { title: "Edit Site · Backlink Market" };

export default async function EditSitePage({ params }: PageProps<"/sites/[domain]/edit">) {
  const { domain: param } = await params;
  if (isUuid(param)) {
    const d = await domainOfUserSite(param);
    if (d) redirect(`/sites/${d}/edit`);
    notFound();
  }
  const site = await getRealUserSite(domainFromParam(param));
  if (!site) notFound();
  const sitemap = await checkSitemap(site.domain);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        title={<SiteLabel domain={site.domain} size={24} className="gap-2.5" />}
        back={{ href: `/sites/${site.domain}`, label: site.domain }}
        actions={<SiteActions site={site} />}
      />
      <SiteEditForm site={site} sitemapPages={sitemap.pages} />
    </div>
  );
}
