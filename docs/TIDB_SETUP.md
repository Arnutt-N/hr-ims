# TiDB Setup

This repository still keeps SQLite as the default local development database so current dev flows keep working.

Use the TiDB workflow below to prepare and cut over to TiDB without rewriting the main Prisma schema in place.

## 1. Prepare the TiDB connection string

Add your TiDB Prisma connection string to `backend/.env`:

```env
TIDB_DATABASE_URL="mysql://<user>:<password>@<host>:4000/<database>?sslaccept=strict"
```

Notes:

- For TiDB Cloud Starter public endpoints, append `?sslaccept=strict`.
- Make sure your TiDB IP allow list already includes the machine that runs Prisma commands.

## 2. Generate and push the TiDB schema

From the repo root:

```bash
npm run db:generate:tidb
npm run db:push:tidb
npm run db:seed:tidb
```

What these commands do:

- Generate a temporary Prisma schema at `backend/prisma/.generated/schema.tidb.prisma`
- Switch only that generated schema to `provider = "mysql"`
- Reuse the existing data model for TiDB without breaking the default SQLite dev flow
- Regenerate the Prisma client for TiDB before seeding

## 3. Cut over the app runtime

When you are ready for the app itself to run on TiDB, replace `DATABASE_URL` in both files with the same TiDB connection string:

- `backend/.env`
- `frontend/next-app/.env`

Example:

```env
DATABASE_URL="mysql://<user>:<password>@<host>:4000/<database>?sslaccept=strict"
```

Both the frontend and backend must point to the same TiDB database.

If you later switch local dev back to SQLite, rerun the default Prisma generate flow:

```bash
cd backend
npx prisma generate
```

## 4. Migration history note

The checked-in Prisma migration history was created for SQLite.

For the TiDB path in this repo, use `prisma db push` through the TiDB scripts above unless you intentionally create a fresh MySQL/TiDB migration baseline.

## 5. Backup and restore note

The in-app backup/restore flow currently supports SQLite file databases only.

If you run the application on TiDB:

- app-level backup routes will return an explicit unsupported message
- use TiDB-native backup or data migration tooling outside the app for database backups
