import { exportPayments, parsePaymentFilters } from "@/lib/payments-data";
import { payoutMethodLabels } from "@/lib/validation/account";
import { createClient } from "@/lib/supabase/server";

const statusLabels = { completed: "Completed", pending: "Payment sent", refunded: "Refunded" } as const;

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Accounting export built on the server from the same filters the dialog counts: oldest first, signed amounts (received +, paid −). */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new Response("Sign in to export payments.", { status: 401 });

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const filters = parsePaymentFilters(params);
  const rows = await exportPayments(filters);

  const header = ["Date", "Payment ID", "Type", "Description", "Offer ID", "Status", "Provider", "Amount", "Currency"];
  const lines = rows.map((p) =>
    [
      p.date,
      p.id,
      p.type === "received" ? "Received" : "Paid",
      p.description,
      p.offerRef ?? p.offerId,
      statusLabels[p.status],
      payoutMethodLabels[p.provider],
      (p.type === "received" ? p.amount : -p.amount).toFixed(2),
      "USD",
    ]
      .map(csvCell)
      .join(","),
  );
  // BOM so Excel opens UTF-8 correctly; CRLF per RFC 4180
  const body = "﻿" + [header.join(","), ...lines].join("\r\n");
  const today = new Date().toISOString().slice(0, 10);
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payments_${filters.from || "start"}_to_${filters.to || today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
