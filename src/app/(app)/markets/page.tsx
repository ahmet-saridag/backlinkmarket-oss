import { redirect } from "next/navigation";

// Markets has no hub page; the sidebar sub-items go straight to each list.
export default function MarketsPage() {
  redirect("/markets/paid");
}
