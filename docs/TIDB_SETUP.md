# Database setup (MySQL 8 locally, TiDB in production)

Dev and production use one Prisma schema: `backend/prisma/schema.prisma` with `provider = "mysql"`. Production stays on TiDB Cloud. Local development uses the MySQL 8 service in `docker-compose.yml`.

There is no SQLite database and no schema conversion script.

## 1. Local MySQL 8

From the repo root:

```bash
docker compose up -d mysql
```

Copy `backend/.env.example` to `backend/.env`. The example `DATABASE_URL` is a dev-only placeholder:

```env
DATABASE_URL="mysql://root:root@localhost:3306/hrims"
```

Put the same URL in the frontend env file (`frontend/next-app/.env` or `.env.local`). Both processes must use one database.

Then:

```bash
cd backend
npx prisma generate
npm run db:setup
```

`npm run db:setup` is `db push` plus seed. It reads `DATABASE_URL` and does not print it.

On an empty database you can also apply the committed SQL:

```bash
npm run db:migrate:deploy
npm run db:seed
```

Historical SQLite migration SQL lives in `backend/prisma/migrations-sqlite-archive/` and is not applied.

## 2. Production TiDB

Do this from a trusted environment, not from a laptop session that should not see production.

1. Set `DATABASE_URL` to the TiDB Cloud connection string (`mysql://`, port `4000`, and `sslaccept=strict` for public endpoints).
2. Allow that machine's IP in the TiDB allow list.
3. Preview the diff before writing:

```bash
cd backend
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script
```

4. Apply the schema. This does not load demo rows:

```bash
npm run db:push:prod
```

`npm run db:seed:prod` is the same seed as local dev. It upserts demo users and **deletes** requests, stock levels, cart rows, stock transactions, transfers, and inventory items before inserting sample rows. Do not run it on a production database that already has real data.

`db:push:prod` and `db:seed:prod` are the same scripts as local `db:push` and `db:seed`. They use `DATABASE_URL` only. There is no `TIDB_DATABASE_URL`.

Do not run `npm run db:migrate:deploy` against the existing production database. That database was created with `db push` and has no Prisma migration history. Deploying the baseline would try to create tables that already exist. `db push` is the production path. After a push that leaves prod matching the baseline, an owner can mark the baseline applied with `prisma migrate resolve --applied 20261110120000_mysql_baseline` if they later want `migrate deploy`.

## 3. Backup

In-app backup and restore do not dump MySQL or TiDB. Use `mysqldump` locally and TiDB's own backup tools in production.
