import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/app-url";

/** Everything behind sign-in stays out of search; the public market (/ and /listing) is open. */
const PRIVATE = ["/api/", "/auth/", "/dashboard", "/account", "/offers", "/sites", "/backlinks", "/payment-history", "/markets"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      // Named explicitly (not just left to the default) so a future blanket disallow can't quietly cut off
      // AI answer engines from citing the public listings. OAI-SearchBot / Claude-SearchBot / PerplexityBot are
      // the live crawlers behind citations; Applebot-Extended and CCBot fall back to opt-out when a site says nothing.
      {
        userAgent: [
          "GPTBot",
          "OAI-SearchBot",
          "ChatGPT-User",
          "ClaudeBot",
          "Claude-User",
          "Claude-SearchBot",
          "PerplexityBot",
          "Perplexity-User",
          "Google-Extended",
          "Applebot",
          "Applebot-Extended",
          "CCBot",
          "meta-externalagent",
          "Bytespider",
          "cohere-ai",
        ],
        allow: "/",
        disallow: PRIVATE,
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
