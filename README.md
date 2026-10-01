# Backlink Market

An open-source marketplace for backlinks. Site owners list their sites and trade links in three ways — **buy and sell**,
**swap 1:1**, or join **three-way ABC pools** — while the platform verifies every site, checks every delivered link, and
keeps monitoring it for as long as the deal runs.

Built with **Next.js 16** (App Router), **React 19**, **Tailwind CSS v4**, **shadcn/ui** (Base UI), **Supabase**
(Auth, Postgres, RLS, pg_cron) and **Resend** for email.

---

## Table of contents

- [Features](#features)
- [How the markets work](#how-the-markets-work)
- [Offer lifecycle](#offer-lifecycle)
- [Link monitoring](#link-monitoring)
- [Trust, standing and penalties](#trust-standing-and-penalties)
- [Sites: verification and metrics](#sites-verification-and-metrics)
- [Background jobs](#background-jobs)
- [Email](#email)
- [SEO and AI discoverability](#seo-and-ai-discoverability)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **Three markets** — Paid Market, Exchange (1:1 swaps) and ABC Pools (three-way loops).
- **Verified sites** — ownership proven with a token file on the domain; real DNS resolution and sitemap checks.
- **Domain Rating from Ahrefs**, refreshed daily, plus a self-reported organic traffic range.
- **Matching rules** — sellers set the DR and traffic ranges they accept; Exchange and ABC only show partners that fit both ways.
- **Automatic delivery check** — the submitted URL is loaded and the link is checked for presence, `dofollow` and the agreed anchor.
- **Continuous link monitoring** with an anomaly window before anything counts against a seller.
- **72-hour deadlines** for responses and deliveries, enforced by the database.
- **Penalty points and suspensions** in a monthly window.
- **Dashboard, offers inbox, backlinks list, payment history (CSV export), activity logs.**
- **Transactional email** for every state change, sent from a database outbox.
- **Google sign-in** via Supabase Auth.
- **Light and dark theme.**
- **LLM-friendly endpoints** (`/llms.txt`, `/llms-full.txt`, `/ai.txt`) and public listing pages with JSON-LD.

## How the markets work

### Paid Market

Buy a placement on a verified site. Placement categories: **Guest Post**, **Link Insertion**, **Review** and
**Footer Link**, each with a link duration of **forever**, **12 months** or **6 months**.

1. The buyer picks a site and categories and writes the brief (target page and anchor text). The price comes from the
   seller's listing (sellers can set a discount); buyers can't name their own price.
2. The seller accepts. The buyer then sees the seller's payout details (wire, PayPal, USDT or bank transfer) and pays
   them **directly** — Backlink Market never holds or moves money.
3. The buyer marks the payment as sent; the seller confirms it arrived.
4. The seller publishes the link and submits the live URL. The platform checks it automatically.
5. The link is monitored for the rest of the deal.

Offer totals must be between **$10** and **$50,000**. A user can have up to **10 open offers** at a time.

### Exchange

Swap links 1:1 with another site — no money changes hands. Each side places a link on their own site pointing to the
other. Matching is mutual: the listed site must accept one of your sites' DR/traffic, and your site must accept theirs.

### ABC Pools

Three-way link loops: **A → B → C → A**, so nobody links back directly. Each site can host its own pool and join up to
10. The pool locks when it fills; every member then hosts one link and receives one. Pools show whether the value
exchanged is balanced between participants.

## Offer lifecycle

| State | Entered when |
|---|---|
| `SENT` | Offer or proposal created |
| `ACCEPTED` | Seller accepts (ABC: the pool locks) |
| `PAYMENT_RECEIVED` | Paid Market: the seller confirms the buyer's payment arrived |
| `DELIVERED` | The host says the link is placed (checked within seconds) |
| `ACTIVE_MONITORING` | Delivery check passed; timed placement is being watched |
| `COMPLETED` | Permanent link verified, term ended, or swap done |
| `ANOMALY_CHECK` | Monitoring found a problem (link gone, `nofollow`, site down) |
| `REJECTED` | Seller declined |
| `CANCELLED` | Withdrawn, timed out, partner failed, or payment not received |
| `EXPIRED` | No answer within 72 hours |
| `VIOLATED_BANNED` | Link not restored within 7 days |
| `VIOLATED_NO_BAN` | Site was down for 7 days |

Sites with a payment sent or a live link can't be deleted or paused; pending offers on a deleted or paused site are
cancelled automatically and the other side is notified.

## Link monitoring

A worker (`/api/cron/scan-links`) claims batches of live links that are due, opens each distinct page once, and checks
that every link is still present, `dofollow` and using the agreed anchor. The schedule and work queue live in the
database (`cron_claim_scans` / `cron_apply_scan`), so two workers never scan the same link and a crashed worker's batch
is released again.

If something is wrong, the offer moves to `ANOMALY_CHECK` and the host gets **7 days** to fix it. Open pages poll
`/api/pulse` to refresh themselves when the system changes something.

## Trust, standing and penalties

| Violation | Points |
|---|---|
| Seller didn't respond within 72 hours | 1 |
| Buyer didn't send payment in time | 1 |
| Seller didn't deliver within 72 hours | 1 |
| One-sided delivery on Exchange / ABC | 1 |
| Delivery rejected as fraudulent | 3 |
| Live link removed and not restored within 7 days | 3 |

Points count in a **monthly window**. Reaching **3 points** suspends the account for **90 days**: it can't create
offers, and its sites are hidden from the markets. Rules are public at `/buyer-rules` and `/seller-rules`.

## Sites: verification and metrics

Adding a site runs these checks:

1. **Format and DNS** — the domain must be valid and actually resolve (several resolvers in parallel, including
   DNS-over-HTTPS, so it works on serverless runtimes).
2. **Ownership** — the owner uploads a token file to `https://<domain>/backlinkmarket-verify.txt`. Tokens are
   HMAC-derived from `SITE_VERIFICATION_SECRET`, so none are stored.
3. **Sitemap** — the site must have a reachable sitemap; its page count is recorded.
4. **Domain Rating** — read from the Ahrefs API (free endpoint only), refreshed daily.

Per site, the owner chooses which markets it's open to, the DR and traffic ranges it accepts, prices and discounts per
category, seller requirements, and slot capacity (daily / weekly / monthly / yearly, optionally per exact page).

## Background jobs

All schedules run in **Supabase pg_cron**, which calls the app's API routes with a bearer secret. The database stores
only a hash of that secret and checks it (`cron_ping`); the same secret unlocks the database functions each job needs,
so **the app never holds a privileged database key**.

| Route | Schedule | Does |
|---|---|---|
| `/api/cron/refresh-dr` | daily, 03:00 UTC | Refresh Domain Rating and sitemap page count for each site |
| `/api/cron/scan-links` | frequent | Check live links (see [Link monitoring](#link-monitoring)) |
| `/api/cron/send-emails` | every minute | Send queued emails from the outbox through Resend |

Deadlines (72-hour responses and deliveries, 7-day anomaly windows) and penalties are applied by the database itself.

## Email

Emails are React Email templates in `src/emails/templates` (offers, payments, delivery, monitoring, pools, sites,
penalties, closures, account, ops). The database writes rows to an **outbox** whenever an event happens; the sender
leases them (no email is sent twice), renders and sends them, and records the result. Users control categories in
Account → Notifications; account-safety mail can't be switched off.

The full list of events, recipients and templates is in [`docs/email-events.md`](docs/email-events.md). In development,
templates can be previewed at `/dev/emails`.

## SEO and AI discoverability

- Public listing page for every site: `/listing/<domain>` with JSON-LD structured data.
- `sitemap.xml`, `robots.txt`, a web manifest and Open Graph / Twitter images.
- `/llms.txt` and `/llms-full.txt` describe the marketplace and every public listing in Markdown for LLMs; `/ai.txt`
  states the AI usage policy.

## Tech stack

| Area | Tools |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| UI | Tailwind CSS v4, shadcn/ui on Base UI, lucide-react, sonner, next-themes |
| Data | Supabase (Postgres, Row Level Security, RPC functions, pg_cron), `@supabase/ssr` |
| Client state | TanStack Query |
| Validation | Zod |
| Email | React Email + Resend |
| Domains | tldts |
| Hosting | Vercel (recommended) |

## Project structure

```
src/
├── app/
│   ├── (app)/                 Signed-in app
│   │   ├── dashboard/
│   │   ├── markets/           paid/, exchange/, abc/ — browse and send offers
│   │   ├── offers/            Inbox and offer detail
│   │   ├── sites/             My sites: add, edit, detail
│   │   ├── backlinks/         Links received and hosted
│   │   ├── payment-history/   With CSV export
│   │   ├── logs/              Activity log
│   │   └── account/           Profile, payout details, notifications, standing
│   ├── api/
│   │   ├── cron/              refresh-dr, scan-links, send-emails
│   │   ├── lists/[list]/      Server-side paginated lists
│   │   └── pulse/             "Has anything changed?" for open pages
│   ├── auth/callback/         OAuth callback
│   ├── listing/[domain]/      Public listing pages
│   ├── buyer-rules/, seller-rules/
│   ├── llms.txt/, llms-full.txt/, ai.txt/, sitemap/
│   └── dev/emails/            Email previews (development)
├── components/                UI by feature (markets, offers, sites, standing, …) and ui/ (shadcn)
├── emails/                    Email templates, outbox, Resend sender
└── lib/                       Domain logic, rules, data loaders, Supabase clients, validation
docs/                          Design notes
public/                        Static files, icons, product video
```

Business rules live in plain modules so they're easy to find: `market-rules.ts`, `standing-rules.ts`, `site-rules.ts`,
`market-price.ts`, `link-check.ts`, `site-verification.ts`.

## Getting started

### Requirements

- Node.js **26** (see `.nvmrc`)
- A [Supabase](https://supabase.com) project with Google sign-in enabled
- Optional: an [Ahrefs](https://ahrefs.com/api) API key and a [Resend](https://resend.com) account

### Setup

```bash
git clone https://github.com/ahmet-saridag/backlinkmarket-oss.git
cd backlinkmarket-oss
npm install
cp .env.example .env.local   # fill in the values
npm run dev
```

Open http://localhost:3000.

> **Database schema:** the Supabase schema (tables, RLS policies, RPC functions and pg_cron jobs) is not in this
> repository yet. It will be added under `supabase/`. Until then the app builds and the public pages render, but the
> signed-in app needs the schema to work.

### Scripts

| Command | Does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Lint |

## Environment variables

All variables are listed in [`.env.example`](.env.example).

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | Supabase publishable (anon) key |
| `NEXT_PUBLIC_APP_URL` | yes | Public base URL, e.g. `http://localhost:3000` |
| `SITE_VERIFICATION_SECRET` | yes | HMAC key for site ownership tokens |
| `APP_SECRET` | for jobs | Shared secret between the app and pg_cron jobs |
| `CRON_SECRET` | for jobs | Bearer token for the scheduled routes |
| `AHREFS_API_KEY` | for DR | Ahrefs API key (free Domain Rating endpoint) |
| `RESEND_API_KEY` | for email | Resend API key |
| `EMAIL_FROM` | for email | Sender address |
| `SUPPORT_EMAIL` | for email | Support / reply-to address |
| `GOOGLE_SITE_VERIFICATION` | no | Google Search Console token |

## Deployment

The app is built for **Vercel**: import the repository, add the environment variables, and deploy. Point the
pg_cron jobs in Supabase at your deployment's `/api/cron/*` routes with your secret. Set the Supabase Auth site URL
and redirect URL (`/auth/callback`) to your domain.

## Contributing

Issues and pull requests are welcome. For larger changes, please open an issue first to discuss the idea.

1. Fork the repository and create a branch.
2. Make your change; run `npm run lint` and `npm run build`.
3. Open a pull request describing what changed and why.

All UI text, code and comments are in English.

## License

[MIT](LICENSE) © 2026 Ahmet Saridag
