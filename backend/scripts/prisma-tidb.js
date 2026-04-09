const { spawnSync } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { prepareTidbSchema, OUTPUT_SCHEMA } = require('./prepare-tidb-prisma');

const args = process.argv.slice(2);
const backendRoot = path.resolve(__dirname, '..');
const tidbUrl = process.env.TIDB_DATABASE_URL?.trim();

if (!args.length) {
    console.error('Usage: node scripts/prisma-tidb.js <prisma args>');
    process.exit(1);
}

if (!tidbUrl) {
    console.error('TIDB_DATABASE_URL is required for TiDB Prisma commands.');
    process.exit(1);
}

prepareTidbSchema();

const prismaArgs = [...args];
if (!prismaArgs.includes('--schema')) {
    prismaArgs.push('--schema', OUTPUT_SCHEMA);
}

const command = process.platform === 'win32' ? 'cmd.exe' : 'npx';
const commandArgs = process.platform === 'win32'
    ? ['/c', 'npx', 'prisma', ...prismaArgs]
    : ['prisma', ...prismaArgs];

const result = spawnSync(command, commandArgs, {
    cwd: backendRoot,
    stdio: 'inherit',
    env: {
        ...process.env,
        DATABASE_URL: tidbUrl,
    },
});

if (result.error) {
    console.error(result.error.message);
    process.exit(1);
}

process.exit(result.status ?? 1);
