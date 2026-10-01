import "server-only";

/**
 * The secret only our server holds (Vercel). The database keeps nothing but its hash, and the few writes a person must
 * never make themselves — an offer's price, a link going live, a check result — are functions that ask for it.
 */
export function appSecret(): string {
  const s = process.env.APP_SECRET;
  if (!s) throw new Error("APP_SECRET is not set");
  return s;
}
