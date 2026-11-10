# HR-IMS

HR-IMS is split into two active codebases:

- `frontend/next-app` for the Next.js app
- `backend` for the Express API and Prisma schema

The repo root is now only a launcher and documentation entry point for the active Next.js frontend and Express backend.

## Quick Start

```bash
cd frontend/next-app
npm install

cd ../backend
npm install

cd ../..
npm run dev
```

Run `npm run dev:backend` in a second terminal if you want the API separately. Frontend runs at `http://localhost:3000` and backend runs at `http://localhost:3001`.

## Database

Local development and production use the same MySQL dialect. The Prisma schema source of truth is `backend/prisma/schema.prisma` (`provider = "mysql"`). Production stays on TiDB Cloud. Local dev uses MySQL 8 from Docker.

```bash
docker compose up -d mysql
cp backend/.env.example backend/.env
```

Set the same `DATABASE_URL` for the frontend environment. The example value is dev-only:

`mysql://root:root@localhost:3306/hrims`

```bash
cd backend
npx prisma generate
npm run db:setup
```

`db:setup` pushes the schema and seeds demo data. `npm run db:migrate:deploy` applies `backend/prisma/migrations` on an empty MySQL database. See `docs/TIDB_SETUP.md` for the production TiDB push, which uses `DATABASE_URL` only.

## TiDB

There is no SQLite schema and no sqlite-to-mysql transform. To push or seed production, set `DATABASE_URL` to the TiDB connection string in that environment and run:

```bash
npm run db:push:prod
npm run db:seed:prod
```

Those scripts refuse to run unless `DATABASE_URL` uses the `mysql://` scheme, and they do not print the URL. Do not commit a production URL. App-level backup still does not dump server databases; use TiDB backup tooling.

## Tests

```bash
# Frontend
npm run test
npm run lint

# Backend
npm run test:backend
cd backend && npm test -- --testPathPattern=security
cd backend && npm test -- --testPathPattern=integration
```

## Notes

- Root `npm run dev` starts the Next.js frontend.
- Root `npm run dev:backend` starts the Express backend.
- Windows shortcuts are still available via `start_frontend.bat` and `start_backend.bat`.
- Optional public access uses Cloudflare Tunnel. Install `cloudflared` on the machine (`winget install --id Cloudflare.cloudflared -e`, `choco install cloudflared`, or `brew install cloudflared`), then run `start_tunnel.bat`. The repo does not include the binary. See `CLOUDFLARE-TUNNEL.md`.
- Use `backend/prisma/schema.prisma` only; do not maintain a separate frontend Prisma schema.
