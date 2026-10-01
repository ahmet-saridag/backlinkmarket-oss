# Email events — what to send, to whom, when

Source of truth for the email layer. Built from the real state machine (`offers.status`, the 72-hour deadlines, the link
monitor, penalties, pools, sites and DR). Priority: **P0** must exist at launch, **P1** should, **P2** nice to have.
"Pref" is the existing Account → Notifications switch (`offers`, `deadlines`, `pools`, `missing`, `payouts`, `disputes`);
`always` = account-safety mail that can't be switched off; `new` = a switch that doesn't exist yet.

Roles: **Buyer** = who sends a Paid offer / proposes a swap. **Seller** = who gets it and hosts the link. In Exchange the
recipient hosts one link and the proposer the other (two offers). In ABC every member hosts one link and receives one.

## The 12 offer states and who is told on entry

| State | Entered when | Who gets an email |
|---|---|---|
| SENT | offer/proposal created | Seller/recipient (T01); buyer confirmation (T02, optional) |
| ACCEPTED | seller accepts (ABC: pool locks) | Buyer/proposer (T03); ABC: all 3 members (T32) |
| PAYMENT_RECEIVED | Paid: seller confirms payment | Buyer (T10) |
| DELIVERED | host says the link is placed | nobody (the check takes seconds); if it fails: host (T13) |
| ACTIVE_MONITORING | check passed, timed placement | Receiver + host (T14) |
| COMPLETED | permanent link verified / term ended / swap done | Receiver + host (T14 / T15 / T16 / T18) |
| ANOMALY_CHECK | link gone/nofollow/site down, 2 looks | Host (T20), receiver (T21); final day (T22) |
| REJECTED | seller declines | Buyer/proposer (T04) |
| CANCELLED | by sender / withdrawn / timeout / partner failed / "payment not received" | the other side (T05, T07, T11, T19); the penalised side (T27, T28) |
| EXPIRED | no answer in 72 h | Proposer (T06); recipient penalised (T27) |
| VIOLATED_BANNED | link not restored in 7 days | Host (T24 + T28), receiver (T25) |
| VIOLATED_NO_BAN | site down 7 days | Both (T26) |

## Templates

| ID | Email | To | Pref | Pri | Variants inside the template |
|---|---|---|---|---|---|
| T01 | Offer / swap proposal received | seller, recipient | offers | P0 | Paid (price, categories) · Exchange (both links, their message) |
| T02 | Offer sent (confirmation) | buyer, proposer | always | P2 | Paid · Exchange |
| T03 | Offer accepted | buyer, proposer | offers | P0 | Paid (pay + upload proof, 72 h) · Exchange (place your link, 72 h) |
| T04 | Offer declined | buyer, proposer | offers | P0 | — |
| T05 | Offer cancelled by sender before an answer | seller, recipient | offers | P1 | — |
| T06 | Offer expired (no answer in 72 h) | buyer, proposer | offers | P0 | — |
| T07 | Withdrawn after acceptance | the other side | offers | P0 | Paid (buyer, with reason) · Exchange (either side) |
| T08 | Deadline reminder, 24 h left | the one who owes the step | deadlines | P0 | respond to offer · pay · confirm payment (ban warning) · place link Paid (ban warning) · place link Exchange/ABC |
| T09 | Buyer says they paid — proof attached | seller | payouts | P0 | — |
| T10 | Payment confirmed — seller will place your link | buyer | payouts | P0 | — |
| T11 | Seller says the payment didn't arrive (offer closed) | buyer | payouts | P0 | — |
| T12 | Payment completed (receipt) | buyer + seller | payouts | P2 | sent · received |
| T13 | We couldn't verify your link (what we saw) | host | disputes | P0 | not found · nofollow · wrong text · page unreachable · check stuck |
| T14 | Link verified and live | receiver; host | payouts | P0 | receiver ("your link is live") · host ("verified") — Paid/Exchange/ABC |
| T15 | Swap complete (both links live) | both | offers | P1 | — |
| T16 | Pool complete (all three links live) | 3 members | pools | P1 | — |
| T17 | Placement ends soon (30 d, 7 d) | receiver (+ host) | new: monitoring | P1 | 30 d · 7 d |
| T18 | Placement term ended — deal complete | both | offers | P1 | — |
| T19 | Closed because the other side ran out of time | the non-penalised side | offers | P0 | buyer didn't pay · seller didn't confirm/deliver (Paid) · swap partner failed · pool closed — each with "take your link down" or "nothing more is due" |
| T20 | Your link needs attention — 7 days | host | disputes | P0 | missing · nofollow · site down |
| T21 | A link to your site needs attention | receiver | missing | P0 | missing · nofollow · site down |
| T22 | Last day of the 7-day window | host; receiver | disputes / missing | P0 | host (ban warning) · receiver |
| T23 | The link is back | both | missing | P1 | — |
| T24 | Link removed — you are banned | host | always | P0 | — |
| T25 | The link to your site was removed — host penalised | receiver | missing | P0 | — |
| T26 | Link lost — site stayed down, no penalty | both | disputes | P1 | — |
| T27 | Penalty points added | penalised account | always | P0 | no answer · payment not sent · no delivery · one-sided delivery · (link removed → T24) — with "n of 3 this month" |
| T28 | Account banned for 90 days | banned account | always | P0 | after 3 points · Paid 3-point cases |
| T29 | Ban lifted | the account | always | P1 | — |
| T31 | Someone joined your pool | pool host / members | pools | P1 | — |
| T32 | Pool locked — place your link in 72 h | 3 members | pools | P0 | who gives to whom |
| T33 | A member left the pool | remaining members | pools | P2 | — |
| T34 | New open pool for your site (after a lock) | host | pools | P2 | — |
| T35 | Site added and verified | owner | always | P1 | — |
| T36 | Domain Rating changed a lot (±5 in 30 d) | owner | new: site health | P2 | up · down |
| T37 | We couldn't read your Domain Rating for days | owner | new: site health | P2 | — |
| T38 | Your sitemap can't be read | owner | new: site health | P2 | page-picking disabled · count dropped |
| T39 | Add a payout account | seller with a Paid listing / accepted offer | payouts | P1 | — |
| T40 | Welcome | new account | always | P1 | — |
| T41 | Weekly summary (links live, expiring, needs attention) | owner | new: digest | P2 | — |
| T42 | Dispute opened ("payment didn't arrive" + proof) | ops | internal | P0 | — |
| T43 | A ban was applied | ops | internal | P1 | — |
| T44 | System alert (queue backlog, cron failing, DR error rate) | ops | internal | P0 | — |

