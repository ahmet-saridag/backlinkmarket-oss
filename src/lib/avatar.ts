import "server-only";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const MAX_BYTES = 2 * 1024 * 1024;
const BUCKET = "avatars";

/** Where an account's photo is served from once it's stored with us. */
export const storedAvatarPrefix = () => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;

/** Only Google's own image host is ever fetched — the URL comes from sign-in metadata, but never trust it blindly. */
const isGoogleAvatar = (raw: string) => {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && /(^|\.)googleusercontent\.com$/.test(url.hostname);
  } catch {
    return false;
  }
};

/**
 * Copies the Google profile photo into our public `avatars` bucket at `<userId>/avatar.jpg` and
 * points the profile at it. Other people (marketplace buyers) can then see it at a fixed URL, and
 * it no longer depends on Google's image host allowing hotlinks.
 */
export async function mirrorGoogleAvatar(supabase: Supabase, userId: string, sourceUrl: string): Promise<string | null> {
  if (sourceUrl.startsWith(storedAvatarPrefix())) return sourceUrl;
  if (!isGoogleAvatar(sourceUrl)) return null;

  // Ask Google for a 256px square instead of the tiny default
  const source = sourceUrl.replace(/=s\d+(-c)?$/, "") + "=s256-c";
  const res = await fetch(source, { signal: AbortSignal.timeout(8_000) });
  if (!res.ok) return null;
  const type = res.headers.get("content-type") ?? "";
  if (!["image/jpeg", "image/png", "image/webp"].includes(type)) return null;
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_BYTES) return null;

  const path = `${userId}/avatar.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, { upsert: true, contentType: type });
  if (error) return null;
  const url = `${supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
  const { error: saveError } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
  return saveError ? null : url;
}
