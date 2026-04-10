/**
 * Postinstall script — selects the Prisma Client provider based on DATABASE_URL.
 *
 * Why this exists:
 *   The repo keeps backend/prisma/schema.prisma as the sqlite source of truth so
 *   local dev against the SQLite file database stays fast. Production on Vercel
 *   runs against TiDB (MySQL protocol). Prisma generates a provider-specific
 *   query engine at `prisma generate` time, so the client compiled from sqlite
 *   cannot talk to a mysql:// DATABASE_URL at runtime, and vice versa.
 *
 *   This script detects the DATABASE_URL scheme at install time and runs the
 *   appropriate generation path:
 *
 *     - DATABASE_URL starts with "mysql://"  -> TiDB path:
 *         1. Run backend/scripts/prepare-tidb-prisma.js to emit a mysql-flavored
 *            copy of the schema at backend/prisma/.generated/schema.tidb.prisma
 *         2. `prisma generate` from that generated schema, writing only the
 *            client_frontend generator into frontend/next-app/node_modules
 *
 *     - Anything else (file:, sqlite:, or unset) -> SQLite path:
 *         `prisma generate` directly from backend/prisma/schema.prisma using
 *         the client_frontend generator (the original behavior)
 *
 * cwd assumption:
 *   npm runs package lifecycle scripts with cwd = the package directory, so
 *   this script runs with cwd = frontend/next-app/. All relative paths below
 *   are anchored to that.
 *
 * No DB connection is made during `prisma generate` — it only parses the
 * schema file and emits code. The DATABASE_URL only needs to have the right
 * SCHEME for the detection to work; it does not need to be reachable.
 */

const { execSync } = require('node:child_process');

const dbUrl = (process.env.DATABASE_URL || '').trim();
const isMysql = dbUrl.startsWith('mysql://');

function run(cmd) {
    console.log(`[postinstall] $ ${cmd}`);
    execSync(cmd, { stdio: 'inherit' });
}

if (isMysql) {
    console.log('[postinstall] DATABASE_URL uses mysql:// -> generating TiDB (MySQL) Prisma Client');
    run('node ../../backend/scripts/prepare-tidb-prisma.js');
    run('npx prisma generate --schema=../../backend/prisma/.generated/schema.tidb.prisma --generator client_frontend');
} else {
    const scheme = dbUrl.split('://')[0] || '(unset)';
    console.log(`[postinstall] DATABASE_URL scheme = "${scheme}" -> generating default SQLite Prisma Client`);
    run('npx prisma generate --schema=../../backend/prisma/schema.prisma --generator client_frontend');
}
