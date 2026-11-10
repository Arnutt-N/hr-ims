/**
 * Postinstall script — generate the frontend Prisma Client.
 *
 * backend/prisma/schema.prisma is the single source of truth and uses the
 * mysql provider for both local MySQL 8 and production TiDB. `prisma generate`
 * does not connect to the database.
 *
 * cwd assumption: npm runs this with cwd = frontend/next-app.
 */

const { execSync } = require('node:child_process');

console.log('[postinstall] Generating Prisma Client from backend/prisma/schema.prisma (provider=mysql)');
execSync(
    'npx prisma generate --schema=../../backend/prisma/schema.prisma --generator client_frontend',
    { stdio: 'inherit' },
);
