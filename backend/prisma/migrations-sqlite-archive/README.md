# Archived SQLite migrations

These SQL files were written for `provider = "sqlite"`. Prisma no longer applies them.

The active history is `backend/prisma/migrations/` (`provider = "mysql"`). Local MySQL 8 and production TiDB both use that schema. Existing production databases should be updated with `npm run db:push:prod`, not by replaying this archive.
