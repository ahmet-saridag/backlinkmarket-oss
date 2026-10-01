import type { Metadata, Viewport } from "next";
import "@fontsource-variable/instrument-sans";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/lib/query/provider";
import { Toaster } from "@/components/ui/sonner";
import { APP_URL, SITE_DESCRIPTION, SITE_NAME } from "@/lib/app-url";

const TITLE = "Backlink Market — buy backlinks from verified sites";

export const metadata: Metadata = {
  // metadataBase resolves relative canonicals and social image paths; APP_URL falls back to production,
  // so a missing env var never ships localhost canonicals to Google.
  metadataBase: new URL(APP_URL),
  title: { default: TITLE, template: "%s" },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  publisher: SITE_NAME,
  alternates: { canonical: "/" },
  appleWebApp: { title: SITE_NAME, statusBarStyle: "black-translucent" },
  openGraph: { title: TITLE, description: SITE_DESCRIPTION, url: APP_URL, siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: SITE_DESCRIPTION },
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0c" },
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <QueryProvider>{children}</QueryProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
