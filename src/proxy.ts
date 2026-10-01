import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Signed-out visitors can browse "/", /listing and the crawler-facing files; everything else needs a session. */
const PUBLIC_PREFIXES = ["/listing", "/auth", "/sitemap", "/seller-rules", "/buyer-rules"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const path = request.nextUrl.pathname;
  const isPublic = path === "/" || path === "/sitemap.xml" || path === "/api/lists/landing" || path === "/api/cron/refresh-dr" || path === "/api/cron/scan-links" || path === "/api/cron/send-emails" || path === "/robots.txt" || (process.env.NODE_ENV !== "production" && path.startsWith("/dev/emails")) || PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

  // Signed-in users have no use for the public landing and listing pages: send them into the app.
  // The token in the cookie can still verify locally (getClaims) after the session behind it is gone,
  // and the app layout then bounces to "/". Only redirect when the server confirms the user, or the two loop.
  if (data?.claims && (path === "/" || path === "/listing" || path.startsWith("/listing/"))) {
    const { data: verified } = await supabase.auth.getUser();
    if (verified.user) {
      const url = request.nextUrl.clone();
      url.pathname = path === "/" ? "/dashboard" : "/markets/paid";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  if (!data?.claims && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|svg|gif|webp|txt|mp4|webm)$).*)"],
};
