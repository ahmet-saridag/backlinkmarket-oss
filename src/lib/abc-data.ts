import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface AcceptedRange {
  drMin?: number;
  drMax?: number;
  trafficMin?: number;
  trafficMax?: number | null;
}

export interface AbcSeat {
  seat: number;
  siteId: string;
  domain: string;
  dr: number;
  mine: boolean;
}

export interface AbcRoomView {
  id: string;
  /** Short reference used in the pool's page address */
  ref: string;
  niche: string;
  drBand: number;
  status: "open" | "locked";
  seatCount: number;
  /** You sit in this room */
  mine: boolean;
  /** Your site opened it (one room per site) */
  hosted: boolean;
  hostSiteId: string | null;
  hostDomain: string | null;
  /** The host site's numbers and the DR / traffic range it accepts from pool members (null = anyone) */
  host: { dr: number; traffic: number; terms: AcceptedRange | null } | null;
  seats: AbcSeat[];
  lockedAt: string | null;
  /** When the pool was opened */
  createdAt: string;
  /** Locked room where your own link is still owed */
  linkDue: boolean;
  /** Your two links in a locked pool, once placed: the one you give and the one you get */
  givePlaced: boolean;
  getPlaced: boolean;
  /** Both of your links are up */
  complete: boolean;
  /** A member missed the 72 hours and the pool was closed for everyone */
  closed: boolean;
  /** The page and anchor of each of your seats here, by site id */
  myLinks: Record<string, { targetUrl: string; anchor: string }>;
}

/** Every pool: open ones anyone can join, and locked ones anyone can look at. */
export async function getAbcRooms(): Promise<AbcRoomView[]> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const [{ data: rooms }, { data: seats }, { data: offers }, { data: mySeats }] = await Promise.all([
    supabase.from("abc_rooms").select("*").order("created_at", { ascending: false }).limit(300),
    supabase.rpc("abc_room_seats"),
    supabase.from("offers").select("pair_id, status, seller_user_id, buyer_user_id").eq("type", "abc").or(`seller_user_id.eq.${auth.user.id},buyer_user_id.eq.${auth.user.id}`),
    supabase.from("abc_seats").select("room_id, site_id, target_url, anchor").eq("user_id", auth.user.id),
  ]);
  const hostIds = [...new Set((rooms ?? []).map((r) => r.host_site_id).filter(Boolean))] as string[];
  const { data: hostSites } = hostIds.length ? await supabase.from("sites").select("id, dr, traffic, exchange_terms").in("id", hostIds) : { data: [] };
  const hostById = new Map((hostSites ?? []).map((h) => [h.id as string, { dr: h.dr as number, traffic: h.traffic as number, terms: (h.exchange_terms as AcceptedRange | null) ?? null }]));
  return (rooms ?? []).map((r) => {
    const roomSeats: AbcSeat[] = (seats ?? [])
      .filter((s: { room_id: string }) => s.room_id === r.id)
      .map((s: { seat: number; site_id: string; domain: string; dr: number; mine: boolean }) => ({ seat: s.seat, siteId: s.site_id, domain: s.domain, dr: s.dr, mine: s.mine }));
    const myLink = (offers ?? []).find((o) => o.pair_id === r.id && o.seller_user_id === auth.user.id);
    const myGet = (offers ?? []).find((o) => o.pair_id === r.id && o.buyer_user_id === auth.user.id);
    const placed = (status?: string) => !!status && ["ACTIVE_MONITORING", "ANOMALY_CHECK", "COMPLETED"].includes(status);
    return {
      id: r.id as string,
      ref: r.ref as string,
      niche: r.niche as string,
      drBand: r.dr_band as number,
      status: r.status as "open" | "locked",
      seatCount: r.seat_count as number,
      mine: roomSeats.some((s) => s.mine),
      hosted: r.host_user_id === auth.user.id,
      hostSiteId: (r.host_site_id as string | null) ?? null,
      hostDomain: roomSeats.find((s) => s.siteId === r.host_site_id)?.domain ?? null,
      host: hostById.get(r.host_site_id as string) ?? null,
      seats: roomSeats,
      lockedAt: (r.locked_at as string | null) ?? null,
      createdAt: r.created_at as string,
      myLinks: Object.fromEntries(
        (mySeats ?? []).filter((x) => x.room_id === r.id).map((x) => [x.site_id as string, { targetUrl: x.target_url as string, anchor: x.anchor as string }]),
      ),
      linkDue: r.status === "locked" && myLink?.status === "ACCEPTED",
      givePlaced: placed(myLink?.status),
      getPlaced: placed(myGet?.status),
      complete: r.status === "locked" && placed(myLink?.status) && placed(myGet?.status),
      closed: r.status === "locked" && (offers ?? []).some((o) => o.pair_id === r.id && o.status === "CANCELLED"),
    };
  });
}

export const MAX_POOLS_PER_SITE = 10;

/** How many pools each of your sites is in right now (the limit is per domain, not per account). */
export async function getSitePoolCounts(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("abc_my_site_pool_counts");
  return Object.fromEntries((data ?? []).map((r: { site_id: string; pools: number }) => [r.site_id, r.pools]));
}

export async function getAbcRoom(ref: string): Promise<AbcRoomView | undefined> {
  return (await getAbcRooms()).find((r) => r.ref === ref || r.id === ref);
}

export type AbcTab = "mine" | "joined" | "explore";

export interface AbcBoardPage {
  tab: AbcTab;
  /** Rooms on the current page of the joined / explore tabs */
  rooms: AbcRoomView[];
  /** Every room your sites host (one per site), for the My pools tab */
  hosted: AbcRoomView[];
  counts: Record<AbcTab, number>;
  /** Locked pools that still need your link */
  due: AbcRoomView[];
  total: number;
  page: number;
}

/** The board's data for one tab: search and paging are done here. */
export type AbcStatusFilter = "all" | "open" | "locked";

export async function getAbcBoard(f: { tab: AbcTab; q: string; status: AbcStatusFilter; page: number; pageSize: number }): Promise<AbcBoardPage> {
  const all = await getAbcRooms();
  // Your sites' own open pools (one each); a hosted pool that has locked moves to "Joined" with the others you take part in
  const hosted = all.filter((r) => r.hosted && r.status === "open");
  const joined = all.filter((r) => r.mine && !(r.hosted && r.status === "open"));
  // Pools you aren't in: the open ones first (they can be joined), then the locked ones (look only)
  const explore = all
    .filter((r) => !r.mine && (f.status === "all" || r.status === f.status))
    .sort((a, b) => Number(b.status === "open") - Number(a.status === "open"));
  const q = f.q.toLowerCase();
  const match = (r: AbcRoomView) => !q || r.niche.toLowerCase().includes(q) || r.seats.some((s) => s.domain.toLowerCase().includes(q));
  const source = (f.tab === "joined" ? joined : f.tab === "explore" ? explore : []).filter(match);
  const page = Math.min(f.page, Math.max(1, Math.ceil(source.length / f.pageSize)));
  return {
    tab: f.tab,
    rooms: source.slice((page - 1) * f.pageSize, page * f.pageSize),
    hosted,
    counts: { mine: hosted.length, joined: joined.length, explore: all.filter((r) => !r.mine).length },
    due: all.filter((r) => r.linkDue),
    total: source.length,
    page,
  };
}
