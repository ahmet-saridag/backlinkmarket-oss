# Backlink Market

A backlink marketplace where site owners buy, sell and swap links: a **Paid** market, a one-to-one **Exchange** market,
and three-way **ABC** pools. Placed links are verified and monitored automatically, with deadlines and penalty points
for rule breaks.

Built with Next.js 16, Tailwind CSS v4, shadcn/ui (Base UI), Supabase (auth, Postgres, pg_cron) and Resend.

## Getting started

Requirements: Node.js (see `.nvmrc`) and a Supabase project.

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Open http://localhost:3000.

### Environment variables

Every variable is listed with a short description in [`.env.example`](.env.example). The Supabase URL and publishable
key are required to run the app; Ahrefs and Resend keys are only needed for Domain Rating lookups and email.

## Project layout

| Path | What's there |
|---|---|
| `src/app` | Routes (App Router): public pages, the signed-in app under `(app)`, API routes |
| `src/components` | UI components |
| `src/lib` | Supabase clients, domain logic, helpers |
| `docs/` | Design notes, e.g. [`email-events.md`](docs/email-events.md) |

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Lint |

## Contributing

Issues and pull requests are welcome. Please open an issue first for larger changes.

## License

[MIT](LICENSE)
