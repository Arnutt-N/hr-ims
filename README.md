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

The Prisma schema source of truth is `backend/prisma/schema.prisma`.

```bash
cd backend
npx prisma generate
npx prisma db push
npx prisma db seed
```

Run the seed step on a fresh clone or any time you need the demo/admin data recreated after rebuilding `backend/prisma/dev.db`.

## TiDB

This repo now includes a TiDB preparation path without breaking the default SQLite local dev setup.

```bash
npm run db:generate:tidb
npm run db:push:tidb
npm run db:seed:tidb
```

Set `TIDB_DATABASE_URL` in `backend/.env` before running those commands, then cut over runtime `DATABASE_URL` in both `backend/.env` and `frontend/next-app/.env` when you are ready to run the app on TiDB.

See `docs/TIDB_SETUP.md` for the full cutover notes and backup limitations.

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
- Use `backend/prisma/schema.prisma` only; do not maintain a separate frontend Prisma schema.
