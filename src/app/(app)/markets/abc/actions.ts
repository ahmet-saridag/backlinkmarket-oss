"use server";

import { suspensionMessage } from "@/lib/standing-data";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, type ActionResult } from "@/lib/validation/account";
import { joinPoolSchema, setPoolLinkSchema } from "@/lib/validation/offer";

const NOT_SIGNED_IN: ActionResult = { ok: false, error: "You're signed out. Sign in again and retry." };

/** Errors the database functions raise on purpose, in words a person can act on. */
const friendly = (message: string) => {
  const known = [
    "pick one of your active sites",
    "this site is not listed in ABC pools",
    "the target URL must be a page on your own site",
    "this room is already locked",
    "you are not in this room",
    "this site already has a seat in this room",
    "your account already has a seat in this room",
    "this site is outside the pool host's accepted range",
    "the pool host is outside the range this site accepts",
    "this site is already in 10 pools",
    "you can't join your own pool",
    "a hosted pool closes when its site leaves ABC",
    "enter the anchor text",
  ];
  const hit = known.find((k) => message.includes(k));
  return hit ? hit.charAt(0).toUpperCase() + hit.slice(1) + "." : "Something went wrong. Please try again.";
};

function done(): ActionResult {
  revalidatePath("/markets/abc");
  revalidatePath("/offers");
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Take a seat in another site's open pool. The third seat locks the room and creates the three links. */
export async function joinPool(input: unknown): Promise<ActionResult & { roomId?: string; locked?: boolean }> {
  const parsed = joinPoolSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NOT_SIGNED_IN;

  const { siteId, targetUrl, anchor, roomId } = parsed.data;
  const suspended = await suspensionMessage(supabase, auth.user.id);
  if (suspended) return { ok: false, error: suspended };
  const { error } = await supabase.rpc("abc_join", { p_room: roomId, p_site_id: siteId, p_target_url: targetUrl, p_anchor: anchor });
  if (error) return { ok: false, error: friendly(error.message) };
  const { data: room } = await supabase.from("abc_rooms").select("status").eq("id", roomId).maybeSingle();
  done();
  return { ok: true, roomId, locked: room?.status === "locked" };
}

/** Change the page and anchor of your own seat while the room is still filling. */
export async function setPoolLink(input: unknown): Promise<ActionResult> {
  const parsed = setPoolLinkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NOT_SIGNED_IN;
  const { error } = await supabase.rpc("abc_set_link", { p_room: parsed.data.roomId, p_site: parsed.data.siteId, p_target_url: parsed.data.targetUrl, p_anchor: parsed.data.anchor });
  return error ? { ok: false, error: friendly(error.message) } : done();
}

export async function leavePool(roomId: string, siteId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NOT_SIGNED_IN;
  const { error } = await supabase.rpc("abc_leave", { p_room: roomId, p_site: siteId });
  return error ? { ok: false, error: friendly(error.message) } : done();
}
