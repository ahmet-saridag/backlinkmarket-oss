"use client";

import { useState } from "react";
import Link from "next/link";
import { LogoMark } from "@/components/brand/Logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

/* Pieces shared by the public (signed-out) pages: header, Google sign-in and the login gate. */

/** Sticky top bar: brand, an optional middle slot (e.g. market tabs), Google sign-in. */
export function PublicHeader({ center }: { center?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 -mx-3 bg-background/85 px-3 backdrop-blur md:-mx-6 md:px-6">
      <div className="flex h-16 items-center gap-3">
        <Link href="/" aria-label="Backlink Market" className="flex shrink-0 items-center gap-2">
          <LogoMark size={32} />
          <span className="hidden text-sm tracking-tight sm:inline">
            <span className="font-semibold">Backlink</span> <span className="text-muted-foreground">Market</span>
          </span>
        </Link>
        {center ? (
          <nav className="hidden flex-1 justify-center md:flex" aria-label="Markets">
            {center}
          </nav>
        ) : (
          <span className="hidden flex-1 md:block" />
        )}
        <span className="flex-1 md:hidden" />
        <ThemeToggle />
        <GoogleButton size="sm" label="Sign in" />
      </div>
      {center && <div className="pb-2.5 md:hidden">{center}</div>}
    </header>
  );
}

/** Google's "G" mark. */
function GoogleG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/** The only way in: Google, through Supabase OAuth. */
export function GoogleButton({ label = "Continue with Google", size = "lg", className }: { label?: string; size?: "sm" | "lg"; className?: string }) {
  const [busy, setBusy] = useState(false);
  async function signIn() {
    setBusy(true);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setBusy(false);
  }
  return (
    <button
      type="button"
      onClick={signIn}
      disabled={busy}
      className={cn(
        buttonVariants({ variant: "outline", size }),
        "gap-2 rounded-full border-foreground/15 bg-card font-medium hover:bg-muted",
        className,
      )}
    >
      <GoogleG className={size === "sm" ? "size-4" : "size-5"} />
      {label}
    </button>
  );
}

/** Browsing is public; the first action asks you to sign in. */
export function LoginGate({ target, onClose }: { target: string | null; onClose: () => void }) {
  return (
    <Dialog open={target !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <LogoMark size={40} className="mb-1" />
          <DialogTitle>Sign in to continue</DialogTitle>
          <DialogDescription>
            Sign in to make an offer, propose a swap or join a pool{target ? ` with ${target}` : ""}. Browsing stays free.
          </DialogDescription>
        </DialogHeader>
        <GoogleButton className="w-full" />
        <p className="text-center text-[11px] text-muted-foreground">New here? The same button creates your account.</p>
      </DialogContent>
    </Dialog>
  );
}

/** Sticky bar on public detail pages: the actions are visible, but each asks you to sign in first. */
export function PublicActionBar({ title, hint, actions }: { title: string; hint: string; actions: { label: string; primary?: boolean }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="sticky bottom-3 z-20 flex flex-col gap-3 rounded-2xl border bg-card/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:pl-4">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">{title}</span>
          <span className="truncate text-xs text-muted-foreground">{hint}</span>
        </div>
        <div className="flex gap-2">
          {actions.map((a) => (
            <Button
              key={a.label}
              size="lg"
              variant={a.primary ? "default" : "outline"}
              className="flex-1 rounded-full sm:flex-none"
              onClick={() => setOpen(true)}
            >
              {a.label}
            </Button>
          ))}
        </div>
      </div>
      <LoginGate target={open ? title : null} onClose={() => setOpen(false)} />
    </>
  );
}

/** Any button on a public page that needs an account: it opens the sign-in gate instead. */
export function GatedButton({
  target,
  children,
  variant = "default",
  className,
}: {
  target: string;
  children: React.ReactNode;
  variant?: "default" | "outline";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} className={cn("rounded-full", className)} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <LoginGate target={open ? target : null} onClose={() => setOpen(false)} />
    </>
  );
}
