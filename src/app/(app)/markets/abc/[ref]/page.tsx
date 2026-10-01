import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleCheck, Clock, Hourglass } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { AbcCycle, roomSeats } from "@/components/markets/AbcCycle";
import { PoolSurface, SeatDots, bandLabel } from "@/components/markets/AbcPool";
import { AbcLeaveButton, AbcLinkForm, AbcSeatForm } from "@/components/markets/AbcSeatForm";
import { Callout } from "@/components/shared/Callout";
import { PageHeader } from "@/components/shared/PageHeader";
import { MAX_POOLS_PER_SITE, getAbcRoom, getSitePoolCounts } from "@/lib/abc-data";
import { rangeProblem } from "@/lib/market-rules";
import { listRealUserSites } from "@/lib/sites-data";
import { cn } from "@/lib/utils";

/** "DR 40–60 · traffic 5k+" for the range a pool host accepts; empty when anyone can join. */
const acceptText = (t: { drMin?: number; drMax?: number; trafficMin?: number; trafficMax?: number | null } | null | undefined) => {
  if (!t) return "";
  const parts: string[] = [];
  if ((t.drMin ?? 0) > 0 || (t.drMax ?? 100) < 100) parts.push(`DR ${t.drMin ?? 0}–${t.drMax ?? 100}`);
  if ((t.trafficMin ?? 0) > 0 || t.trafficMax != null) parts.push(`traffic ${t.trafficMin ?? 0}${t.trafficMax != null ? `–${t.trafficMax}` : "+"}`);
  return parts.join(" · ");
};

export const metadata: Metadata = { title: "Pool · ABC Pool · Backlink Market" };

