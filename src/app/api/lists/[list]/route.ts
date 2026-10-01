import { LOADERS, type ListName } from "@/lib/list-loaders";
import { createClient } from "@/lib/supabase/server";

/** One endpoint for every list's data: the same loaders the pages use, answering a query string with JSON. */
export async function GET(request: Request, { params }: { params: Promise<{ list: string }> }) {
  const { list } = await params;
  if (!(list in LOADERS)) return Response.json({ error: "Unknown list" }, { status: 404 });
  const entry = LOADERS[list as ListName];

  if (!entry.public) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return Response.json({ error: "Sign in required" }, { status: 401 });
  }

  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const body = await entry.load(sp);
  return Response.json(body, {
    // The public list can be shared by everyone for a moment; private ones never are.
    headers: { "Cache-Control": entry.public ? "public, s-maxage=30, stale-while-revalidate=120" : "private, no-store" },
  });
}