**Totals:** 43 templates — 22 P0, 13 P1, 8 P2 (T30 intentionally unused). About 63 distinct renders once the
variants above are counted. 40 go to users and 3 are internal ops mail (T42–T44); T02, T35 and T40 are plain account mail.

## Event → email, per market

### Paid
SENT → T01 (seller) · seller silent 48 h → T08 respond (seller) · 72 h → T06 (buyer) + T27 (seller +1) ·
ACCEPTED → T03 (buyer) · buyer silent → T08 pay · 72 h → T19 buyer-didn't-pay (seller) + T27 (buyer +1) ·
buyer withdraws → T07 (seller) · buyer says paid → T09 (seller) · seller silent → T08 confirm · 72 h → T28 + T19 (buyer) ·
seller "didn't receive" → T11 (buyer), T42 (ops) · seller confirms → T10 (buyer) · seller silent → T08 place link ·
72 h → T28 + T19 (buyer) · check fails → T13 (seller) · check passes → T14 (both) · completed payment → T12.

### Exchange
proposal → T01 (recipient) · 72 h → T06 (proposer) + T27 (recipient) · accept → T03 (proposer) · withdraw → T07 (other) ·
24 h left → T08 (each host not done) · 72 h → T27 (late host) + T19 (the other: take down / nothing due) ·
check fails → T13 · link verified → T14 · both live → T15.

### ABC
join → T31 · lock → T32 (3) · 24 h left → T08 (each host not done) · one late → T27 (late member) + T19 (the other two) ·
check fails → T13 · each link verified → T14 · all live → T16.

### Monitoring (every market, every live link)
first miss: nothing (re-checked in an hour) · second miss → T20 (host) + T21 (receiver) · final day → T22 ·
fixed → T23 · 7 days gone → T24 + T28 (host) + T25 (receiver) · site down 7 days → T26 · timed term: 30 d / 7 d → T17,
end → T18.

### Account and sites
sign-up → T40 · site added → T35 · penalty → T27 · 3 points → T28 · 90 days later → T29 ·
DR ±5 → T36 · DR unreadable → T37 · sitemap unreadable → T38 · weekly → T41.

## What the code needs to emit these
Most events already exist as a database change (status moves, `link_events`, `violations`, `suspended_until`), so one
outbox table fed by those changes is enough. Not yet emitted anywhere, so new triggers or cron work is required:
24 h reminders (T08), term-ending (T17), ban lifted (T29), DR change/unreadable (T36/T37), sitemap unreadable (T38),
weekly summary (T41), pool joins/leaves (T31, T33), welcome and site-added (T40, T35), ops alerts (T42–T44).

## Where the templates are
All 43 are built (React Email) in `src/emails/`: `ui.tsx` (shared design), `templates/*.tsx` (one component per template,
grouped by area), `registry.ts` (the list), `render.tsx` (subject + HTML + plain text, nothing is sent). Preview every
variant in light and dark at `/dev/emails` (development only). 79 variants render today. Sending is not wired up yet:
`RESEND_API_KEY` is stored in `.env.local` and Vercel, and the sender address still has to be a verified Resend domain.

## How it is wired (live)
- **Outbox:** every email is a row in `email_outbox` (unique `dedupe_key`, so one event never sends twice). Database
  triggers on `offers`, `violations`, `payments`, `sites`, `profiles`, `abc_seats` and `abc_rooms` write the rows;
  `enqueue_scheduled_emails()` (pg_cron, every 15 min) writes the time-based ones (T08, T17, T22, T29, T36–T39, T41, T44).
  Enqueueing can never fail the deal that caused it.
- **Sender:** `/api/cron/send-emails` (pg_cron, every minute). It leases a batch, has the database gather the context for each
  row (`cron_email_context`), builds the props (`src/emails/build.ts`), applies the recipient's switches, renders and sends
  through Resend with an idempotency key. Retries: 1 min, 5 min, 30 min, 2 h, 12 h, then failed (an ops alert, T44).
- **Switches:** the six existing groups plus `monitoring` and `site` (on by default) and `digest` (off until chosen).
  Account-safety mail and ops mail ignore the switches.
- **Checks without sending:** `?preview=1&id=N` shows what row N would send; `?send_to=you@x.com&id=N` sends it to you only.