/** One pool: the loop, where it stands, and what you can do — join if you're not in, or leave / place your link if you are. */
export default async function AbcPoolPage({ params }: PageProps<"/markets/abc/[ref]">) {
  const { ref } = await params;
  const room = await getAbcRoom(ref);
  if (!room) notFound();

  const mySites = (await listRealUserSites()).filter((s) => s.markets.includes("abc") && s.status === "active");
  const counts = await getSitePoolCounts();
  const inRoom = new Set(room.seats.filter((s) => s.mine).map((s) => s.siteId));
  const blocked: Record<string, string> = {};
  for (const s of mySites) {
    const hostRange = room.host && room.hostSiteId !== s.id ? rangeProblem(s, room.host.terms) : null;
    const yourRange = room.host && room.hostSiteId !== s.id ? rangeProblem(room.host, s.exchangeTerms) : null;
    // One seat per account in a pool, whichever of your sites it is
    if (inRoom.size > 0) blocked[s.id] = inRoom.has(s.id) ? "already has a seat here" : "your account already has a seat here";
    else if (hostRange) blocked[s.id] = `out of range: ${hostRange}`;
    else if (yourRange) blocked[s.id] = "the host is outside the range this site accepts";
    else if ((counts[s.id] ?? 0) >= MAX_POOLS_PER_SITE) blocked[s.id] = `already in ${MAX_POOLS_PER_SITE} pools`;
  }
  const mySeats = room.seats.filter((s) => s.mine);
  const open = 3 - room.seatCount;

  const state = !room.mine && room.status === "locked"
    ? { icon: CircleCheck, tone: "text-muted-foreground", title: "Locked — the loop is running", body: "Three sites, each placing a link for the next one: A → B → C → A. You can watch it here; a locked pool can't be joined any more." }
    : !room.mine
    ? { icon: Hourglass, tone: "text-sky-600 dark:text-sky-400", title: `${open} seat${open > 1 ? "s" : ""} open`, body: `Take a seat with one of your sites — one seat per account in a pool, and a site can be in up to ${MAX_POOLS_PER_SITE} pools. Nothing is due until all three seats are taken.` }
    : room.closed && room.mine
    ? { icon: Clock, tone: "text-red-600 dark:text-red-400", title: "Pool closed", body: "A member didn't place their link within 72 hours and was penalised. The pool is closed for everyone: nothing more is due, and if you already placed a link you can take it down." }
    : room.status === "open"
      ? { icon: Hourglass, tone: "text-sky-600 dark:text-sky-400", title: `${open} seat${open > 1 ? "s" : ""} open`, body: "Waiting for more sites. Nothing is due until all three seats are taken — you'll see it in Offers when the room locks." }
      : room.linkDue
        ? { icon: Clock, tone: "text-amber-600 dark:text-amber-400", title: "Place your link · 72h", body: "The pool is locked. Put your link on the page you choose, then press the button in Offers — we check it ourselves and the offer goes live." }
        : room.complete
          ? { icon: CircleCheck, tone: "text-green-600 dark:text-green-400", title: "Loop complete", body: "Your link is live and the link you were getting is live too. Both are checked daily — see them in Offers and Backlinks." }
          : room.givePlaced
            ? { icon: Hourglass, tone: "text-sky-600 dark:text-sky-400", title: "Your link is live", body: "Waiting for the site that links to you to place theirs. We check their page ourselves and you'll be told the moment it's live." }
            : { icon: CircleCheck, tone: "text-muted-foreground", title: "Locked", body: "The other sites place their links; each one is checked by us, not by you." };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader
        title={`Pool #${room.ref}`}
        description={`${bandLabel(room)}${room.hostDomain ? ` · opened by ${room.hostDomain}` : ""}${acceptText(room.host?.terms) ? ` · accepts ${acceptText(room.host?.terms)}` : ""}`}
        back={{ href: "/markets/abc", label: "ABC Pool" }}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <PoolSurface className="flex flex-col gap-2 p-4 pb-8 md:p-6 md:pb-10">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium tracking-[0.06em] text-sky-700 uppercase dark:text-sky-400">Pool #{room.ref}</span>
            <SeatDots filled={room.seatCount} className="[&>span]:size-3" />
          </div>
          <AbcCycle seats={room.mine ? roomSeats(room.seats) : roomSeats(room.seats.map((s) => ({ ...s, mine: false })))} className="my-2" />
        </PoolSurface>

        <div className="flex flex-col gap-4">
          <div className={cn("flex flex-col gap-2 rounded-2xl border bg-card p-4", room.linkDue && "border-amber-500/40")}>
            <span className={cn("flex items-center gap-2 text-sm font-medium", state.tone)}>
              <state.icon className="size-4" /> {state.title}
            </span>
            <p className="text-[13px] text-muted-foreground">{state.body}</p>
            {room.mine && room.status === "locked" && (
              <Link href="/offers" className={cn(buttonVariants({ variant: room.linkDue ? "default" : "outline" }), "mt-1 rounded-full")}>
                See it in Offers
              </Link>
            )}
            
          </div>

          {room.status === "open" &&
            mySeats.map((seat) => (
              <div key={seat.siteId} className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
                <span className="text-sm font-medium">Your link · {seat.domain}</span>
                <p className="text-[13px] text-muted-foreground">The page of {seat.domain} the link you receive points to.</p>
                <AbcLinkForm roomId={room.id} siteId={seat.siteId} domain={seat.domain} initial={room.myLinks[seat.siteId] ?? null} />
                {seat.siteId !== room.hostSiteId && <AbcLeaveButton roomId={room.id} siteId={seat.siteId} domain={seat.domain} />}
              </div>
            ))}

          {room.status === "open" && !room.mine && (
            <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
              <span className="text-sm font-medium">Join this pool</span>
              {mySites.length === 0 ? (
                <Callout variant="warning" title="No site in ABC Pool">
                  Open one of your sites to ABC Pool in{" "}
                  <Link href="/sites" className="underline">
                    My Sites
                  </Link>{" "}
                  first.
                </Callout>
              ) : (
                <AbcSeatForm sites={mySites} roomId={room.id} submitLabel="Take this seat" blocked={blocked} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
