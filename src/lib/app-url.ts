// Single source of truth for the public site origin. Trailing slashes are stripped so callers can
// concatenate paths (`${APP_URL}/listing/...`) safely. Falls back to production rather than an
// empty string, so a missing env var never ships localhost canonicals or broken absolute URLs.
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://backlinkmarket.co").trim().replace(/\/$/, "");
export const SITE_NAME = "Backlink Market";
export const SITE_DESCRIPTION = "Buy backlink placements from verified sites, swap links one-to-one, or join three-way ABC pools — pay sellers directly, no escrow.";
