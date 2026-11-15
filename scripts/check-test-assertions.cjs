#!/usr/bin/env node
/**
 * Fails when a test file contains an `it(...)` block with no assertion.
 *
 * Why this exists: `idor.test.ts` once passed 13/13 without a single
 * `expect()`. A test that asserts nothing is green whether the code works or
 * not, so it hides the very regression it was written to catch.
 *
 * Usage:
 *   node scripts/check-test-assertions.cjs                 # scan default roots
 *   node scripts/check-test-assertions.cjs path/to/x.test.ts
 *
 * Exit code 1 when any block is empty of assertions.
 */
const fs = require('fs');
const path = require('path');

const DEFAULT_ROOTS = [
  'backend/src/tests/security',
  'backend/src/tests/unit',
  'frontend/next-app/tests',
];

const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/;

function walk(dir, out) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      walk(full, out);
    } else if (TEST_FILE.test(entry.name)) {
      out.push(full);
    }
  }
}

function findEmptyBlocks(src) {
  const blocks = src.split(/\n\s*it\(/).slice(1);
  const empty = [];
  for (const b of blocks) {
    const body = b.split(/\n\s*it\(/)[0];
    if (!/expect\(|assert\(|\.toThrow|rejects\./.test(body)) {
      const name = b.split('\n')[0].trim().replace(/,\s*(async\s*)?\(.*$/, '');
      empty.push(name.slice(0, 90));
    }
  }
  return { total: blocks.length, empty };
}

const args = process.argv.slice(2);
const files = [];
if (args.length > 0) {
  files.push(...args);
} else {
  for (const root of DEFAULT_ROOTS) walk(root, files);
}

let failed = 0;
let scanned = 0;
for (const file of files) {
  if (!fs.existsSync(file)) {
    console.error(`missing: ${file}`);
    failed++;
    continue;
  }
  scanned++;
  const { total, empty } = findEmptyBlocks(fs.readFileSync(file, 'utf8'));
  if (empty.length > 0) {
    failed++;
    console.error(`\n${file} — ${empty.length}/${total} it-blocks have no assertion:`);
    for (const name of empty) console.error(`  - ${name}`);
  }
}

if (failed > 0) {
  console.error(
    `\n${failed} file(s) contain tests that assert nothing. ` +
      `A test with no expect() passes whether the code works or not — ` +
      `add an assertion or delete the test.`,
  );
  process.exit(1);
}

console.log(`ok: ${scanned} test file(s), every it-block asserts something`);
