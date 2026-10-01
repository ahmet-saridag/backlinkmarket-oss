// Pure domain string helpers — no I/O, safe to import from client components. Server-only checks
// (DNS, Ahrefs) live in @/lib/site-verification.
export const normalizeDomain = (input: string) =>
  input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split("?")[0];

const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;

export const isValidDomainFormat = (domain: string) => DOMAIN_RE.test(domain);

/** Well-known path the seller uploads the ownership token to — plain HTTP, no DNS access needed. */
export const VERIFICATION_FILE_PATH = "/backlinkmarket-verify.txt";
export const verificationFileUrl = (domain: string) => `https://${domain}${VERIFICATION_FILE_PATH}`;

/** Sites' page addresses are their domain names; old links used Postgres uuids, which still resolve (and redirect). */
export const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

/** A page-address segment as a domain: decoded, lowercased. */
export const domainFromParam = (param: string) => decodeURIComponent(param).trim().toLowerCase();
