const { spawnSync } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

// [2026-11-10] Modified by Cursor: one MySQL path for local Docker and prod TiDB.
// Reads DATABASE_URL only. Never prints the URL (it can contain a password).

const url = process.env.DATABASE_URL?.trim();
if (!url) {
    console.error('DATABASE_URL is required. Refusing to run.');
    process.exit(1);
}
if (!url.startsWith('mysql://')) {
    console.error('DATABASE_URL must use the mysql:// scheme. Refusing to run.');
    process.exit(1);
}

const action = process.argv[2];
if (action !== 'push' && action !== 'seed') {
    console.error('Usage: node scripts/db-with-database-url.js <push|seed>');
    process.exit(1);
}

console.log(`Running prisma ${action} with DATABASE_URL (mysql scheme confirmed, value not printed).`);

const backendRoot = path.resolve(__dirname, '..');
const prismaArgs = action === 'push'
    ? ['prisma', 'db', 'push', '--schema', 'prisma/schema.prisma']
    : ['prisma', 'db', 'seed'];

const command = process.platform === 'win32' ? 'cmd.exe' : 'npx';
const commandArgs = process.platform === 'win32'
    ? ['/c', 'npx', ...prismaArgs]
    : prismaArgs;

const result = spawnSync(command, commandArgs, {
    cwd: backendRoot,
    stdio: 'inherit',
    env: process.env,
});

if (result.error) {
    console.error(result.error.message);
    process.exit(1);
}

process.exit(result.status ?? 1);
